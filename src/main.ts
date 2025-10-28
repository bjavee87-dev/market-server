import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from 'express-rate-limit'
import fileUpload from "express-fileupload";
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

// External Modules
import { Routes, gasStation } from "./Routes";
import { resolvers, typeDefs } from "./graphql";
import config from "../config.json";
import setlog from "./utils/setlog";

// Get router
const router: express.Router = express.Router();
const app: express.Express = express();
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const connectDatabase = async (mongoUrl: string) => {
    try {
        const options = {
            autoCreate: true,
            keepAlive: true,
            retryReads: true,
        } as mongoose.ConnectOptions;
        mongoose.set("strictQuery", true);
        const result = await mongoose.connect(mongoUrl, options);
        if (result) {
            setlog("MongoDB connected");
        }
    } catch (err) {
        setlog("ConnectDatabase", err);
    }
};

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(
    cors({
        origin: "*",
        methods: ["POST", "GET"],
    })
);

app.use(
    (req, res, next) => {
        if (req.originalUrl === '/payment/session-complete') { //stripe payment completed
            next();
        } else {
            express.json()(req, res, next);
        }
    }
);
// // stripe payment callback url
// app.post("/payment/session-complete", express.raw({type: 'application/json'}), gasStation.completePayment);


// Frontend Render
if (!config.debug) {
    app.use(express.static(__dirname + "/build"));
    app.get("/*", function (req, res) {
        res.sendFile(__dirname + "/build/index.html", function (err) {
            if (err) {
                res.status(500).send(err);
            }
        });
    });
}

// API Router
Routes(router);
app.use("/api", router);

// Apollo Server
const startApolloServer = async (typeDefs: any, resolvers: any) => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        csrfPrevention: true,
        cache: "bounded",
        // context: async ({ req, res }) => {
        //     const token = req.headers.authorization || "";
        //     jwt.verify(token, config.JWT_SECRET, async (err, _) => {
        //         if (err) return res.sendStatus(403);
        //     });
        // },
    }) as any;

    await server.start();
    app.use(expressMiddleware(server));
    app.use(limiter)
    app.listen(config.PORT, () => {
        setlog(`Server listening on ${config.PORT} port`);
    });
};

// Running Server

connectDatabase(config.DATABASE).then(() => {
    startApolloServer(typeDefs, resolvers);
}).catch((err: any) => {
    setlog(err);
});