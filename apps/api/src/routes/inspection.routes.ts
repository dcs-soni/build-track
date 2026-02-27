import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  idParamSchema,
  projectIdParamSchema,
} from "../schemas/common.schema.js";

const createInspectionSchema = z.object({
  projectId: z.string().uuid(),
  inspectionType: z.enum([
    "structural",
    "electrical",
    "plumbing",
    "fire_safety",
    "hvac",
    "roofing",
    "foundation",
    "final",
    "other",
  ]),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  inspectorId: z.string().uuid().optional(),
  inspectorName: z.string().max(255).optional(),
  inspectorCompany: z.string().max(255).optional(),
  scheduledDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date string",
  }), // ISO date
  scheduledTime: z.string().max(20).optional(),
  location: z.string().max(255).optional(),
  drawingRef: z.string().max(255).optional(),
  specSection: z.string().max(100).optional(),
});

const updateInspectionSchema = createInspectionSchema
  .partial()
  .omit({ projectId: true })
  .extend({
    status: z
      .enum([
        "scheduled",
        "in_progress",
        "passed",
        "failed",
        "needs_reinspection",
        "cancelled",
      ])
      .optional(),
    result: z.enum(["pass", "fail", "conditional_pass"]).optional(),
    findings: z.string().optional(),
    deficiencies: z.string().optional(),
    correctiveActions: z.string().optional(),
    costImpact: z.boolean().optional(),
    scheduleImpact: z.boolean().optional(),
    estimatedCost: z.number().optional(),
    delayDays: z.number().int().optional(),
    reportUrl: z.string().url().optional(),
    photoUrls: z.array(z.string().url()).optional(),
  });

const completeInspectionSchema = z.object({
  result: z.enum(["pass", "fail", "conditional_pass"]),
  findings: z.string().optional(),
  deficiencies: z.string().optional(),
  correctiveActions: z.string().optional(),
  costImpact: z.boolean().optional(),
  scheduleImpact: z.boolean().optional(),
  estimatedCost: z.number().optional(),
  delayDays: z.number().int().optional(),
});

const getInspectionsQuerySchema = z.object({
  status: z
    .enum([
      "scheduled",
      "in_progress",
      "passed",
      "failed",
      "needs_reinspection",
      "cancelled",
    ])
    .optional(),
  type: z
    .enum([
      "structural",
      "electrical",
      "plumbing",
      "fire_safety",
      "hvac",
      "roofing",
      "foundation",
      "final",
      "other",
    ])
    .optional(),
});

export const inspectionRoutes: FastifyPluginAsync = async (fastify) => {
  // List inspections for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const queryResult = getInspectionsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
        },
      });
    }
    const { status, type } = queryResult.data;

    const inspections = await fastify.prisma.inspection.findMany({
      where: {
        projectId,
        tenantId,
        ...(status && { status }),
        ...(type && { inspectionType: type }),
      },
      include: {
        inspector: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledDate: "desc" }],
    });

    return reply.send({ success: true, data: inspections });
  });

  // Get single inspection
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const inspection = await fastify.prisma.inspection.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    if (!inspection) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Inspection not found" },
      });
    }

    return reply.send({ success: true, data: inspection });
  });

  // Create inspection
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createInspectionSchema.parse(request.body);

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

    // Auto-generate inspection number
    const count = await fastify.prisma.inspection.count({
      where: { projectId: body.projectId },
    });
    const inspectionNumber = `INS-${String(count + 1).padStart(3, "0")}`;

    const inspection = await fastify.prisma.inspection.create({
      data: {
        ...body,
        tenantId,
        inspectionNumber,
        scheduledDate: new Date(body.scheduledDate),
        createdBy: userId,
      },
      include: {
        inspector: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    return reply.status(201).send({ success: true, data: inspection });
  });

  // Update inspection
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = updateInspectionSchema.parse(request.body);

    const updateData: Record<string, unknown> = { ...body };
    if (body.scheduledDate)
      updateData.scheduledDate = new Date(body.scheduledDate as string);

    const result = await fastify.prisma.inspection.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Inspection not found" },
      });
    }

    const updated = await fastify.prisma.inspection.findFirst({
      where: { id },
      include: {
        inspector: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Complete inspection with result
  fastify.post("/:id/complete", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = completeInspectionSchema.parse(request.body);

    const status =
      body.result === "fail"
        ? "failed"
        : body.result === "conditional_pass"
          ? "needs_reinspection"
          : "passed";

    const result = await fastify.prisma.inspection.updateMany({
      where: {
        id,
        tenantId,
        status: { in: ["scheduled", "in_progress"] },
      },
      data: {
        status,
        result: body.result,
        completedDate: new Date(),
        findings: body.findings,
        deficiencies: body.deficiencies,
        correctiveActions: body.correctiveActions,
        costImpact: body.costImpact ?? false,
        scheduleImpact: body.scheduleImpact ?? false,
        estimatedCost: body.estimatedCost,
        delayDays: body.delayDays,
      },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Inspection not found or not in a completable status",
        },
      });
    }

    const updated = await fastify.prisma.inspection.findFirst({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        inspector: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Delete inspection
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.inspection.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Inspection not found" },
      });
    }

    return reply.status(204).send();
  });
};
