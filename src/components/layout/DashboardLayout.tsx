import React from "react";
import { useNavigate } from "react-router-dom";

import { Sidebar } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {

  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        No user session found.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* SIDEBAR */}
      <Sidebar
        role={user.role as "admin" | "auditor" | "user"}
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>

    </div>
  );
}