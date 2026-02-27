import type { FastifyPluginAsync, FastifyInstance } from "fastify";
import { z } from "zod";
import { projectIdParamSchema } from "../schemas/common.schema.js";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const weeklyQuerySchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parts = val.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
      ) {
        throw new Error("Invalid date");
      }
      return date;
    }),
});

const monthlyQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Invalid month format, expected YYYY-MM")
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parts = val.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const date = new Date(year, month, 1);
      if (date.getFullYear() !== year || date.getMonth() !== month) {
        throw new Error("Invalid month");
      }
      return date;
    }),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekRange(weekStart?: Date) {
  const start = weekStart ? new Date(weekStart) : new Date();
  // Align to Monday
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getMonthRange(monthStart?: Date) {
  const now = new Date();
  const year = monthStart ? monthStart.getFullYear() : now.getFullYear();
  const month = monthStart ? monthStart.getMonth() : now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { start, end };
}

// ─── Route Plugin ────────────────────────────────────────────────────────────

export const progressReportRoutes: FastifyPluginAsync = async (fastify) => {
  // Weekly progress report
  fastify.get("/projects/:projectId/weekly", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const query = weeklyQuerySchema.parse(request.query);
    const { start, end } = getWeekRange(query.weekStart);

    const report = await generateReport(
      fastify,
      projectId,
      tenantId!,
      start,
      end,
      "weekly",
    );
    return reply.send({ success: true, data: report });
  });

  // Monthly progress report
  fastify.get("/projects/:projectId/monthly", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const query = monthlyQuerySchema.parse(request.query);
    const { start, end } = getMonthRange(query.month);

    const report = await generateReport(
      fastify,
      projectId,
      tenantId!,
      start,
      end,
      "monthly",
    );
    return reply.send({ success: true, data: report });
  });
};

// ─── Report Generation ───────────────────────────────────────────────────────

async function generateReport(
  fastify: FastifyInstance,
  projectId: string,
  tenantId: string,
  start: Date,
  end: Date,
  period: string,
) {
  // 1. Project info
  const project = await fastify.prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: {
      id: true,
      name: true,
      status: true,
      budget: true,
      startDate: true,
      estimatedEnd: true,
    },
  });

  if (!project) {
    throw fastify.httpErrors.notFound("Project not found");
  }

  // 2. Daily reports in range
  const dailyReports = await fastify.prisma.dailyReport.findMany({
    where: {
      projectId,
      tenantId,
      reportDate: { gte: start, lte: end },
    },
    orderBy: { reportDate: "asc" },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  // 3. Expenses in range
  const expenses = await fastify.prisma.expense.findMany({
    where: {
      projectId,
      tenantId,
      expenseDate: { gte: start, lte: end },
    },
  });

  const expenseByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const exp of expenses) {
    const amount = Number(exp.amount) || 0;
    totalExpenses += amount;
    expenseByCategory[exp.category] =
      (expenseByCategory[exp.category] || 0) + amount;
  }

  // 4. Task stats
  const tasks = await fastify.prisma.task.findMany({
    where: { projectId, tenantId },
    select: { status: true, progressPercent: true },
  });

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t: { status: string }) => t.status === "completed")
      .length,
    inProgress: tasks.filter(
      (t: { status: string }) => t.status === "in_progress",
    ).length,
    pending: tasks.filter((t: { status: string }) => t.status === "pending")
      .length,
    blocked: tasks.filter((t: { status: string }) => t.status === "blocked")
      .length,
    avgProgress:
      tasks.length > 0
        ? Math.round(
            tasks.reduce(
              (sum: number, t: { progressPercent: number }) =>
                sum + (t.progressPercent || 0),
              0,
            ) / tasks.length,
          )
        : 0,
  };

  // 5. Budget health
  const budgetItems = await fastify.prisma.budgetItem.findMany({
    where: { projectId, tenantId },
    select: { estimatedCost: true, actualCost: true, category: true },
  });

  const budgetHealth = {
    totalBudget: Number(project.budget) || 0,
    totalEstimated: budgetItems.reduce(
      (sum: number, b: { estimatedCost: unknown }) =>
        sum + (Number(b.estimatedCost) || 0),
      0,
    ),
    totalActual: budgetItems.reduce(
      (sum: number, b: { actualCost: unknown }) =>
        sum + (Number(b.actualCost) || 0),
      0,
    ),
    percentSpent: 0 as number,
    overBudgetItems: budgetItems.filter(
      (b: { actualCost: unknown; estimatedCost: unknown }) =>
        Number(b.actualCost) > Number(b.estimatedCost),
    ).length,
  };
  budgetHealth.percentSpent =
    budgetHealth.totalBudget > 0
      ? Math.round((budgetHealth.totalActual / budgetHealth.totalBudget) * 100)
      : 0;

  // 6. Photo count
  const photoCount = await fastify.prisma.photo.count({
    where: {
      projectId,
      tenantId,
      createdAt: { gte: start, lte: end },
    },
  });

  // 7. Open RFIs
  const openRfiCount = await fastify.prisma.rFI.count({
    where: {
      projectId,
      tenantId,
      status: { in: ["open", "draft", "under_review"] },
    },
  });

  // 8. Safety incidents in range
  const safetyIncidents = await fastify.prisma.safetyIncident.count({
    where: {
      projectId,
      tenantId,
      incidentDate: { gte: start, lte: end },
    },
  });

  // 9. Change orders summary
  const changeOrders = await fastify.prisma.changeOrder.findMany({
    where: { projectId, tenantId },
    select: { status: true, estimatedCost: true, approvedCost: true },
  });

  const changeOrderSummary = {
    total: changeOrders.length,
    pending: changeOrders.filter((co: { status: string }) =>
      ["draft", "submitted", "under_review"].includes(co.status),
    ).length,
    approved: changeOrders.filter(
      (co: { status: string }) => co.status === "approved",
    ).length,
    totalValue: changeOrders.reduce(
      (sum: number, co: { approvedCost: unknown; estimatedCost: unknown }) =>
        sum + (Number(co.approvedCost) || Number(co.estimatedCost) || 0),
      0,
    ),
  };

  // 10. Workers on site (from daily reports)
  const workerCounts = dailyReports
    .map((r: { workersCount: number | null }) => r.workersCount || 0)
    .filter((c: number) => c > 0);
  const workerStats = {
    avgWorkers:
      workerCounts.length > 0
        ? Math.round(
            workerCounts.reduce((a: number, b: number) => a + b, 0) /
              workerCounts.length,
          )
        : 0,
    maxWorkers: workerCounts.length > 0 ? Math.max(...workerCounts) : 0,
    reportsCount: dailyReports.length,
  };

  return {
    period,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    project,
    dailyReports: dailyReports.map(
      (r: {
        id: string;
        reportDate: Date;
        weather: string | null;
        workSummary: string | null;
        issues: string | null;
        workersCount: number | null;
        author: { name: string } | null;
      }) => ({
        id: r.id,
        reportDate: r.reportDate,
        weather: r.weather,
        workSummary: r.workSummary,
        issues: r.issues,
        workersCount: r.workersCount,
        author: r.author?.name,
      }),
    ),
    expenses: {
      total: totalExpenses,
      byCategory: expenseByCategory,
      count: expenses.length,
    },
    tasks: taskStats,
    budgetHealth,
    photos: { count: photoCount },
    rfis: { openCount: openRfiCount },
    safety: { incidentCount: safetyIncidents },
    changeOrders: changeOrderSummary,
    workers: workerStats,
    generatedAt: new Date().toISOString(),
  };
}
