import type { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient.js';

/**
 * GET /api/notifications
 * Returns all pending notifications that are due today or in the past for the user.
 * Also marks fetched notifications as 'sent' so we track delivery.
 */
export async function getNotifications(req: Request, res: Response) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date().toISOString();

    // Fetch all notifications (pending + sent) for display in the in-app inbox
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

    // Auto-mark 'pending' ones as 'sent' now that the user is fetching them
    const pendingIds = (data || [])
      .filter((n: any) => n.status === 'pending')
      .map((n: any) => n.id);

    if (pendingIds.length > 0) {
      await supabase
        .from('scheduled_notifications')
        .update({ status: 'sent' })
        .in('id', pendingIds);
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Unexpected error fetching notifications:', err);
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
      .eq('status', 'pending')
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
