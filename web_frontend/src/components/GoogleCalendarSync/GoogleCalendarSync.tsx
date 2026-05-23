import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Loader2, Unlink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import {
  disconnectGoogleCalendar,
  getGoogleCalendarAuthUrl,
  getGoogleCalendarStatus,
  syncGoogleCalendar,
} from '../../api/googleCalendar';
import styles from './GoogleCalendarSync.module.css';

export default function GoogleCalendarSync() {
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);
  const oauthSyncStartedRef = useRef(false);

  const loadStatus = useCallback(async () => {
    if (!user?.token || !isPremium) {
      setLoadingStatus(false);
      return;
    }
    try {
      const status = await getGoogleCalendarStatus(user.token);
      setConnected(status.connected);
      setGoogleEmail(status.email);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  }, [user?.token, isPremium]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const runSync = useCallback(async () => {
    if (!user?.token || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await syncGoogleCalendar(user.token);
      setConnected(true);
      if (result.email) setGoogleEmail(result.email);
      const parts: string[] = [];
      if (result.created) parts.push(`${result.created} new`);
      if (result.updated) parts.push(`${result.updated} updated`);
      if (result.duplicatesRemoved) parts.push(`${result.duplicatesRemoved} duplicates removed`);
      if (result.removed) parts.push(`${result.removed} removed`);
      setMessage(
        `Synced ${result.total} event${result.total !== 1 ? 's' : ''} to Google Calendar` +
          (parts.length ? ` (${parts.join(', ')})` : '')
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
      syncInFlightRef.current = false;
    }
  }, [user?.token]);

  // After Google OAuth redirect
  useEffect(() => {
    const flag = searchParams.get('googleCalendar');
    if (!flag || !user?.token || !isPremium) return;

    const email = searchParams.get('email');
    const errMsg = searchParams.get('message');

    if (flag === 'connected') {
      setConnected(true);
      if (email) setGoogleEmail(decodeURIComponent(email));
      setSearchParams({}, { replace: true });
      if (!oauthSyncStartedRef.current) {
        oauthSyncStartedRef.current = true;
        runSync();
      }
    } else if (flag === 'error') {
      setError(errMsg ? decodeURIComponent(errMsg) : 'Google connection failed');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user?.token, isPremium, setSearchParams, runSync]);

  const handleSyncClick = async () => {
    if (!user?.token) return;

    if (connected) {
      await runSync();
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      const url = await getGoogleCalendarAuthUrl(user.token);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Google sign-in');
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.token) return;
    if (!window.confirm('Disconnect Google Calendar from Trakkit?')) return;

    const removeEvents = window.confirm(
      'Remove Trakkit events from your Google Calendar?\n\n' +
        'Only events created by Trakkit sync will be deleted. Your other Google events are not affected.\n\n' +
        'OK — remove them\n' +
        'Cancel — keep them on Google Calendar'
    );

    setDisconnecting(true);
    setError(null);
    setMessage(null);
    try {
      const { eventsRemoved } = await disconnectGoogleCalendar(user.token, removeEvents);
      setConnected(false);
      setGoogleEmail(null);
      if (removeEvents) {
        setMessage(
          eventsRemoved > 0
            ? `Disconnected. Removed ${eventsRemoved} event${eventsRemoved !== 1 ? 's' : ''} from Google Calendar.`
            : 'Disconnected. No Trakkit events were found on Google Calendar.'
        );
      } else {
        setMessage('Disconnected. Your Google Calendar events were left unchanged.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  };

  if (!isPremium) {
    return (
      <div className={styles.calendarPremiumNotice} role="note">
        <div className={styles.calendarPremiumNoticeIcon} aria-hidden>
          <Calendar size={18} />
        </div>
        <div className={styles.calendarPremiumNoticeBody}>
          <p className={styles.calendarPremiumNoticeLabel}>Google Calendar sync</p>
          <p className={styles.calendarPremiumNoticeText}>
            Connect your Gmail account and sync warranties, subscriptions, reminders, and to-dos to Google Calendar.
          </p>
        </div>
        <button type="button" className={styles.calendarPremiumLink} onClick={() => navigate('/pricing')}>
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.syncBtn}
          onClick={handleSyncClick}
          disabled={syncing || loadingStatus}
        >
          {syncing ? (
            <>
              <Loader2 size={16} className={styles.spin} />
              {connected ? 'Syncing…' : 'Connecting…'}
            </>
          ) : (
            <>
              <Calendar size={16} />
              Sync with Google Calendar
            </>
          )}
        </button>
        {connected && (
          <button
            type="button"
            className={styles.disconnectBtn}
            onClick={handleDisconnect}
            disabled={disconnecting || syncing}
            title="Disconnect"
          >
            {disconnecting ? <Loader2 size={16} className={styles.spin} /> : <Unlink size={16} />}
          </button>
        )}
      </div>
      {googleEmail && (
        <p className={styles.connectedAs}>Connected as {googleEmail}</p>
      )}
      {!connected && !loadingStatus && (
        <p className={styles.hint}>
          Sign in with the Google account that has the calendar you want to use (Gmail).
        </p>
      )}
      {message && <p className={styles.success}>{message}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
