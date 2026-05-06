import { Navigate, Outlet } from "react-router-dom"
import { useAuth, Role } from "@/context/AuthContext"
import { Sidebar } from "@/components/layout/Sidebar"

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard based on their role
    return <Navigate to={`/${user.role}`} replace />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar role={user.role as "admin" | "auditor" | "user"} onLogout={logout} />
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
