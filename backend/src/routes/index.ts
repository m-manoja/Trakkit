import { Router } from "express";
import { healthRouter } from "./health.route.js";
import subscriptionRoutes from './subscription';

export const router = Router();
router.use("/health", healthRouter);
router.use('/subscriptions', subscriptionRoutes);