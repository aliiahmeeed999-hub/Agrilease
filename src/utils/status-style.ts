import type {
  EquipmentStatus,
  BookingStatus,
  TaskStatus,
  TaskPriority,
  WorkerStatus,
  FinancingStatus,
} from "@/generated/prisma/enums";

// Typed as Record<Enum, string> (not Record<string, string>) so TypeScript
// forces every consumer to update these maps when a new enum value is added —
// BookingStatus.CANCELLED was previously added to the enum without updating
// every color-map copy, which this centralizes and type-checks against.

// One colour vocabulary for every status in the product, so a colour always
// means the same thing wherever it appears:
//   success (green)  - done / approved / working: nothing needed from you
//   info (blue)      - in motion: being worked on or reviewed
//   warning (ochre)  - waiting on someone: needs attention or a decision
//   destructive (red)- refused, failed or out of service
//   muted (grey)     - inactive, not started, or closed without outcome
// Colour is never the only signal: each badge always carries its text label.
const TONE = {
  success: "bg-success/15 text-success",
  progress: "bg-info/12 text-info",
  attention: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
} as const;

export const EQUIPMENT_STATUS_STYLE: Record<EquipmentStatus, string> = {
  ACTIVE: TONE.success,
  IDLE: TONE.neutral,
  MAINTENANCE: TONE.attention,
  OFFLINE: TONE.danger,
};

export const BOOKING_STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING: TONE.attention,
  APPROVED: TONE.success,
  REJECTED: TONE.danger,
  CANCELLED: TONE.neutral,
};

export const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  PENDING: TONE.neutral,
  IN_PROGRESS: TONE.progress,
  COMPLETED: TONE.success,
  CANCELLED: TONE.danger,
};

// Outlined (bg-transparent + colored border), not the solid tinted chip
// TASK_STATUS_STYLE uses, so a task's priority and its status never read as
// two copies of the same badge even when they share a hue.
export const TASK_PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "border-muted-foreground/40 bg-transparent text-muted-foreground",
  MEDIUM: "border-warning/50 bg-transparent text-warning",
  HIGH: "border-destructive/50 bg-transparent text-destructive",
};

export const WORKER_STATUS_STYLE: Record<WorkerStatus, string> = {
  ACTIVE: TONE.success,
  ON_LEAVE: TONE.neutral,
};

export const FINANCING_STATUS_STYLE: Record<FinancingStatus, string> = {
  DRAFT: TONE.neutral,
  SUBMITTED: TONE.neutral,
  UNDER_REVIEW: TONE.progress,
  CHANGES_REQUESTED: TONE.attention,
  APPROVED: TONE.success,
  REJECTED: TONE.danger,
};
