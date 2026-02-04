import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { notifyUsers } from "../utils/notifications.js";

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  subcontractorId: z.string().uuid().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
});

export const taskRoutes: FastifyPluginAsync = async (fastify) => {
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

  // Create task
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createTaskSchema.parse(request.body);

    // Verify project belongs to tenant
    const project = await fastify.prisma.project.findFirst({
      where: { id: body.projectId, tenantId },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const task = await fastify.prisma.task.create({
      data: {
        ...body,
        tenantId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    if (task.assignedTo) {
      await notifyUsers(fastify.prisma, {
        tenantId,
        actorId: userId,
        userIds: [task.assignedTo],
        type: "task_assigned",
        title: `Task assigned: ${task.title}`,
        message: `You were assigned to "${task.title}".`,
        link: `/projects/${task.projectId}`,
        preferenceKey: "notifyTaskAssigned",
      });
    }

    return reply.status(201).send({ success: true, data: task });
  });

  // Update task
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = updateTaskSchema.parse(request.body);

    const existing = await fastify.prisma.task.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Task not found" },
      });
    }

    // Build update data
    const updateData: Record<string, unknown> = { ...body };
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.status === "completed") updateData.completedAt = new Date();

    const task = await fastify.prisma.task.update({
      where: { id },
      data: updateData,
    });

    if (body.assignedTo && body.assignedTo !== existing.assignedTo) {
      await notifyUsers(fastify.prisma, {
        tenantId: tenantId!,
        actorId: userId,
        userIds: [body.assignedTo],
        type: "task_assigned",
        title: `Task assigned: ${task.title}`,
        message: `You were assigned to "${task.title}".`,
        link: `/projects/${task.projectId}`,
        preferenceKey: "notifyTaskAssigned",
      });
    }
    return reply.send({ success: true, data: task });
  });

  // Delete task
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const result = await fastify.prisma.task.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Task not found" },
      });
    }

    return reply.status(204).send();
  });

  // Complete task
  fastify.post("/:id/complete", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const result = await fastify.prisma.task.updateMany({
      where: { id, tenantId },
      data: { status: "completed", completedAt: new Date() },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Task not found" },
      });
    }

    const task = await fastify.prisma.task.findFirst({
      where: { id, tenantId },
    });
    return reply.send({ success: true, data: task });
  });
};
