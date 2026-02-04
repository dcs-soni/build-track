import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import rateLimit from "@fastify/rate-limit";

import { prisma } from "@buildtrack/database";
import { authRoutes } from "./routes/auth.routes.js";
import { projectRoutes } from "./routes/project.routes.js";
import { taskRoutes } from "./routes/task.routes.js";
import { budgetRoutes } from "./routes/budget.routes.js";
import { expenseRoutes } from "./routes/expense.routes.js";
import { dailyReportRoutes } from "./routes/daily-report.routes.js";
import { subcontractorRoutes } from "./routes/subcontractor.routes.js";
import { permitRoutes } from "./routes/permit.routes.js";
import { photoRoutes } from "./routes/photo.routes.js";
import { invitationRoutes } from "./routes/invitation.routes.js";
import { activityRoutes } from "./routes/activity.routes.js";
import { clientPortalRoutes } from "./routes/client-portal.routes.js";
import { timelineRoutes } from "./routes/timeline.routes.js";
import { rfiRoutes } from "./routes/rfi.routes.js";
import { equipmentRoutes } from "./routes/equipment.routes.js";
import { notificationRoutes } from "./routes/notification.routes.js";
import { projectUpdateRoutes } from "./routes/project-updates.routes.js";
import { tenantPlugin } from "./plugins/tenant.plugin.js";
import { errorHandler } from "./plugins/error.plugin.js";

const envToLogger = {
  development: { transport: { target: "pino-pretty" } },
  production: true,
  test: false,
};

export async function buildApp() {
  const app = Fastify({
    logger:
      envToLogger[process.env.NODE_ENV as keyof typeof envToLogger] ?? true,
  });

  // Register plugins
  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });
  await app.register(sensible);
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "change-me-in-production",
  });

  // Custom plugins
  await app.register(tenantPlugin);
  await app.register(errorHandler);

  // Decorate with prisma
  app.decorate("prisma", prisma);

  // Health check
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // ====================
  // API ROUTES
  // ====================

  // Core
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(projectRoutes, { prefix: "/api/v1/projects" });
  await app.register(taskRoutes, { prefix: "/api/v1/tasks" });

  // Feature 1: Budget Analytics
  await app.register(budgetRoutes, { prefix: "/api/v1/budget" });

  // Feature 2: Daily Reports
  await app.register(dailyReportRoutes, { prefix: "/api/v1/daily-reports" });

  // Feature 3: Subcontractor Management
  await app.register(subcontractorRoutes, { prefix: "/api/v1/subcontractors" });

  // Feature 4: Permit Tracker
  await app.register(permitRoutes, { prefix: "/api/v1/permits" });

  // Feature 5: Photo Documentation
  await app.register(photoRoutes, { prefix: "/api/v1/photos" });

  // Feature 6: Team Invitations
  await app.register(invitationRoutes, { prefix: "/api/v1/invitations" });

  // Feature 7: Activity Timeline
  await app.register(activityRoutes, { prefix: "/api/v1/activity" });

  // Feature 8: Expense Tracking
  await app.register(expenseRoutes, { prefix: "/api/v1/expenses" });

  // Feature 9: Client Portal
  await app.register(clientPortalRoutes, { prefix: "/api/v1/client" });

  // Feature 10: Project Timeline/Gantt
  await app.register(timelineRoutes, { prefix: "/api/v1/timeline" });

  // Feature 11: RFI (Request for Information)
  await app.register(rfiRoutes, { prefix: "/api/v1/rfis" });

  // Feature 12: Equipment/Asset Tracking
  await app.register(equipmentRoutes, { prefix: "/api/v1/equipment" });

  // Feature 13: Notifications & Communication
  await app.register(notificationRoutes, { prefix: "/api/v1/notifications" });
  await app.register(projectUpdateRoutes, { prefix: "/api/v1" });

  // Graceful shutdown
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}

// Type augmentation for Fastify
declare module "fastify" {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
  interface FastifyRequest {
    tenantId?: string;
    userId?: string;
  }
}
