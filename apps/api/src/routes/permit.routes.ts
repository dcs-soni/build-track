import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  idParamSchema,
  projectIdParamSchema,
} from "../schemas/common.schema.js";

const createPermitSchema = z.object({
  projectId: z.string().uuid(),
  permitType: z.string().min(1),
  permitNumber: z.string().optional(),
  issuingAgency: z.string().optional(),
  submittedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  fees: z.number().optional(),
  notes: z.string().optional(),
  applicationUrl: z.string().url().optional(),
  reminderDays: z.number().int().min(1).max(365).optional(),
});

const updatePermitSchema = createPermitSchema
  .partial()
  .omit({ projectId: true })
  .extend({
    status: z
      .enum([
        "pending",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "expired",
      ])
      .optional(),
    approvedAt: z.string().optional(),
    approvalUrl: z.string().url().optional(),
  });

export const permitRoutes: FastifyPluginAsync = async (fastify) => {
  // List permits for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const { status } = request.query as Record<string, string>;

    const permits = await fastify.prisma.permit.findMany({
      where: { projectId, tenantId, ...(status && { status }) },
      orderBy: [{ status: "asc" }, { expiresAt: "asc" }],
    });

    // Enrich with expiry warnings
    const now = new Date();
    const enriched = permits.map((permit) => {
      const daysToExpiry = permit.expiresAt
        ? Math.ceil(
            (permit.expiresAt.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;
      return {
        ...permit,
        daysToExpiry,
        isExpired: permit.expiresAt && permit.expiresAt < now,
        isExpiringSoon:
          daysToExpiry !== null &&
          daysToExpiry <= permit.reminderDays &&
          daysToExpiry > 0,
      };
    });

    return reply.send({ success: true, data: enriched });
  });

  // Get single permit
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const permit = await fastify.prisma.permit.findFirst({
      where: { id, tenantId },
      include: { project: { select: { id: true, name: true } } },
    });

    if (!permit) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Permit not found" },
      });
    }

    return reply.send({ success: true, data: permit });
  });

  // Create permit
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createPermitSchema.parse(request.body);

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

    const permit = await fastify.prisma.permit.create({
      data: {
        ...body,
        tenantId,
        submittedAt: body.submittedAt ? new Date(body.submittedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
    });

    return reply.status(201).send({ success: true, data: permit });
  });

  // Update permit
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = updatePermitSchema.parse(request.body);

    const updateData: Record<string, unknown> = { ...body };

    // Handle date conversions
    if (body.submittedAt) updateData.submittedAt = new Date(body.submittedAt);
    if (body.approvedAt) updateData.approvedAt = new Date(body.approvedAt);
    if (body.expiresAt) updateData.expiresAt = new Date(body.expiresAt);

    // Auto-set review started when status changes to under_review
    if (body.status === "under_review") {
      updateData.reviewStarted = new Date();
    }

    const result = await fastify.prisma.permit.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Permit not found" },
      });
    }

    const updated = await fastify.prisma.permit.findFirst({ where: { id } });
    return reply.send({ success: true, data: updated });
  });

  // Quick status updates
  fastify.post("/:id/submit", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.permit.updateMany({
      where: { id, tenantId, status: "pending" },
      data: { status: "submitted", submittedAt: new Date() },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Permit not found or not in pending status",
        },
      });
    }

    const updated = await fastify.prisma.permit.findFirst({ where: { id } });
    return reply.send({ success: true, data: updated });
  });

  fastify.post("/:id/approve", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const { permitNumber, expiresAt } = request.body as {
      permitNumber?: string;
      expiresAt?: string;
    };

    const result = await fastify.prisma.permit.updateMany({
      where: { id, tenantId, status: { in: ["submitted", "under_review"] } },
      data: {
        status: "approved",
        approvedAt: new Date(),
        ...(permitNumber && { permitNumber }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      },
    });

    if (result.count === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Permit not found or not in valid status for approval",
        },
      });
    }

    const updated = await fastify.prisma.permit.findFirst({ where: { id } });
    return reply.send({ success: true, data: updated });
  });

  // Delete permit
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.permit.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Permit not found" },
      });
    }

    return reply.status(204).send();
  });

  // Get all expiring permits across projects
  fastify.get("/expiring", async (request, reply) => {
    const tenantId = request.tenantId;
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const expiring = await fastify.prisma.permit.findMany({
      where: {
        tenantId,
        status: "approved",
        expiresAt: { lte: sixtyDaysFromNow },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { expiresAt: "asc" },
    });

    return reply.send({
      success: true,
      data: expiring.map((p) => ({
        ...p,
        daysToExpiry: Math.ceil(
          (p.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
        isExpired: p.expiresAt! < now,
      })),
    });
  });
};
