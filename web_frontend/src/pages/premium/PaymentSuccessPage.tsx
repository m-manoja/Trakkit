import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { activateCheckout, completePayment, getPlanStatus } from '../../api/payment';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const PENDING_ORDER_KEY = 'trakkit_pending_order_id';

export default function PaymentSuccessPage() {
  const { refreshPlan, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refreshing, setRefreshing] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [activationNote, setActivationNote] = useState<string | null>(null);
  const ranRef = useRef(false);

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
        // If PayHere ever sends signed params on return URL, verify them first.
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
          // PayHere success redirect — no query params; activate via stored order id.
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
              'Payment received. Premium may take a moment — tap below to check again, or refresh the page.'
            );
          }
        }
      } finally {
        sessionStorage.removeItem(PENDING_ORDER_KEY);
        setRefreshing(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount when token is ready
  }, [user?.token]);

  useEffect(() => {
    if (!refreshing && isPremium) {
      const timer = setTimeout(() => navigate('/dashboard'), 4000);
      return () => clearTimeout(timer);
    }
  }, [refreshing, isPremium, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fdf2f5 0%, #fff 60%)',
      padding: '2rem',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 8px 48px rgba(185, 55, 93, 0.12)',
        border: '1px solid rgba(185, 55, 93, 0.1)',
      }}>

        {refreshing ? (
          <>
            <Loader2 size={56} style={{ color: '#b9375d', animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2937', margin: '0 0 0.75rem' }}>
              Activating your Premium plan…
            </h1>
            <p style={{ color: '#6B7280', fontSize: '0.95rem', margin: 0 }}>
              Please wait while we confirm your payment.
            </p>
          </>
        ) : isPremium ? (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #b9375d, #e05c85)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 24px rgba(185, 55, 93, 0.35)',
            }}>
              <CheckCircle size={40} color="white" />
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1F2937', margin: '0 0 0.75rem', letterSpacing: '-0.5px' }}>
              You&apos;re now Premium!
            </h1>
            <p style={{ color: '#6B7280', fontSize: '0.975rem', lineHeight: 1.6, margin: '0 0 0.5rem' }}>
              Welcome, <strong>{user?.firstName || 'Trakkit user'}</strong>! Your Premium features are now active.
            </p>
            <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: '0 0 2rem' }}>
              Redirecting to your dashboard in a few seconds…
            </p>

            <ul style={{ textAlign: 'left', listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                'Unlimited document uploads',
                'Family sharing for warranties, subscriptions, reminders & to-dos',
                'Sync with Google Calendar',
              ].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem', color: '#374151' }}>
                  <CheckCircle size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #b9375d, #e05c85)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(185, 55, 93, 0.35)',
              }}
            >
              Go to Dashboard →
            </button>
          </>
        ) : (
          <>
            <AlertCircle size={56} style={{ color: '#F59E0B', marginBottom: '1.5rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2937', margin: '0 0 0.75rem' }}>
              Almost there…
            </h1>
            <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              {activationNote}
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!user?.token) return;
                setRefreshing(true);
                const orderId = sessionStorage.getItem(PENDING_ORDER_KEY);
                if (orderId) {
                  try {
                    await activateCheckout(user.token, orderId);
                  } catch (e) {
                    console.warn(e);
                  }
                }
                const data = await getPlanStatus(user.token);
                await refreshPlan();
                setIsPremium(data.plan === 'premium');
                setRefreshing(false);
              }}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'white',
                color: '#b9375d',
                border: '2px solid #b9375d',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                marginBottom: '0.75rem',
              }}
            >
              Check activation again
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'transparent',
                color: '#6B7280',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Continue to dashboard
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
