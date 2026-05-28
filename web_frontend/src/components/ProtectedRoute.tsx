import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./ProtectedRoute.module.css";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.spinner} />
      </div>
    );
  }

  const fullPath = location.pathname + location.search;

  // When the pricing page is opened from the mobile app, always require a fresh login
  // even if a stale web session exists in localStorage. The flag is set by OTPVerificationPage
  // after the user successfully authenticates for this mobile upgrade session.
  const isMobileUpgrade =
    location.pathname === '/pricing' && location.search.includes('source=mobile');

  if (!user || (isMobileUpgrade && !sessionStorage.getItem('trakkit_mobile_login_done'))) {
    return <Navigate to="/login" replace state={{ from: fullPath }} />;
  }

  // Block access until profile is complete
  if (user.profileCompleted === false && location.pathname !== "/profile_setup") {
    return <Navigate to="/profile_setup?isFirstSetup=true" replace />;
  }

  // Block access until email is verified (only after profile is done)
  if (
    user.profileCompleted === true &&
    user.emailVerified === false &&
    location.pathname !== "/verify-email-pending"
  ) {
    return <Navigate to="/verify-email-pending" replace />;
  }

  return <>{children}</>;
}
