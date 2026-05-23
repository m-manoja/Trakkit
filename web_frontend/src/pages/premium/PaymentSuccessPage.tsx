import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const { refreshPlan, user } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    // As soon as this page loads, refresh the plan from the server.
    // The webhook may have already upgraded the plan by now.
    const activate = async () => {
      try {
        await refreshPlan();
      } catch (e) {
        console.error('Failed to refresh plan on success page:', e);
      } finally {
        setRefreshing(false);
      }
    };

    activate();
  }, []);

  // Auto-redirect to dashboard after 4 seconds
  useEffect(() => {
    if (!refreshing) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [refreshing, navigate]);

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
        ) : (
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
              You're now Premium! 🎉
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
                'Share reminders with family',
                'Google Calendar sync',
              ].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem', color: '#374151' }}>
                  <CheckCircle size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>

            <button
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
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
