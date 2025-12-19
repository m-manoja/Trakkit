import express from "express";
import { router } from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";

export const app = express();

app.use(express.json());
app.use("/api", router);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not Found" }));
// error middleware
app.use(errorHandler);