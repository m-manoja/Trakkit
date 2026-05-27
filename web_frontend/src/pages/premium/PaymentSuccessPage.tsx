import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { activateCheckout, completePayment, getPlanStatus } from '../../api/payment';
import { CheckCircle, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import styles from './PaymentResult.module.css';

const PENDING_ORDER_KEY = 'trakkit_pending_order_id';

export default function PaymentSuccessPage() {
  const { refreshPlan, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refreshing, setRefreshing] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [activationNote, setActivationNote] = useState<string | null>(null);
  const ranRef = useRef(false);
  const isFromMobile = sessionStorage.getItem('trakkit_payment_source') === 'mobile';

  useEffect(() => {
    if (ranRef.current) return;
    if (!user?.token) {
      setRefreshing(false);
      setActivationNote('Please sign in again to activate your Premium plan.');
      return;
    }

    ranRef.current = true;

    const run = async () => {
      const token = user.token;
      const orderId =
        searchParams.get('order_id') ||
        sessionStorage.getItem(PENDING_ORDER_KEY);

      try {
        const statusCode = searchParams.get('status_code');
        const md5sig = searchParams.get('md5sig');
        if (orderId && statusCode && md5sig) {
          try {
            await completePayment(token, {
              order_id: orderId,
              status_code: statusCode,
              md5sig,
              merchant_id: searchParams.get('merchant_id') ?? undefined,
              payhere_amount: searchParams.get('payhere_amount') ?? undefined,
              payhere_currency: searchParams.get('payhere_currency') ?? undefined,
            });
          } catch (e) {
            console.warn('Payment complete (signed return):', e);
          }
        } else if (orderId) {
          try {
            await activateCheckout(token, orderId);
          } catch (e) {
            console.warn('Activate checkout:', e);
          }
        }

        const maxAttempts = 10;
        const delayMs = 1500;
        let resolvedPlan: string | undefined;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const data = await getPlanStatus(token);
            resolvedPlan = data.plan;
            await refreshPlan();
          } catch (e) {
            console.error('Failed to refresh plan:', e);
          }

          if (resolvedPlan === 'premium') {
            setIsPremium(true);
            setActivationNote(null);
            break;
          }

          if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }

        if (resolvedPlan !== 'premium') {
          const final = await getPlanStatus(token).catch(() => null);
          const premium = final?.plan === 'premium';
          setIsPremium(premium);
          if (!premium) {
            setActivationNote(
              orderId
                ? 'Payment received. Premium may take a moment — tap below to check again.'
                : 'Missing order reference. Go back to Pricing and try Upgrade again without refreshing during checkout.'
            );
          }
        }

        if (resolvedPlan === 'premium') {
          sessionStorage.removeItem(PENDING_ORDER_KEY);
          sessionStorage.removeItem('trakkit_payment_source');
        }
      } finally {
        setRefreshing(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount when token is ready
  }, [user?.token]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {refreshing ? (
          <>
            <Loader2 size={56} className={styles.spin} style={{ color: '#b9375d', marginBottom: '1.5rem' }} />
            <h1 className={styles.title}>Activating your Premium plan…</h1>
            <p className={styles.subtitle}>Please wait while we confirm your payment.</p>
          </>
        ) : isPremium ? (
          <>
            <div className={styles.iconCircle}>
              <CheckCircle size={40} color="white" />
            </div>
            <h1 className={styles.title}>You&apos;re now Premium!</h1>
            <p className={styles.subtitle}>
              Welcome, <strong>{user?.firstName || 'Trakkit user'}</strong>! Your Premium features are now active.
            </p>

            {isFromMobile ? (
              <div className={styles.appNote}>
                <Smartphone size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Close this browser and return to the Trakkit app. Your account will update automatically.
                </span>
              </div>
            ) : null}

            <ul className={styles.featureList}>
              {[
                'Unlimited document uploads',
                'Family sharing for warranties, subscriptions, reminders & to-dos',
                'Sync with Google Calendar',
              ].map((f, i) => (
                <li key={i} className={styles.featureItem}>
                  <CheckCircle size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>

            {isFromMobile ? (
              <button type="button" className={styles.primaryBtn} onClick={() => navigate('/pricing')}>
                Done
              </button>
            ) : (
              <button type="button" className={styles.primaryBtn} onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </button>
            )}
          </>
        ) : (
          <>
            <AlertCircle size={56} style={{ color: '#F59E0B', marginBottom: '1.5rem' }} />
            <h1 className={styles.title}>Almost there…</h1>
            <p className={styles.subtitle}>{activationNote}</p>
            <button
              type="button"
              className={styles.outlineBtn}
              onClick={async () => {
                if (!user?.token) return;
                setRefreshing(true);
                const retryOrderId =
                  searchParams.get('order_id') || sessionStorage.getItem(PENDING_ORDER_KEY);
                if (retryOrderId) {
                  try {
                    await activateCheckout(user.token, retryOrderId);
                  } catch (e) {
                    console.warn(e);
                  }
                }
                const data = await getPlanStatus(user.token);
                await refreshPlan();
                setIsPremium(data.plan === 'premium');
                setRefreshing(false);
              }}
            >
              Check activation again
            </button>
            <button
              type="button"
              className={`${styles.textBtn} ${styles.textBtnPlain}`}
              onClick={() => navigate('/pricing')}
            >
              Back to pricing
            </button>
          </>
        )}
      </div>
    </div>
  );
}
