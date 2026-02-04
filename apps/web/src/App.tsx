import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { LandingPage } from "@/pages/LandingPage";
// New feature pages
import { BudgetAnalyticsPage } from "@/pages/BudgetAnalyticsPage";
import { SubcontractorsPage } from "@/pages/SubcontractorsPage";
import { DailyReportsPage } from "@/pages/DailyReportsPage";
import { PermitsPage } from "@/pages/PermitsPage";
import { PhotoGalleryPage } from "@/pages/PhotoGalleryPage";
import { ActivityTimelinePage } from "@/pages/ActivityTimelinePage";
import { TeamSettingsPage } from "@/pages/TeamSettingsPage";
import { ProjectTimelinePage } from "@/pages/ProjectTimelinePage";
import { NotificationsPage } from "@/pages/NotificationsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--ivory)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--teal)] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Projects */}
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />

        {/* Feature 1: Budget Analytics */}
        <Route
          path="/projects/:projectId/budget"
          element={<BudgetAnalyticsPage />}
        />

        {/* Feature 2: Daily Reports */}
        <Route
          path="/projects/:projectId/reports"
          element={<DailyReportsPage />}
        />

        {/* Feature 3: Subcontractor Management */}
        <Route path="/subcontractors" element={<SubcontractorsPage />} />

        {/* Feature 4: Permit Tracker */}
        <Route path="/projects/:projectId/permits" element={<PermitsPage />} />

        {/* Feature 5: Photo Documentation */}
        <Route
          path="/projects/:projectId/photos"
          element={<PhotoGalleryPage />}
        />

        {/* Feature 7: Activity Timeline */}
        <Route path="/activity" element={<ActivityTimelinePage />} />
        <Route
          path="/projects/:projectId/activity"
          element={<ActivityTimelinePage />}
        />

        {/* Communication: Notifications */}
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Feature 6: Team Invitations */}
        <Route path="/settings/team" element={<TeamSettingsPage />} />

        {/* Feature 10: Project Timeline/Gantt */}
        <Route
          path="/projects/:projectId/timeline"
          element={<ProjectTimelinePage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
