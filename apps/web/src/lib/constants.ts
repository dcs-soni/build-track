import type { StatusVariant } from "@/components/ui";

// ─── Status → Variant mappings ───────────────────────────────────────────────
// Used by StatusBadge to translate domain statuses into visual variants.

export const PROJECT_STATUS_VARIANT: Record<string, StatusVariant> = {
  planning: "neutral",
  active: "success",
  on_hold: "warning",
  completed: "success",
  cancelled: "danger",
};

export const EXPENSE_STATUS_VARIANT: Record<string, StatusVariant> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

export const EQUIPMENT_STATUS_VARIANT: Record<string, StatusVariant> = {
  available: "success",
  checked_out: "warning",
  maintenance: "danger",
  retired: "danger",
  lost: "danger",
};

export const PERMIT_STATUS_VARIANT: Record<string, StatusVariant> = {
  pending: "warning",
  submitted: "warning",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
};

export const RFI_STATUS_VARIANT: Record<string, StatusVariant> = {
  draft: "neutral",
  open: "warning",
  under_review: "warning",
  answered: "success",
  closed: "success",
  void: "danger",
};

export const TASK_STATUS_VARIANT: Record<string, StatusVariant> = {
  pending: "neutral",
  in_progress: "warning",
  completed: "success",
  blocked: "danger",
};

// ─── Budget / Expense categories ─────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  { value: "materials", label: "Materials" },
  { value: "labor", label: "Labor" },
  { value: "equipment", label: "Equipment" },
  { value: "permits", label: "Permits" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "overhead", label: "Overhead" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
] as const;

// ─── Pagination defaults ─────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
