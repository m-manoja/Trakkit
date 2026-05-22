import type { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient.js';

/**
 * GET /api/notifications
 * Returns all due notifications for the user (pending, notified, sent).
 * Does NOT auto-mark status — status is only changed via markAsRead or the worker.
 * 'newIds' = IDs of notifications that are 'pending' or 'notified' (not yet seen in-app).
 */
export async function getNotifications(req: Request, res: Response) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();

    // Fetch all due notifications for display in the in-app inbox
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('user_id', userId)
      .lte('scheduled_for', now)  // only those that are due
      .order('scheduled_for', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // 'newIds' = notifications the worker has processed but the user hasn't dismissed yet
    const newIds = (data || [])
      .filter((n: any) => n.status === 'pending' || n.status === 'notified')
      .map((n: any) => n.id);

    return res.json({ success: true, data: data || [], newIds });
  } catch (err) {
    console.error('Unexpected error fetching notifications:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/notifications/mark-read
 * Marks the given notification IDs as 'sent' (read/seen in-app).
 * Body: { ids: string[] }
 */
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
      .eq('user_id', userId); // safety: only mark own notifications

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
 * GET /api/notifications/unread-count
 * Returns count of pending notifications due now or in the past.
 * Used for the bell badge.
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
      .in('status', ['pending', 'notified'])
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

/**
 * DELETE /api/notifications/:id
 * Removes a single notification from the inbox.
 */
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
      .eq('user_id', userId); // safety: only delete own notifications

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

/**
 * DELETE /api/notifications/clear-all
 * Clears all delivered (sent) notifications for the user.
 */
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
