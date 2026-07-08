import type { Request, Response } from 'express';
import * as sharingService from '../services/sharing.service.js';

function getUserId(req: Request): string | undefined {
  return (req as any).user?.id || (req as any).user?.userId;
}

export async function resolveRecipient(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { email, phone } = req.body as { email?: string; phone?: string };
    const result = await sharingService.resolveRecipient(email, phone);

    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function createInvite(req: Request, res: Response) {
  try {
    const ownerUserId = getUserId(req);
    if (!ownerUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { email, items } = req.body as {
      email?: string;
      items?: sharingService.ShareItemInput[];
    };

    if (!email || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'email and items are required.' });
    }

    const result = await sharingService.createInvite(ownerUserId, email, items);

    const message =
      result.invited > 0
        ? `Invite sent to ${result.email}. They'll get the shared reminder once they join.`
        : 'These items were already invited to that email.';

    return res.status(201).json({ success: true, data: result, message });
  } catch (error: any) {
    const status = error.message?.includes('Premium') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

export async function createShare(req: Request, res: Response) {
  try {
    const ownerUserId = getUserId(req);
    if (!ownerUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { recipientUserId, items } = req.body as {
      recipientUserId?: string;
      items?: sharingService.ShareItemInput[];
    };

    if (!recipientUserId || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'recipientUserId and items are required.' });
    }

    const result = await sharingService.createShares(ownerUserId, recipientUserId, items);

    return res.status(201).json({
      success: true,
      data: result,
      message: `Shared with ${result.recipientDisplayName}.`,
    });
  } catch (error: any) {
    const status = error.message?.includes('Premium') ? 403 : 400;
    return res.status(status).json({ success: false, message: error.message });
  }
}

export async function revokeShare(req: Request, res: Response) {
  try {
    const ownerUserId = getUserId(req);
    if (!ownerUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const shareId = req.params.shareId;
    if (!shareId) return res.status(400).json({ success: false, message: 'Share id required.' });

    await sharingService.revokeShare(shareId, ownerUserId);
    return res.json({ success: true, message: 'Share removed.' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function respondToShare(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const shareId = req.params.shareId;
    if (!shareId) return res.status(400).json({ success: false, message: 'Share id required.' });

    const { action } = req.body as { action?: 'accept' | 'decline' };
    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ success: false, message: "action must be 'accept' or 'decline'." });
    }

    await sharingService.respondToShare(shareId, userId, action);
    return res.json({
      success: true,
      message: action === 'accept' ? 'Share accepted.' : 'Share declined.',
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export async function listSent(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const data = await sharingService.listSentShares(userId);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function listReceived(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const data = await sharingService.listReceivedShares(userId);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getReceivedDetail(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const shareId = req.params.shareId as string;
    if (!shareId) {
      return res.status(400).json({ success: false, message: 'Share id required.' });
    }
    const data = await sharingService.getReceivedShareDetail(shareId, userId);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
}
