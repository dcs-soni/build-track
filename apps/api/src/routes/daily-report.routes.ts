import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const createReportSchema = z.object({
  projectId: z.string().uuid(),
  reportDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "reportDate must be a valid ISO date string",
  }),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  workSummary: z.string().optional(),
  issues: z.string().optional(),
  safetyNotes: z.string().optional(),
  workersCount: z.number().int().min(0).optional(),
  equipmentUsed: z.string().optional(),
  materialsUsed: z.string().optional(),
});

const updateReportSchema = createReportSchema
  .partial()
  .omit({ projectId: true, reportDate: true });

export const dailyReportRoutes: FastifyPluginAsync = async (fastify) => {
  // List reports for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;
    const {
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

    // Validate date query params if provided
    if (
      (startDate && isNaN(Date.parse(startDate))) ||
      (endDate && isNaN(Date.parse(endDate)))
    ) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_PARAMS",
          message: "startDate and endDate must be valid ISO date strings",
        },
      });
    }

    const where = {
      projectId,
      tenantId,
      ...(startDate &&
        endDate && {
          reportDate: { gte: new Date(startDate), lte: new Date(endDate) },
        }),
    };

    const [reports, total] = await Promise.all([
      fastify.prisma.dailyReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { reportDate: "desc" },
        include: {
          author: { select: { name: true, avatarUrl: true } },
          photos: {
            select: { id: true, url: true, thumbnailUrl: true, category: true },
          },
        },
      }),
      fastify.prisma.dailyReport.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        items: reports,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  // Get single report
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const report = await fastify.prisma.dailyReport.findFirst({
      where: { id, tenantId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        photos: true,
        project: { select: { id: true, name: true } },
      },
    });

    if (!report) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Report not found" },
      });
    }

    return reply.send({ success: true, data: report });
  });

  // Create daily report
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createReportSchema.parse(request.body);
    const reportDate = new Date(body.reportDate);

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

    // Rely on the DB-level @@unique([projectId, reportDate]) constraint
    // instead of a non-atomic findFirst pre-check.
    try {
      const report = await fastify.prisma.dailyReport.create({
        data: {
          ...body,
          tenantId,
          reportDate,
          createdBy: userId,
        },
      });

      return reply.status(201).send({ success: true, data: report });
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === "P2002") {
        return reply.status(409).send({
          success: false,
          error: {
            code: "DUPLICATE",
            message: "Report already exists for this date",
          },
        });
      }
      throw err;
    }
  });

  // Update daily report
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const body = updateReportSchema.parse(request.body);

    const result = await fastify.prisma.dailyReport.updateMany({
      where: { id, tenantId },
      data: body,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Report not found" },
      });
    }

    const updated = await fastify.prisma.dailyReport.findFirst({
      where: { id, tenantId },
    });
    return reply.send({ success: true, data: updated });
  });

  // Sign off report
  fastify.post("/:id/sign-off", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    // Only supervisors and admins can sign off reports
    const membership = await fastify.prisma.tenantMembership.findFirst({
      where: { userId, tenantId },
      select: { role: true },
    });

    if (!membership || !["ADMIN", "SUPERVISOR"].includes(membership.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Only supervisors and admins can sign off reports",
        },
      });
    }

    const result = await fastify.prisma.dailyReport.updateMany({
      where: { id, tenantId, supervisorSignOff: false },
      data: {
        supervisorSignOff: true,
        signedOffBy: userId,
        signedOffAt: new Date(),
      },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Report not found or already signed off",
        },
      });
    }

    const updated = await fastify.prisma.dailyReport.findFirst({
      where: { id, tenantId },
    });
    return reply.send({ success: true, data: updated });
  });

  // Delete report
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const result = await fastify.prisma.dailyReport.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Report not found" },
      });
    }

    return reply.status(204).send();
  });

  // Get report calendar (dates with reports)
  fastify.get("/projects/:projectId/calendar", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;
    const { year, month } = request.query as { year?: string; month?: string };

    const now = new Date();
    const parsedYear = year ? parseInt(year, 10) : now.getFullYear();
    const parsedMonth = month ? parseInt(month, 10) : now.getMonth() + 1;

    // Validate: year must be a 4-digit number, month must be 1–12
    const safeYear =
      Number.isFinite(parsedYear) && parsedYear >= 1970 && parsedYear <= 2100
        ? parsedYear
        : now.getFullYear();
    const safeMonth =
      Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : now.getMonth() + 1;

    const startDate = new Date(safeYear, safeMonth - 1, 1);
    const endDate = new Date(safeYear, safeMonth, 0);

    const reports = await fastify.prisma.dailyReport.findMany({
      where: {
        projectId,
        tenantId,
        reportDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        reportDate: true,
        supervisorSignOff: true,
        weather: true,
        workersCount: true,
      },
    });

    return reply.send({
      success: true,
      data: reports.map((r) => ({
        id: r.id,
        date: r.reportDate.toISOString().split("T")[0],
        signedOff: r.supervisorSignOff,
        weather: r.weather,
        workers: r.workersCount,
      })),
    });
  });
};
