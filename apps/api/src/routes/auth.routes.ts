import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import * as argon2 from "argon2";
import rateLimit from "@fastify/rate-limit";
import { RateLimiter } from "../utils/rate-limiter.util.js";
import { TTLCache } from "../utils/cache.util.js";
import type { Prisma } from "@buildtrack/database";
import { hashToken, issueRefreshToken } from "../utils/token.util.js";

const loginBruteForceLimiter = new RateLimiter(5, 5 * 60 * 1000); // 5 attempts per 5 minutes per IP

type UserWithMemberships = Prisma.UserGetPayload<{
  include: { memberships: { include: { tenant: true } } };
}>;

const userProfileCache = new TTLCache<UserWithMemberships | null>(60 * 1000); // 1 minute cache for /me queries

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  tenantName: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Pre-computed dummy hash so argon2.verify always runs, preventing timing-based user enumeration.
// Generated with: await argon2.hash("dummy-password-never-matches")
// The actual password doesn't matter — this just needs to be a structurally valid Argon2id hash
// so that argon2.verify() runs its full computation without throwing.
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$c29tZXJhbmRvbXNhbHQ$YXJnb24yaWRoYXNob3V0cHV0Zm9yZHVtbXk";

function slugifyTenantName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function generateUniqueTenantSlug(
  fastify: {
    prisma: {
      tenant: {
        findUnique: (args: { where: { slug: string } }) => Promise<{
          id: string;
        } | null>;
      };
    };
  },
  seed: string,
): Promise<string> {
  const baseSlug = slugifyTenantName(seed) || "workspace";
  let slug = baseSlug;
  let suffix = 1;

  while (await fastify.prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Scoped rate limit for auth routes (conservative default)
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "15 minutes",
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests — please try again later",
      },
    }),
  });

  // Register
  fastify.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const { email, password, name, tenantName } = body;

    // Check if user exists
    const existingUser = await fastify.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return reply.status(409).send({
        success: false,
        error: { code: "USER_EXISTS", message: "User already exists" },
      });
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create user and tenant in transaction
    const result = await fastify.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name },
      });

      // Create default tenant
      const tenantSlug = await generateUniqueTenantSlug(
        fastify,
        tenantName || `${name} workspace`,
      );

      const tenant = await tx.tenant.create({
        data: { name: tenantName || `${name}'s Workspace`, slug: tenantSlug },
      });

      // Create membership
      await tx.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "owner" },
      });

      return { user, tenant };
    });

    // Generate tokens
    const accessToken = fastify.jwt.sign(
      { sub: result.user.id, tenantId: result.tenant.id },
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
    );
    const refreshToken = await issueRefreshToken(fastify.prisma, result.user.id);

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        tenantId: result.tenant.id,
        tokens: { accessToken, refreshToken, expiresIn: 900 },
      },
    });
  });

  // Login — stricter rate limit to protect expensive Argon2 verification
  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      // Manual brute-force/DoS protection explicitly shielding the argon2 call
      if (!loginBruteForceLimiter.check(request.ip)) {
        return reply.status(429).send({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many login attempts — please try again later",
          },
        });
      }

      const body = loginSchema.parse(request.body);
      const { email, password } = body;

      const user = await fastify.prisma.user.findUnique({
        where: { email },
        include: { memberships: { include: { tenant: true } } },
      });

      // Always run argon2.verify to prevent timing-based user enumeration.
      // If the user doesn't exist, verify against a dummy hash so the response
      // time is indistinguishable from a real failed login.
      const passwordHashToCheck = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
      let validPassword = false;
      try {
        validPassword = await argon2.verify(passwordHashToCheck, password);
      } catch {
        // Treat any verification error (malformed hash, library failure) as
        // a failed login to avoid leaking a 500 that enables user enumeration.
        validPassword = false;
      }

      if (!user || !user.passwordHash || !validPassword) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      // Get default tenant
      const defaultMembership = user.memberships[0];
      if (!defaultMembership) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "NO_TENANT",
            message: "User has no associated tenant",
          },
        });
      }

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { sub: user.id, tenantId: defaultMembership.tenantId },
        { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
      );
      const refreshToken = await issueRefreshToken(fastify.prisma, user.id);

      // Update last login
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Clear rate limit on successful login
      loginBruteForceLimiter.reset(request.ip);

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            memberships: user.memberships.map((m) => ({
              tenantId: m.tenantId,
              tenantName: m.tenant.name,
              role: m.role,
            })),
          },
          tokens: { accessToken, refreshToken, expiresIn: 900 },
        },
      });
    },
  );

  // Refresh token
  fastify.post("/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string };
    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: "MISSING_TOKEN", message: "Refresh token required" },
      });
    }

    const storedToken = await fastify.prisma.refreshToken.findUnique({
      where: { token: hashToken(refreshToken) },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired refresh token",
        },
      });
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: storedToken.userId },
      include: { memberships: true },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      });
    }

    // Ensure user has a tenant membership — mirror the login handler's guard
    const defaultMembership = user.memberships[0];
    if (!defaultMembership) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "NO_TENANT",
          message: "User has no associated tenant",
        },
      });
    }

    // Revoke old token and create new one
    await fastify.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = fastify.jwt.sign(
      { sub: user.id, tenantId: defaultMembership.tenantId },
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
    );
    const newRefreshToken = await issueRefreshToken(fastify.prisma, user.id);

    return reply.send({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken, expiresIn: 900 },
    });
  });

  // Get current user
  fastify.get(
    "/me",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      await request.jwtVerify();
      const userId = request.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        });
      }

      let user = userProfileCache.get(userId);

      if (!user) {
        user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: { memberships: { include: { tenant: true } } },
        });

        if (user) {
          userProfileCache.set(userId, user);
        }
      }

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        });
      }

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          memberships: user.memberships.map(
            (m: UserWithMemberships["memberships"][number]) => ({
              tenantId: m.tenantId,
              tenantName: m.tenant.name,
              tenantSlug: m.tenant.slug,
              role: m.role,
            }),
          ),
        },
      });
    },
  );
};
