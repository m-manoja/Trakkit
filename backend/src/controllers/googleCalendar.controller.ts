import { Request, Response } from 'express';
import * as googleCalendarService from '../services/googleCalendar.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const MOBILE_APP_SCHEME = process.env.MOBILE_APP_SCHEME || 'mobilefrontend';

function oauthRedirectUrl(
  platform: googleCalendarService.OAuthPlatform,
  params: Record<string, string>
): string {
  const qs = new URLSearchParams(params).toString();
  if (platform === 'mobile') {
    return `${MOBILE_APP_SCHEME}://google-calendar-callback?${qs}`;
  }
  return `${FRONTEND_URL}/dashboard?${qs}`;
}

export const getAuthUrl = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const platform: googleCalendarService.OAuthPlatform =
      req.query.platform === 'mobile' ? 'mobile' : 'web';

    await googleCalendarService.assertPremium(userId);
    const url = googleCalendarService.getAuthorizationUrl(userId, platform);

    return res.json({ success: true, data: { url } });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const oauthCallback = async (req: Request, res: Response) => {
  const oauthError = req.query.error as string | undefined;
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;

  let platform: googleCalendarService.OAuthPlatform = 'web';
  if (state) {
    try {
      platform = googleCalendarService.parseOAuthState(state).platform;
    } catch {
      // fall back to web redirect
    }
  }

  try {
    if (oauthError) {
      return res.redirect(
        oauthRedirectUrl(platform, {
          googleCalendar: 'error',
          message: oauthError,
        })
      );
    }

    if (!code || !state) {
      return res.redirect(
        oauthRedirectUrl(platform, {
          googleCalendar: 'error',
          message: 'missing_code',
        })
      );
    }

    const { email, platform: resolvedPlatform } = await googleCalendarService.handleOAuthCallback(code, state);
    platform = resolvedPlatform;

    return res.redirect(
      oauthRedirectUrl(platform, {
        googleCalendar: 'connected',
        email,
      })
    );
  } catch (error: any) {
    console.error('Google OAuth callback error:', error.message);
    return res.redirect(
      oauthRedirectUrl(platform, {
        googleCalendar: 'error',
        message: error.message,
      })
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
