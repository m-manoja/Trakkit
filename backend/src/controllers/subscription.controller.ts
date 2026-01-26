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

        // Pass the body to the service. 
        // Note: Ensure your service uses 'userId' as the key for the database column.
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

/**
 * NEW: Fetch all subscriptions for a specific user
 * This fixes the 404 error your frontend is currently getting.
 */
export const getUserSubscriptions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params; // Extracts ID from the URL /api/subscriptions/user/:userId

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const loggedInUser = (req as any).user;

        // Security Check: Only allow users to fetch their own data
        if (loggedInUser.id !== userId && loggedInUser.userId !== userId) {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        console.log(`Fetching subscriptions for User: ${userId}`);

        const subscriptions = await subscriptionService.getSubscriptionsByUserId(userId);

        res.status(200).json({
            success: true,
            data: subscriptions
        });
    } catch (error: any) {
        console.error("Fetch Error:", error.message);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch subscriptions" });
    }
};

// Handler for Editing
export const editSubscription = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Subscription ID is required" });
        }

        const userId = (req as any).user?.id || (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const updatedData = await subscriptionService.updateSubscription(id, userId, req.body);

        return res.status(200).json({
            success: true,
            message: "Subscription updated successfully",
            data: updatedData
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || "Failed to update subscription" });
    }
};

// Handler for Deleting
export const removeSubscription = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id || (req as any).user.userId;

        if (!id) {
            return res.status(400).json({ success: false, message: "Subscription ID is required" });
        }

        await subscriptionService.deleteSubscription(id, userId);

        res.status(200).json({
            success: true,
            message: "Subscription deleted successfully"
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};