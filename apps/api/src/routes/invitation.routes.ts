import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "crypto";

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "member", "viewer", "client"]),
});

export const invitationRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth hook for protected routes
  const authHook = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply
        .status(401)
        .send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
    }
  };

  // List pending invitations
  fastify.get("/", { preHandler: authHook }, async (request, reply) => {
    const tenantId = request.tenantId;

    const invitations = await fastify.prisma.invitation.findMany({
      where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { inviter: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ success: true, data: invitations });
  });

  // Create invitation
  fastify.post("/", { preHandler: authHook }, async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId) {
      return reply
        .status(400)
        .send({
          success: false,
          error: { code: "NO_TENANT", message: "Tenant context required" },
        });
    }

    const body = createInvitationSchema.parse(request.body);

    // Check if user already exists with this email in tenant
    const existingMembership = await fastify.prisma.tenantMembership.findFirst({
      where: { tenantId, user: { email: body.email } },
    });

    if (existingMembership) {
      return reply
        .status(409)
        .send({
          success: false,
          error: {
            code: "ALREADY_MEMBER",
            message: "User is already a member of this organization",
          },
        });
    }

    // Check for existing pending invitation
    const existingInvitation = await fastify.prisma.invitation.findFirst({
      where: {
        tenantId,
        email: body.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return reply
        .status(409)
        .send({
          success: false,
          error: {
            code: "ALREADY_INVITED",
            message: "Invitation already pending for this email",
          },
        });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await fastify.prisma.invitation.create({
      data: {
        tenantId,
        email: body.email,
        role: body.role,
        token,
        expiresAt,
        invitedBy: userId!,
      },
      include: { tenant: { select: { name: true } } },
    });

    // In production, send email here
    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite/${token}`;

    return reply.status(201).send({
      success: true,
      data: { ...invitation, inviteUrl },
      message: "Invitation created. In production, an email would be sent.",
    });
  });

  // Validate invitation token (public route)
  fastify.get("/validate/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const invitation = await fastify.prisma.invitation.findFirst({
      where: { token, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: {
        tenant: { select: { name: true, logoUrl: true } },
        inviter: { select: { name: true } },
      },
    });

    if (!invitation) {
      return reply
        .status(404)
        .send({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired invitation",
          },
        });
    }

    return reply.send({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        tenantName: invitation.tenant.name,
        tenantLogo: invitation.tenant.logoUrl,
        invitedBy: invitation.inviter.name,
        expiresAt: invitation.expiresAt,
      },
    });
  });

  // Accept invitation (with optional new user registration)
  fastify.post("/accept/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const { name, password } = request.body as {
      name?: string;
      password?: string;
    };

    const invitation = await fastify.prisma.invitation.findFirst({
      where: { token, acceptedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!invitation) {
      return reply
        .status(404)
        .send({
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired invitation",
          },
        });
    }

    // Check if user already exists
    let user = await fastify.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user) {
      // Need name and password for new user
      if (!name || !password) {
        return reply
          .status(400)
          .send({
            success: false,
            error: {
              code: "REGISTRATION_REQUIRED",
              message: "Name and password required for new user",
            },
          });
      }

      // Import argon2 for password hashing
      const argon2 = await import("argon2");

      user = await fastify.prisma.user.create({
        data: {
          email: invitation.email,
          name,
          passwordHash: await argon2.hash(password),
        },
      });
    }

    // Create membership and mark invitation accepted
    await fastify.prisma.$transaction([
      fastify.prisma.tenantMembership.create({
        data: {
          tenantId: invitation.tenantId,
          userId: user.id,
          role: invitation.role,
        },
      }),
      fastify.prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    // Generate tokens for auto-login
    const accessToken = fastify.jwt.sign(
      { sub: user.id, tenantId: invitation.tenantId },
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
    );

    return reply.send({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        tokens: { accessToken },
        tenantId: invitation.tenantId,
      },
    });
  });

  // Revoke invitation
  fastify.delete("/:id", { preHandler: authHook }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenantId;

    const result = await fastify.prisma.invitation.deleteMany({
      where: { id, tenantId, acceptedAt: null },
    });

    if (result.count === 0) {
      return reply
        .status(404)
        .send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Invitation not found or already accepted",
          },
        });
    }

    return reply.status(204).send();
  });

  // Resend invitation
  fastify.post(
    "/:id/resend",
    { preHandler: authHook },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.tenantId;

      const invitation = await fastify.prisma.invitation.findFirst({
        where: { id, tenantId, acceptedAt: null },
      });

      if (!invitation) {
        return reply
          .status(404)
          .send({
            success: false,
            error: { code: "NOT_FOUND", message: "Invitation not found" },
          });
      }

      // Generate new token and extend expiry
      const newToken = crypto.randomBytes(32).toString("hex");
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const updated = await fastify.prisma.invitation.update({
        where: { id },
        data: { token: newToken, expiresAt: newExpiresAt },
      });

      const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite/${newToken}`;

      return reply.send({
        success: true,
        data: { ...updated, inviteUrl },
        message: "Invitation resent with new token.",
      });
    },
  );
};
