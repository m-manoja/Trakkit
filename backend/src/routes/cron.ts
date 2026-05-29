import { Router } from 'express';
import { processNotifications } from '../services/notificationWorker.service.js';

const router = Router();

// Vercel calls this endpoint on schedule. It passes Authorization: Bearer <CRON_SECRET>.
// An external cron service (e.g. cron-job.org) must also send the same header.
router.get('/process-notifications', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const result = await processNotifications();
    console.log(`[Cron] Processed ${result.processed} notification(s)`);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[Cron] processNotifications failed:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
