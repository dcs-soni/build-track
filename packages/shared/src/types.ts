// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TenantRole = "owner" | "admin" | "manager" | "member" | "viewer";

export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  permissions: string[];
  joinedAt: Date;
}

export interface AuthUser extends User {
  memberships: TenantMembership[];
  currentTenantId?: string;
  currentRole?: TenantRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Tenant Types
export type TenantPlan = "free" | "pro" | "enterprise";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  settings: Record<string, unknown>;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Project Types
export type ProjectType =
  | "residential"
  | "commercial"
  | "renovation"
  | "land_development"
  | "mixed_use";
export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  projectType?: ProjectType | null;
  status: ProjectStatus;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate?: Date | null;
  estimatedEnd?: Date | null;
  actualEnd?: Date | null;
  budget?: number | null;
  currency: string;
  coverImage?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  clientAccessEnabled?: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  budgetSpent: number;
  budgetTotal: number;
  tasksCompleted: number;
  tasksTotal: number;
}

// Budget Types
export type BudgetCategory =
  | "labor"
  | "materials"
  | "equipment"
  | "permits"
  | "overhead"
  | "subcontractor"
  | "contingency"
  | "other";
export type BudgetItemStatus = "pending" | "approved" | "paid";

export interface BudgetItem {
  id: string;
  tenantId: string;
  projectId: string;
  category: BudgetCategory;
  description: string;
  estimatedCost: number;
  actualCost: number;
  status: BudgetItemStatus;
  notes?: string | null;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Task Types
export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  tenantId: string;
  projectId: string;
  parentId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: Date | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  assignedTo?: string | null;
  subcontractorId?: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Daily Report Types
export interface DailyReport {
  id: string;
  tenantId: string;
  projectId: string;
  reportDate: Date;
  weather?: string | null;
  temperature?: number | null;
  workSummary?: string | null;
  issues?: string | null;
  safetyNotes?: string | null;
  workersCount?: number | null;
  photos: string[];
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Subcontractor Types
export interface Subcontractor {
  id: string;
  tenantId: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  trade?: string | null;
  licenseNumber?: string | null;
  insuranceExpiry?: Date | null;
  rating?: number | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Permit Types
export type PermitStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export interface Permit {
  id: string;
  tenantId: string;
  projectId: string;
  permitType: string;
  permitNumber?: string | null;
  issuingAgency?: string | null;
  status: PermitStatus;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  expiresAt?: Date | null;
  fees?: number | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Communication Types
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export type NotificationDigestFrequency =
  | "immediate"
  | "daily"
  | "weekly"
  | "none";

export interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  digestFrequency: NotificationDigestFrequency;
  notifyTaskAssigned: boolean;
  notifyRfiAssigned: boolean;
  notifyRfiResponse: boolean;
  notifyProjectUpdates: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectUpdateAudience = "internal" | "client";

export interface ProjectUpdate {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  body: string;
  audience: ProjectUpdateAudience;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// RFI Types
export type RfiStatus =
  | "draft"
  | "open"
  | "under_review"
  | "answered"
  | "closed"
  | "void";
export type RfiPriority = "low" | "normal" | "high" | "urgent";
export type BallInCourt =
  | "contractor"
  | "architect"
  | "engineer"
  | "owner"
  | "consultant";

export interface RFI {
  id: string;
  tenantId: string;
  projectId: string;
  rfiNumber: string;
  subject: string;
  question: string;
  suggestedAnswer?: string | null;
  drawingRef?: string | null;
  specSection?: string | null;
  location?: string | null;
  status: RfiStatus;
  priority: RfiPriority;
  assignedToId?: string | null;
  ballInCourt: BallInCourt;
  dateSubmitted?: Date | null;
  dateRequired: Date;
  dateAnswered?: Date | null;
  dateClosed?: Date | null;
  costImpact: boolean;
  scheduleImpact: boolean;
  costAmount?: number | null;
  scheduleDays?: number | null;
  impactNotes?: string | null;
  officialAnswer?: string | null;
  answeredById?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations that will be returned by API
  assignedTo?: { id: string; name: string; email: string } | null;
  creator?: { id: string; name: string } | null;
  _count?: { responses: number; attachments: number };
  daysUntilDue?: number;
  isOverdue?: boolean;
}

// Equipment Types
export type EquipmentCategory =
  | "tool"
  | "vehicle"
  | "heavy_equipment"
  | "safety"
  | "electronics"
  | "other";
export type EquipmentStatus =
  | "available"
  | "checked_out"
  | "maintenance"
  | "retired"
  | "lost";
export type EquipmentCondition =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "needs_repair";

export interface Equipment {
  id: string;
  tenantId: string;
  assetTag: string;
  name: string;
  category: EquipmentCategory;
  model?: string | null;
  serialNumber?: string | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  currentProjectId?: string | null;
  maintenanceIntervalDays?: number | null;
  nextMaintenanceDate?: Date | null;
  lastMaintenanceDate?: Date | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  currentProject?: { id: string; name: string } | null;
  totalAssignments?: number;
  totalMaintenanceRecords?: number;
  maintenanceDue?: boolean;
}

export interface EquipmentAssignment {
  id: string;
  tenantId: string;
  equipmentId: string;
  projectId?: string | null;
  assignedToId: string;
  assignedById: string;
  purpose?: string | null;
  checkedOutAt: Date;
  expectedReturnAt?: Date | null;
  checkedInAt?: Date | null;
  checkedInById?: string | null;
  conditionOut: EquipmentCondition;
  conditionIn?: EquipmentCondition | null;

  // Relations
  assignedTo?: { id: string; name: string } | null;
  assignedBy?: { id: string; name: string } | null;
  checkedInBy?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
}

// Expense Types
export type ExpenseStatus = "pending" | "approved" | "rejected";

export interface Expense {
  id: string;
  tenantId: string;
  projectId: string;
  budgetItemId?: string | null;
  amount: number;
  currency: string;
  vendor?: string | null;
  description: string;
  category: BudgetCategory;
  receiptUrl?: string | null;
  expenseDate: Date;
  status: ExpenseStatus;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  project?: { id: string; name: string } | null;
  budgetItem?: { id: string; description: string; category: string } | null;
  creator?: { id: string; name: string } | null;
}

// Document Types
export type DocumentFolderType =
  | "folder"
  | "file"
  | "blueprint"
  | "contract"
  | "invoice"
  | "other";

export interface ProjectDocument {
  id: string;
  tenantId: string;
  projectId?: string | null;
  folderId?: string | null;
  name: string;
  type: DocumentFolderType;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storagePath?: string | null;
  version: number;
  tags: string[];
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;

  uploader?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

// Inspection Types
export type InspectionType =
  | "structural"
  | "electrical"
  | "plumbing"
  | "fire_safety"
  | "hvac"
  | "roofing"
  | "foundation"
  | "final"
  | "other";
export type InspectionStatus =
  | "scheduled"
  | "in_progress"
  | "passed"
  | "failed"
  | "needs_reinspection"
  | "cancelled";
export type InspectionResult = "pass" | "fail" | "conditional_pass";

export interface Inspection {
  id: string;
  tenantId: string;
  projectId: string;
  inspectionNumber: string;
  inspectionType: InspectionType;
  title: string;
  description?: string | null;
  status: InspectionStatus;
  result?: InspectionResult | null;
  inspectorId?: string | null;
  inspectorName?: string | null;
  inspectorCompany?: string | null;
  scheduledDate: Date;
  scheduledTime?: string | null;
  completedDate?: Date | null;
  location?: string | null;
  drawingRef?: string | null;
  specSection?: string | null;
  findings?: string | null;
  deficiencies?: string | null;
  correctiveActions?: string | null;
  costImpact: boolean;
  scheduleImpact: boolean;
  estimatedCost?: number | null;
  delayDays?: number | null;
  reportUrl?: string | null;
  photoUrls: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  project?: { id: string; name: string } | null;
  inspector?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
}

// Punch List Types
export type PunchListCategory =
  | "general"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "structural"
  | "finish"
  | "landscape"
  | "other";
export type PunchListPriority = "low" | "medium" | "high" | "critical";
export type PunchListStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "verified"
  | "wont_fix";

export interface PunchListItem {
  id: string;
  tenantId: string;
  projectId: string;
  itemNumber: string;
  title: string;
  description?: string | null;
  category: PunchListCategory;
  priority: PunchListPriority;
  status: PunchListStatus;
  location?: string | null;
  floor?: string | null;
  room?: string | null;
  drawingRef?: string | null;
  assignedToId?: string | null;
  dueDate?: Date | null;
  resolution?: string | null;
  resolvedAt?: Date | null;
  verifiedById?: string | null;
  verifiedAt?: Date | null;
  photoUrls: string[];
  notes?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  project?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
  verifiedBy?: { id: string; name: string } | null;
  creator?: { id: string; name: string } | null;
}

// Safety Incident Types
export type SafetyIncidentType =
  | "near_miss"
  | "first_aid"
  | "recordable"
  | "lost_time"
  | "property_damage"
  | "environmental";
export type SafetySeverity = "low" | "medium" | "high" | "critical";
export type SafetyIncidentStatus =
  | "reported"
  | "investigating"
  | "resolved"
  | "closed";

export interface SafetyIncident {
  id: string;
  tenantId: string;
  projectId: string;
  incidentNumber: string;
  title: string;
  description: string;
  incidentType: SafetyIncidentType;
  severity: SafetySeverity;
  status: SafetyIncidentStatus;
  incidentDate: Date;
  incidentTime?: string | null;
  location?: string | null;
  weather?: string | null;
  injuredParty?: string | null;
  witnesses?: string | null;
  workersOnSite?: number | null;
  rootCause?: string | null;
  immediateAction?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  investigatedAt?: Date | null;
  investigationNotes?: string | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  closureNotes?: string | null;
  oshaRecordable: boolean;
  daysLost: number;
  restrictedDays: number;
  photoUrls: string[];
  reportUrl?: string | null;
  reportedBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  project?: { id: string; name: string } | null;
  reporter?: { id: string; name: string } | null;
}
