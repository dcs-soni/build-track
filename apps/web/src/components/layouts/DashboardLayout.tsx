import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Building2,
  Clock,
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/subcontractors", icon: Users, label: "Subcontractors" },
  { to: "/activity", icon: Clock, label: "Activity" },
  { to: "/settings/team", icon: Users, label: "Team" },
];

const secondaryNavItems = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[var(--ivory)]">
      {/* Premium Sidebar */}
      <aside className="w-64 bg-[var(--charcoal)] flex flex-col relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--teal)] to-[var(--mocha)] flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-lg text-white">BuildTrack</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold px-3 mb-3">
            Main Menu
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-item relative ${isActive ? "active" : ""}`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}

          <div className="pt-6 pb-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold px-3 mb-3">
              Settings
            </p>
          </div>
          {secondaryNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-item relative ${isActive ? "active" : ""}`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--teal)] to-[var(--mocha)] flex items-center justify-center text-white font-semibold shadow-lg">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-white/50 truncate">{user?.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-white/50" />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-[var(--sand)] flex items-center justify-between px-6">
          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--stone)]" />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              className="w-full h-10 pl-10 pr-4 bg-[var(--cream)] border border-[var(--sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]/20 focus:border-[var(--teal)] transition-all"
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <button className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--cream)] hover:bg-[var(--sand)] transition-colors">
              <Bell className="h-5 w-5 text-[var(--stone)]" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-[var(--terracotta)] rounded-full" />
            </button>

            <div className="h-6 w-px bg-[var(--sand)]" />

            <button className="flex items-center gap-2 px-4 h-10 bg-[var(--teal)] text-white rounded-xl font-medium text-sm hover:bg-[var(--teal-light)] transition-colors">
              <FolderKanban className="h-4 w-4" />
              New Project
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
