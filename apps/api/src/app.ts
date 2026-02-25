import crypto from "node:crypto";
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
import { analyticsRoutes } from "./routes/analytics.routes.js";
import { documentRoutes } from "./routes/document.routes.js";
import { tenantPlugin } from "./plugins/tenant.plugin.js";
import { errorHandler } from "./plugins/error.plugin.js";
import { authGuardPlugin } from "./plugins/auth-guard.plugin.js";

const envToLogger = {
  development: { transport: { target: "pino-pretty" } },
  production: true,
  test: false,
};

export async function buildApp() {
  const app = Fastify({
    logger:
      envToLogger[process.env.NODE_ENV as keyof typeof envToLogger] ?? true,
    genReqId: () => crypto.randomUUID(),
  });

  // Register plugins
  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });
  await app.register(sensible);
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET environment variable is required. The server cannot start without it.",
    );
  }
  await app.register(jwt, {
    secret: process.env.JWT_SECRET,
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
  // PUBLIC ROUTES (no auth required)
  // ====================
  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  // Invitations & client portal have mixed public/private routes
  // — they handle auth per-route internally
  await app.register(invitationRoutes, { prefix: "/api/v1/invitations" });
  await app.register(clientPortalRoutes, { prefix: "/api/v1/client" });

  // ====================
  // PROTECTED ROUTES (auth guard applied to all)
  // ====================
  await app.register(
    async function protectedRoutes(instance) {
      await instance.register(authGuardPlugin);

      // Core
      await instance.register(projectRoutes, { prefix: "/projects" });
      await instance.register(taskRoutes, { prefix: "/tasks" });

      // Budget & Expenses
      await instance.register(budgetRoutes, { prefix: "/budget" });
      await instance.register(expenseRoutes, { prefix: "/expenses" });

      // Daily Reports
      await instance.register(dailyReportRoutes, {
        prefix: "/daily-reports",
      });

      // Subcontractor Management
      await instance.register(subcontractorRoutes, {
        prefix: "/subcontractors",
      });

      // Permit Tracker
      await instance.register(permitRoutes, { prefix: "/permits" });

      // Photo Documentation
      await instance.register(photoRoutes, { prefix: "/photos" });

      // Activity Timeline
      await instance.register(activityRoutes, { prefix: "/activity" });

      // Project Timeline/Gantt
      await instance.register(timelineRoutes, { prefix: "/timeline" });

      // RFI (Request for Information)
      await instance.register(rfiRoutes, { prefix: "/rfis" });

      // Equipment/Asset Tracking
      await instance.register(equipmentRoutes, { prefix: "/equipment" });

      // Notifications & Communication
      await instance.register(notificationRoutes, {
        prefix: "/notifications",
      });
      await instance.register(projectUpdateRoutes);

      // Analytics
      await instance.register(analyticsRoutes, { prefix: "/analytics" });

      // Documents
      await instance.register(documentRoutes, { prefix: "/documents" });
    },
    { prefix: "/api/v1" },
  );

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
