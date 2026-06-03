import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
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

const FREE_FEATURES = [
  { icon: Upload,   text: 'Up to 10 document uploads',       included: true },
  { icon: Bell,     text: 'Personal reminders & notifications', included: true },
  { icon: Users,    text: 'Family sharing mode',             included: false },
  { icon: Calendar, text: 'Google Calendar sync',            included: false },
];

const PREMIUM_FEATURES = [
  { icon: Upload,   text: 'Unlimited document uploads' },
  { icon: Bell,     text: 'Personal reminders & notifications' },
  { icon: Users,    text: 'Family sharing for warranties, subscriptions, reminders & to-dos' },
  { icon: Calendar, text: 'Sync all events to your Google Calendar (Gmail)' },
];

export default function PricingPage() {
  const { user, refreshPlan } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isMobile = searchParams.get('source') === 'mobile';
  // A fresh login is required before a mobile visitor can pay. The flag is set by
  // OTPVerificationPage once they authenticate for this upgrade session.
  const mobileLoginDone = () => sessionStorage.getItem('trakkit_mobile_login_done') === '1';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentInitData | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // For the mobile-upgrade flow the browser may already hold a *different* user's
  // session (the phone's browser is logged in separately from the app). Until the
  // visitor logs in fresh as themselves, ignore that stale session so we never show
  // someone else's plan or skip the login gate. See handleUpgrade / mobileLoginDone.
  const effectiveUser = isMobile && !mobileLoginDone() ? null : user;
  const isPremium = effectiveUser?.plan === 'premium';

  useEffect(() => {
    // Only sync the plan when we trust the session (desktop, or a freshly
    // authenticated mobile visitor). Avoids fetching a stale account's plan.
    if (effectiveUser?.token) refreshPlan();
    if (isMobile) {
      sessionStorage.setItem('trakkit_payment_source', 'mobile');
    } else {
      sessionStorage.removeItem('trakkit_payment_source');
    }
  }, [effectiveUser?.token, refreshPlan, isMobile]);

  // Kick off the PayHere checkout. Assumes the user is authenticated.
  const startPayment = async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await initiatePayment(user.token);
      setPaymentData(data);
      sessionStorage.setItem('trakkit_pending_order_id', data.order_id);

      setTimeout(() => {
        formRef.current?.submit();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    // Mobile flow: force a fresh login before paying. Remember the intent so we can
    // resume checkout automatically once the user returns from the login screen.
    if (isMobile && (!user?.token || !mobileLoginDone())) {
      sessionStorage.setItem('trakkit_mobile_upgrade_intent', '1');
      navigate('/login', { state: { from: '/pricing?source=mobile' } });
      return;
    }
    startPayment();
  };

  // After a mobile visitor logs in, they land back here — resume checkout automatically.
  useEffect(() => {
    if (
      isMobile &&
      user?.token &&
      mobileLoginDone() &&
      !isPremium &&
      sessionStorage.getItem('trakkit_mobile_upgrade_intent') === '1'
    ) {
      sessionStorage.removeItem('trakkit_mobile_upgrade_intent');
      startPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume once when auth is ready
  }, [isMobile, user?.token, isPremium]);

  const body = (
      <div className={styles.pageWrapper}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Star size={11} />
            One-Time Upgrade · No Subscriptions
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

        {/* ── Cards Grid ── */}
        <div className={styles.cardsGrid}>

          {/* Free Card */}
          <div className={`${styles.card} ${styles.freeCard}`}>
            <div className={`${styles.planIcon} ${styles.freeIcon}`}>
              <Shield size={26} />
            </div>
            <h2 className={styles.planName}>Free Plan</h2>
            <p className={styles.planDesc}>
              Everything you need to get started tracking your important items.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.currency}>LKR</span>
              <span className={styles.amount}>0</span>
              <span className={styles.period}>/ forever</span>
            </div>
            <ul className={styles.featuresList}>
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className={styles.featureItem}>
                  {f.included
                    ? <Check size={14} className={`${styles.featureIcon} ${styles.checkIcon}`} />
                    : <X     size={14} className={`${styles.featureIcon} ${styles.xIcon}`} />
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
            <div className={styles.popularBadge}>⚡ Best Value</div>
            <div className={`${styles.planIcon} ${styles.premiumIcon}`}>
              <Zap size={26} />
            </div>
            <h2 className={styles.planName}>Premium Plan</h2>
            <p className={styles.planDesc}>
              Unlimited uploads, family sharing, and Google Calendar sync — forever.
            </p>
            <div className={styles.priceRow}>
              <span className={styles.currency}>LKR</span>
              <span className={styles.amount}>999</span>
              <span className={styles.period}>/ one-time</span>
            </div>
            <ul className={styles.featuresList}>
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={i} className={styles.featureItem}>
                  <Check size={14} className={`${styles.featureIcon} ${styles.checkIcon}`} />
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

        {searchParams.get('source') === 'mobile' && (
          <div className={styles.mobileNote}>
            <Smartphone size={16} />
            <p>
              Opened from the Trakkit app? After payment, close this browser and return to the app —
              Premium updates automatically.
            </p>
          </div>
        )}

        {/* ── Hidden PayHere Form ── */}
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
  );

  // Mobile upgrade flow: render a clean, standalone page (no app sidebar) so a
  // logged-out visitor isn't shown the authenticated app shell.
  if (isMobile) {
    return <div className={styles.standalonePage}>{body}</div>;
  }

  return <Layout>{body}</Layout>;
}
