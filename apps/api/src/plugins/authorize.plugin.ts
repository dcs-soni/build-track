import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Creates a Fastify preHandler that checks whether the current user
 * has one of the allowed roles in the current tenant.
 *
 * Usage in a route:
 *   fastify.delete("/:id", { preHandler: requireRole("owner", "admin") }, handler);
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, userId } = request;

    if (!tenantId || !userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    const membership = await request.server.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      select: { role: true },
    });

    if (!membership || !roles.includes(membership.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `This action requires one of the following roles: ${roles.join(", ")}`,
        },
      });
    }
  };
}
