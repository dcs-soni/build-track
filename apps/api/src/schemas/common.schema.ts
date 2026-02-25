import { z } from "zod";

// ─── Reusable Query Schemas ──────────────────────────────────────────────────

/**
 * Pagination query parameters with safe defaults and bounds.
 * Use `.parse(request.query)` in route handlers to replace unsafe
 * `request.query as Record<string, string>` casts.
 */
export const paginationQuerySchema = z.object({
  page: z.string().default("1").transform(Number).pipe(z.number().int().min(1)),
  limit: z
    .string()
    .default("20")
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
});

/**
 * Common search + pagination query with optional status filter.
 */
export const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
});

// ─── Reusable Param Schemas ──────────────────────────────────────────────────

/**
 * UUID route param validation.
 * Use `.parse(request.params)` to replace `request.params as { id: string }`.
 */
export const idParamSchema = z.object({
  id: z.string().uuid("Invalid resource ID"),
});

/**
 * Project-scoped route param validation.
 */
export const projectIdParamSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

/**
 * Combined project + resource ID params.
 */
export const projectResourceParamSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  id: z.string().uuid("Invalid resource ID"),
});
