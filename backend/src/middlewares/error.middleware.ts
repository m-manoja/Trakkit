import type { ErrorRequestHandler } from "express";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = (err as any).status ?? 500;
  const message = (err as any).message ?? "Internal Server Error";
  if (status >= 500) logger.error({ err }, "Unhandled error");
  res.status(status).json({ error: message });
};