import { Router } from 'express';
import * as reminderController from '../controllers/reminder.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// Match these to the API_BASE_URL calls in your reminders.tsx
router.post('/add', protect, reminderController.addReminder);
router.get('/user/:userId', protect, reminderController.getUserReminders);
router.get('/:id', protect, reminderController.getReminder);
router.put('/:id', protect, reminderController.updateReminder);
router.delete('/:id', protect, reminderController.deleteReminder);

export default router;