/**
 * Equipment/Asset Tracking Routes
 *
 * Enterprise-quality equipment management with:
 * - Full CRUD operations
 * - Check-in/check-out with chain of custody
 * - Maintenance scheduling and tracking
 * - Utilization analytics
 * - Document management
 *
 * @module equipment.routes
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { idParamSchema } from "../schemas/common.schema.js";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const EQUIPMENT_CATEGORY = [
  "tool",
  "vehicle",
  "heavy_equipment",
  "safety",
  "electronics",
  "other",
] as const;
const EQUIPMENT_STATUS = [
  "available",
  "checked_out",
  "maintenance",
  "retired",
  "lost",
] as const;
const EQUIPMENT_CONDITION = [
  "excellent",
  "good",
  "fair",
  "poor",
  "needs_repair",
] as const;
const MAINTENANCE_TYPE = [
  "scheduled",
  "preventive",
  "repair",
  "inspection",
  "calibration",
  "emergency",
] as const;
const MAINTENANCE_STATUS = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "overdue",
] as const;

const createEquipmentSchema = z.object({
  assetTag: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(EQUIPMENT_CATEGORY),
  subcategory: z.string().max(100).optional(),
  manufacturer: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  serialNumber: z.string().max(255).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  warrantyExpiry: z.string().optional(),
  depreciationRate: z.number().min(0).max(100).optional(),
  storageLocation: z.string().max(255).optional(),
  maintenanceIntervalDays: z.number().int().positive().optional(),
  meterReading: z.number().optional(),
  meterUnit: z.string().max(20).optional(),
  imageUrl: z.string().url().optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateEquipmentSchema = createEquipmentSchema.partial().extend({
  status: z.enum(EQUIPMENT_STATUS).optional(),
  condition: z.enum(EQUIPMENT_CONDITION).optional(),
  currentProjectId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const checkoutEquipmentSchema = z.object({
  assignedToId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  purpose: z.string().max(500).optional(),
  expectedReturnAt: z.string().optional(),
  conditionOut: z.enum(EQUIPMENT_CONDITION),
  meterOut: z.number().optional(),
  notesOut: z.string().optional(),
  photoOutUrl: z.string().url().optional(),
  signatureOutUrl: z.string().url().optional(),
});

const checkinEquipmentSchema = z.object({
  conditionIn: z.enum(EQUIPMENT_CONDITION),
  meterIn: z.number().optional(),
  notesIn: z.string().optional(),
  photoInUrl: z.string().url().optional(),
  signatureInUrl: z.string().url().optional(),
});

const createMaintenanceSchema = z.object({
  equipmentId: z.string().uuid(),
  type: z.enum(MAINTENANCE_TYPE),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  scheduledDate: z.string(),
  dueDate: z.string().optional(),
  vendor: z.string().max(255).optional(),
  workOrderNumber: z.string().max(100).optional(),
});

const updateMaintenanceSchema = createMaintenanceSchema
  .partial()
  .omit({ equipmentId: true })
  .extend({
    status: z.enum(MAINTENANCE_STATUS).optional(),
    performedById: z.string().uuid().optional(),
    completedDate: z.string().optional(),
    laborHours: z.number().optional(),
    partsCost: z.number().optional(),
    laborCost: z.number().optional(),
    otherCost: z.number().optional(),
    meterReading: z.number().optional(),
    findings: z.string().optional(),
    actionsTaken: z.string().optional(),
    partsUsed: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number(),
          cost: z.number().optional(),
        }),
      )
      .optional(),
    receiptUrl: z.string().url().optional(),
    followUpRequired: z.boolean().optional(),
    followUpNotes: z.string().optional(),
    nextScheduledDate: z.string().optional(),
  });

// =============================================================================
// ROUTES
// =============================================================================

export const equipmentRoutes: FastifyPluginAsync = async (fastify) => {
  // ---------------------------------------------------------------------------
  // LIST ALL EQUIPMENT
  // ---------------------------------------------------------------------------
  fastify.get("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const query = request.query as Record<string, string>;

    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.condition) where.condition = query.condition;
    if (query.projectId) where.currentProjectId = query.projectId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { assetTag: { contains: query.search, mode: "insensitive" } },
        { serialNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const equipment = await fastify.prisma.equipment.findMany({
      where,
      include: {
        currentProject: { select: { id: true, name: true } },
        _count: { select: { assignments: true, maintenanceRecords: true } },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Enrich with computed fields
    const now = new Date();
    const enriched = equipment.map(
      (eq: {
        id: string;
        nextMaintenanceDate?: Date | null;
        _count: { assignments: number; maintenanceRecords: number };
        [key: string]: unknown;
      }) => {
        const maintenanceDue = eq.nextMaintenanceDate
          ? new Date(eq.nextMaintenanceDate) <= now
          : false;
        return {
          ...eq,
          maintenanceDue,
          totalAssignments: eq._count.assignments,
          totalMaintenanceRecords: eq._count.maintenanceRecords,
        };
      },
    );

    return reply.send({ success: true, data: enriched });
  });

  // ---------------------------------------------------------------------------
  // GET SINGLE EQUIPMENT
  // ---------------------------------------------------------------------------
  fastify.get("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const equipment = await fastify.prisma.equipment.findFirst({
      where: { id, tenantId },
      include: {
        tenant: { select: { id: true, name: true } },
        currentProject: { select: { id: true, name: true } },
        assignments: {
          take: 10,
          orderBy: { checkedOutAt: "desc" },
          include: {
            assignedTo: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        },
        maintenanceRecords: {
          take: 10,
          orderBy: { scheduledDate: "desc" },
          include: {
            performedBy: { select: { id: true, name: true } },
          },
        },
        documents: {
          orderBy: { createdAt: "desc" },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!equipment) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Equipment not found" },
      });
    }

    return reply.send({ success: true, data: equipment });
  });

  // ---------------------------------------------------------------------------
  // CREATE EQUIPMENT
  // ---------------------------------------------------------------------------
  fastify.post("/", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;

    if (!tenantId || !userId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "NO_CONTEXT",
          message: "Tenant and user context required",
        },
      });
    }

    const body = createEquipmentSchema.parse(request.body);

    // Check for duplicate asset tag
    const existing = await fastify.prisma.equipment.findFirst({
      where: { tenantId, assetTag: body.assetTag },
    });
    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: "DUPLICATE", message: "Asset tag already exists" },
      });
    }

    const equipment = await fastify.prisma.equipment.create({
      data: {
        tenantId,
        assetTag: body.assetTag,
        name: body.name,
        description: body.description,
        category: body.category,
        subcategory: body.subcategory,
        manufacturer: body.manufacturer,
        model: body.model,
        serialNumber: body.serialNumber,
        purchaseDate: body.purchaseDate
          ? new Date(body.purchaseDate)
          : undefined,
        purchasePrice: body.purchasePrice,
        warrantyExpiry: body.warrantyExpiry
          ? new Date(body.warrantyExpiry)
          : undefined,
        depreciationRate: body.depreciationRate,
        storageLocation: body.storageLocation,
        maintenanceIntervalDays: body.maintenanceIntervalDays,
        meterReading: body.meterReading,
        meterUnit: body.meterUnit,
        imageUrl: body.imageUrl,
        notes: body.notes,
        customFields: body.customFields
          ? JSON.parse(JSON.stringify(body.customFields))
          : undefined,
        currentValue: body.purchasePrice, // Initial value = purchase price
      },
    });

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId,
        userId,
        action: "created",
        entityType: "equipment",
        entityId: equipment.id,
        entityName: `${body.assetTag}: ${body.name}`,
      },
    });

    return reply.status(201).send({ success: true, data: equipment });
  });

  // ---------------------------------------------------------------------------
  // UPDATE EQUIPMENT
  // ---------------------------------------------------------------------------
  fastify.patch("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = updateEquipmentSchema.parse(request.body);

    const existing = await fastify.prisma.equipment.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Equipment not found" },
      });
    }

    // Prepare update data with date conversions
    const updateData: Record<string, unknown> = { ...body };
    if (body.purchaseDate)
      updateData.purchaseDate = new Date(body.purchaseDate);
    if (body.warrantyExpiry)
      updateData.warrantyExpiry = new Date(body.warrantyExpiry);

    const updated = await fastify.prisma.equipment.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        userId: userId!,
        action: "updated",
        entityType: "equipment",
        entityId: id,
        entityName: `${existing.assetTag}: ${existing.name}`,
        changes: JSON.parse(JSON.stringify(body)),
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // ---------------------------------------------------------------------------
  // DELETE EQUIPMENT
  // ---------------------------------------------------------------------------
  fastify.delete("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const equipment = await fastify.prisma.equipment.findFirst({
      where: { id, tenantId },
    });

    if (!equipment) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Equipment not found" },
      });
    }

    // Soft delete by setting isActive to false
    await fastify.prisma.equipment.update({
      where: { id },
      data: { isActive: false, status: "retired" },
    });

    return reply.status(204).send();
  });

  // ---------------------------------------------------------------------------
  // CHECK OUT EQUIPMENT
  // ---------------------------------------------------------------------------
  fastify.post("/:id/checkout", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = checkoutEquipmentSchema.parse(request.body);

    const equipment = await fastify.prisma.equipment.findFirst({
      where: { id, tenantId },
    });

    if (!equipment) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Equipment not found" },
      });
    }

    if (equipment.status !== "available") {
      return reply.status(400).send({
        success: false,
        error: {
          code: "NOT_AVAILABLE",
          message: `Equipment is currently ${equipment.status}`,
        },
      });
    }

    // Create assignment and update equipment atomically
    const [assignment] = await fastify.prisma.$transaction([
      fastify.prisma.equipmentAssignment.create({
        data: {
          tenantId: tenantId!,
          equipmentId: id,
          projectId: body.projectId,
          assignedToId: body.assignedToId,
          assignedById: userId!,
          purpose: body.purpose,
          expectedReturnAt: body.expectedReturnAt
            ? new Date(body.expectedReturnAt)
            : undefined,
          conditionOut: body.conditionOut,
          meterOut: body.meterOut,
          notesOut: body.notesOut,
          photoOutUrl: body.photoOutUrl,
          signatureOutUrl: body.signatureOutUrl,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      fastify.prisma.equipment.update({
        where: { id },
        data: {
          status: "checked_out",
          condition: body.conditionOut,
          currentProjectId: body.projectId,
          meterReading: body.meterOut,
        },
      }),
    ]);

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        projectId: body.projectId,
        userId: userId!,
        action: "checked_out",
        entityType: "equipment",
        entityId: id,
        entityName: `${equipment.assetTag}: ${equipment.name}`,
        metadata: { assignedToId: body.assignedToId },
      },
    });

    return reply.status(201).send({ success: true, data: assignment });
  });

  // ---------------------------------------------------------------------------
  // CHECK IN EQUIPMENT
  // ---------------------------------------------------------------------------
  fastify.post("/:id/checkin", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = checkinEquipmentSchema.parse(request.body);

    const equipment = await fastify.prisma.equipment.findFirst({
      where: { id, tenantId },
    });

    if (!equipment) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Equipment not found" },
      });
    }

    if (equipment.status !== "checked_out") {
      return reply.status(400).send({
        success: false,
        error: {
          code: "NOT_CHECKED_OUT",
          message: "Equipment is not currently checked out",
        },
      });
    }

    // Find active assignment
    const activeAssignment = await fastify.prisma.equipmentAssignment.findFirst(
      {
        where: { equipmentId: id, checkedInAt: null },
        orderBy: { checkedOutAt: "desc" },
      },
    );

    if (!activeAssignment) {
      return reply.status(400).send({
        success: false,
        error: { code: "NO_ASSIGNMENT", message: "No active assignment found" },
      });
    }

    // Update assignment and equipment atomically
    const [assignment] = await fastify.prisma.$transaction([
      fastify.prisma.equipmentAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          checkedInAt: new Date(),
          checkedInById: userId,
          conditionIn: body.conditionIn,
          meterIn: body.meterIn,
          notesIn: body.notesIn,
          photoInUrl: body.photoInUrl,
          signatureInUrl: body.signatureInUrl,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      fastify.prisma.equipment.update({
        where: { id },
        data: {
          status: "available",
          condition: body.conditionIn,
          currentProjectId: null,
          meterReading: body.meterIn,
        },
      }),
    ]);

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        projectId: activeAssignment.projectId,
        userId: userId!,
        action: "checked_in",
        entityType: "equipment",
        entityId: id,
        entityName: `${equipment.assetTag}: ${equipment.name}`,
      },
    });

    return reply.send({ success: true, data: assignment });
  });

  // ---------------------------------------------------------------------------
  // GET EQUIPMENT ASSIGNMENT HISTORY
  // ---------------------------------------------------------------------------
  fastify.get("/:id/history", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const equipment = await fastify.prisma.equipment.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!equipment) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Equipment not found" },
      });
    }

    const history = await fastify.prisma.equipmentAssignment.findMany({
      where: { equipmentId: id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
        checkedInBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { checkedOutAt: "desc" },
    });

    return reply.send({ success: true, data: history });
  });

  // ---------------------------------------------------------------------------
  // SCHEDULE MAINTENANCE
  // ---------------------------------------------------------------------------
  fastify.post("/maintenance", async (request, reply) => {
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = createMaintenanceSchema.parse(request.body);

    // Verify equipment exists
    const equipment = await fastify.prisma.equipment.findFirst({
      where: { id: body.equipmentId, tenantId },
    });

    if (!equipment) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Equipment not found" },
      });
    }

    const maintenance = await fastify.prisma.equipmentMaintenance.create({
      data: {
        tenantId: tenantId!,
        equipmentId: body.equipmentId,
        type: body.type,
        title: body.title,
        description: body.description,
        priority: body.priority || "normal",
        scheduledDate: new Date(body.scheduledDate),
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        vendor: body.vendor,
        workOrderNumber: body.workOrderNumber,
      },
      include: {
        equipment: { select: { id: true, assetTag: true, name: true } },
      },
    });

    // Update equipment's next maintenance date if this is earlier
    const currentNext = equipment.nextMaintenanceDate;
    const scheduledDate = new Date(body.scheduledDate);
    if (!currentNext || scheduledDate < currentNext) {
      await fastify.prisma.equipment.update({
        where: { id: body.equipmentId },
        data: { nextMaintenanceDate: scheduledDate },
      });
    }

    // Log activity
    await fastify.prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        userId: userId!,
        action: "scheduled",
        entityType: "equipment_maintenance",
        entityId: maintenance.id,
        entityName: `${equipment.assetTag}: ${body.title}`,
      },
    });

    return reply.status(201).send({ success: true, data: maintenance });
  });

  // ---------------------------------------------------------------------------
  // UPDATE MAINTENANCE RECORD
  // ---------------------------------------------------------------------------
  fastify.patch("/maintenance/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const userId = request.userId;
    const body = updateMaintenanceSchema.parse(request.body);

    const maintenance = await fastify.prisma.equipmentMaintenance.findFirst({
      where: { id, tenantId },
      include: {
        equipment: { select: { id: true, assetTag: true, name: true } },
      },
    });

    if (!maintenance) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Maintenance record not found" },
      });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...body };
    if (body.scheduledDate)
      updateData.scheduledDate = new Date(body.scheduledDate);
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.completedDate)
      updateData.completedDate = new Date(body.completedDate);
    if (body.nextScheduledDate)
      updateData.nextScheduledDate = new Date(body.nextScheduledDate);

    // Calculate total cost
    if (
      body.partsCost !== undefined ||
      body.laborCost !== undefined ||
      body.otherCost !== undefined
    ) {
      updateData.totalCost =
        (body.partsCost ?? maintenance.partsCost?.toNumber() ?? 0) +
        (body.laborCost ?? maintenance.laborCost?.toNumber() ?? 0) +
        (body.otherCost ?? maintenance.otherCost?.toNumber() ?? 0);
    }

    const updated = await fastify.prisma.equipmentMaintenance.update({
      where: { id },
      data: updateData,
    });

    // If completed, update equipment
    if (body.status === "completed" || body.completedDate) {
      await fastify.prisma.equipment.update({
        where: { id: maintenance.equipmentId },
        data: {
          lastMaintenanceDate: body.completedDate
            ? new Date(body.completedDate)
            : new Date(),
          nextMaintenanceDate: body.nextScheduledDate
            ? new Date(body.nextScheduledDate)
            : undefined,
          meterReading: body.meterReading,
          condition: "good", // Maintenance typically improves condition
          status: "available", // Make available after maintenance
        },
      });

      // Log activity
      await fastify.prisma.activityLog.create({
        data: {
          tenantId: tenantId!,
          userId: userId!,
          action: "completed",
          entityType: "equipment_maintenance",
          entityId: id,
          entityName: `${maintenance.equipment.assetTag}: ${maintenance.title}`,
        },
      });
    }

    return reply.send({ success: true, data: updated });
  });

  // ---------------------------------------------------------------------------
  // GET UPCOMING MAINTENANCE
  // ---------------------------------------------------------------------------
  fastify.get("/due-maintenance", async (request, reply) => {
    const tenantId = request.tenantId;
    const query = request.query as { days?: string };
    const days = parseInt(query.days || "30", 10);

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const dueMaintenance = await fastify.prisma.equipmentMaintenance.findMany({
      where: {
        tenantId,
        status: { in: ["scheduled", "overdue"] },
        scheduledDate: { lte: futureDate },
      },
      include: {
        equipment: {
          select: { id: true, assetTag: true, name: true, category: true },
        },
        performedBy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });

    // Enrich with overdue status
    const enriched = dueMaintenance.map(
      (m: { scheduledDate: Date; [key: string]: unknown }) => ({
        ...m,
        isOverdue: new Date(m.scheduledDate) < now,
        daysUntilDue: Math.ceil(
          (new Date(m.scheduledDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      }),
    );

    return reply.send({ success: true, data: enriched });
  });

  // ---------------------------------------------------------------------------
  // EQUIPMENT ANALYTICS
  // ---------------------------------------------------------------------------
  fastify.get("/analytics", async (request, reply) => {
    const tenantId = request.tenantId;
    const query = request.query as { startDate?: string; endDate?: string };

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Get counts by status
    const byStatus = await fastify.prisma.equipment.groupBy({
      by: ["status"],
      where: { tenantId, isActive: true },
      _count: true,
    });

    // Get counts by category
    const byCategory = await fastify.prisma.equipment.groupBy({
      by: ["category"],
      where: { tenantId, isActive: true },
      _count: true,
    });

    // Get total value
    const valueResult = await fastify.prisma.equipment.aggregate({
      where: { tenantId, isActive: true },
      _sum: { currentValue: true, purchasePrice: true },
    });

    // Get assignment stats for period
    const assignmentStats = await fastify.prisma.equipmentAssignment.findMany({
      where: {
        tenantId,
        checkedOutAt: { gte: startDate, lte: endDate },
      },
      select: {
        checkedOutAt: true,
        checkedInAt: true,
        equipmentId: true,
      },
    });

    // Calculate utilization
    const totalEquipment = await fastify.prisma.equipment.count({
      where: { tenantId, isActive: true },
    });

    const checkedOutNow = await fastify.prisma.equipment.count({
      where: { tenantId, isActive: true, status: "checked_out" },
    });

    const utilizationRate =
      totalEquipment > 0 ? (checkedOutNow / totalEquipment) * 100 : 0;

    // Maintenance cost summary
    const maintenanceCosts =
      await fastify.prisma.equipmentMaintenance.aggregate({
        where: {
          tenantId,
          status: "completed",
          completedDate: { gte: startDate, lte: endDate },
        },
        _sum: { totalCost: true },
        _count: true,
      });

    return reply.send({
      success: true,
      data: {
        summary: {
          totalEquipment,
          checkedOutNow,
          utilizationRate: Math.round(utilizationRate * 100) / 100,
          totalPurchaseValue: valueResult._sum.purchasePrice?.toNumber() || 0,
          totalCurrentValue: valueResult._sum.currentValue?.toNumber() || 0,
          assignmentsInPeriod: assignmentStats.length,
        },
        byStatus: Object.fromEntries(
          byStatus.map((s: { status: string; _count: number }) => [
            s.status,
            s._count,
          ]),
        ),
        byCategory: Object.fromEntries(
          byCategory.map((c: { category: string; _count: number }) => [
            c.category,
            c._count,
          ]),
        ),
        maintenance: {
          completedCount: maintenanceCosts._count,
          totalCost: maintenanceCosts._sum.totalCost?.toNumber() || 0,
        },
        period: { startDate, endDate },
      },
    });
  });
};
