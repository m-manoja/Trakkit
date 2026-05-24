import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { emailLogin } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { normalizePlan } from "../../utils/plan";
import styles from "./EmailLoginPage.module.css";

export default function EmailLoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await emailLogin(email.trim(), password);
      const { token, user } = response;

      setUser({
        id: user.id,
        phone: user.phone,
        token,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        plan: normalizePlan(user.plan),
      });

      navigate("/dashboard", { replace: true });
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Incorrect email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className={styles.page}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        {/* Back */}
        <button className={styles.backRow} onClick={() => navigate("/login")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Phone Login
        </button>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconCircle}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h1 className={styles.title}>Backup Login</h1>
          <p className={styles.subtitle}>
            Sign in with your backup email &amp; password if you no longer have access to your phone number.
          </p>
        </div>

        {/* Form */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email-input">Email address</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                id="email-input"
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password-input">Password</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="password-input"
                className={styles.input}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            id="email-signin-btn"
            className={styles.loginBtn}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : null}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>

        <p className={styles.hint}>
          Don't have backup login set up? Sign in with your phone number and add it from your profile.
        </p>
      </div>
    </div>
  );
}
