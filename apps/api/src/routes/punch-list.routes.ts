import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  idParamSchema,
  projectIdParamSchema,
} from "../schemas/common.schema.js";

const createPunchListSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z
    .enum([
      "general",
      "electrical",
      "plumbing",
      "hvac",
      "structural",
      "finish",
      "landscape",
      "other",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  location: z.string().max(255).optional(),
  floor: z.string().max(50).optional(),
  room: z.string().max(100).optional(),
  drawingRef: z.string().max(255).optional(),
  assignedToId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),
});

const updatePunchListSchema = createPunchListSchema
  .partial()
  .omit({ projectId: true })
  .extend({
    status: z
      .enum(["open", "in_progress", "resolved", "verified", "wont_fix"])
      .optional(),
  });

const resolveSchema = z.object({
  resolution: z.string().min(1),
});

export const punchListRoutes: FastifyPluginAsync = async (fastify) => {
  // List punch list items for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const { status, priority } = request.query as Record<string, string>;

    const items = await fastify.prisma.punchListItem.findMany({
      where: {
        projectId,
        tenantId,
        ...(status && { status }),
        ...(priority && { priority }),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { status: "asc" }, { createdAt: "desc" }],
    });

    // Enrich with overdue flag
    const now = new Date();
    const enriched = items.map((item) => ({
      ...item,
      isOverdue:
        item.dueDate &&
        item.dueDate < now &&
        !["resolved", "verified", "wont_fix"].includes(item.status),
    }));

    return reply.send({ success: true, data: enriched });
  });

  // Get single punch list item
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const item = await fastify.prisma.punchListItem.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    if (!item) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Punch list item not found" },
      });
    }

    return reply.send({ success: true, data: item });
  });

  // Create punch list item
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createPunchListSchema.parse(request.body);

    // Verify project access
    const project = await fastify.prisma.project.findFirst({
      where: { id: body.projectId, tenantId },
    });
    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // Auto-generate item number
    const count = await fastify.prisma.punchListItem.count({
      where: { projectId: body.projectId },
    });
    const itemNumber = `PL-${String(count + 1).padStart(3, "0")}`;

    const item = await fastify.prisma.punchListItem.create({
      data: {
        ...body,
        tenantId,
        itemNumber,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        createdBy: userId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    return reply.status(201).send({ success: true, data: item });
  });

  // Update punch list item
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = updatePunchListSchema.parse(request.body);

    const updateData: Record<string, unknown> = { ...body };
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate as string);

    const result = await fastify.prisma.punchListItem.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Punch list item not found" },
      });
    }

    const updated = await fastify.prisma.punchListItem.findFirst({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Resolve a punch list item
  fastify.post("/:id/resolve", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = resolveSchema.parse(request.body);

    const result = await fastify.prisma.punchListItem.updateMany({
      where: {
        id,
        tenantId,
        status: { in: ["open", "in_progress"] },
      },
      data: {
        status: "resolved",
        resolution: body.resolution,
        resolvedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Item not found or not in a resolvable status",
        },
      });
    }

    const updated = await fastify.prisma.punchListItem.findFirst({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Verify a resolved punch list item
  fastify.post("/:id/verify", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const userId = request.userId;

    const result = await fastify.prisma.punchListItem.updateMany({
      where: {
        id,
        tenantId,
        status: "resolved",
      },
      data: {
        status: "verified",
        verifiedById: userId,
        verifiedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Item not found or not in resolved status",
        },
      });
    }

    const updated = await fastify.prisma.punchListItem.findFirst({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Delete punch list item
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.punchListItem.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Punch list item not found" },
      });
    }

    return reply.status(204).send();
  });
};
