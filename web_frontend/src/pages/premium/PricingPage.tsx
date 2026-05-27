import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CheckoutLayout from '../../components/CheckoutLayout';
import styles from './PricingPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { initiatePayment, type PaymentInitData } from '../../api/payment';
import {
  Zap,
  Check,
  X,
  Star,
  Shield,
  Loader2,
  Upload,
  Users,
  Calendar,
  Bell,
  Smartphone,
} from 'lucide-react';

// PayHere sandbox URL — switch to live URL after academic submission
const PAYHERE_CHECKOUT_URL = 'https://sandbox.payhere.lk/pay/checkout';

// Remove these — they are now returned by the backend
// const frontendUrl = ...

const FREE_FEATURES = [
  { icon: Upload, text: 'Up to 10 document uploads', included: true },
  { icon: Bell,   text: 'Personal reminders & notifications', included: true },
  { icon: Users,  text: 'Family sharing mode', included: false },
  { icon: Calendar, text: 'Google Calendar sync', included: false },
];

const PREMIUM_FEATURES = [
  { icon: Upload,   text: 'Unlimited document uploads', included: true },
  { icon: Bell,     text: 'Personal reminders & notifications', included: true },
  { icon: Users,    text: 'Family sharing for warranties, subscriptions, reminders & to-dos', included: true },
  { icon: Calendar, text: 'Sync all events to your Google Calendar (Gmail)', included: true },
];

export default function PricingPage() {
  const { user, refreshPlan } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user?.token) refreshPlan();
    if (searchParams.get('source') === 'mobile') {
      sessionStorage.setItem('trakkit_payment_source', 'mobile');
    } else {
      sessionStorage.removeItem('trakkit_payment_source');
    }
  }, [user?.token, refreshPlan, searchParams]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentInitData | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isPremium = user?.plan === 'premium';

  const handleUpgrade = async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await initiatePayment(user.token);
      setPaymentData(data);
      sessionStorage.setItem('trakkit_pending_order_id', data.order_id);

      // Small timeout so React renders the hidden form before we submit it
      setTimeout(() => {
        formRef.current?.submit();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <CheckoutLayout>
      <div className={styles.pageWrapper}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Star size={12} />
            One-Time Upgrade
          </div>
          <h1 className={styles.title}>
            Simple, honest<br />
            <span>pricing for everyone</span>
          </h1>
          <p className={styles.subtitle}>
            Unlock the full power of Trakkit with a single one-time payment.
            No subscriptions. No hidden fees. Yours forever.
          </p>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className={styles.errorBanner}>
            ⚠️ {error}
          </div>
        )}


        <div className={styles.cardsGrid}>

          {/* Free Card */}
          <div className={`${styles.card} ${styles.freeCard}`}>
            <div className={`${styles.planIcon} ${styles.freeIcon}`}>
              <Shield size={24} />
            </div>
            <h2 className={styles.planName}>Free Plan</h2>
            <p className={styles.planDesc}>Everything you need to get started tracking your important items.</p>
            <div className={styles.priceRow}>
              <span className={styles.currency}>LKR</span>
              <span className={styles.amount}>0</span>
              <span className={styles.period}>/ forever</span>
            </div>
            <ul className={styles.featuresList}>
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className={styles.featureItem}>
                  {f.included
                    ? <Check size={16} className={`${styles.featureIcon} ${styles.checkIcon}`} />
                    : <X size={16} className={`${styles.featureIcon} ${styles.xIcon}`} />
                  }
                  <span className={f.included ? '' : styles.lockedText}>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className={styles.freeBtn}>
              {isPremium ? 'Previous Plan' : '✓ Your Current Plan'}
            </div>
          </div>

          {/* Premium Card */}
          <div className={`${styles.card} ${styles.premiumCard}`}>
            <div className={styles.popularBadge}>Best Value</div>
            <div className={`${styles.planIcon} ${styles.premiumIcon}`}>
              <Zap size={24} />
            </div>
            <h2 className={styles.planName}>Premium Plan</h2>
            <p className={styles.planDesc}>Unlimited uploads, family sharing, and Google Calendar sync.</p>
            <div className={styles.priceRow}>
              <span className={styles.currency}>LKR</span>
              <span className={styles.amount}>999</span>
              <span className={styles.period}>/ one-time</span>
            </div>
            <ul className={styles.featuresList}>
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={i} className={styles.featureItem}>
                  <Check size={16} className={`${styles.featureIcon} ${styles.checkIcon}`} />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className={styles.alreadyPremiumBtn}>
                <Check size={18} />
                You're on Premium 🎉
              </div>
            ) : (
              <button
                id="upgrade-btn"
                className={styles.upgradeBtn}
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={18} className="spin" /> Redirecting to PayHere…</>
                ) : (
                  <><Zap size={18} /> Upgrade Now — LKR 999</>
                )}
              </button>
            )}
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.guaranteeNote}>
          <Shield size={16} />
          Secured by PayHere · Safe &amp; encrypted checkout
        </div>

        <div className={styles.mobileNote}>
          <Smartphone size={16} />
          <p>
            Opened from the Trakkit app? After payment, close this browser and return to the app —
            Premium updates automatically.
          </p>
        </div>

        {/* ── Hidden PayHere Form ── */}
        {/* PayHere works by submitting a standard HTML form to their URL.
            We build the form in React state after getting data from our backend. */}
        {paymentData && (
          <form
            ref={formRef}
            method="post"
            action={PAYHERE_CHECKOUT_URL}
            className={styles.hiddenForm}
          >
            <input type="hidden" name="merchant_id"   value={paymentData.merchant_id} />
            <input type="hidden" name="return_url"    value={paymentData.return_url} />
            <input type="hidden" name="cancel_url"    value={paymentData.cancel_url} />
            <input type="hidden" name="notify_url"    value={paymentData.notify_url} />
            <input type="hidden" name="order_id"      value={paymentData.order_id} />
            <input type="hidden" name="items"         value={paymentData.items} />
            <input type="hidden" name="currency"      value={paymentData.currency} />
            <input type="hidden" name="amount"        value={paymentData.amount} />
            <input type="hidden" name="hash"          value={paymentData.hash} />
            <input type="hidden" name="custom_1"      value={paymentData.userId} />
            <input type="hidden" name="first_name"    value={user?.firstName || ''} />
            <input type="hidden" name="last_name"     value={user?.lastName || ''} />
            <input type="hidden" name="email"         value={user?.email?.includes('@') ? user.email : 'customer@trakkit.app'} />
            <input type="hidden" name="phone"         value={(user?.phone || '0770000000').replace(/\s/g, '')} />
            <input type="hidden" name="address"       value="N/A" />
            <input type="hidden" name="city"          value="Colombo" />
            <input type="hidden" name="country"       value="Sri Lanka" />
          </form>
        )}
      </div>
    </CheckoutLayout>
  );
}
