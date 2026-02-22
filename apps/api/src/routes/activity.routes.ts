import type { FastifyPluginAsync } from "fastify";

export const activityRoutes: FastifyPluginAsync = async (fastify) => {

  // Get activity for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;
    const {
      entityType,
      action,
      page = "1",
      limit = "50",
    } = request.query as Record<string, string>;

    const where = {
      projectId,
      tenantId,
      ...(entityType && { entityType }),
      ...(action && { action }),
    };

    const [activities, total] = await Promise.all([
      fastify.prisma.activityLog.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: Math.min(parseInt(limit), 100),
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      fastify.prisma.activityLog.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        items: activities.map((a) => ({
          ...a,
          changes: a.changes as Record<string, unknown>,
          metadata: a.metadata as Record<string, unknown>,
        })),
        meta: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  });

  // Get all activity for tenant (dashboard)
  fastify.get("/recent", async (request, reply) => {
    const tenantId = request.tenantId;
    const { limit = "20" } = request.query as Record<string, string>;

    const activities = await fastify.prisma.activityLog.findMany({
      where: { tenantId },
      take: Math.min(parseInt(limit), 100),
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return reply.send({
      success: true,
      data: activities.map((a) => ({
        ...a,
        changes: a.changes as Record<string, unknown>,
        description: formatActivityDescription(
          a.action,
          a.entityType,
          a.entityName,
          a.changes as Record<string, object>,
        ),
      })),
    });
  });

  // Get activity for specific entity
  fastify.get("/entity/:entityType/:entityId", async (request, reply) => {
    const { entityType, entityId } = request.params as {
      entityType: string;
      entityId: string;
    };
    const tenantId = request.tenantId;

    const activities = await fastify.prisma.activityLog.findMany({
      where: { entityType, entityId, tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    return reply.send({
      success: true,
      data: activities.map((a) => ({
        ...a,
        changes: a.changes as Record<string, unknown>,
      })),
    });
  });

  // Get activity stats
  fastify.get("/stats", async (request, reply) => {
    const tenantId = request.tenantId;
    const { days = "7" } = request.query as { days?: string };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [byAction, byEntityType, byUser, total] = await Promise.all([
      fastify.prisma.activityLog.groupBy({
        by: ["action"],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: true,
      }),
      fastify.prisma.activityLog.groupBy({
        by: ["entityType"],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: true,
      }),
      fastify.prisma.activityLog.groupBy({
        by: ["userId"],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
      fastify.prisma.activityLog.count({
        where: { tenantId, createdAt: { gte: startDate } },
      }),
    ]);

    // Get user names for top users
    const userIds = byUser.map((u) => u.userId);
    const users = await fastify.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return reply.send({
      success: true,
      data: {
        total,
        byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
        byEntityType: byEntityType.map((e) => ({
          entityType: e.entityType,
          count: e._count,
        })),
        byUser: byUser.map((u) => ({
          userId: u.userId,
          name: userMap.get(u.userId) || "Unknown",
          count: u._count,
        })),
      },
    });
  });
};

function formatActivityDescription(
  action: string,
  entityType: string,
  entityName: string | null,
  changes: Record<string, object>,
): string {
  const name = entityName || entityType;
  const changedFields = Object.keys(changes);

  switch (action) {
    case "created":
      return `Created ${entityType} "${name}"`;
    case "updated":
      if (changedFields.length > 0) {
        return `Updated ${changedFields.join(", ")} on ${entityType} "${name}"`;
      }
      return `Updated ${entityType} "${name}"`;
    case "deleted":
      return `Deleted ${entityType} "${name}"`;
    case "completed":
      return `Completed ${entityType} "${name}"`;
    case "approved":
      return `Approved ${entityType} "${name}"`;
    case "rejected":
      return `Rejected ${entityType} "${name}"`;
    default:
      return `${action} ${entityType} "${name}"`;
  }
}

// Activity logging helper (to be used by other routes)
export async function logActivity(
  prisma: any,
  {
    tenantId,
    projectId,
    userId,
    action,
    entityType,
    entityId,
    entityName,
    changes,
    metadata,
    ipAddress,
    userAgent,
  }: {
    tenantId: string;
    projectId?: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    changes?: Record<string, { old?: unknown; new?: unknown }>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  try {
    await prisma.activityLog.create({
      data: {
        tenantId,
        projectId,
        userId,
        action,
        entityType,
        entityId,
        entityName,
        changes: changes || {},
        metadata: metadata || {},
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
