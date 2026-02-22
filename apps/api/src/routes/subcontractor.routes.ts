import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const createSubcontractorSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  trade: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  insuranceNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  notes: z.string().optional(),
});

const updateSubcontractorSchema = createSubcontractorSchema.partial().extend({
  rating: z.number().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
  w9Url: z.string().url().optional(),
  insuranceCertUrl: z.string().url().optional(),
});

export const subcontractorRoutes: FastifyPluginAsync = async (fastify) => {

  // List subcontractors
  fastify.get("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const {
      trade,
      search,
      active,
      page = "1",
      limit = "20",
    } = request.query as Record<string, string>;

    const where = {
      tenantId,
      ...(trade && { trade }),
      ...(active !== undefined && { isActive: active === "true" }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: "insensitive" as const } },
          { contactName: { contains: search, mode: "insensitive" as const } },
          { trade: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [subcontractors, total] = await Promise.all([
      fastify.prisma.subcontractor.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { companyName: "asc" },
        include: { _count: { select: { tasks: true } } },
      }),
      fastify.prisma.subcontractor.count({ where }),
    ]);

    // Check for expiring insurance/licenses (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const enriched = subcontractors.map((sub) => ({
      ...sub,
      insuranceExpiring:
        sub.insuranceExpiry && sub.insuranceExpiry <= thirtyDaysFromNow,
      licenseExpiring:
        sub.licenseExpiry && sub.licenseExpiry <= thirtyDaysFromNow,
      insuranceExpired: sub.insuranceExpiry && sub.insuranceExpiry < now,
      licenseExpired: sub.licenseExpiry && sub.licenseExpiry < now,
    }));

    return reply.send({
      success: true,
      data: {
        items: enriched,
        meta: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  });

  // Get single subcontractor with project history
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const subcontractor = await fastify.prisma.subcontractor.findFirst({
      where: { id, tenantId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
            project: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!subcontractor) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: "NOT_FOUND", message: "Subcontractor not found" },
        });
    }

    // Get unique projects worked on
    const projectIds = [
      ...new Set(subcontractor.tasks.map((t) => t.projectId)),
    ];

    return reply.send({
      success: true,
      data: { ...subcontractor, projectCount: projectIds.length },
    });
  });

  // Create subcontractor
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

    const body = createSubcontractorSchema.parse(request.body);

    const subcontractor = await fastify.prisma.subcontractor.create({
      data: {
        ...body,
        tenantId,
        licenseExpiry: body.licenseExpiry
          ? new Date(body.licenseExpiry)
          : undefined,
        insuranceExpiry: body.insuranceExpiry
          ? new Date(body.insuranceExpiry)
          : undefined,
      },
    });

    return reply.status(201).send({ success: true, data: subcontractor });
  });

  // Update subcontractor
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;
    const body = updateSubcontractorSchema.parse(request.body);

    const result = await fastify.prisma.subcontractor.updateMany({
      where: { id, tenantId },
      data: {
        ...body,
        licenseExpiry: body.licenseExpiry
          ? new Date(body.licenseExpiry)
          : undefined,
        insuranceExpiry: body.insuranceExpiry
          ? new Date(body.insuranceExpiry)
          : undefined,
      },
    });

    if (result.count === 0) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: "NOT_FOUND", message: "Subcontractor not found" },
        });
    }

    const updated = await fastify.prisma.subcontractor.findFirst({
      where: { id },
    });
    return reply.send({ success: true, data: updated });
  });

  // Delete subcontractor
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const result = await fastify.prisma.subcontractor.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: "NOT_FOUND", message: "Subcontractor not found" },
        });
    }

    return reply.status(204).send();
  });

  // Get trades (for filtering)
  fastify.get("/trades/list", async (request, reply) => {
    const tenantId = request.tenantId;

    const trades = await fastify.prisma.subcontractor.groupBy({
      by: ["trade"],
      where: { tenantId },
      _count: true,
    });

    return reply.send({
      success: true,
      data: trades
        .filter((t) => t.trade)
        .map((t) => ({ trade: t.trade, count: t._count })),
    });
  });

  // Get expiring compliance
  fastify.get("/compliance/expiring", async (request, reply) => {
    const tenantId = request.tenantId;
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const [expiringInsurance, expiringLicense] = await Promise.all([
      fastify.prisma.subcontractor.findMany({
        where: {
          tenantId,
          isActive: true,
          insuranceExpiry: { lte: thirtyDaysFromNow },
        },
        select: { id: true, companyName: true, insuranceExpiry: true },
        orderBy: { insuranceExpiry: "asc" },
      }),
      fastify.prisma.subcontractor.findMany({
        where: {
          tenantId,
          isActive: true,
          licenseExpiry: { lte: thirtyDaysFromNow },
        },
        select: { id: true, companyName: true, licenseExpiry: true },
        orderBy: { licenseExpiry: "asc" },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        insurance: expiringInsurance.map((s) => ({
          ...s,
          daysRemaining: Math.ceil(
            (s.insuranceExpiry!.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        })),
        license: expiringLicense.map((s) => ({
          ...s,
          daysRemaining: Math.ceil(
            (s.licenseExpiry!.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        })),
      },
    });
  });
};
