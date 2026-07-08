import { Router } from 'express';
import * as reminderController from '../controllers/reminder.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();


router.post('/add', protect, reminderController.addReminder);
router.get('/user/:userId', protect, reminderController.getUserReminders);
router.get('/:id', protect, reminderController.getReminder);
router.put('/:id', protect, reminderController.updateReminder);
router.delete('/:id', protect, reminderController.deleteReminder);

export default router;