import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { StatusScreen } from "@/components/StatusScreen";
import { useAuth } from "@/hooks/useAuth";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { SetupPage } from "@/pages/SetupPage";
import { TicketCreatePage } from "@/pages/TicketCreatePage";
import { TicketDetailPage } from "@/pages/TicketDetailPage";
import { TicketListPage } from "@/pages/TicketListPage";

function ProtectedRoute({ children }) {
  const { configured, session, loading } = useAuth();
  if (!configured) return <Navigate to="/setup" replace />;
  if (loading) return <StatusScreen title="Checking your session" />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { hasRole } = useAuth();
  if (!hasRole("administrator")) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="tickets" element={<TicketListPage />} />
        <Route path="tickets/new" element={<TicketCreatePage />} />
        <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
