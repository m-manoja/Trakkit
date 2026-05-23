import React, { useState, useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyOTP, sendOTP } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import BackupPasswordPrompt from "../../components/BackupPasswordPrompt";
import styles from "./OTPVerification.module.css";

const OTP_LENGTH = 6;

export default function OTPVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const phone: string = location.state?.phone ?? "";

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown timer
  React.useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const handleChange = (idx: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = [...digits];
    text.split("").forEach((ch, i) => (next[i] = ch));
    setDigits(next);
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const code = digits.join("");

  const handleVerify = async () => {
    if (code.length < OTP_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await verifyOTP(phone, code);
      const { token, user } = response;

      setUser({
        id: user.id,
        phone: user.phone,
        token,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        plan: user.plan === 'premium' ? 'premium' : 'free',
      });

      const backupPromptShown = (user as any).backupPromptShown ?? true;
      let target = response.nextScreen;
      
      if (!target || target === '/dashboard' || target === '/index' || target === '/(tabs)') {
        target = '/dashboard';
      }
      if (target === '/profile_setup') {
        target = '/profile_setup?isFirstSetup=true';
      }

      if (!backupPromptShown) {
        setPendingRoute(target);
        setShowBackupPrompt(true);
      } else {
        navigate(target, { replace: true });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      await sendOTP(phone);
      setTimer(30);
      setCanResend(false);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = phone ? phone.replace(/(\+\d{2})\d+(\d{4})/, "$1 •••• $2") : "your phone";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91A16 16 0 0 0 15 15.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>

        <h1 className={styles.title}>Verify Your Phone</h1>
        <p className={styles.subtitle}>
          We sent a 6-digit code to <strong>{maskedPhone}</strong>
        </p>

        <div className={styles.otpRow}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              className={`${styles.otpBox} ${d ? styles.filled : ""}`}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.verifyBtn}
          onClick={handleVerify}
          disabled={loading || code.length < OTP_LENGTH}
        >
          {loading ? <span className={styles.spinner} /> : "Verify & Continue"}
        </button>

        <button
          className={`${styles.resendBtn} ${canResend ? styles.resendActive : ""}`}
          onClick={handleResend}
          disabled={!canResend || loading}
        >
          {canResend ? "Resend Code" : `Resend in ${timer}s`}
        </button>

        <button
          className={styles.backBtn}
          onClick={() => navigate("/login")}
        >
          ← Change phone number
        </button>
      </div>

      <BackupPasswordPrompt
        visible={showBackupPrompt}
        onDone={() => {
          setShowBackupPrompt(false);
          if (pendingRoute) {
            navigate(pendingRoute, { replace: true });
          }
        }}
      />
    </div>
  );
}
