import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  idParamSchema,
  projectIdParamSchema,
} from "../schemas/common.schema.js";

const uploadPhotoSchema = z.object({
  projectId: z.string().uuid(),
  reportId: z.string().uuid().optional(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().optional(),
  category: z
    .enum([
      "progress",
      "issue",
      "safety",
      "completion",
      "before",
      "after",
      "general",
    ])
    .optional(),
  location: z.string().optional(),
  takenAt: z.string().optional(),
});

const updatePhotoSchema = z.object({
  caption: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  annotations: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        text: z.string(),
      }),
    )
    .optional(),
});

export const photoRoutes: FastifyPluginAsync = async (fastify) => {
  // List photos for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const {
      category,
      startDate,
      endDate,
      page = "1",
      limit = "50",
    } = request.query as Record<string, string>;

    const where = {
      projectId,
      tenantId,
      ...(category && { category }),
      ...(startDate &&
        endDate && {
          takenAt: { gte: new Date(startDate), lte: new Date(endDate) },
        }),
    };

    const [photos, total] = await Promise.all([
      fastify.prisma.photo.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: Math.min(parseInt(limit), 100),
        orderBy: { takenAt: "desc" },
        include: {
          uploader: { select: { id: true, name: true } },
          dailyReport: { select: { id: true, reportDate: true } },
        },
      }),
      fastify.prisma.photo.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        items: photos,
        meta: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  });

  // Get photos grouped by date
  fastify.get("/projects/:projectId/by-date", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const photos = await fastify.prisma.photo.findMany({
      where: { projectId, tenantId },
      orderBy: { takenAt: "desc" },
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        caption: true,
        category: true,
        takenAt: true,
      },
    });

    // Group by date
    const byDate: Record<string, typeof photos> = {};
    photos.forEach((photo) => {
      const dateKey = photo.takenAt.toISOString().split("T")[0];
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(photo);
    });

    return reply.send({
      success: true,
      data: Object.entries(byDate).map(([date, photos]) => ({
        date,
        photos,
        count: photos.length,
      })),
    });
  });

  // Get single photo
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const photo = await fastify.prisma.photo.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true } },
        dailyReport: { select: { id: true, reportDate: true } },
      },
    });

    if (!photo) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Photo not found" },
      });
    }

    return reply.send({ success: true, data: photo });
  });

  // Upload photo (URL-based)
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = uploadPhotoSchema.parse(request.body);

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

    const photo = await fastify.prisma.photo.create({
      data: {
        ...body,
        tenantId,
        uploadedBy: userId,
        takenAt: body.takenAt ? new Date(body.takenAt) : new Date(),
      },
    });

    return reply.status(201).send({ success: true, data: photo });
  });

  // Bulk upload photos
  fastify.post("/bulk", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const { projectId, photos } = request.body as {
      projectId: string;
      photos: Array<{ url: string; caption?: string; category?: string }>;
    };

    if (!Array.isArray(photos) || photos.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_INPUT", message: "Photos array required" },
      });
    }

    if (photos.length > 50) {
      return reply.status(400).send({
        success: false,
        error: { code: "TOO_MANY", message: "Maximum 50 photos per request" },
      });
    }

    // Verify project access
    const project = await fastify.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const created = await fastify.prisma.photo.createMany({
      data: photos.map((p) => ({
        projectId,
        tenantId,
        url: p.url,
        caption: p.caption,
        category: p.category,
        uploadedBy: userId,
        takenAt: new Date(),
      })),
    });

    return reply
      .status(201)
      .send({ success: true, data: { count: created.count } });
  });

  // Update photo
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = updatePhotoSchema.parse(request.body);

    const result = await fastify.prisma.photo.updateMany({
      where: { id, tenantId },
      data: body,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Photo not found" },
      });
    }

    const updated = await fastify.prisma.photo.findFirst({ where: { id } });
    return reply.send({ success: true, data: updated });
  });

  // Delete photo
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.photo.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Photo not found" },
      });
    }

    return reply.status(204).send();
  });

  // Get photo statistics
  fastify.get("/projects/:projectId/stats", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const [total, byCategory] = await Promise.all([
      fastify.prisma.photo.count({ where: { projectId, tenantId } }),
      fastify.prisma.photo.groupBy({
        by: ["category"],
        where: { projectId, tenantId },
        _count: true,
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        total,
        byCategory: byCategory.map((c) => ({
          category: c.category || "general",
          count: c._count,
        })),
      },
    });
  });
};
