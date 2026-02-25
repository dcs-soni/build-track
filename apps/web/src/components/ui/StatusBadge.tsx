import type { ReactNode } from "react";

export type StatusVariant = "success" | "warning" | "danger" | "neutral";

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "text-[#4A9079] bg-[#4A9079]/10 border-[#4A9079]/20",
  warning: "text-[#A68B5B] bg-[#A68B5B]/10 border-[#A68B5B]/20",
  danger: "text-[#9E534F] bg-[#9E534F]/10 border-[#9E534F]/20",
  neutral: "text-[#718096] bg-[#718096]/10 border-[#718096]/20",
};

interface StatusBadgeProps {
  /** Visual style variant */
  variant: StatusVariant;
  /** Display label */
  label: string;
  /** Optional leading icon */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Consistent status badge used across the application.
 * Replaces the duplicated inline status pill patterns found on
 * Equipment, Expenses, RFI, Permits, and other pages.
 */
export function StatusBadge({
  variant,
  label,
  icon,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest border ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
