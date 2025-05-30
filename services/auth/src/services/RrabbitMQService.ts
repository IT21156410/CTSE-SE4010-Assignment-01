import * as amqplib from 'amqplib';
import AuthService from "./AuthService";

import env from "../config";

const {
    QUEUE_NAME,
    EXCHANGE_NAME,
    AUTH_SERVICE,
    MSG_QUEUE_URL,
} = env

export class RabbitMQService {
    private static instance: RabbitMQService;
    private channel: amqplib.Channel | null = null;

    private constructor() {
    }

    static async getInstance(): Promise<RabbitMQService> {
        if (!RabbitMQService.instance) {
            RabbitMQService.instance = new RabbitMQService();
            await RabbitMQService.instance.init();
        }
        return RabbitMQService.instance;
    }

    private async init(): Promise<void> {
        console.log(".env MSG_QUEUE_URL fetched as: " + MSG_QUEUE_URL);
        const connection = await amqplib.connect(MSG_QUEUE_URL);
        this.channel = await connection.createChannel();

        // Assert exchange for publishing
        // await this.channel.assertQueue(EXCHANGE_NAME, {durable: true});
        await this.channel.assertExchange(EXCHANGE_NAME, 'direct');

        console.log('RabbitMQ connection and channel initialized.');

    }

    async publishMessage(routingKey: string, message: string): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel is not initialized.');
        }
        this.channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(message));
        console.log(`[${routingKey}] publish message: ${message}`);

    }

    async subscribeMessage(service: AuthService): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel is not initialized.');
        }
        // await this.channel.assertExchange(EXCHANGE_NAME, "direct", {durable: true});
        const q = await this.channel.assertQueue(QUEUE_NAME);
        console.log(` Waiting for messages in queue: ${q.queue}`);

        await this.channel.bindQueue(q.queue, EXCHANGE_NAME, AUTH_SERVICE);

        await this.channel.consume(q.queue, (msg: amqplib.ConsumeMessage | null) => {
                if (msg !== null && msg.content) {
                    console.log("the message is:", msg.content.toString());
                    service.SubscribeEvents(msg.content.toString());
                }
                console.log("[X] received");
            },
            {
                noAck: true,
            });
    }

    async close(): Promise<void> {
        if (this.channel) {
            await this.channel.close();
        }
    }
}