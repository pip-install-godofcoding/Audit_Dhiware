import * as React from "react"
import { cn } from "@/lib/utils"
import { Link, useLocation } from "react-router-dom"
import { Shield, FileText, Settings, Users, LogOut, LayoutDashboard, Target, Activity } from "lucide-react"

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  role: "admin" | "auditor" | "user";
  onLogout: () => void;
}

export function Sidebar({ role, onLogout }: SidebarProps) {
  const location = useLocation();

  const auditorLinks: SidebarItem[] = [
    { name: "Audit Setup", href: "/auditor/setup", icon: Target },
    { name: "Live Progress", href: "/auditor/progress", icon: LayoutDashboard },
    { name: "Findings", href: "/auditor/findings", icon: Shield },
    { name: "Reports", href: "/auditor/reports", icon: FileText },
  ];

  const adminLinks: SidebarItem[] = [
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Settings", href: "/admin/settings", icon: Settings },
    { name: "History", href: "/admin/history", icon: FileText },
    { name: "System Health", href: "/admin/system-health", icon: Activity },
  ];

  const userLinks: SidebarItem[] = [
    { name: "Upload", href: "/user/upload", icon: FileText },
    { name: "My Documents", href: "/user/documents", icon: LayoutDashboard },
  ];

  const links = 
    role === "admin" ? adminLinks : 
    role === "auditor" ? auditorLinks : userLinks;

  return (
    <div className="hidden md:flex h-screen w-64 flex-col border-r border-white/10 bg-slate-900">
      <div className="p-6">
        <div className="flex items-center gap-3">
  
  <div className="bg-indigo-600 p-2 rounded-xl">
    <Shield className="h-5 w-5 text-white" />
  </div>

  <div>
    <h2 className="text-lg font-semibold tracking-tight text-white">
      TwinSecure
    </h2>

    <p className="text-xs text-gray-400">
      AI Audit Platform
    </p>
  </div>

</div>
        <p className="text-xs text-gray-400 mt-1 capitalize">{role} Portal</p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? ":bg-white/10 text-white" 
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  )
}
