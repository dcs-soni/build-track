/**
 * RFI (Request for Information) Routes
 *
 * Industry-standard RFI management following software development best practices:
 * - Zod validation schemas for type safety
 * - State machine pattern for workflow transitions
 * - Ball-in-court tracking for accountability
 * - Activity logging integration
 *
 * @module rfi.routes
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { notifyUsers } from "../utils/notifications.js";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// RFI Status values: draft, open, under_review, answered, closed, void
// RFI Priority values: low, normal, high, urgent
// Ball-in-court values: contractor, architect, engineer, owner, consultant
const RFI_PRIORITY = ["low", "normal", "high", "urgent"] as const;
const BALL_IN_COURT = [
  "contractor",
  "architect",
  "engineer",
  "owner",
  "consultant",
] as const;

const createRFISchema = z.object({
  projectId: z.string().uuid(),
  subject: z.string().min(1).max(255),
  question: z.string().min(1),
  suggestedAnswer: z.string().optional(),
  drawingRef: z.string().max(255).optional(),
  specSection: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
  priority: z.enum(RFI_PRIORITY).optional(),
  assignedToId: z.string().uuid().optional(),
  ballInCourt: z.enum(BALL_IN_COURT).optional(),
  dateRequired: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "dateRequired must be a valid ISO date string",
  }),
  costImpact: z.boolean().optional(),
  scheduleImpact: z.boolean().optional(),
  costAmount: z.number().optional(),
  scheduleDays: z.number().int().optional(),
  impactNotes: z.string().optional(),
  distributionUserIds: z.array(z.string().uuid()).optional(),
});

const updateRFISchema = createRFISchema.partial().omit({ projectId: true });

const respondToRFISchema = z.object({
  response: z.string().min(1),
  isOfficial: z.boolean().optional(),
});

const closeRFISchema = z.object({
  officialAnswer: z.string().optional(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates the next RFI number for a project
 * Format: {sequence} (e.g., "001", "002")
 * The frontend/reports will display as PROJ-RFI-001
 */
async function generateRFINumber(
  tx: import("@buildtrack/database").Prisma.TransactionClient,
  projectId: string,
): Promise<string> {
  const lastRFI = await tx.rFI.findFirst({
    where: { projectId },
    orderBy: { rfiNumber: "desc" },
    select: { rfiNumber: true },
  });

  if (!lastRFI) {
    return "001";
  }

  const lastNum = parseInt(lastRFI.rfiNumber, 10);
  return (lastNum + 1).toString().padStart(3, "0");
}

/**
 * Valid state transitions for RFI workflow
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["open", "void"],
  open: ["under_review", "answered", "void"],
  under_review: ["answered", "open", "void"],
  answered: ["closed", "open"], // Can reopen if additional clarification needed
  closed: [], // Terminal state
  void: [], // Terminal state
};

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// =============================================================================
// ROUTES
// =============================================================================

export const rfiRoutes: FastifyPluginAsync = async (fastify) => {
  // ---------------------------------------------------------------------------
  // LIST RFIs FOR A PROJECT
  // ---------------------------------------------------------------------------
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;
    const query = request.query as Record<string, string>;

    // Build filter
    const where: Record<string, unknown> = { projectId, tenantId };
    if (query.status) where.status = query.status;
    if (query.ballInCourt) where.ballInCourt = query.ballInCourt;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    const rfis = await fastify.prisma.rFI.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        _count: { select: { responses: true, attachments: true } },
      },
      orderBy: [{ status: "asc" }, { dateRequired: "asc" }],
    });

    // Enrich with computed fields
    const now = new Date();
    const enriched = rfis.map((rfi) => {
      const daysUntilDue = Math.ceil(
        (new Date(rfi.dateRequired).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return {
        ...rfi,
        daysUntilDue,
        isOverdue:
          daysUntilDue < 0 &&
          !["closed", "void", "answered"].includes(rfi.status),
        responseCount: rfi._count.responses,
        attachmentCount: rfi._count.attachments,
      };
    });

    return reply.send({ success: true, data: enriched });
  });

  // ---------------------------------------------------------------------------
  // GET SINGLE RFI WITH FULL DETAILS
  // ---------------------------------------------------------------------------
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const rfi = await fastify.prisma.rFI.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        answeredBy: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        responses: {
          include: { responder: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          include: { uploader: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        distributions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!rfi) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "RFI not found" },
      });
    }

    // Calculate days until due
    const now = new Date();
    const daysUntilDue = Math.ceil(
      (new Date(rfi.dateRequired).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return reply.send({
      success: true,
      data: {
        ...rfi,
        daysUntilDue,
        isOverdue:
          daysUntilDue < 0 &&
          !["closed", "void", "answered"].includes(rfi.status),
      },
    });
  });

  // ---------------------------------------------------------------------------
  // CREATE NEW RFI
  // ---------------------------------------------------------------------------
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "NO_CONTEXT",
          message: "Tenant and user context required",
        },
      });
    }

    const body = createRFISchema.parse(request.body);

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

    // Extract distribution list
    const { distributionUserIds, ...rfiData } = body;

    // Generate RFI number and create RFI atomically to prevent duplicates
    const rfi = await fastify.prisma.$transaction(
      async (tx) => {
        const rfiNumber = await generateRFINumber(tx, body.projectId);

        return tx.rFI.create({
          data: {
            ...rfiData,
            rfiNumber,
            tenantId,
            createdBy: userId,
            dateRequired: new Date(body.dateRequired),
            ballInCourt: body.ballInCourt || "contractor",
            distributions: distributionUserIds?.length
              ? {
                  create: distributionUserIds.map((uid) => ({ userId: uid })),
                }
              : undefined,
          },
          include: {
            assignedTo: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId,
        projectId: body.projectId,
        userId,
        action: "created",
        entityType: "rfi",
        entityId: rfi.id,
        entityName: `RFI-${rfi.rfiNumber}: ${body.subject}`,
      },
    });

    const notifyIds = [rfi.assignedToId, ...(distributionUserIds || [])].filter(
      Boolean,
    ) as string[];

    await notifyUsers(fastify.prisma, {
      tenantId,
      actorId: userId,
      userIds: notifyIds,
      type: "rfi_assigned",
      title: `RFI-${rfi.rfiNumber}: ${body.subject}`,
      message: "New RFI requires your attention.",
      link: `/projects/${body.projectId}`,
      priority: rfi.priority as "low" | "normal" | "high" | "urgent",
      preferenceKey: "notifyRfiAssigned",
    });

    return reply.status(201).send({ success: true, data: rfi });
  });

  // ---------------------------------------------------------------------------
  // UPDATE RFI
  // ---------------------------------------------------------------------------
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = updateRFISchema.parse(request.body);

    // Find existing RFI
    const existing = await fastify.prisma.rFI.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "RFI not found" },
      });
    }

    // Only allow editing draft RFIs (or specific fields on open RFIs)
    if (existing.status !== "draft" && existing.status !== "open") {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Cannot edit RFI in current status",
        },
      });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...body };
    if (body.dateRequired) {
      updateData.dateRequired = new Date(body.dateRequired);
    }

    // Handle distribution list update
    const { distributionUserIds, ...dataWithoutDistribution } =
      updateData as Record<string, unknown> & {
        distributionUserIds?: string[];
      };

    const updated = await fastify.prisma.$transaction(async (tx) => {
      // Reconcile distribution list atomically when provided
      if (distributionUserIds !== undefined) {
        await tx.rFIDistribution.deleteMany({ where: { rfiId: id } });
        if (distributionUserIds?.length) {
          await tx.rFIDistribution.createMany({
            data: distributionUserIds.map((uid: string) => ({
              rfiId: id,
              userId: uid,
            })),
          });
        }
      }

      return tx.rFI.update({
        where: { id },
        data: dataWithoutDistribution,
        include: {
          assignedTo: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
        },
      });
    });

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        projectId: existing.projectId,
        userId: userId!,
        action: "updated",
        entityType: "rfi",
        entityId: id,
        entityName: `RFI-${existing.rfiNumber}: ${existing.subject}`,
        changes: body,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // ---------------------------------------------------------------------------
  // SUBMIT RFI (Draft -> Open)
  // ---------------------------------------------------------------------------
  fastify.post("/:id/submit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    const rfi = await fastify.prisma.rFI.findFirst({
      where: { id, tenantId },
    });

    if (!rfi) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "RFI not found" },
      });
    }

    if (!canTransition(rfi.status, "open")) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_TRANSITION",
          message: `Cannot submit RFI from status: ${rfi.status}`,
        },
      });
    }

    // Update status and set submission date
    const updated = await fastify.prisma.rFI.update({
      where: { id },
      data: {
        status: "open",
        dateSubmitted: new Date(),
        ballInCourt: rfi.assignedToId ? "architect" : rfi.ballInCourt,
      },
    });

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        projectId: rfi.projectId,
        userId: userId!,
        action: "submitted",
        entityType: "rfi",
        entityId: id,
        entityName: `RFI-${rfi.rfiNumber}: ${rfi.subject}`,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // ---------------------------------------------------------------------------
  // ADD RESPONSE TO RFI
  // ---------------------------------------------------------------------------
  fastify.post("/:id/respond", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = respondToRFISchema.parse(request.body);

    const rfi = await fastify.prisma.rFI.findFirst({
      where: { id, tenantId },
    });

    if (!rfi) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "RFI not found" },
      });
    }

    // Can only respond to open or under_review RFIs
    if (!["open", "under_review"].includes(rfi.status)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Cannot respond to RFI in current status",
        },
      });
    }

    // Create response
    const response = await fastify.prisma.rFIResponse.create({
      data: {
        rfiId: id,
        responderId: userId!,
        response: body.response,
        isOfficial: body.isOfficial || false,
      },
      include: {
        responder: { select: { id: true, name: true } },
      },
    });

    // If official response, update RFI status
    const rfiUpdateData: Record<string, unknown> = {
      status: "under_review",
      ballInCourt: "contractor", // Ball goes back to contractor to review
    };

    if (body.isOfficial) {
      rfiUpdateData.status = "answered";
      rfiUpdateData.dateAnswered = new Date();
      rfiUpdateData.officialAnswer = body.response;
      rfiUpdateData.answeredById = userId;
    }

    await fastify.prisma.rFI.update({
      where: { id },
      data: rfiUpdateData,
    });

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        projectId: rfi.projectId,
        userId: userId!,
        action: body.isOfficial ? "answered" : "commented",
        entityType: "rfi",
        entityId: id,
        entityName: `RFI-${rfi.rfiNumber}: ${rfi.subject}`,
      },
    });

    await notifyUsers(fastify.prisma, {
      tenantId: tenantId!,
      actorId: userId!,
      userIds: [rfi.createdBy, rfi.assignedToId].filter(Boolean) as string[],
      type: "rfi_response",
      title: `RFI-${rfi.rfiNumber}: ${rfi.subject}`,
      message: body.isOfficial
        ? "Official response posted."
        : "New comment added.",
      link: `/projects/${rfi.projectId}`,
      priority: rfi.priority as "low" | "normal" | "high" | "urgent",
      preferenceKey: "notifyRfiResponse",
    });

    return reply.status(201).send({ success: true, data: response });
  });

  // ---------------------------------------------------------------------------
  // CLOSE RFI
  // ---------------------------------------------------------------------------
  fastify.post("/:id/close", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = closeRFISchema.parse(request.body);

    const rfi = await fastify.prisma.rFI.findFirst({
      where: { id, tenantId },
    });

    if (!rfi) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "RFI not found" },
      });
    }

    if (!canTransition(rfi.status, "closed")) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_TRANSITION",
          message: `Cannot close RFI from status: ${rfi.status}`,
        },
      });
    }

    const updated = await fastify.prisma.rFI.update({
      where: { id },
      data: {
        status: "closed",
        dateClosed: new Date(),
        officialAnswer: body.officialAnswer || rfi.officialAnswer,
      },
    });

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        projectId: rfi.projectId,
        userId: userId!,
        action: "closed",
        entityType: "rfi",
        entityId: id,
        entityName: `RFI-${rfi.rfiNumber}: ${rfi.subject}`,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // ---------------------------------------------------------------------------
  // VOID RFI
  // ---------------------------------------------------------------------------
  fastify.post("/:id/void", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const userId = request.userId;

    const rfi = await fastify.prisma.rFI.findFirst({
      where: { id, tenantId },
    });

    if (!rfi) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "RFI not found" },
      });
    }

    if (!canTransition(rfi.status, "void")) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_TRANSITION",
          message: `Cannot void RFI from status: ${rfi.status}`,
        },
      });
    }

    const updated = await fastify.prisma.rFI.update({
      where: { id },
      data: { status: "void" },
    });

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        projectId: rfi.projectId,
        userId: userId!,
        action: "voided",
        entityType: "rfi",
        entityId: id,
        entityName: `RFI-${rfi.rfiNumber}: ${rfi.subject}`,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // ---------------------------------------------------------------------------
  // DELETE RFI (Draft only)
  // ---------------------------------------------------------------------------
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const rfi = await fastify.prisma.rFI.findFirst({
      where: { id, tenantId },
    });

    if (!rfi) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "RFI not found" },
      });
    }

    // Only allow deleting draft RFIs
    if (rfi.status !== "draft") {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Only draft RFIs can be deleted. Use void instead.",
        },
      });
    }

    await fastify.prisma.rFI.delete({ where: { id } });

    return reply.status(204).send();
  });

  // ---------------------------------------------------------------------------
  // GET OVERDUE RFIs
  // ---------------------------------------------------------------------------
  fastify.get("/overdue", async (request, reply) => {
    const tenantId = request.tenantId;
    const now = new Date();

    const overdue = await fastify.prisma.rFI.findMany({
      where: {
        tenantId,
        status: { in: ["open", "under_review"] },
        dateRequired: { lt: now },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { dateRequired: "asc" },
    });

    const enriched = overdue.map((rfi) => ({
      ...rfi,
      daysOverdue: Math.ceil(
        (now.getTime() - new Date(rfi.dateRequired).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));

    return reply.send({ success: true, data: enriched });
  });

  // ---------------------------------------------------------------------------
  // GET RFIs BY BALL-IN-COURT
  // ---------------------------------------------------------------------------
  fastify.get("/ball-in-court/:party", async (request, reply) => {
    const { party } = request.params as { party: string };
    const tenantId = request.tenantId;

    if (!(BALL_IN_COURT as readonly string[]).includes(party)) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_PARAM", message: `Invalid party: ${party}` },
      });
    }

    const rfis = await fastify.prisma.rFI.findMany({
      where: {
        tenantId,
        ballInCourt: party,
        status: { in: ["open", "under_review"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { dateRequired: "asc" },
    });

    return reply.send({ success: true, data: rfis });
  });

  // ---------------------------------------------------------------------------
  // RFI STATISTICS / LOG
  // ---------------------------------------------------------------------------
  fastify.get("/projects/:projectId/stats", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const tenantId = request.tenantId;

    const [total, byStatus, byPriority, avgResponseTime] = await Promise.all([
      // Total count
      fastify.prisma.rFI.count({ where: { projectId, tenantId } }),

      // Count by status
      fastify.prisma.rFI.groupBy({
        by: ["status"],
        where: { projectId, tenantId },
        _count: true,
      }),

      // Count by priority
      fastify.prisma.rFI.groupBy({
        by: ["priority"],
        where: { projectId, tenantId },
        _count: true,
      }),

      // Average response time for answered/closed RFIs
      fastify.prisma.rFI.findMany({
        where: {
          projectId,
          tenantId,
          status: { in: ["answered", "closed"] },
          dateSubmitted: { not: null },
          dateAnswered: { not: null },
        },
        select: { dateSubmitted: true, dateAnswered: true },
      }),
    ]);

    // Calculate average response time in days
    let avgDays = 0;
    if (avgResponseTime.length > 0) {
      const totalDays = avgResponseTime.reduce((sum, rfi) => {
        const days = Math.ceil(
          (rfi.dateAnswered!.getTime() - rfi.dateSubmitted!.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return sum + days;
      }, 0);
      avgDays = Math.round(totalDays / avgResponseTime.length);
    }

    // Count overdue
    const now = new Date();
    const overdueCount = await fastify.prisma.rFI.count({
      where: {
        projectId,
        tenantId,
        status: { in: ["open", "under_review"] },
        dateRequired: { lt: now },
      },
    });

    return reply.send({
      success: true,
      data: {
        total,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
        byPriority: Object.fromEntries(
          byPriority.map((p) => [p.priority, p._count]),
        ),
        averageResponseTimeDays: avgDays,
        overdueCount,
      },
    });
  });
};
