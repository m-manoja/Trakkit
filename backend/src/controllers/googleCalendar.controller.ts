import { Request, Response } from 'express';
import * as googleCalendarService from '../services/googleCalendar.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const getAuthUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await googleCalendarService.assertPremium(userId);
    const url = googleCalendarService.getAuthorizationUrl(userId);

    return res.json({ success: true, data: { url } });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const oauthCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const oauthError = req.query.error as string | undefined;

    if (oauthError) {
      return res.redirect(`${FRONTEND_URL}/dashboard?googleCalendar=error&message=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/dashboard?googleCalendar=error&message=missing_code`);
    }

    const { email } = await googleCalendarService.handleOAuthCallback(code, state);

    return res.redirect(
      `${FRONTEND_URL}/dashboard?googleCalendar=connected&email=${encodeURIComponent(email)}`
    );
  } catch (error: any) {
    console.error('Google OAuth callback error:', error.message);
    return res.redirect(
      `${FRONTEND_URL}/dashboard?googleCalendar=error&message=${encodeURIComponent(error.message)}`
    );
  }
};

export const getStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const status = await googleCalendarService.getConnectionStatus(userId);
    return res.json({ success: true, data: status });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const syncCalendar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await googleCalendarService.syncEventsToGoogleCalendar(userId);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Google Calendar sync error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const disconnect = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const removeEvents = Boolean(req.body?.removeEvents);
    const { eventsRemoved } = await googleCalendarService.disconnectGoogleCalendar(userId, {
      removeEvents,
    });
    return res.json({
      success: true,
      message: 'Google Calendar disconnected',
      data: { eventsRemoved },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
