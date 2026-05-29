/**
 * Optional: extend scheduled_notifications.status to allow 'processing'.
 * The worker no longer requires this status (uses locked_at only), but run
 * this if you have rows stuck with status = 'processing' from older code:
 *
 * UPDATE scheduled_notifications SET status = 'pending', locked_at = NULL
 *   WHERE status = 'processing';
 */

console.log('No migration required — worker uses locked_at instead of processing status.');
