import { Router } from "express";
import { health } from "../controllers/health.controller.js";
import { asyncHandler } from "../middlewares/async.middleware.js";

export const healthRouter = Router();
healthRouter.get("/", asyncHandler(health));