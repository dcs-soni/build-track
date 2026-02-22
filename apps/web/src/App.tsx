import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy-loaded pages — each is split into its own chunk
const LandingPage = lazy(() =>
  import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/pages/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ProjectsPage = lazy(() =>
  import("@/pages/ProjectsPage").then((m) => ({ default: m.ProjectsPage })),
);
const ProjectDetailPage = lazy(() =>
  import("@/pages/ProjectDetailPage").then((m) => ({
    default: m.ProjectDetailPage,
  })),
);
const BudgetAnalyticsPage = lazy(() =>
  import("@/pages/BudgetAnalyticsPage").then((m) => ({
    default: m.BudgetAnalyticsPage,
  })),
);
const SubcontractorsPage = lazy(() =>
  import("@/pages/SubcontractorsPage").then((m) => ({
    default: m.SubcontractorsPage,
  })),
);
const DailyReportsPage = lazy(() =>
  import("@/pages/DailyReportsPage").then((m) => ({
    default: m.DailyReportsPage,
  })),
);
const PermitsPage = lazy(() =>
  import("@/pages/PermitsPage").then((m) => ({ default: m.PermitsPage })),
);
const PhotoGalleryPage = lazy(() =>
  import("@/pages/PhotoGalleryPage").then((m) => ({
    default: m.PhotoGalleryPage,
  })),
);
const ActivityTimelinePage = lazy(() =>
  import("@/pages/ActivityTimelinePage").then((m) => ({
    default: m.ActivityTimelinePage,
  })),
);
const TeamSettingsPage = lazy(() =>
  import("@/pages/TeamSettingsPage").then((m) => ({
    default: m.TeamSettingsPage,
  })),
);
const ProjectTimelinePage = lazy(() =>
  import("@/pages/ProjectTimelinePage").then((m) => ({
    default: m.ProjectTimelinePage,
  })),
);
const NotificationsPage = lazy(() =>
  import("@/pages/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--ivory)]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--teal)] border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
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

            {/* Budget Analytics */}
            <Route
              path="/projects/:projectId/budget"
              element={<BudgetAnalyticsPage />}
            />

            {/* Daily Reports */}
            <Route
              path="/projects/:projectId/reports"
              element={<DailyReportsPage />}
            />

            {/* Subcontractor Management */}
            <Route path="/subcontractors" element={<SubcontractorsPage />} />

            {/* Permit Tracker */}
            <Route
              path="/projects/:projectId/permits"
              element={<PermitsPage />}
            />

            {/* Photo Documentation */}
            <Route
              path="/projects/:projectId/photos"
              element={<PhotoGalleryPage />}
            />

            {/* Activity Timeline */}
            <Route path="/activity" element={<ActivityTimelinePage />} />
            <Route
              path="/projects/:projectId/activity"
              element={<ActivityTimelinePage />}
            />

            {/* Notifications */}
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Team Settings */}
            <Route path="/settings/team" element={<TeamSettingsPage />} />

            {/* Project Timeline/Gantt */}
            <Route
              path="/projects/:projectId/timeline"
              element={<ProjectTimelinePage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
