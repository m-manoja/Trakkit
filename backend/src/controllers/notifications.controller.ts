import type { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient.js';

/** In-app inbox: only after outbound delivery attempted (or in-app-only with no channels). */
const INBOX_STATUSES = ['notified', 'sent', 'failed'];

/**
 * GET /api/notifications
 * Returns due notifications that have been processed by the worker (not raw pending).
 */
export async function getNotifications(req: Request, res: Response) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('user_id', userId)
      .in('status', INBOX_STATUSES)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const newIds = (data || [])
      .filter((n: { status: string }) => n.status === 'notified' || n.status === 'failed')
      .map((n: { id: string }) => n.id);

    return res.json({ success: true, data: data || [], newIds });
  } catch (err) {
    console.error('Unexpected error fetching notifications:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markNotificationsRead(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const { ids } = req.body as { ids: string[] };

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.json({ success: true, message: 'Nothing to mark' });
  }

  try {
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ status: 'sent' })
      .in('id', ids)
      .eq('user_id', userId)
      .in('status', ['notified', 'failed']);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json({ success: true, message: `${ids.length} notification(s) marked as read` });
  } catch (err) {
    console.error('Unexpected error marking notifications as read:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Badge count: unread in-app (notified + failed delivery, not yet dismissed).
 */
export async function getUnreadCount(req: Request, res: Response) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();

    const { count, error } = await supabase
      .from('scheduled_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['notified', 'failed'])
      .lte('scheduled_for', now);

    if (error) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json({ success: true, count: count || 0 });
  } catch (err) {
    console.error('Unexpected error fetching unread count:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteNotification(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { error } = await supabase
      .from('scheduled_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json({ success: true, message: 'Notification removed' });
  } catch (err) {
    console.error('Unexpected error deleting notification:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function clearAllNotifications(req: Request, res: Response) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { error } = await supabase
      .from('scheduled_notifications')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'sent');

    if (error) {
      console.error('Error clearing notifications:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    console.error('Unexpected error clearing notifications:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
