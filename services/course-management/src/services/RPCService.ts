import * as amqplib from 'amqplib';
import env from "../config";
import CourseService from "./CourseService";
import {v4 as uuid4} from "uuid";


const {
    MSG_QUEUE_URL,
} = env

let amqplibConnection: amqplib.Connection | null = null;

export const getChannel = async () => {
    if (amqplibConnection === null) {
        amqplibConnection = await amqplib.connect(MSG_QUEUE_URL);
    }
    const channel = await amqplibConnection?.createChannel();
    return channel;
};

export const RPCObserver = async (RPC_QUEUE_NAME: string, service: CourseService) => {
    const channel = await getChannel();
    await channel.assertQueue(RPC_QUEUE_NAME, {
        durable: false,
    });
    await channel.prefetch(1);
    await channel.consume(
        RPC_QUEUE_NAME,
        async (msg: amqplib.ConsumeMessage | null) => {
            if (msg !== null && msg.content) {
                let response = {};
                // DB Operation

                response = await service.SubscribeRPCObserver(msg.content.toString()); // call DB operation

                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    {
                        correlationId: msg.properties.correlationId,
                    }
                );
                channel.ack(msg);
            }
        },
        {
            noAck: false,
        }
    );
};

export const requestData = async (RPC_QUEUE_NAME: string, requestPayload: {
    event: string,
    data: {}
}, uuid: string) => {
    try {
        const channel = await getChannel();

        const q = await channel.assertQueue("", {exclusive: true});

        channel.sendToQueue(
            RPC_QUEUE_NAME,
            Buffer.from(JSON.stringify(requestPayload)),
            {
                replyTo: q.queue,
                correlationId: uuid,
            }
        );

        return new Promise((resolve, reject) => {
            // timeout n
            const timeout = setTimeout(() => {
                channel.close();
                resolve("API could not fulfill the request!");
            }, 8000);
            channel.consume(
                q.queue,
                (msg: amqplib.ConsumeMessage | null) => {
                    if (msg !== null && msg.properties.correlationId == uuid) {
                        resolve(JSON.parse(msg.content.toString()));
                        clearTimeout(timeout);
                    } else {
                        reject("data Not found!");
                    }
                },
                {
                    noAck: true,
                }
            );
        });
    } catch (error) {
        console.log(error);
        return "error";
    }
};

export const RPCRequest = async (RPC_QUEUE_NAME: string, requestPayload: {
    event: string,
    data: {}
}) => {
    const uuid = uuid4(); // correlationId
    return await requestData(RPC_QUEUE_NAME, requestPayload, uuid);
};
