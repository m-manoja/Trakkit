import React from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import styles from "./ProtectedRoute.module.css";

interface AdminRouteProps {
  children: React.ReactNode;
}

// Gates admin pages behind a standalone admin session (separate from users).
export default function AdminRoute({ children }: AdminRouteProps) {
  const { adminToken, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (!adminToken) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
