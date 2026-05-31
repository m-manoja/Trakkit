import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateProfile, setBackupPassword } from "../../api/users";
import { sendEmailVerification } from "../../api/auth";
import { Eye, EyeOff } from "lucide-react";
import styles from "./ProfileSetupPage.module.css";

export default function ProfileSetupPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isFirstSetup = new URLSearchParams(location.search).get("isFirstSetup") === "true";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const isValidName = (v: string) => v.trim().length >= 2 && /^[A-Za-z\s'-]+$/.test(v.trim());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both first and last name.");
      return;
    }
    if (!isValidName(firstName)) {
      setError("First name must be at least 2 characters and contain only letters.");
      return;
    }
    if (!isValidName(lastName)) {
      setError("Last name must be at least 2 characters and contain only letters.");
      return;
    }
    if (!user?.id || !user?.token) {
      setError("Not authenticated.");
      return;
    }

    if (isFirstSetup) {
      if (!email.trim()) {
        setError("Email is required for account recovery.");
        return;
      }
      if (!isValidEmail(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      if (!password) {
        setError("Password is required.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      await updateProfile({
        userId: user.id,
        firstName,
        lastName,
        email,
      }, user.token);

      if (isFirstSetup && password) {
        await setBackupPassword(email.trim(), password, user.token);
      }

      setUser({ ...user, firstName, lastName, email, profileCompleted: true, emailVerified: false });

      if (email.trim()) {
        sendEmailVerification(user.token, email.trim(), "link").catch(() => {});
      }

      navigate("/verify-email-pending", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Complete Your Profile</h1>
          <p className={styles.subtitle}>
            {isFirstSetup ? "Welcome! Let's get to know you." : "Please update your details."}
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.label}>First Name *</label>
            <input
              type="text"
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. John"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Last Name *</label>
            <input
              type="text"
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Doe"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{isFirstSetup ? "Email Address (Recovery Email) *" : "Email Address (Optional)"}</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={!isFirstSetup}
              title={!isFirstSetup ? "Please use the Settings page to change your email" : ""}
            />
            {!isFirstSetup && (
              <p className="profile-setup-note">
                Use the Settings page to update your email.
              </p>
            )}
          </div>

          {isFirstSetup && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Account Recovery Password *</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.passwordInput}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Confirm Recovery Password *</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.passwordInput}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
              </div>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner}></span> : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
