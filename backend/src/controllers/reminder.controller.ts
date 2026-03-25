import { Request, Response } from 'express';
import * as reminderService from '../services/reminder.service';

export const addReminder = async (req: Request, res: Response) => {
    try {
        console.log('Request body:', req.body);
        const { title, type, reminder_date, repeat_cycle, remind_time, description, userId, reminder_schedule } = req.body;

        // Validate required fields
        if (!title || !type || !reminder_date || !userId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: title, type, reminder_date, userId"
            });
        }

        const reminderData = {
            user_id: userId,
            title,
            type,
            reminder_date,
            repeat_cycle: type === 'repeat' ? (repeat_cycle || 'Every week') : null,
            remind_time: remind_time || 'On the day',
            reminder_schedule,
            description
        };

        console.log('Reminder data to insert:', reminderData);

        const newReminder = await reminderService.createReminder(reminderData);
        console.log('Created reminder:', newReminder);

        res.status(201).json({ success: true, data: newReminder });
    } catch (error: any) {
        console.error('Error in addReminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateReminder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, type, reminder_date, repeat_cycle, remind_time, description, reminder_schedule } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Reminder ID is required" });
        }

        const updateData = {
            title,
            type,
            reminder_date,
            repeat_cycle: type === 'repeat' ? repeat_cycle : null,
            remind_time,
            reminder_schedule,
            description,
            updated_at: new Date().toISOString()
        };

        const updatedReminder = await reminderService.updateReminder(id, updateData);
        res.status(200).json({ success: true, data: updatedReminder });
    } catch (error: any) {
        console.error('Error in updateReminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserReminders = async (req: Request, res: Response) => {
    try {
        console.log('Request params:', req.params);
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }
        const reminders = await reminderService.getRemindersByUserId(userId);
        res.status(200).json({ success: true, data: reminders });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteReminder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Reminder ID is required" });
        }
        await reminderService.deleteReminderById(id);
        res.status(200).json({ success: true, message: "Reminder deleted" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};