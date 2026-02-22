import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const PUBLIC_PATHS = [
  "/health",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/invitations/validate",
  "/api/v1/invitations/accept",
  "/api/v1/client/portal",
];

const tenantPluginAsync: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("tenantId", undefined);
  fastify.decorateRequest("userId", undefined);

  fastify.addHook("preHandler", async (request, reply) => {
    // Skip for public routes — match exact path or path segment boundary
    const pathname = request.url.split("?")[0];
    const isPublic = PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    );
    if (isPublic) {
      return;
    }

    try {
      const decoded = await request.jwtVerify<{
        sub: string;
        tenantId: string;
      }>();
      request.userId = decoded.sub;

      // If a tenant header is provided and differs from the JWT tenant,
      // verify the user actually has membership in the target tenant.
      const tenantHeader = request.headers["x-tenant-id"] as string | undefined;

      if (tenantHeader && tenantHeader !== decoded.tenantId) {
        const membership = await fastify.prisma.tenantMembership.findUnique({
          where: {
            tenantId_userId: {
              tenantId: tenantHeader,
              userId: decoded.sub,
            },
          },
        });

        if (!membership) {
          return reply.status(403).send({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "No access to the requested tenant",
            },
          });
        }

        request.tenantId = tenantHeader;
      } else {
        request.tenantId = decoded.tenantId;
      }
    } catch {
      // JWT verification failed — will be handled by auth guard middleware
    }
  });
};

export const tenantPlugin = fp(tenantPluginAsync, {
  name: "tenant-plugin",
});
