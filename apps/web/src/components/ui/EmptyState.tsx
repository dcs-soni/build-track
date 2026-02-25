import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Icon element to display */
  icon: ReactNode;
  /** Primary heading */
  title: string;
  /** Secondary description text */
  description?: string;
  /** Optional action button or element */
  action?: ReactNode;
}

/**
 * Reusable empty state placeholder used when a list or resource
 * has no items to display. Replaces the inline empty-state blocks
 * duplicated across Equipment, Expenses, Documents, etc.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="p-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#111111] border border-[#1A1A1A] flex items-center justify-center mx-auto mb-6">
        {icon}
      </div>
      <h3 className="text-white font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[#4A5568] max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
