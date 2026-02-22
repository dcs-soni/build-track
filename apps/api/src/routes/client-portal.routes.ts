import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import crypto, { createHash } from "crypto";

/** Hash a token with SHA-256 for storage */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const clientPortalRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth hook for admin routes
  const authHook = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }
  };

  // Enable client access for a project (admin only)
  fastify.post(
    "/projects/:projectId/enable",
    { preHandler: authHook },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const tenantId = request.tenantId;

      const project = await fastify.prisma.project.findFirst({
        where: { id: projectId, tenantId },
      });
      if (!project) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const accessToken = crypto.randomBytes(32).toString("hex");

      const result = await fastify.prisma.project.updateMany({
        where: { id: projectId, tenantId },
        data: {
          clientAccessEnabled: true,
          clientAccessToken: hashToken(accessToken),
        },
      });

      if (result.count === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const portalUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/client/${accessToken}`;

      return reply.send({ success: true, data: { accessToken, portalUrl } });
    },
  );

  // Disable client access
  fastify.post(
    "/projects/:projectId/disable",
    { preHandler: authHook },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const tenantId = request.tenantId;

      await fastify.prisma.project.updateMany({
        where: { id: projectId, tenantId },
        data: { clientAccessEnabled: false, clientAccessToken: null },
      });

      return reply.send({ success: true, message: "Client access disabled" });
    },
  );

  // Regenerate access token
  fastify.post(
    "/projects/:projectId/regenerate",
    { preHandler: authHook },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      const tenantId = request.tenantId;

      const newToken = crypto.randomBytes(32).toString("hex");

      await fastify.prisma.project.updateMany({
        where: { id: projectId, tenantId, clientAccessEnabled: true },
        data: { clientAccessToken: hashToken(newToken) },
      });

      const portalUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/client/${newToken}`;

      return reply.send({
        success: true,
        data: { accessToken: newToken, portalUrl },
      });
    },
  );

  // ====================
  // PUBLIC CLIENT PORTAL ROUTES (accessed via token)
  // ====================

  // Validate client access token and get project overview
  fastify.get("/view/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const project = await fastify.prisma.project.findFirst({
      where: { clientAccessToken: hashToken(token), clientAccessEnabled: true },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        city: true,
        state: true,
        startDate: true,
        estimatedEnd: true,
        coverImage: true,
        tenant: { select: { name: true, logoUrl: true } },
      },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired access link",
        },
      });
    }

    return reply.send({ success: true, data: project });
  });

  // Get project progress (client view)
  fastify.get("/view/:token/progress", async (request, reply) => {
    const { token } = request.params as { token: string };

    const project = await fastify.prisma.project.findFirst({
      where: { clientAccessToken: hashToken(token), clientAccessEnabled: true },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            progressPercent: true,
            dueDate: true,
          },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid access link" },
      });
    }

    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const overallProgress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Group by status
    const statusBreakdown = {
      pending: tasks.filter((t) => t.status === "pending").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: completedTasks,
    };

    return reply.send({
      success: true,
      data: {
        overallProgress,
        totalTasks,
        completedTasks,
        statusBreakdown,
        milestones: tasks
          .filter((t) => t.dueDate)
          .map((t) => ({
            title: t.title,
            dueDate: t.dueDate,
            status: t.status,
            progress: t.progressPercent,
          }))
          .sort(
            (a, b) =>
              new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
          ),
      },
    });
  });

  // Get project photos (client view - limited)
  fastify.get("/view/:token/photos", async (request, reply) => {
    const { token } = request.params as { token: string };
    const { category, limit: rawLimit = "20" } = request.query as Record<
      string,
      string
    >;

    const parsedLimit = parseInt(rawLimit, 10);
    const safeLimit = Math.min(
      Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : parsedLimit,
      100,
    );

    const project = await fastify.prisma.project.findFirst({
      where: { clientAccessToken: hashToken(token), clientAccessEnabled: true },
      select: { id: true },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid access link" },
      });
    }

    const ALLOWED_CATEGORIES = ["progress", "completion"];
    const safeCategory =
      category && ALLOWED_CATEGORIES.includes(category) ? category : undefined;

    const photos = await fastify.prisma.photo.findMany({
      where: {
        projectId: project.id,
        // Only show progress and completion photos to clients
        category: safeCategory ?? { in: ALLOWED_CATEGORIES },
      },
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        caption: true,
        category: true,
        takenAt: true,
      },
      orderBy: { takenAt: "desc" },
      take: safeLimit,
    });

    return reply.send({ success: true, data: photos });
  });

  // Get project timeline (client view)
  fastify.get("/view/:token/timeline", async (request, reply) => {
    const { token } = request.params as { token: string };

    const project = await fastify.prisma.project.findFirst({
      where: { clientAccessToken: hashToken(token), clientAccessEnabled: true },
      select: { id: true },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid access link" },
      });
    }

    const tasks = await fastify.prisma.task.findMany({
      where: { projectId: project.id, parentId: null },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        dueDate: true,
        progressPercent: true,
        color: true,
      },
      orderBy: { startDate: "asc" },
    });

    return reply.send({ success: true, data: tasks });
  });

  // Get project updates (client view)
  fastify.get("/view/:token/updates", async (request, reply) => {
    const { token } = request.params as { token: string };
    const { limit = "20" } = request.query as Record<string, string>;

    const project = await fastify.prisma.project.findFirst({
      where: { clientAccessToken: hashToken(token), clientAccessEnabled: true },
      select: { id: true, tenantId: true },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid access link" },
      });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit), 1), 50);

    const updates = await fastify.prisma.projectUpdate.findMany({
      where: {
        projectId: project.id,
        tenantId: project.tenantId,
        audience: "client",
      },
      orderBy: { createdAt: "desc" },
      take: parsedLimit,
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    });

    return reply.send({ success: true, data: updates });
  });

  // Get budget summary (client view - optional, configurable)
  fastify.get("/view/:token/budget", async (request, reply) => {
    const { token } = request.params as { token: string };

    const project = await fastify.prisma.project.findFirst({
      where: { clientAccessToken: hashToken(token), clientAccessEnabled: true },
      select: { id: true, budget: true },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid access link" },
      });
    }

    // Only show high-level budget info, not detailed breakdown
    const budgetItems = await fastify.prisma.budgetItem.findMany({
      where: { projectId: project.id },
      select: { estimatedCost: true, actualCost: true, category: true },
    });

    const totalBudget =
      project.budget != null
        ? Number(project.budget)
        : budgetItems.reduce((sum, i) => sum + Number(i.estimatedCost), 0);
    const totalSpent = budgetItems.reduce(
      (sum, i) => sum + Number(i.actualCost),
      0,
    );
    const percentSpent =
      totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    return reply.send({
      success: true,
      data: {
        totalBudget,
        percentSpent,
        isOnBudget: totalSpent <= totalBudget,
      },
    });
  });
};
