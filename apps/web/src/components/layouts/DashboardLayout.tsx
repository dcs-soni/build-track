import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Clock,
  Search,
  Bell,
  BarChart3,
  FileText,
  Briefcase,
  HardHat,
  Receipt,
  FolderOpen,
  ShieldAlert,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/equipment", icon: HardHat, label: "Equipment" },
  { to: "/documents", icon: FolderOpen, label: "Documents" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
  { to: "/budget-analytics", icon: BarChart3, label: "Analytics" },
  { to: "/subcontractors", icon: Briefcase, label: "Contractors" },
  { to: "/daily-reports", icon: FileText, label: "Reports" },
  { to: "/safety-incidents", icon: ShieldAlert, label: "Safety" },
  { to: "/activity", icon: Clock, label: "Activity" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
];

const secondaryNavItems = [
  { to: "/settings/team", icon: Users, label: "Team" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: unreadData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60000,
  });
  const unreadCount = unreadData?.data?.data?.count ?? 0;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      {/* Ultra-Slim Obsidian Sidebar */}
      <aside className="w-64 bg-[#0A0A0A] border-r border-[#1A1A1A] flex flex-col">
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#3A3A3A] flex items-center justify-center">
              <span className="text-white font-medium text-lg tracking-tighter">
                B
              </span>
            </div>
            <div>
              <span className="text-white font-medium tracking-tight block">
                BuildTrack
              </span>
              <span className="text-[10px] tracking-[0.2em] text-[#4A5568] uppercase">
                Atrium
              </span>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-6 px-4">
          <p className="text-[10px] tracking-[0.2em] text-[#4A5568] uppercase px-3 mb-4">
            Navigation
          </p>
          <div className="space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-300 group ${
                    isActive
                      ? "text-[#A68B5B] bg-[#A68B5B]/5 border-l-2 border-[#A68B5B] -ml-px"
                      : "text-[#718096] hover:text-white hover:bg-white/[0.02]"
                  }`
                }
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="font-medium tracking-wide">{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[#1A1A1A]">
            <p className="text-[10px] tracking-[0.2em] text-[#4A5568] uppercase px-3 mb-4">
              System
            </p>
            <div className="space-y-1">
              {secondaryNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-300 ${
                      isActive
                        ? "text-[#A68B5B] bg-[#A68B5B]/5 border-l-2 border-[#A68B5B] -ml-px"
                        : "text-[#718096] hover:text-white hover:bg-white/[0.02]"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span className="font-medium tracking-wide">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[#1A1A1A]">
          <div className="flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors cursor-pointer group">
            <div className="w-9 h-9 border border-[#3A3A3A] flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-[#4A5568] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 mt-2 text-xs tracking-[0.1em] text-[#4A5568] hover:text-[#A68B5B] transition-colors uppercase"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Minimal */}
        <header className="h-16 bg-[#0A0A0A] border-b border-[#1A1A1A] flex items-center justify-between px-8">
          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
            <input
              type="text"
              placeholder="Search projects, reports..."
              className="w-full h-10 pl-8 pr-4 bg-transparent border-0 border-b border-[#1A1A1A] text-white text-sm placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors duration-500"
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-6">
            <NavLink
              to="/notifications"
              className="relative p-2 text-[#4A5568] hover:text-white transition-colors"
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#A68B5B] text-[10px] text-[#0A0A0A] flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="h-6 w-px bg-[#1A1A1A]" />

            <button
              onClick={() => navigate("/projects?create=true")}
              className="flex items-center gap-2 px-5 py-2.5 border border-[#A68B5B] text-[#A68B5B] text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500"
            >
              <FolderKanban className="h-4 w-4" strokeWidth={1.5} />
              New Project
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#111111] p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
