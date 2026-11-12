export type CalendarItemType =
  | "TASK_DUE"
  | "CROP_PLANTED"
  | "CROP_HARVEST"
  | "RENTAL_START"
  | "RENTAL_END"
  | "SALE_OFFER";

export interface CalendarItem {
  type: CalendarItemType;
  date: string;
  title: string;
  subtitle?: string;
  href?: string;
}
