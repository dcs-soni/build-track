import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  idParamSchema,
  projectIdParamSchema,
} from "../schemas/common.schema.js";

const createDocumentSchema = z.object({
  projectId: z.string().uuid(),
  folderId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  type: z.enum(["folder", "file", "blueprint", "contract", "invoice", "other"]),
  mimeType: z.string().optional().nullable(),
  sizeBytes: z.number().int().optional().nullable(),
  storagePath: z.string().optional().nullable(),
  version: z.number().int().default(1),
  tags: z.array(z.string()).default([]),
});

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  folderId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  version: z.number().int().optional(),
});

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  // List documents for a project (optionally within a specific folder)
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const { folderId } = request.query as Record<string, string>;

    const where: Record<string, unknown> = {
      projectId,
      tenantId,
    };

    if (folderId !== undefined) {
      where.folderId = folderId || null; // handles top-level if folderId is empty string
    }

    const documents = await fastify.prisma.document.findMany({
      where,
      orderBy: [
        { type: "asc" }, // folders first if type=folder
        { name: "asc" },
      ],
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    return reply.send({
      success: true,
      data: documents,
    });
  });

  // Get single document
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const document = await fastify.prisma.document.findFirst({
      where: { id, tenantId },
      include: {
        uploader: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!document) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      });
    }

    // Convert BigInt to Number if needed, prisma client handles BigInt but JSON.stringify doesn't
    const serializedDocument = {
      ...document,
      sizeBytes: document.sizeBytes ? Number(document.sizeBytes) : null,
    };

    return reply.send({ success: true, data: serializedDocument });
  });

  // Create document or folder
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_TENANT", message: "Tenant context required" },
      });
    }

    const body = createDocumentSchema.parse(request.body);

    // Verify project access
    const project = await fastify.prisma.project.findFirst({
      where: { id: body.projectId, tenantId },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // If folderId is provided, verify folder exists and is in the same project
    if (body.folderId) {
      const parentFolder = await fastify.prisma.document.findFirst({
        where: { id: body.folderId, tenantId, projectId: body.projectId },
      });
      if (!parentFolder || parentFolder.type !== "folder") {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_FOLDER",
            message: "Parent folder is invalid",
          },
        });
      }
    }

    const document = await fastify.prisma.document.create({
      data: {
        tenantId,
        projectId: body.projectId,
        folderId: body.folderId || null,
        name: body.name,
        type: body.type,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        storagePath: body.storagePath,
        version: body.version,
        tags: body.tags,
        createdBy: userId,
      },
    });

    const serializedDocument = {
      ...document,
      sizeBytes: document.sizeBytes ? Number(document.sizeBytes) : null,
    };

    return reply.status(201).send({ success: true, data: serializedDocument });
  });

  // Update/Rename document
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const body = updateDocumentSchema.parse(request.body);

    // Verify ownership
    const existing = await fastify.prisma.document.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      });
    }

    // Update
    const result = await fastify.prisma.document.updateMany({
      where: { id, tenantId },
      data: {
        name: body.name,
        folderId: body.folderId,
        tags: body.tags,
        version: body.version,
      },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      });
    }

    const updated = await fastify.prisma.document.findFirst({ where: { id } });

    const serializedDocument = {
      ...updated,
      sizeBytes: updated?.sizeBytes ? Number(updated.sizeBytes) : null,
    };

    return reply.send({ success: true, data: serializedDocument });
  });

  // Delete document
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    // TODO: if type=folder, recursively delete all children.
    // However, Prisma schema might have cascade delete for DocumentHierarchy

    const result = await fastify.prisma.document.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      });
    }

    return reply.status(204).send();
  });
};
