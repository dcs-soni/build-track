import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { listQuerySchema, idParamSchema } from "../schemas/common.schema.js";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  projectType: z
    .enum([
      "residential",
      "commercial",
      "renovation",
      "land_development",
      "mixed_use",
    ])
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().optional(),
  estimatedEnd: z.string().optional(),
  budget: z.number().optional(),
  currency: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  status: z
    .enum(["planning", "active", "on_hold", "completed", "cancelled"])
    .optional(),
});

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // List projects
  fastify.get("/", async (request, reply) => {
    const tenantId = request.tenantId;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const { status, search, page, limit } = listQuerySchema.parse(
      request.query,
    );

    const where = {
      tenantId,
      ...(status && { status }),
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [projects, total] = await Promise.all([
      fastify.prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      fastify.prisma.project.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        items: projects,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  // Get single project
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const project = await fastify.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        budgetItems: true,
        tasks: { where: { parentId: null }, orderBy: { sortOrder: "asc" } },
        _count: { select: { tasks: true, documents: true, permits: true } },
      },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    return reply.send({ success: true, data: project });
  });

  // Create project
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createProjectSchema.parse(request.body);

    const project = await fastify.prisma.project.create({
      data: {
        ...body,
        tenantId,
        createdBy: userId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        estimatedEnd: body.estimatedEnd
          ? new Date(body.estimatedEnd)
          : undefined,
      },
    });

    return reply.status(201).send({ success: true, data: project });
  });

  // Update project
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const body = updateProjectSchema.parse(request.body);

    const project = await fastify.prisma.project.updateMany({
      where: { id, tenantId },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        estimatedEnd: body.estimatedEnd
          ? new Date(body.estimatedEnd)
          : undefined,
      },
    });

    if (project.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const updated = await fastify.prisma.project.findFirst({
      where: { id, tenantId },
    });
    return reply.send({ success: true, data: updated });
  });

  // Delete project
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const result = await fastify.prisma.project.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    return reply.status(204).send();
  });

  // Get project dashboard/summary
  fastify.get("/:id/dashboard", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const project = await fastify.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        budgetItems: true,
        tasks: true,
      },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const tasksCompleted = project.tasks.filter(
      (t) => t.status === "completed",
    ).length;
    const budgetSpent = project.budgetItems.reduce(
      (sum, item) => sum + Number(item.actualCost),
      0,
    );
    const budgetTotal = project.budgetItems.reduce(
      (sum, item) => sum + Number(item.estimatedCost),
      0,
    );

    return reply.send({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        status: project.status,
        progress:
          project.tasks.length > 0
            ? Math.round((tasksCompleted / project.tasks.length) * 100)
            : 0,
        budgetSpent,
        budgetTotal: budgetTotal || Number(project.budget) || 0,
        tasksCompleted,
        tasksTotal: project.tasks.length,
      },
    });
  });
};
