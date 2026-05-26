import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { sendEmailVerification } from "../../api/auth";
import { getProfile, type UserProfile } from "../../api/users";
import styles from "./VerifyEmailPendingPage.module.css";

export default function VerifyEmailPendingPage() {
  const navigate = useNavigate();
  const { user, setUser, signOut } = useAuth();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  const email = user?.email ?? "";

  const handleResend = async () => {
    if (!user?.token || !email) return;
    setResending(true);
    setResent(false);
    try {
      await sendEmailVerification(user.token, email);
      setResent(true);
    } catch {
      // silently ignore — email service error
    } finally {
      setResending(false);
    }
  };

  const handleContinue = async () => {
    if (!user?.token) return;
    setChecking(true);
    setNotYet(false);
    try {
      const profile = await getProfile(user.token) as UserProfile & { email_verified?: boolean };
      if (profile?.email_verified) {
        setUser({ ...user, emailVerified: true });
        navigate("/dashboard", { replace: true });
      } else {
        setNotYet(true);
      }
    } catch {
      setNotYet(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        <div className={styles.iconCircle}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>

        <h1 className={styles.title}>Verify your email</h1>

        <p className={styles.subtitle}>
          We sent a verification link to
        </p>
        <p className={styles.email}>{email || "your email address"}</p>
        <p className={styles.subtitle}>
          Open that email and click the link to continue to your dashboard.
        </p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <span>Open your email inbox</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <span>Find the email from <strong>Trakkit</strong></span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <span>Click <strong>"Verify Email"</strong> in that email</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>4</span>
            <span>Come back here and click Continue</span>
          </div>
        </div>

        {notYet && (
          <p className={styles.notYet}>
            Your email is not verified yet. Please click the link in the email first, then try again.
          </p>
        )}

        <button
          type="button"
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={checking}
        >
          {checking ? <span className={styles.spinner} /> : null}
          {checking ? "Checking…" : "I've verified — Continue to Dashboard"}
        </button>

        <div className={styles.resendRow}>
          <span>Didn't receive the email?</span>
          <button
            type="button"
            className={styles.resendBtn}
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Sending…" : resent ? "Sent!" : "Resend"}
          </button>
        </div>

        <button
          type="button"
          className={styles.signOutBtn}
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
