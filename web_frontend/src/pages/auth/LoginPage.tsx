import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOTP } from "../../api/auth";
import styles from "./LoginPage.module.css";

// Simple international phone input with country code select
const POPULAR_COUNTRIES = [
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1",  flag: "🇺🇸", name: "USA / Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
];

export default function LoginPage() {
  const navigate = useNavigate();

  const [countryCode, setCountryCode] = useState("+94");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError("");
    setLoading(true);

    const fullPhone = `${countryCode}${cleanNumber}`;

    try {
      await sendOTP(fullPhone);
      navigate("/verify-otp", { state: { phone: fullPhone } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  const selectedCountry = POPULAR_COUNTRIES.find((c) => c.code === countryCode);

  return (
    <div className={styles.page}>
      {/* Decorative blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.logoRing}>
            <span className={styles.logoEmoji}>📋</span>
          </div>
          <h1 className={styles.appName}>Trakkit</h1>
          <p className={styles.tagline}>Your personal life manager</p>
        </div>

        {/* Form */}
        <div className={styles.formSection}>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Enter your phone number to receive a verification code</p>

          <label className={styles.label}>Phone Number</label>
          <div className={styles.phoneRow}>
            <select
              className={styles.countrySelect}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              aria-label="Country code"
            >
              {POPULAR_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input
              id="phone-input"
              className={styles.phoneInput}
              type="tel"
              placeholder="77 123 4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {selectedCountry && (
            <p className={styles.countryHint}>{selectedCountry.flag} {selectedCountry.name} ({selectedCountry.code})</p>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            id="send-otp-btn"
            className={styles.primaryBtn}
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : null}
            {loading ? "Sending…" : "Send Verification Code"}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            id="email-login-btn"
            className={styles.secondaryBtn}
            onClick={() => navigate("/login/email")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Login with Email instead
          </button>

          <p className={styles.hint}>
            Lost your SIM? Use your backup email &amp; password to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
