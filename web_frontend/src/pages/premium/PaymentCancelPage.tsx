import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
      padding: '2rem',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        border: '1px solid #E5E7EB',
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          background: '#FEF2F2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <XCircle size={36} style={{ color: '#EF4444' }} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2937', margin: '0 0 0.75rem', letterSpacing: '-0.5px' }}>
          Payment Cancelled
        </h1>
        <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
          No worries — your payment was not completed and you have not been charged.
          You can try again whenever you're ready.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/pricing')}
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
              boxShadow: '0 4px 16px rgba(185, 55, 93, 0.3)',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'transparent',
              color: '#6B7280',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
