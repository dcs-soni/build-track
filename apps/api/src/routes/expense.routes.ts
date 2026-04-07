import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  idParamSchema,
  projectIdParamSchema,
} from "../schemas/common.schema.js";

const createExpenseSchema = z.object({
  projectId: z.string().uuid(),
  budgetItemId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  vendor: z.string().optional(),
  description: z.string().min(1),
  category: z.enum([
    "labor",
    "materials",
    "equipment",
    "permits",
    "overhead",
    "subcontractor",
    "travel",
    "other",
  ]),
  receiptUrl: z.string().url().optional(),
  expenseDate: z.string(),
});

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  vendor: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  receiptUrl: z.string().url().optional(),
});

export const expenseRoutes: FastifyPluginAsync = async (fastify) => {
  // List expenses for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const {
      category,
      status,
      startDate,
      endDate,
      page: rawPage = "1",
      limit: rawLimit = "20",
    } = request.query as Record<string, string>;

    const parsedPage = Number(rawPage);
    const parsedLimit = Number(rawLimit);

    if (!Number.isFinite(parsedPage) || !Number.isFinite(parsedLimit)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_PARAMS",
          message: "page and limit must be valid numbers",
        },
      });
    }

    const page = Math.max(Math.floor(parsedPage), 1);
    const limit = Math.min(Math.max(Math.floor(parsedLimit), 1), 100);

    const where = {
      projectId,
      tenantId,
      ...(category && { category }),
      ...(status && { status }),
      ...(startDate &&
        endDate && {
          expenseDate: { gte: new Date(startDate), lte: new Date(endDate) },
        }),
    };

    const [expenses, total] = await Promise.all([
      fastify.prisma.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expenseDate: "desc" },
        include: {
          budgetItem: { select: { category: true, description: true } },
          creator: { select: { name: true } },
        },
      }),
      fastify.prisma.expense.count({ where }),
    ]);

    // Calculate totals
    const totals = await fastify.prisma.expense.aggregate({
      where: { projectId, tenantId },
      _sum: { amount: true },
      _count: true,
    });

    return reply.send({
      success: true,
      data: {
        items: expenses,
        totals: {
          totalAmount: Number(totals._sum.amount) || 0,
          count: totals._count,
        },
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  // Create expense
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createExpenseSchema.parse(request.body);

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

    if (body.budgetItemId) {
      const budgetItem = await fastify.prisma.budgetItem.findFirst({
        where: {
          id: body.budgetItemId,
          tenantId,
          projectId: body.projectId,
        },
      });

      if (!budgetItem) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_BUDGET_ITEM",
            message: "Budget item does not belong to this project",
          },
        });
      }
    }

    // Create expense and update budget item actual cost
    const expense = await fastify.prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          ...body,
          tenantId,
          createdBy: userId,
          expenseDate: new Date(body.expenseDate),
        },
      });

      // If linked to budget item, update actual cost
      if (body.budgetItemId) {
        await tx.budgetItem.updateMany({
          where: {
            id: body.budgetItemId,
            tenantId,
            projectId: body.projectId,
          },
          data: { actualCost: { increment: body.amount } },
        });
      }

      return exp;
    });

    return reply.status(201).send({ success: true, data: expense });
  });

  // Update expense
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = updateExpenseSchema.parse(request.body);

    const existing = await fastify.prisma.expense.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Expense not found" },
      });
    }

    // Strip any status/approval fields — these can only be changed
    // through the dedicated /approve and /reject endpoints.
    const rawBody = body as Record<string, unknown>;
    const updateData: Record<string, unknown> = Object.fromEntries(
      Object.entries(rawBody).filter(
        ([k]) => k !== "status" && k !== "approvedBy" && k !== "approvedAt",
      ),
    );

    const expense = await fastify.prisma.$transaction(async (tx) => {
      if (
        existing.budgetItemId &&
        body.amount !== undefined &&
        body.amount !== Number(existing.amount)
      ) {
        await tx.budgetItem.updateMany({
          where: {
            id: existing.budgetItemId,
            tenantId,
            projectId: existing.projectId,
          },
          data: {
            actualCost: {
              increment: body.amount - Number(existing.amount),
            },
          },
        });
      }

      return tx.expense.update({
        where: { id },
        data: updateData,
      });
    });

    return reply.send({ success: true, data: expense });
  });

  // Delete expense
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const existing = await fastify.prisma.expense.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Expense not found" },
      });
    }

    // Rollback budget item actual cost if linked
    await fastify.prisma.$transaction(async (tx) => {
      if (existing.budgetItemId) {
        await tx.budgetItem.updateMany({
          where: {
            id: existing.budgetItemId,
            tenantId,
            projectId: existing.projectId,
          },
          data: { actualCost: { decrement: Number(existing.amount) } },
        });
      }
      await tx.expense.delete({ where: { id } });
    });

    return reply.status(204).send();
  });

  // Approve/Reject expense
  fastify.post("/:id/approve", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const userId = request.userId;

    const expense = await fastify.prisma.expense.updateMany({
      where: { id, tenantId, status: "pending" },
      data: { status: "approved", approvedBy: userId, approvedAt: new Date() },
    });

    if (expense.count === 0) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Expense not found or already processed",
        },
      });
    }

    const updated = await fastify.prisma.expense.findFirst({ where: { id } });
    return reply.send({ success: true, data: updated });
  });

  fastify.post("/:id/reject", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const expense = await fastify.prisma.expense.updateMany({
      where: { id, tenantId, status: "pending" },
      data: { status: "rejected" },
    });

    if (expense.count === 0) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Expense not found or already processed",
        },
      });
    }

    const updated = await fastify.prisma.expense.findFirst({ where: { id } });
    return reply.send({ success: true, data: updated });
  });
};
