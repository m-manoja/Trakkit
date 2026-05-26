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

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
