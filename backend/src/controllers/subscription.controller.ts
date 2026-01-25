import { Request, Response } from 'express';
import * as subscriptionService from '../services/subscription.service';

export const addSubscription = async (req: Request, res: Response) => {
    try {
        // Look for ID in multiple common JWT locations (id or userId)
        const user = (req as any).user;
        const userId = user?.id || user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User identity could not be verified" });
        }

        console.log(`Saving subscription for User: ${userId}`);

        const data = await subscriptionService.createSubscription(userId, req.body);
        
        res.status(201).json({ 
            success: true, 
            message: "Subscription saved successfully",
            data 
        });
    } catch (error: any) {
        console.error("Database Error:", error.message);
        res.status(500).json({ success: false, message: error.message || "Failed to save subscription" });
    }
};