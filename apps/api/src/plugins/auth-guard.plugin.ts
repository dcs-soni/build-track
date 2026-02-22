import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/**
 * Shared authentication guard plugin.
 *
 * Registers a preHandler hook that:
 *  1. Verifies the JWT token is present and valid
 *  2. Ensures a tenant context exists on the request
 *
 * Register this plugin on the Fastify scope that contains all
 * protected routes. Auth routes (login, register, refresh) and
 * other public routes must NOT be registered in this scope.
 */
const authGuardAsync: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!request.tenantId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "NO_TENANT",
          message: "Tenant context required",
        },
      });
    }
  });
};

export const authGuardPlugin = fp(authGuardAsync, {
  name: "auth-guard-plugin",
});
