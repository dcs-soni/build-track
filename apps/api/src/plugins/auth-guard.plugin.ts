import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

/**
 * Shared authentication guard plugin.
 *
 * Registers:
 *  1. A scoped rate limit — throttles abusive clients *before* any
 *     expensive auth work runs (60 req/min per IP by default).
 *  2. A preHandler hook that verifies the JWT and ensures a tenant
 *     context exists on the request.
 *
 * Register this plugin on the Fastify scope that contains all
 * protected routes. Auth routes (login, register, refresh) and
 * other public routes must NOT be registered in this scope.
 */
const authGuardAsync: FastifyPluginAsync = async (fastify) => {
  // ── Rate limit (registered first so its hook runs before jwtVerify) ──
  await fastify.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests — please try again later",
      },
    }),
  });

  // ── JWT + tenant verification ──
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
