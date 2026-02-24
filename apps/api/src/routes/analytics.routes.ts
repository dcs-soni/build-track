import type { FastifyPluginAsync } from "fastify";

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/analytics/summary
   *
   * Cross-project financial analytics for the current tenant.
   * Returns aggregate budget/spend data, per-project breakdown,
   * expense category distribution, and recent expense activity.
   */
  fastify.get("/summary", async (request, reply) => {
    const tenantId = request.tenantId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    // Parallel data fetch — single round-trip per query
    const [projects, budgetItems, expenses, recentExpenses] = await Promise.all(
      [
        // All projects for this tenant
        fastify.prisma.project.findMany({
          where: { tenantId },
          select: {
            id: true,
            name: true,
            status: true,
            budget: true,
            _count: { select: { tasks: true } },
          },
          orderBy: { createdAt: "desc" },
        }),

        // All budget items across projects
        fastify.prisma.budgetItem.findMany({
          where: { tenantId },
          select: {
            projectId: true,
            category: true,
            estimatedCost: true,
            actualCost: true,
            status: true,
          },
        }),

        // Aggregate expenses across all projects
        fastify.prisma.expense.groupBy({
          by: ["category"],
          where: { tenantId },
          _sum: { amount: true },
          _count: true,
        }),

        // Last 10 expenses for the activity feed
        fastify.prisma.expense.findMany({
          where: { tenantId },
          select: {
            id: true,
            description: true,
            amount: true,
            category: true,
            expenseDate: true,
            vendor: true,
            project: { select: { name: true } },
          },
          orderBy: { expenseDate: "desc" },
          take: 10,
        }),
      ],
    );

    // ── Compute aggregates ──────────────────────────────────────────

    // Per-project budget summary
    const projectSummaries = projects.map((project) => {
      const items = budgetItems.filter((bi) => bi.projectId === project.id);
      const estimated = items.reduce((s, i) => s + Number(i.estimatedCost), 0);
      const actual = items.reduce((s, i) => s + Number(i.actualCost), 0);
      const projectBudget = Number(project.budget) || estimated;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: projectBudget,
        estimated,
        actual,
        variance: estimated - actual,
        utilization:
          projectBudget > 0 ? Math.round((actual / projectBudget) * 100) : 0,
        taskCount: project._count.tasks,
      };
    });

    // Totals
    const totalBudget = projectSummaries.reduce((s, p) => s + p.budget, 0);
    const totalEstimated = projectSummaries.reduce(
      (s, p) => s + p.estimated,
      0,
    );
    const totalActual = projectSummaries.reduce((s, p) => s + p.actual, 0);

    // Expense by category
    const expenseByCategory = expenses.map((e) => ({
      category: e.category,
      total: Number(e._sum.amount) || 0,
      count: e._count,
    }));

    // Budget item status distribution
    const budgetStatusCounts = {
      pending: budgetItems.filter((i) => i.status === "pending").length,
      approved: budgetItems.filter((i) => i.status === "approved").length,
      paid: budgetItems.filter((i) => i.status === "paid").length,
    };

    // Budget by category (across all projects)
    const budgetByCategory: Record<
      string,
      { estimated: number; actual: number }
    > = {};
    for (const item of budgetItems) {
      if (!budgetByCategory[item.category]) {
        budgetByCategory[item.category] = { estimated: 0, actual: 0 };
      }
      budgetByCategory[item.category].estimated += Number(item.estimatedCost);
      budgetByCategory[item.category].actual += Number(item.actualCost);
    }

    // Over-budget projects
    const overBudgetProjects = projectSummaries.filter(
      (p) => p.actual > p.budget && p.budget > 0,
    );

    return reply.send({
      success: true,
      data: {
        overview: {
          totalProjects: projects.length,
          activeProjects: projects.filter((p) => p.status === "active").length,
          totalBudget,
          totalEstimated,
          totalActual,
          totalVariance: totalEstimated - totalActual,
          overallUtilization:
            totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0,
          overBudgetCount: overBudgetProjects.length,
        },
        projectBreakdown: projectSummaries,
        expenseByCategory,
        budgetByCategory: Object.entries(budgetByCategory).map(
          ([category, data]) => ({
            category,
            ...data,
            variance: data.estimated - data.actual,
          }),
        ),
        budgetStatusCounts,
        recentExpenses: recentExpenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          category: e.category,
          date: e.expenseDate.toISOString().split("T")[0],
          vendor: e.vendor,
          projectName: e.project.name,
        })),
      },
    });
  });
};
