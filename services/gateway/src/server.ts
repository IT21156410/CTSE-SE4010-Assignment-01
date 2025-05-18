import "dotenv/config";
import express from "express";
import cors from 'cors';
import proxy from "express-http-proxy";
import morgan from "morgan";
import {setupSwagger} from "./swagger";

const isProduction = process.env.NODE_ENV === "production";
const port = parseInt(process.env.PORT || '80', 10);
console.log(".env port fetched as: " + port);

const app = express();


app.use(express.json({limit: '20mb'}));
app.use(express.urlencoded({limit: '20mb', extended: true}));

if (!isProduction) {
    app.use(morgan("dev"));
    app.use(cors({
        optionsSuccessStatus: 200,
        origin: '*',
        allowedHeaders: ['Content-Type, Access-Control-Allow-Headers, Access-Control-Allow-Origin, Authorization, X-Requested-With', 'Cache-Control']
    }));
} else {
    app.use(morgan('combined'));
    app.use(cors());
}

// Setup Swagger UI at /docs before API routes
// Since setupSwagger is async, we need to handle it properly
(async () => {
    try {
        await setupSwagger(app);
        console.log("Swagger documentation setup complete");
    } catch (error) {
        console.error("Error setting up Swagger documentation:", error);
    }
})();

// API proxy routes
app.use("/api/auth", proxy(process.env.AUTH_BASE_URL || "http://localhost:8001"));
app.use("/api/course", proxy(process.env.COURSE_BASE_URL || "http://localhost:8002"));
app.use("/api/forum", proxy(process.env.LMS_BASE_URL || "http://localhost:8003"));
app.use("/api/notification", proxy(process.env.NOTIF_BASE_URL || "http://localhost:8004"));

// app.get('/', (req, res) => {
//     const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:8000";
//     const json = {
//         name: "Gateway™ API",
//         documentation: `${gatewayUrl}/docs`,
//         services: {
//             auth: {
//                 base_url: process.env.AUTH_BASE_URL || "http://localhost:8001",
//                 proxy_url: `${gatewayUrl}/api/auth`,
//             },
//             courses: {
//                 base_url: process.env.COURSE_BASE_URL || "http://localhost:8002",
//                 proxy_url: `${gatewayUrl}/api/course`,
//             },
//             lms: {
//                 base_url: process.env.LMS_BASE_URL || "http://localhost:8003",
//                 proxy_url: `${gatewayUrl}/api/forum`,
//             },
//             notifications: {
//                 base_url: process.env.NOTIF_BASE_URL || "http://localhost:8004",
//                 proxy_url: `${gatewayUrl}/api/notification`,
//             },
//         }
//     };
//     res.status(200).json(json);
// });

app.get("/", (req, res) => {
    const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:8000";

    const services = {
        auth: {
            base_url: process.env.AUTH_BASE_URL || "http://localhost:8001",
            proxy_url: `${gatewayUrl}/api/auth`,
        },
        courses: {
            base_url: process.env.COURSE_BASE_URL || "http://localhost:8002",
            proxy_url: `${gatewayUrl}/api/course`,
        },
        lms: {
            base_url: process.env.LMS_BASE_URL || "http://localhost:8003",
            proxy_url: `${gatewayUrl}/api/forum`,
        },
        notifications: {
            base_url: process.env.NOTIF_BASE_URL || "http://localhost:8004",
            proxy_url: `${gatewayUrl}/api/notification`,
        },
    };

    const html = `
        <html lang="en">
        <head>
            <title>Updated Gateway™ API</title>
            <style>
                body { font-family: sans-serif; padding: 20px; background: #f4f4f4; }
                h1 { color: darkred; }
                table { width: 100%; border-collapse: collapse; margin-top: 35px; }
                th, td { padding: 10px; border: 1px solid #ccc; text-align: left; }
                th { background-color: #eee; }
                button {
                  padding: 10px 20px;
                  background: #33b04e;
                  color: #fff;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                }
                button:hover { background: #39ce58; }
            </style>
        </head>
        <body>
            <h1>Gateway™ API</h1>
            <h2>🚀 Cloud Microservice Deployment on AWS EKS</h2>
            <p>This project includes a containerized Node.js + TypeScript-based Microservice, deployed to AWS EKS with CI/CD via GitHub Actions.</p>
            <p>
            <a href="${gatewayUrl}/docs" target="_blank">
                <button>API COLLECTION</button>
            </a>
            </p>
            <table>
                <thead>
                    <tr>
                    <th>Service</th>
                    <th>Proxy URL</th>
                    <th>Base URL</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(services).map(([name, info]) => `
                            <tr>
                                <td>
                                    <a href="${info.base_url}/api-docs" target="_blank">
                                        <button>${name.toUpperCase()}</button>
                                    </a>
                                </td>
                                <td><a href="${info.proxy_url}" target="_blank">${info.proxy_url}</a></td>
                                <td><a href="${info.base_url}" target="_blank">${info.base_url}</a></td>
                            </tr>`).join("")}
                </tbody>
            </table>
        </body>
        </html>
    `;

    res.status(200).send(html);
});

app.listen(port, () => {
    console.log("Gateway is Listening to Port 80");
});
