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

  // When the pricing page is opened from the mobile app, show it publicly so the user
  // can review the plans first. The "Upgrade Now" button (in PricingPage) gates the
  // actual payment behind a fresh login — we deliberately skip every auth/profile check
  // here so a logged-out (or stale-session) mobile visitor still sees the page.
  const isMobileUpgrade =
    location.pathname === '/pricing' && location.search.includes('source=mobile');

  if (isMobileUpgrade) {
    return <>{children}</>;
  }

  if (!user) {
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

  // Block access until user has explicitly saved notification settings (first-time setup)
  if (
    user.profileCompleted === true &&
    user.emailVerified !== false &&
    user.settingsCompleted === false &&
    location.pathname !== "/settings"
  ) {
    return <Navigate to="/settings?firstSetup=true" replace />;
  }

  return <>{children}</>;
}
