import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import * as googleCalendarController from '../controllers/googleCalendar.controller.js';

const router = Router();

router.get('/callback', googleCalendarController.oauthCallback);
router.get('/auth-url', protect, googleCalendarController.getAuthUrl);
router.get('/status', protect, googleCalendarController.getStatus);
router.post('/sync', protect, googleCalendarController.syncCalendar);
router.post('/disconnect', protect, googleCalendarController.disconnect);

export default router;
