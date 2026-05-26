import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmEmailVerification } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import styles from "./VerifyEmailPage.module.css";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { user, setUser } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Invalid verification link.");
      return;
    }
    confirmEmailVerification(token)
      .then(() => {
        if (user) setUser({ ...user, emailVerified: true });
        setStatus("success");
      })
      .catch((e: unknown) => {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "Verification failed.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className={styles.page}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        {status === "loading" && (
          <>
            <div className={styles.iconCircle}>
              <span className={styles.spinner} />
            </div>
            <h1 className={styles.title}>Verifying your email…</h1>
            <p className={styles.subtitle}>Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className={styles.iconCircleSuccess}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className={styles.title}>Email Verified!</h1>
            <p className={styles.subtitle}>Your email address has been confirmed. You're all set.</p>
            <button
              type="button"
              className={styles.btn}
              onClick={() => navigate("/dashboard", { replace: true })}
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className={styles.iconCircleError}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 className={styles.title}>Verification Failed</h1>
            <p className={styles.subtitle}>{errorMsg}</p>
            <button
              type="button"
              className={styles.btn}
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
