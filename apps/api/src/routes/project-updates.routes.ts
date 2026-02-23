import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { notifyUsers } from "../utils/notifications.js";

const createUpdateSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(3),
  audience: z.enum(["internal", "client"]).optional(),
});

const listQuerySchema = z.object({
  audience: z.enum(["internal", "client"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const allowedRoles = new Set(["owner", "admin", "manager"]);

export const projectUpdateRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get("/projects/:projectId/updates", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const project = await fastify.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true },
    });
    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const query = listQuerySchema.parse(request.query);
    const limit = query.limit ?? 50;

    const updates = await fastify.prisma.projectUpdate.findMany({
      where: {
        projectId,
        tenantId,
        ...(query.audience ? { audience: query.audience } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return reply.send({ success: true, data: updates });
  });

  fastify.post("/projects/:projectId/updates", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const membership = await fastify.prisma.tenantMembership.findFirst({
      where: { tenantId, userId },
      select: { role: true },
    });

    if (!membership || !allowedRoles.has(membership.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      });
    }

    const body = createUpdateSchema.parse(request.body);

    const project = await fastify.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true, name: true, createdBy: true },
    });
    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const update = await fastify.prisma.projectUpdate.create({
      data: {
        tenantId,
        projectId,
        title: body.title,
        body: body.body,
        audience: body.audience || "internal",
        createdBy: userId,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Gather notification recipients: tenant members with allowed roles
    const members = await fastify.prisma.tenantMembership.findMany({
      where: { tenantId, role: { in: Array.from(allowedRoles) } },
      select: { userId: true },
    });

    // Build recipient list, explicitly filtering out the actor (author)
    // Also include project creator if they exist
    const recipientUserIds = new Set(
      members.map((m) => m.userId).filter((uid) => uid !== userId),
    );

    // Include project creator if different from actor
    if (project.createdBy && project.createdBy !== userId) {
      recipientUserIds.add(project.createdBy);
    }

    // Only notify if there are recipients other than the actor
    if (recipientUserIds.size > 0) {
      await notifyUsers(fastify.prisma, {
        tenantId,
        actorId: userId,
        userIds: Array.from(recipientUserIds),
        type: "project_update",
        title: `Project update: ${project.name}`,
        message: body.title,
        link: `/projects/${projectId}`,
        preferenceKey: "notifyProjectUpdates",
      });
    }

    return reply.status(201).send({ success: true, data: update });
  });
};
