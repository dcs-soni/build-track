import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small uppercase label above the title */
  label?: string;
  /** Main page title */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Action buttons / elements on the right side */
  actions?: ReactNode;
}

/**
 * Consistent page header component with label, title, description, and actions.
 * Replaces the duplicated header pattern found on every page in the application.
 */
export function PageHeader({
  label,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        {label && (
          <p className="text-xs tracking-[0.2em] text-[#A68B5B] uppercase mb-3">
            {label}
          </p>
        )}
        <h1 className="text-3xl font-medium text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[#4A5568] mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
