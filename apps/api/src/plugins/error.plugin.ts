import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import { Prisma } from "@buildtrack/database";

const errorHandlerAsync: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.flatten().fieldErrors,
        },
      });
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return reply.status(409).send({
          success: false,
          error: { code: "CONFLICT", message: "Resource already exists" },
        });
      }
      if (error.code === "P2025") {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Resource not found" },
        });
      }
    }

    // Handle HTTP errors from @fastify/sensible
    const statusCode = error.statusCode || 500;
    const message = statusCode < 500 ? error.message : "Internal server error";

    return reply.status(statusCode).send({
      success: false,
      error: { code: "ERROR", message },
    });
  });
};

export const errorHandler = fp(errorHandlerAsync, {
  name: "error-handler",
});
