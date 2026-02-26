import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  idParamSchema,
  projectIdParamSchema,
} from "../schemas/common.schema.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const createChangeOrderSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  reason: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  estimatedCost: z.number().optional(),
  scheduleDays: z.number().int().optional(),
  scheduleImpact: z.boolean().optional(),
  drawingRef: z.string().max(255).optional(),
  specSection: z.string().max(100).optional(),
  items: z
    .array(
      z.object({
        category: z.enum([
          "labor",
          "materials",
          "equipment",
          "subcontractor",
          "other",
        ]),
        description: z.string().min(1),
        quantity: z.number().positive().optional(),
        unitCost: z.number(),
        budgetItemId: z.string().uuid().optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
});

const updateChangeOrderSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  reason: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  estimatedCost: z.number().optional(),
  scheduleDays: z.number().int().optional(),
  scheduleImpact: z.boolean().optional(),
  drawingRef: z.string().max(255).optional(),
  specSection: z.string().max(100).optional(),
});

const addItemSchema = z.object({
  category: z.enum([
    "labor",
    "materials",
    "equipment",
    "subcontractor",
    "other",
  ]),
  description: z.string().min(1),
  quantity: z.number().positive().optional(),
  unitCost: z.number(),
  budgetItemId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const rejectSchema = z.object({
  reason: z.string().min(1),
});

const approveSchema = z.object({
  approvedCost: z.number().optional(),
});

// ─── Route Plugin ────────────────────────────────────────────────────────────

export const changeOrderRoutes: FastifyPluginAsync = async (fastify) => {
  // List change orders for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const { status } = request.query as Record<string, string>;

    const changeOrders = await fastify.prisma.changeOrder.findMany({
      where: {
        projectId,
        tenantId,
        ...(status && { status }),
      },
      include: {
        requester: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: {
          include: {
            budgetItem: {
              select: { id: true, category: true, description: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute summary totals
    const summary = {
      totalCount: changeOrders.length,
      totalEstimated: changeOrders.reduce(
        (sum, co) => sum + (Number(co.estimatedCost) || 0),
        0,
      ),
      totalApproved: changeOrders
        .filter((co) => co.status === "approved")
        .reduce(
          (sum, co) =>
            sum + (Number(co.approvedCost) || Number(co.estimatedCost) || 0),
          0,
        ),
      pendingCount: changeOrders.filter((co) =>
        ["draft", "submitted", "under_review"].includes(co.status),
      ).length,
      approvedCount: changeOrders.filter((co) => co.status === "approved")
        .length,
      rejectedCount: changeOrders.filter((co) => co.status === "rejected")
        .length,
    };

    return reply.send({
      success: true,
      data: { items: changeOrders, summary },
    });
  });

  // Get single change order
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const changeOrder = await fastify.prisma.changeOrder.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: {
          include: {
            budgetItem: {
              select: { id: true, category: true, description: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!changeOrder) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Change order not found" },
      });
    }

    return reply.send({ success: true, data: changeOrder });
  });

  // Create change order
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createChangeOrderSchema.parse(request.body);

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

    // Auto-generate CO number
    const count = await fastify.prisma.changeOrder.count({
      where: { projectId: body.projectId },
    });
    const coNumber = `CO-${String(count + 1).padStart(3, "0")}`;

    const changeOrder = await fastify.prisma.$transaction(async (tx) => {
      const co = await tx.changeOrder.create({
        data: {
          tenantId,
          projectId: body.projectId,
          coNumber,
          title: body.title,
          description: body.description,
          reason: body.reason,
          priority: body.priority ?? "medium",
          estimatedCost: body.estimatedCost,
          scheduleDays: body.scheduleDays,
          scheduleImpact: body.scheduleImpact ?? false,
          drawingRef: body.drawingRef,
          specSection: body.specSection,
          requestedBy: userId,
        },
      });

      // Create line items if provided
      if (body.items && body.items.length > 0) {
        await tx.changeOrderItem.createMany({
          data: body.items.map((item) => ({
            changeOrderId: co.id,
            category: item.category,
            description: item.description,
            quantity: item.quantity ?? 1,
            unitCost: item.unitCost,
            totalCost: (item.quantity ?? 1) * item.unitCost,
            budgetItemId: item.budgetItemId,
            notes: item.notes,
          })),
        });
      }

      return tx.changeOrder.findUnique({
        where: { id: co.id },
        include: {
          requester: { select: { id: true, name: true } },
          items: true,
        },
      });
    });

    return reply.status(201).send({ success: true, data: changeOrder });
  });

  // Update change order (draft/submitted only)
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = updateChangeOrderSchema.parse(request.body);

    const existing = await fastify.prisma.changeOrder.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Change order not found" },
      });
    }

    if (!["draft", "submitted"].includes(existing.status)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Only draft or submitted change orders can be edited",
        },
      });
    }

    const updated = await fastify.prisma.changeOrder.update({
      where: { id },
      data: body,
      include: {
        requester: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: true,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // Submit for review
  fastify.post("/:id/submit", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.changeOrder.updateMany({
      where: { id, tenantId, status: "draft" },
      data: { status: "submitted", submittedAt: new Date() },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Change order not found or not in draft status",
        },
      });
    }

    const updated = await fastify.prisma.changeOrder.findFirst({
      where: { id },
      include: {
        requester: { select: { id: true, name: true } },
        items: true,
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Approve change order — updates linked budget items in a transaction
  fastify.post("/:id/approve", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = approveSchema.parse(request.body ?? {});

    const existing = await fastify.prisma.changeOrder.findFirst({
      where: { id, tenantId, status: { in: ["submitted", "under_review"] } },
      include: { items: true },
    });

    if (!existing) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Change order not found or not in a reviewable status",
        },
      });
    }

    await fastify.prisma.$transaction(async (tx) => {
      // Update the change order status
      await tx.changeOrder.update({
        where: { id },
        data: {
          status: "approved",
          approvedCost: body.approvedCost ?? existing.estimatedCost ?? 0,
          approvedById: userId,
          approvedAt: new Date(),
          reviewedAt: new Date(),
        },
      });

      // Update linked budget items' actual costs
      for (const item of existing.items) {
        if (item.budgetItemId) {
          await tx.budgetItem.update({
            where: { id: item.budgetItemId },
            data: { actualCost: { increment: Number(item.totalCost) } },
          });
        }
      }
    });

    const updated = await fastify.prisma.changeOrder.findFirst({
      where: { id },
      include: {
        requester: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: true,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // Reject change order
  fastify.post("/:id/reject", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = rejectSchema.parse(request.body);

    const result = await fastify.prisma.changeOrder.updateMany({
      where: { id, tenantId, status: { in: ["submitted", "under_review"] } },
      data: {
        status: "rejected",
        rejectionReason: body.reason,
        approvedById: userId,
        rejectedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Change order not found or not in a reviewable status",
        },
      });
    }

    const updated = await fastify.prisma.changeOrder.findFirst({
      where: { id },
      include: {
        requester: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: true,
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Add line item to change order
  fastify.post("/:id/items", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = addItemSchema.parse(request.body);

    const co = await fastify.prisma.changeOrder.findFirst({
      where: { id, tenantId, status: { in: ["draft", "submitted"] } },
    });

    if (!co) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Change order not found or cannot be modified",
        },
      });
    }

    const quantity = body.quantity ?? 1;
    const item = await fastify.prisma.changeOrderItem.create({
      data: {
        changeOrderId: id,
        category: body.category,
        description: body.description,
        quantity,
        unitCost: body.unitCost,
        totalCost: quantity * body.unitCost,
        budgetItemId: body.budgetItemId,
        notes: body.notes,
      },
      include: {
        budgetItem: { select: { id: true, category: true, description: true } },
      },
    });

    // Recalculate estimated cost
    const allItems = await fastify.prisma.changeOrderItem.findMany({
      where: { changeOrderId: id },
    });
    const totalEstimated = allItems.reduce(
      (sum: number, i: { totalCost: unknown }) => sum + Number(i.totalCost),
      0,
    );
    await fastify.prisma.changeOrder.update({
      where: { id },
      data: { estimatedCost: totalEstimated },
    });

    return reply.status(201).send({ success: true, data: item });
  });

  // Remove line item
  fastify.delete("/:id/items/:itemId", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const { itemId } = z
      .object({ itemId: z.string().uuid() })
      .parse(request.params);
    const tenantId = request.tenantId;

    const co = await fastify.prisma.changeOrder.findFirst({
      where: { id, tenantId, status: { in: ["draft", "submitted"] } },
    });

    if (!co) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Change order not found or cannot be modified",
        },
      });
    }

    const deleted = await fastify.prisma.changeOrderItem.deleteMany({
      where: { id: itemId, changeOrderId: id },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Item not found" },
      });
    }

    // Recalculate estimated cost
    const remaining = await fastify.prisma.changeOrderItem.findMany({
      where: { changeOrderId: id },
    });
    const totalEstimated = remaining.reduce(
      (sum, i) => sum + Number(i.totalCost),
      0,
    );
    await fastify.prisma.changeOrder.update({
      where: { id },
      data: { estimatedCost: totalEstimated },
    });

    return reply.status(204).send();
  });

  // Delete change order (draft only)
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.changeOrder.deleteMany({
      where: { id, tenantId, status: "draft" },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Change order not found or not in draft status",
        },
      });
    }

    return reply.status(204).send();
  });
};
