import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  idParamSchema,
  projectIdParamSchema,
} from "../schemas/common.schema.js";

const createIncidentSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  incidentType: z.enum([
    "near_miss",
    "first_aid",
    "recordable",
    "lost_time",
    "property_damage",
    "environmental",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  incidentDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "Invalid date",
  }), // ISO date
  incidentTime: z.string().max(20).optional(),
  location: z.string().max(255).optional(),
  weather: z.string().max(50).optional(),
  injuredParty: z.string().max(255).optional(),
  witnesses: z.string().optional(),
  workersOnSite: z.number().int().optional(),
  immediateAction: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),
});

const updateIncidentSchema = createIncidentSchema
  .partial()
  .omit({ projectId: true })
  .extend({
    status: z
      .enum(["reported", "investigating", "resolved", "closed"])
      .optional(),
    rootCause: z.string().optional(),
    correctiveAction: z.string().optional(),
    preventiveAction: z.string().optional(),
    investigationNotes: z.string().optional(),
    closureNotes: z.string().optional(),
    oshaRecordable: z.boolean().optional(),
    daysLost: z.number().int().optional(),
    restrictedDays: z.number().int().optional(),
    reportUrl: z.string().url().optional(),
  });

const resolveIncidentSchema = z.object({
  rootCause: z.string().min(1),
  correctiveAction: z.string().min(1),
  preventiveAction: z.string().optional(),
});

const getSafetyIncidentsQuerySchema = z.object({
  status: z
    .enum(["reported", "investigating", "resolved", "closed"])
    .optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  type: z
    .enum([
      "near_miss",
      "first_aid",
      "recordable",
      "lost_time",
      "property_damage",
      "environmental",
    ])
    .optional(),
});

export const safetyIncidentRoutes: FastifyPluginAsync = async (fastify) => {
  // List all incidents across projects (safety dashboard)
  fastify.get("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const queryResult = getSafetyIncidentsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
        },
      });
    }
    const { status, severity, type } = queryResult.data;

    const incidents = await fastify.prisma.safetyIncident.findMany({
      where: {
        tenantId,
        ...(status && { status }),
        ...(severity && { severity }),
        ...(type && { incidentType: type }),
      },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
      orderBy: [{ incidentDate: "desc" }],
      take: 100,
    });

    return reply.send({ success: true, data: incidents });
  });

  // List incidents for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const queryResult = getSafetyIncidentsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
        },
      });
    }
    const { status, severity } = queryResult.data;

    const incidents = await fastify.prisma.safetyIncident.findMany({
      where: {
        projectId,
        tenantId,
        ...(status && { status }),
        ...(severity && { severity }),
      },
      include: {
        reporter: { select: { id: true, name: true } },
      },
      orderBy: [{ incidentDate: "desc" }],
    });

    return reply.send({ success: true, data: incidents });
  });

  // Get single incident
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const incident = await fastify.prisma.safetyIncident.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    });

    if (!incident) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Safety incident not found" },
      });
    }

    return reply.send({ success: true, data: incident });
  });

  // Report a safety incident
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createIncidentSchema.parse(request.body);

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

    // Auto-generate incident number using atomic counter
    const counter = await fastify.prisma.projectIncidentCounter.upsert({
      where: { projectId: body.projectId },
      update: { seq: { increment: 1 } },
      create: { projectId: body.projectId, seq: 1 },
    });
    const incidentNumber = `SI-${String(counter.seq).padStart(3, "0")}`;

    const incident = await fastify.prisma.safetyIncident.create({
      data: {
        ...body,
        tenantId,
        incidentNumber,
        incidentDate: new Date(body.incidentDate),
        reportedBy: userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    });

    return reply.status(201).send({ success: true, data: incident });
  });

  // Update incident
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = updateIncidentSchema.parse(request.body);

    const updateData: Record<string, unknown> = { ...body };
    if (body.incidentDate)
      updateData.incidentDate = new Date(body.incidentDate as string);

    const result = await fastify.prisma.safetyIncident.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Safety incident not found" },
      });
    }

    const updated = await fastify.prisma.safetyIncident.findFirst({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Begin investigation
  fastify.post("/:id/investigate", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.safetyIncident.updateMany({
      where: {
        id,
        tenantId,
        status: "reported",
      },
      data: {
        status: "investigating",
        investigatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Incident not found or not in reported status",
        },
      });
    }

    const updated = await fastify.prisma.safetyIncident.findFirst({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Resolve incident with corrective actions
  fastify.post("/:id/resolve", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = resolveIncidentSchema.parse(request.body);

    const result = await fastify.prisma.safetyIncident.updateMany({
      where: {
        id,
        tenantId,
        status: { in: ["reported", "investigating"] },
      },
      data: {
        status: "resolved",
        rootCause: body.rootCause,
        correctiveAction: body.correctiveAction,
        preventiveAction: body.preventiveAction,
        resolvedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Incident not found or not in a resolvable status",
        },
      });
    }

    const updated = await fastify.prisma.safetyIncident.findFirst({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: updated });
  });

  // Delete incident
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.safetyIncident.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Safety incident not found" },
      });
    }

    return reply.status(204).send();
  });
};
