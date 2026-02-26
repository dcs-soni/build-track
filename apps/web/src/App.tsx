import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui";

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
const AnalyticsPage = lazy(() =>
  import("@/pages/AnalyticsPage").then((m) => ({
    default: m.AnalyticsPage,
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
const RFIPage = lazy(() =>
  import("@/pages/RFIPage").then((m) => ({
    default: m.RFIPage,
  })),
);
const RFIDetailPage = lazy(() =>
  import("@/pages/RFIDetailPage").then((m) => ({
    default: m.RFIDetailPage,
  })),
);
const EquipmentPage = lazy(() =>
  import("@/pages/EquipmentPage").then((m) => ({
    default: m.EquipmentPage,
  })),
);
const EquipmentDetailPage = lazy(() =>
  import("@/pages/EquipmentDetailPage").then((m) => ({
    default: m.EquipmentDetailPage,
  })),
);
const ExpensesPage = lazy(() =>
  import("@/pages/ExpensesPage").then((m) => ({
    default: m.ExpensesPage,
  })),
);
const DocumentsPage = lazy(() =>
  import("@/pages/DocumentsPage").then((m) => ({
    default: m.DocumentsPage,
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
const InspectionsPage = lazy(() =>
  import("@/pages/InspectionsPage").then((m) => ({
    default: m.InspectionsPage,
  })),
);
const PunchListPage = lazy(() =>
  import("@/pages/PunchListPage").then((m) => ({
    default: m.PunchListPage,
  })),
);
const SafetyIncidentsPage = lazy(() =>
  import("@/pages/SafetyIncidentsPage").then((m) => ({
    default: m.SafetyIncidentsPage,
  })),
);
const ChangeOrdersPage = lazy(() =>
  import("@/pages/ChangeOrdersPage").then((m) => ({
    default: m.ChangeOrdersPage,
  })),
);
const ProgressReportsPage = lazy(() =>
  import("@/pages/ProgressReportsPage").then((m) => ({
    default: m.ProgressReportsPage,
  })),
);
const SubcontractorPortalPage = lazy(() =>
  import("@/pages/SubcontractorPortalPage").then((m) => ({
    default: m.SubcontractorPortalPage,
  })),
);

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
          <Route path="/sub-portal" element={<SubcontractorPortalPage />} />

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

            {/* Top-level Analytics */}
            <Route path="/budget-analytics" element={<AnalyticsPage />} />

            {/* Top-level Daily Reports (shows all, no project scope) */}
            <Route path="/daily-reports" element={<DailyReportsPage />} />

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

            {/* Request for Information */}
            <Route path="/projects/:projectId/rfis" element={<RFIPage />} />
            <Route
              path="/projects/:projectId/rfis/:rfiId"
              element={<RFIDetailPage />}
            />

            {/* Equipment & Assets */}
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/equipment/:id" element={<EquipmentDetailPage />} />

            {/* Expenses & Financials */}
            <Route path="/expenses" element={<ExpensesPage />} />

            {/* Document Management */}
            <Route path="/documents" element={<DocumentsPage />} />

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

            {/* Inspections */}
            <Route
              path="/projects/:projectId/inspections"
              element={<InspectionsPage />}
            />

            {/* Punch List */}
            <Route
              path="/projects/:projectId/punch-list"
              element={<PunchListPage />}
            />

            {/* Safety Incidents */}
            <Route path="/safety-incidents" element={<SafetyIncidentsPage />} />
            <Route
              path="/projects/:projectId/safety-incidents"
              element={<SafetyIncidentsPage />}
            />

            {/* Change Orders */}
            <Route
              path="/projects/:projectId/change-orders"
              element={<ChangeOrdersPage />}
            />

            {/* Progress Reports */}
            <Route
              path="/projects/:projectId/reports/progress"
              element={<ProgressReportsPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
