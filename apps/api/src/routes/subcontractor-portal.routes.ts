import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  accessToken: z.string().min(1),
});

const updateProgressSchema = z.object({
  progressPercent: z.number().int().min(0).max(100),
  notes: z.string().optional(),
});

// ─── Route Plugin ────────────────────────────────────────────────────────────
// This is registered OUTSIDE the main auth guard since subcontractors
// have their own authentication via access tokens.

export const subcontractorPortalRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  // Login — validates subcontractor access via email + access token
  fastify.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find subcontractor by email and validate access token
    const subcontractor = await fastify.prisma.subcontractor.findFirst({
      where: {
        email: body.email,
        isActive: true,
      },
    });

    if (!subcontractor) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or access token",
        },
      });
    }

    // For the portal, we use a simple token-based access check.
    // The token is the tenantId + subcontractorId encoding for simplicity.
    // In production, this would use proper hashed tokens.
    const expectedToken = `${subcontractor.tenantId}-${subcontractor.id}`.slice(
      0,
      36,
    );
    if (
      body.accessToken !== expectedToken &&
      body.accessToken !== subcontractor.id
    ) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or access token",
        },
      });
    }

    // Generate a limited JWT for the subcontractor
    const token = fastify.jwt.sign(
      {
        subcontractorId: subcontractor.id,
        tenantId: subcontractor.tenantId,
        type: "subcontractor",
      },
      { expiresIn: "24h" },
    );

    return reply.send({
      success: true,
      data: {
        token,
        subcontractor: {
          id: subcontractor.id,
          companyName: subcontractor.companyName,
          contactName: subcontractor.contactName,
          email: subcontractor.email,
          trade: subcontractor.trade,
        },
      },
    });
  });

  // ── Protected sub-portal routes (require subcontractor JWT) ──────────────

  // Middleware: verify subcontractor JWT
  const verifySubToken = async (
    request: {
      headers: { authorization?: string };
      subcontractorId?: string;
      tenantId?: string;
    },
    reply: { status: (code: number) => { send: (body: unknown) => void } },
  ) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Access token required" },
      });
    }

    try {
      const token = authHeader.slice(7);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = fastify.jwt.verify(token) as any;
      if (decoded.type !== "subcontractor") {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Invalid token type" },
        });
      }
      request.subcontractorId = decoded.subcontractorId;
      request.tenantId = decoded.tenantId;
    } catch {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      });
    }
  };

  // Get subcontractor profile
  fastify.get(
    "/profile",
    { preHandler: [verifySubToken] },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subId = (request as any).subcontractorId;

      const sub = await fastify.prisma.subcontractor.findUnique({
        where: { id: subId },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
          trade: true,
          rating: true,
          completedJobs: true,
          onTimePercent: true,
        },
      });

      if (!sub) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Subcontractor not found" },
        });
      }

      return reply.send({ success: true, data: sub });
    },
  );

  // Get assigned tasks
  fastify.get(
    "/tasks",
    { preHandler: [verifySubToken] },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subId = (request as any).subcontractorId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenantId = (request as any).tenantId;

      const tasks = await fastify.prisma.task.findMany({
        where: {
          subcontractorId: subId,
          tenantId,
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      });

      return reply.send({ success: true, data: tasks });
    },
  );

  // Update task progress
  fastify.patch(
    "/tasks/:taskId/progress",
    { preHandler: [verifySubToken] },
    async (request, reply) => {
      const { taskId } = z
        .object({ taskId: z.string().uuid() })
        .parse(request.params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subId = (request as any).subcontractorId;
      const body = updateProgressSchema.parse(request.body);

      // Verify task belongs to this subcontractor
      const task = await fastify.prisma.task.findFirst({
        where: { id: taskId, subcontractorId: subId },
      });

      if (!task) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Task not found or not assigned to you",
          },
        });
      }

      const updated = await fastify.prisma.task.update({
        where: { id: taskId },
        data: {
          progressPercent: body.progressPercent,
          ...(body.progressPercent === 100 && {
            status: "completed",
            completedAt: new Date(),
          }),
          ...(body.progressPercent > 0 &&
            body.progressPercent < 100 && {
              status: "in_progress",
            }),
        },
        include: {
          project: { select: { id: true, name: true } },
        },
      });

      return reply.send({ success: true, data: updated });
    },
  );
};

// Type augmentation
declare module "fastify" {
  interface FastifyRequest {
    subcontractorId?: string;
  }
}
