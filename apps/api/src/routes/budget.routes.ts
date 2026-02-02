import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const createBudgetItemSchema = z.object({
  projectId: z.string().uuid(),
  category: z.enum([
    "labor",
    "materials",
    "equipment",
    "permits",
    "overhead",
    "subcontractor",
    "contingency",
    "other",
  ]),
  description: z.string().min(1),
  estimatedCost: z.number().positive(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
});

const updateBudgetItemSchema = z.object({
  description: z.string().optional(),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().min(0).optional(),
  status: z.enum(["pending", "approved", "paid"]).optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

export const budgetRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth hook
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply
        .status(401)
        .send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
    }
  });

  // Get budget analytics for a project
  fastify.get("/projects/:projectId/analytics", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;

    // Verify project access
    const project = await fastify.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: { budgetItems: true },
    });

    if (!project) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
    }

    const budgetItems = project.budgetItems;
    const totalEstimated = budgetItems.reduce(
      (sum, item) => sum + Number(item.estimatedCost),
      0,
    );
    const totalActual = budgetItems.reduce(
      (sum, item) => sum + Number(item.actualCost),
      0,
    );
    const totalVariance = totalEstimated - totalActual;
    const variancePercent =
      totalEstimated > 0
        ? ((totalVariance / totalEstimated) * 100).toFixed(2)
        : 0;

    // Group by category
    const byCategory: Record<
      string,
      { estimated: number; actual: number; variance: number; count: number }
    > = {};
    budgetItems.forEach((item) => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = {
          estimated: 0,
          actual: 0,
          variance: 0,
          count: 0,
        };
      }
      byCategory[item.category].estimated += Number(item.estimatedCost);
      byCategory[item.category].actual += Number(item.actualCost);
      byCategory[item.category].variance =
        byCategory[item.category].estimated - byCategory[item.category].actual;
      byCategory[item.category].count += 1;
    });

    // Group by status
    const byStatus = {
      pending: budgetItems.filter((i) => i.status === "pending").length,
      approved: budgetItems.filter((i) => i.status === "approved").length,
      paid: budgetItems.filter((i) => i.status === "paid").length,
    };

    // Items over budget (alert)
    const overBudgetItems = budgetItems.filter(
      (item) => Number(item.actualCost) > Number(item.estimatedCost),
    );

    // Spending trend (last 30 days from expenses)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expenses = await fastify.prisma.expense.findMany({
      where: { projectId, tenantId, expenseDate: { gte: thirtyDaysAgo } },
      orderBy: { expenseDate: "asc" },
    });

    const dailySpending: Record<string, number> = {};
    expenses.forEach((exp) => {
      const dateKey = exp.expenseDate.toISOString().split("T")[0];
      dailySpending[dateKey] =
        (dailySpending[dateKey] || 0) + Number(exp.amount);
    });

    return reply.send({
      success: true,
      data: {
        summary: {
          totalBudget: Number(project.budget) || totalEstimated,
          totalEstimated,
          totalActual,
          totalVariance,
          variancePercent: Number(variancePercent),
          isOverBudget: totalActual > totalEstimated,
          percentSpent:
            totalEstimated > 0
              ? ((totalActual / totalEstimated) * 100).toFixed(1)
              : 0,
        },
        byCategory,
        byStatus,
        overBudgetItems: overBudgetItems.map((i) => ({
          id: i.id,
          category: i.category,
          description: i.description,
          estimated: Number(i.estimatedCost),
          actual: Number(i.actualCost),
          overBy: Number(i.actualCost) - Number(i.estimatedCost),
        })),
        spendingTrend: Object.entries(dailySpending).map(([date, amount]) => ({
          date,
          amount,
        })),
        itemCount: budgetItems.length,
      },
    });
  });

  // List budget items for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;
    const { category, status } = request.query as Record<string, string>;

    const items = await fastify.prisma.budgetItem.findMany({
      where: {
        projectId,
        tenantId,
        ...(category && { category }),
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ success: true, data: items });
  });

  // Create budget item
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply
        .status(400)
        .send({
          success: false,
          error: { code: "NO_TENANT", message: "Tenant context required" },
        });
    }

    const body = createBudgetItemSchema.parse(request.body);

    // Verify project access
    const project = await fastify.prisma.project.findFirst({
      where: { id: body.projectId, tenantId },
    });

    if (!project) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
    }

    const budgetItem = await fastify.prisma.budgetItem.create({
      data: {
        ...body,
        tenantId,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    return reply.status(201).send({ success: true, data: budgetItem });
  });

  // Update budget item
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const body = updateBudgetItemSchema.parse(request.body);

    const result = await fastify.prisma.budgetItem.updateMany({
      where: { id, tenantId },
      data: {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    if (result.count === 0) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: "NOT_FOUND", message: "Budget item not found" },
        });
    }

    const updated = await fastify.prisma.budgetItem.findFirst({
      where: { id, tenantId },
    });
    return reply.send({ success: true, data: updated });
  });

  // Delete budget item
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const result = await fastify.prisma.budgetItem.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: "NOT_FOUND", message: "Budget item not found" },
        });
    }

    return reply.status(204).send();
  });
};
