import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendOTP } from "../../api/auth";
import styles from "./LoginPage.module.css";
import logo from "../../assets/icon.png";

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
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from;

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
      navigate("/verify-otp", { state: { phone: fullPhone, from: returnTo } });
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
          <img src={logo} alt="Trakkit" className={styles.logoImg} />
          <h1 className={styles.appName}>Trakkit</h1>
          <p className={styles.tagline}>Your personal life manager</p>
        </div>

        {/* Form */}
        <div className={styles.formSection}>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>
            {returnTo === '/pricing'
              ? 'Sign in with the same phone number as the Trakkit app to continue checkout.'
              : 'Enter your phone number to receive a verification code'}
          </p>

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

          <p className={styles.hint}>
            <button type="button" className={styles.lostPhoneLink} onClick={() => navigate("/login/email")}>
              Lost your phone number?
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
