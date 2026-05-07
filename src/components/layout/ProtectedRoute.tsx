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
    const defaultRoutes = {
  admin: "/admin/users",
  auditor: "/auditor/setup",
  user: "/user/upload",
};

return (
  <Navigate
    to={defaultRoutes[user.role as keyof typeof defaultRoutes]}
    replace
  />
);
  }

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      <Sidebar role={user.role as "admin" | "auditor" | "user"} onLogout={logout} />
      <main className="flex-1 overflow-y-auto">

  {/* TOPBAR */}
  <div className="flex items-center justify-between border-b bg-white px-6 py-4">

    <div>
      <h1 className="text-lg font-semibold text-gray-900 capitalize">
        {user.role} Portal
      </h1>

      <p className="text-sm text-gray-500">
        AI Assisted Audit Platform
      </p>
    </div>

    <div className="text-right">

      <p className="text-sm font-medium text-gray-900">
        {user.name}
      </p>

      <p className="text-xs text-gray-500">
        {user.email}
      </p>

    </div>

  </div>

  {/* PAGE CONTENT */}
  <div className="p-4 md:p-8">
    <Outlet />
  </div>

</main>
    </div>
  );
}
