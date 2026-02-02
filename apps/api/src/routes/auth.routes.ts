import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import * as argon2 from "argon2";
import crypto from "crypto";

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

export const authRoutes: FastifyPluginAsync = async (fastify) => {
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
      const tenantSlug = tenantName
        ? tenantName.toLowerCase().replace(/\s+/g, "-")
        : `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

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
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Store refresh token
    await fastify.prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        tokens: { accessToken, refreshToken, expiresIn: 900 },
      },
    });
  });

  // Login
  fastify.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const { email, password } = body;

    const user = await fastify.prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { tenant: true } } },
    });

    if (!user || !user.passwordHash) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
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
        error: { code: "NO_TENANT", message: "User has no associated tenant" },
      });
    }

    // Generate tokens
    const accessToken = fastify.jwt.sign(
      { sub: user.id, tenantId: defaultMembership.tenantId },
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
    );
    const refreshToken = crypto.randomBytes(64).toString("hex");

    await fastify.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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
  });

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
      where: { token: refreshToken },
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

    // Revoke old token and create new one
    await fastify.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tenantId = user.memberships[0]?.tenantId;
    const accessToken = fastify.jwt.sign(
      { sub: user.id, tenantId },
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
    );
    const newRefreshToken = crypto.randomBytes(64).toString("hex");

    await fastify.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return reply.send({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken, expiresIn: 900 },
    });
  });

  // Get current user
  fastify.get("/me", async (request, reply) => {
    await request.jwtVerify();
    const userId = request.userId;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { tenant: true } } },
    });

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
        memberships: user.memberships.map((m) => ({
          tenantId: m.tenantId,
          tenantName: m.tenant.name,
          tenantSlug: m.tenant.slug,
          role: m.role,
        })),
      },
    });
  });
};
