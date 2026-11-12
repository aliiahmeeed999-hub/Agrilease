"use client";

import {
  Sprout,
  LayoutDashboard,
  Tractor,
  Store,
  ArrowLeftRight,
  Landmark,
  Sparkles,
  ClipboardCheck,
  CalendarDays,
  Users,
  ClipboardList,
  Inbox,
  HandCoins,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  History,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  CloudSun,
  Droplets,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";
import { ROLE_HOME } from "@/lib/constants";
import type { PublicUser } from "@/types/user";
import type { Role } from "@/generated/prisma/enums";

type NavLabelKey =
  | "dashboard"
  | "farms"
  | "equipment"
  | "marketplace"
  | "myTransactions"
  | "financing"
  | "ai"
  | "tasks"
  | "calendar"
  | "ownerCalendar"
  | "workers"
  | "listings"
  | "rentalRequests"
  | "saleOffers"
  | "financingRequests"
  | "approvedLoans"
  | "users"
  | "listingsModeration"
  | "transactions"
  | "activityLog"
  | "mapSuppliers"
  | "mapClimate"
  | "mapWater"
  | "mapVegetation";

interface NavItem {
  labelKey: NavLabelKey;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  sectionLabelKey?: "sectionOperate" | "sectionEquipment" | "sectionMyBusiness" | "sectionMaps";
  items: NavItem[];
}

const FARMER_SECTIONS: NavSection[] = [
  {
    sectionLabelKey: "sectionOperate",
    items: [
      { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { labelKey: "farms", href: "/farms", icon: Sprout },
      { labelKey: "tasks", href: "/tasks", icon: ClipboardCheck },
      { labelKey: "calendar", href: "/calendar", icon: CalendarDays },
      { labelKey: "workers", href: "/workers", icon: Users },
    ],
  },
  {
    sectionLabelKey: "sectionEquipment",
    items: [
      { labelKey: "equipment", href: "/equipment", icon: Tractor },
      { labelKey: "marketplace", href: "/marketplace", icon: Store },
      { labelKey: "myTransactions", href: "/transactions", icon: ArrowLeftRight },
    ],
  },
  { items: [{ labelKey: "financing", href: "/financing", icon: Landmark }] },
  {
    sectionLabelKey: "sectionMaps",
    items: [
      { labelKey: "mapSuppliers", href: "/maps/suppliers", icon: MapPinned },
      { labelKey: "mapClimate", href: "/maps/climate", icon: CloudSun },
      { labelKey: "mapWater", href: "/maps/water", icon: Droplets },
      { labelKey: "mapVegetation", href: "/maps/vegetation", icon: Leaf },
    ],
  },
  { items: [{ labelKey: "ai", href: "/ai", icon: Sparkles }] },
];

const OWNER_SECTIONS: NavSection[] = [
  { items: [{ labelKey: "dashboard", href: "/owner", icon: LayoutDashboard }] },
  {
    sectionLabelKey: "sectionMyBusiness",
    items: [
      { labelKey: "listings", href: "/owner/listings", icon: ClipboardList },
      { labelKey: "rentalRequests", href: "/owner/bookings", icon: Inbox },
      { labelKey: "saleOffers", href: "/owner/sale-offers", icon: HandCoins },
    ],
  },
  { items: [{ labelKey: "marketplace", href: "/marketplace", icon: Store }] },
  { items: [{ labelKey: "ownerCalendar", href: "/owner/calendar", icon: CalendarDays }] },
];

const BANKER_SECTIONS: NavSection[] = [
  {
    items: [
      { labelKey: "dashboard", href: "/banker", icon: LayoutDashboard },
      { labelKey: "financingRequests", href: "/banker/financing", icon: Landmark },
      { labelKey: "approvedLoans", href: "/banker/loans", icon: CheckCircle2 },
    ],
  },
];

const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { labelKey: "dashboard", href: "/admin", icon: LayoutDashboard },
      { labelKey: "users", href: "/admin/users", icon: Users },
      { labelKey: "listingsModeration", href: "/admin/equipment", icon: ShieldCheck },
      { labelKey: "transactions", href: "/admin/transactions", icon: Receipt },
      { labelKey: "financing", href: "/admin/financing", icon: Landmark },
      { labelKey: "activityLog", href: "/admin/activity-log", icon: History },
    ],
  },
];

const SECTIONS_BY_ROLE: Record<Role, NavSection[]> = {
  FARMER: FARMER_SECTIONS,
  RENTAL_OWNER: OWNER_SECTIONS,
  BANKER: BANKER_SECTIONS,
  ADMIN: ADMIN_SECTIONS,
};

interface SidebarNavProps {
  user: PublicUser;
  collapsed: boolean;
  onNavigate?: () => void;
}

// The nav item that owns the current page: the longest href that matches the
// path on a whole-segment boundary. A plain startsWith() lit up "Dashboard"
// (/owner, /banker, /admin) on every page of those consoles, because every
// console route begins with its own home path.
function activeHref(pathname: string, sections: NavSection[]): string | null {
  let best: string | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && (best === null || item.href.length > best.length)) best = item.href;
    }
  }
  return best;
}

// Shared nav content, rendered both inside the fixed desktop rail and inside
// the mobile sheet - same sections/icons/active-state logic either way, so
// there is no separate mobile IA to keep in sync with the desktop one.
export function SidebarNav({ user, collapsed, onNavigate }: SidebarNavProps) {
  const t = useTranslations("common.nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const sections = SECTIONS_BY_ROLE[user.role];
  const current = activeHref(pathname, sections);

  return (
    <nav aria-label={tCommon("mainNavigation")} className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
      {sections.map((section, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {section.sectionLabelKey && !collapsed && (
            <p className="type-overline px-3 pb-1.5 text-muted-foreground">{t(section.sectionLabelKey)}</p>
          )}
          {section.items.map((item) => {
            const isActive = item.href === current;
            const label = t(item.labelKey);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-label={collapsed ? label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group/nav relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors pointer-coarse:min-h-11",
                  collapsed && "justify-center px-0",
                  // Signature 3: the current page carries a short terracotta
                  // mark on its leading edge, like a bookmark ribbon. A quiet
                  // tint, not a filled block: olive fills are kept for the one
                  // primary action on a screen.
                  isActive
                    ? "bg-sidebar-accent font-semibold text-foreground before:absolute before:inset-y-2 before:-start-3 before:w-1 before:rounded-e-full before:bg-terracotta"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn("size-5 shrink-0", isActive ? "text-primary" : "group-hover/nav:text-foreground")}
                  aria-hidden="true"
                />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );

            if (!collapsed) return link;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="inline-end">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function SidebarLogo({ collapsed, role }: { collapsed: boolean; role: Role }) {
  return (
    <Link
      href={ROLE_HOME[role]}
      className={cn(
        "flex h-14 shrink-0 items-center gap-2.5 px-5 text-base font-semibold tracking-tight",
        collapsed && "justify-center px-0"
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sprout className="size-4.5" aria-hidden="true" />
      </span>
      {/* The brand name is Latin in every locale. */}
      {collapsed ? <span className="sr-only">agriLease</span> : <span dir="ltr">agriLease</span>}
    </Link>
  );
}

export function SidebarCollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const t = useTranslations("common");
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
      aria-expanded={!collapsed}
      className={cn(
        "m-3 flex min-h-10 items-center gap-3 rounded-xl text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        collapsed ? "justify-center px-0" : "px-3"
      )}
    >
      {collapsed ? (
        <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
      ) : (
        <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
      )}
      {!collapsed && t("collapseSidebar")}
    </button>
  );
}
