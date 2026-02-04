import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ensureNotificationPreference } from "../utils/notifications.js";

const listQuerySchema = z.object({
  status: z.enum(["all", "unread", "read"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const preferenceSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  digestFrequency: z
    .enum(["immediate", "daily", "weekly", "none"])
    .optional(),
  notifyTaskAssigned: z.boolean().optional(),
  notifyRfiAssigned: z.boolean().optional(),
  notifyRfiResponse: z.boolean().optional(),
  notifyProjectUpdates: z.boolean().optional(),
});

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth hook
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }
  });

  fastify.get("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const query = listQuerySchema.parse(request.query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const where: Record<string, unknown> = { tenantId, userId };
    if (query.status === "unread") where.isRead = false;
    if (query.status === "read") where.isRead = true;
    if (query.priority) where.priority = query.priority;

    const [items, total] = await Promise.all([
      fastify.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      fastify.prisma.notification.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  fastify.get("/unread-count", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const count = await fastify.prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });

    return reply.send({ success: true, data: { count } });
  });

  fastify.post("/:id/read", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;
    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const result = await fastify.prisma.notification.updateMany({
      where: { id, tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Notification not found" },
      });
    }

    return reply.send({ success: true });
  });

  fastify.post("/read-all", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    await fastify.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return reply.send({ success: true });
  });

  fastify.get("/preferences", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const preference = await ensureNotificationPreference(
      fastify.prisma,
      tenantId,
      userId,
    );

    return reply.send({ success: true, data: preference });
  });

  fastify.put("/preferences", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const updates = preferenceSchema.parse(request.body);

    const preference = await fastify.prisma.notificationPreference.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: { tenantId, userId, ...updates },
      update: updates,
    });

    return reply.send({ success: true, data: preference });
  });
};
