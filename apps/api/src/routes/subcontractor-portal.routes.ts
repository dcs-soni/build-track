import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import * as argon2 from "argon2";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  accessToken: z.string().min(1),
});

const updateProgressSchema = z.object({
  progressPercent: z.number().int().min(0).max(100),
  notes: z.string().optional(),
});

// Pre-computed dummy hash so argon2.verify always runs, preventing timing-based
// subcontractor enumeration. Same pattern used in auth.routes.ts.
const DUMMY_PORTAL_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$c29tZXJhbmRvbXNhbHQ$YXJnb24yaWRoYXNob3V0cHV0Zm9yZHVtbXk";

/**
 * Verifies a plaintext portal secret against a stored argon2 hash.
 * Always runs the full argon2 computation to prevent timing attacks.
 */
async function verifyPortalSecret(
  plainSecret: string,
  storedHash: string | null,
): Promise<boolean> {
  const hashToCheck = storedHash ?? DUMMY_PORTAL_HASH;
  try {
    return await argon2.verify(hashToCheck, plainSecret);
  } catch {
    return false;
  }
}

// ─── Route Plugin ────────────────────────────────────────────────────────────
// This is registered OUTSIDE the main auth guard since subcontractors
// have their own authentication via access tokens.

export const subcontractorPortalRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  // Login — validates subcontractor access via email + hashed portal secret
  fastify.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find subcontractor by email
    const subcontractor = await fastify.prisma.subcontractor.findFirst({
      where: {
        email: body.email,
        isActive: true,
      },
    });

    if (!subcontractor) {
      // Run a dummy verify to prevent timing-based enumeration
      await verifyPortalSecret(body.accessToken, null);
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or access token",
        },
      });
    }

    // Reject immediately if the subcontractor has no portal secret configured
    if (!subcontractor.portalSecretHash) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "PORTAL_NOT_CONFIGURED",
          message:
            "Portal access has not been configured for this subcontractor",
        },
      });
    }

    // Securely verify the provided access token against the stored hash
    const isValid = await verifyPortalSecret(
      body.accessToken,
      subcontractor.portalSecretHash,
    );

    if (!isValid) {
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
