import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { setBackupPassword, dismissBackupPrompt } from "../api/users";
import { ShieldCheck, Mail, Lock, Eye, EyeOff } from "lucide-react";
import styles from "./BackupPasswordPrompt.module.css";

interface Props {
  visible: boolean;
  onDone: () => void;
}

export default function BackupPasswordPrompt({ visible, onDone }: Props) {
  const { user } = useAuth();
  const token = user?.token || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  if (!visible) return null;

  const handleSave = async () => {
    if (!email.trim()) {
      alert("Please enter an email address.");
      return;
    }
    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await setBackupPassword(email.trim(), password, token);
      alert("✅ Backup login set! You can now log in with your email & password if you lose access to your phone.");
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save backup login.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await dismissBackupPrompt(token);
    } catch {
      // silent
    } finally {
      setDismissing(false);
      onDone();
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconCircle}>
          <ShieldCheck size={32} color="#DC2626" />
        </div>
        <h2 className={styles.title}>Secure your account</h2>
        <p className={styles.subtitle}>
          Add a backup email & password so you can still log in if you ever lose access to your phone number.
        </p>

        <div className={styles.formGroup}>
          <label className={styles.label}>Backup email</label>
          <div className={styles.inputWrapper}>
            <Mail size={16} color="#9CA3AF" />
            <input
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <div className={styles.inputWrapper}>
            <Lock size={16} color="#9CA3AF" />
            <input
              type={showPass ? "text" : "password"}
              className={styles.input}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Confirm password</label>
          <div className={styles.inputWrapper}>
            <Lock size={16} color="#9CA3AF" />
            <input
              type={showPass ? "text" : "password"}
              className={styles.input}
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <button
          className={styles.primaryBtn}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <span className={styles.spinner}></span> : "Set Backup Login"}
        </button>

        <button
          className={styles.skipBtn}
          onClick={handleDismiss}
          disabled={dismissing}
        >
          {dismissing ? "Skipping..." : "Skip for now"}
        </button>
      </div>
    </div>
  );
}
