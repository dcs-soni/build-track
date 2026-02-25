import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { projectIdParamSchema } from "../schemas/common.schema.js";

const taskIdParamSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});

export const timelineRoutes: FastifyPluginAsync = async (fastify) => {
  // Get Gantt chart data for a project
  fastify.get("/projects/:projectId", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    // Verify project access
    const project = await fastify.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true, name: true, startDate: true, estimatedEnd: true },
    });

    if (!project) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // Get all tasks with hierarchy
    const tasks = await fastify.prisma.task.findMany({
      where: { projectId, tenantId },
      select: {
        id: true,
        parentId: true,
        title: true,
        status: true,
        startDate: true,
        dueDate: true,
        progressPercent: true,
        dependsOn: true,
        color: true,
        assignee: { select: { id: true, name: true } },
        subcontractor: { select: { id: true, companyName: true } },
        subtasks: { select: { id: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { startDate: "asc" }],
    });

    // Transform to Gantt format
    const ganttData = tasks.map((task) => {
      const start = task.startDate || project.startDate;
      const end = task.dueDate || project.estimatedEnd;

      return {
        id: task.id,
        parentId: task.parentId,
        name: task.title,
        start: start?.toISOString().split("T")[0] || null,
        end: end?.toISOString().split("T")[0] || null,
        progress: task.progressPercent,
        dependencies: task.dependsOn,
        color: task.color || getStatusColor(task.status),
        status: task.status,
        assignee:
          task.assignee?.name || task.subcontractor?.companyName || null,
        hasChildren: task.subtasks.length > 0,
      };
    });

    // Calculate project-level timeline stats
    const allDates = tasks
      .flatMap((t) => [t.startDate, t.dueDate])
      .filter(Boolean)
      .map((d) => new Date(d!).getTime());

    const projectStart =
      allDates.length > 0 ? new Date(Math.min(...allDates)) : project.startDate;
    const projectEnd =
      allDates.length > 0
        ? new Date(Math.max(...allDates))
        : project.estimatedEnd;

    return reply.send({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          startDate: projectStart?.toISOString().split("T")[0],
          endDate: projectEnd?.toISOString().split("T")[0],
        },
        tasks: ganttData,
        summary: {
          totalTasks: tasks.length,
          completed: tasks.filter((t) => t.status === "completed").length,
          inProgress: tasks.filter((t) => t.status === "in_progress").length,
          pending: tasks.filter((t) => t.status === "pending").length,
          overdue: tasks.filter(
            (t) =>
              t.dueDate &&
              new Date(t.dueDate) < new Date() &&
              t.status !== "completed",
          ).length,
        },
      },
    });
  });

  // Update task dates (for drag-and-drop)
  fastify.patch("/tasks/:taskId/dates", async (request, reply) => {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const { startDate, dueDate } = request.body as {
      startDate?: string;
      dueDate?: string;
    };

    if (!startDate && !dueDate) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Provide startDate or dueDate",
        },
      });
    }

    const result = await fastify.prisma.task.updateMany({
      where: { id: taskId, tenantId },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
      },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Task not found" },
      });
    }

    const updated = await fastify.prisma.task.findFirst({
      where: { id: taskId },
    });
    return reply.send({ success: true, data: updated });
  });

  // Update task dependencies
  fastify.patch("/tasks/:taskId/dependencies", async (request, reply) => {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const { dependsOn } = request.body as { dependsOn: string[] };

    if (!Array.isArray(dependsOn)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "dependsOn must be an array",
        },
      });
    }

    // Validate that all dependency IDs exist
    if (dependsOn.length > 0) {
      const existing = await fastify.prisma.task.findMany({
        where: { id: { in: dependsOn }, tenantId },
        select: { id: true },
      });

      if (existing.length !== dependsOn.length) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_DEPENDENCIES",
            message: "Some dependency IDs are invalid",
          },
        });
      }

      // Check for circular dependencies
      if (dependsOn.includes(taskId)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "CIRCULAR_DEPENDENCY",
            message: "Task cannot depend on itself",
          },
        });
      }
    }

    const result = await fastify.prisma.task.updateMany({
      where: { id: taskId, tenantId },
      data: { dependsOn },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Task not found" },
      });
    }

    const updated = await fastify.prisma.task.findFirst({
      where: { id: taskId },
    });
    return reply.send({ success: true, data: updated });
  });

  // Update task progress
  fastify.patch("/tasks/:taskId/progress", async (request, reply) => {
    const { taskId } = taskIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const { progress } = request.body as { progress: number };

    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_INPUT", message: "Progress must be 0-100" },
      });
    }

    const updateData: Record<string, unknown> = { progressPercent: progress };

    // Auto-update status based on progress
    if (progress === 100) {
      updateData.status = "completed";
      updateData.completedAt = new Date();
    } else if (progress > 0) {
      updateData.status = "in_progress";
    }

    const result = await fastify.prisma.task.updateMany({
      where: { id: taskId, tenantId, status: { not: "completed" } },
      data: updateData,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Task not found or already completed",
        },
      });
    }

    const updated = await fastify.prisma.task.findFirst({
      where: { id: taskId },
    });
    return reply.send({ success: true, data: updated });
  });

  // Get critical path
  fastify.get("/projects/:projectId/critical-path", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;

    const tasks = await fastify.prisma.task.findMany({
      where: { projectId, tenantId, status: { not: "completed" } },
      select: {
        id: true,
        title: true,
        dueDate: true,
        dependsOn: true,
        status: true,
      },
      orderBy: { dueDate: "asc" },
    });

    // Find tasks that are on the critical path (no slack)
    // Simplified: tasks with the latest due dates that have dependencies
    const criticalTasks = tasks
      .filter(
        (t) =>
          t.dependsOn.length > 0 ||
          tasks.some((other) => other.dependsOn.includes(t.id)),
      )
      .slice(0, 10);

    return reply.send({
      success: true,
      data: {
        criticalPath: criticalTasks.map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate?.toISOString().split("T")[0],
          status: t.status,
          dependsOn: t.dependsOn,
        })),
      },
    });
  });

  // Get overdue tasks
  fastify.get("/projects/:projectId/overdue", async (request, reply) => {
    const { projectId } = projectIdParamSchema.parse(request.params);
    const tenantId = request.tenantId;
    const now = new Date();

    const overdue = await fastify.prisma.task.findMany({
      where: {
        projectId,
        tenantId,
        status: { not: "completed" },
        dueDate: { lt: now },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        assignee: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    return reply.send({
      success: true,
      data: overdue.map((t) => ({
        ...t,
        daysOverdue: Math.ceil(
          (now.getTime() - new Date(t.dueDate!).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      })),
    });
  });
};

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "#9CA3AF",
    in_progress: "#3B82F6",
    completed: "#10B981",
    blocked: "#EF4444",
    on_hold: "#F59E0B",
  };
  return colors[status] || "#6B7280";
}
