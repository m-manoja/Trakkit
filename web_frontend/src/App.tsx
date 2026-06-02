import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { TimezoneProvider } from "./context/TimezoneContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import LoginPage from "./pages/auth/LoginPage";
import EmailLoginPage from "./pages/auth/EmailLoginPage";
import OTPVerificationPage from "./pages/auth/OTPVerificationPage";
import ProfileSetupPage from "./pages/auth/ProfileSetupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import VerifyEmailPendingPage from "./pages/auth/VerifyEmailPendingPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import WarrantiesPage from "./pages/warranties/WarrantiesPage";
import SubscriptionsPage from "./pages/subscriptions/SubscriptionsPage";
import RemindersPage from "./pages/reminders/RemindersPage";
import TodosPage from "./pages/todos/TodosPage";
import SettingsPage from "./pages/settings/SettingsPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import PricingPage from "./pages/premium/PricingPage";
import PaymentSuccessPage from "./pages/premium/PaymentSuccessPage";
import PaymentCancelPage from "./pages/premium/PaymentCancelPage";
import AdminPortalPage from "./pages/admin/AdminPortalPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";

import { AlertProvider } from "./context/AlertContext";

export default function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
      <TimezoneProvider>
      <AlertProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/email" element={<EmailLoginPage />} />
          <Route path="/verify-otp" element={<OTPVerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/verify-email-pending"
            element={
              <ProtectedRoute>
                <VerifyEmailPendingPage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/profile_setup"
            element={
              <ProtectedRoute>
                <ProfileSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warranties"
            element={
              <ProtectedRoute>
                <WarrantiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <SubscriptionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reminders"
            element={
              <ProtectedRoute>
                <RemindersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/todos"
            element={
              <ProtectedRoute>
                <TodosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <PricingPage />
              </ProtectedRoute>
            }
          />

          {/* Admin portal — fully separate auth, its own login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPortalPage />
              </AdminRoute>
            }
          />

          {/* Payment result pages — no sidebar, standalone pages */}
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/cancel"
            element={
              <ProtectedRoute>
                <PaymentCancelPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </AlertProvider>
      </TimezoneProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}
