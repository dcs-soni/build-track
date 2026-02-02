import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const tenantPluginAsync: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("tenantId", undefined);
  fastify.decorateRequest("userId", undefined);

  fastify.addHook("preHandler", async (request) => {
    // Skip for public routes
    const publicPaths = [
      "/health",
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/auth/refresh",
    ];
    if (publicPaths.some((path) => request.url.startsWith(path))) {
      return;
    }

    // Extract tenant from header or JWT
    const tenantHeader = request.headers["x-tenant-id"] as string | undefined;

    try {
      const decoded = await request.jwtVerify<{
        sub: string;
        tenantId: string;
      }>();
      request.userId = decoded.sub;
      request.tenantId = tenantHeader || decoded.tenantId;
    } catch {
      // JWT verification failed - will be handled by auth middleware
    }
  });
};

export const tenantPlugin = fp(tenantPluginAsync, {
  name: "tenant-plugin",
});
