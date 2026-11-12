"use client";

import { useEffect, useState } from "react";
import { Menu, LogOut, UserRound, X, Sprout } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { SidebarNav, SidebarLogo, SidebarCollapseToggle } from "@/components/layout/Sidebar";
import { logout } from "@/services/auth.service";
import { cn } from "@/utils/cn";
import { ROLE_HOME } from "@/lib/constants";
import type { PublicUser } from "@/types/user";

const COLLAPSE_STORAGE_KEY = "agrilease.sidebarCollapsed";

function initials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppChrome({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  const t = useTranslations("common");
  const tNav = useTranslations("common.nav");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Preference is read client-side only (no cookie/SSR sync exists for this
  // yet, unlike preferredLanguage) - defaults to expanded for the server
  // render and the first client pass (so hydration matches), then syncs from
  // localStorage once mounted. This is the standard hydration-safe pattern
  // for a client-only persisted preference, not an unintentional effect - the
  // lint rule below doesn't know that distinction, hence the deliberate
  // suppression rather than restructuring around it.
  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh">
      {/* First stop for keyboard and screen-reader users: jump past the nav. */}
      <a
        href="#main-content"
        className="sr-only z-50 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-3"
      >
        {t("skipToContent")}
      </a>

      {/* Desktop rail */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-border bg-sidebar transition-[width] duration-200 ease-out-quint md:flex",
          collapsed ? "w-[4.5rem]" : "w-64"
        )}
      >
        <SidebarLogo collapsed={collapsed} role={user.role} />
        <SidebarNav user={user} collapsed={collapsed} />
        <SidebarCollapseToggle collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="md:hidden">
          <SheetTitle className="sr-only">{t("mainNavigation")}</SheetTitle>
          <div className="flex items-center justify-between pe-2">
            <SidebarLogo collapsed={false} role={user.role} />
            <SheetClose
              aria-label={t("closeMenu")}
              className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </SheetClose>
          </div>
          <SidebarNav user={user} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="material-chrome sticky top-0 z-30 border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center justify-between gap-2 px-2 sm:px-4 md:px-6">
            <div className="flex items-center gap-1 md:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label={t("openMenu")}
                aria-haspopup="dialog"
                aria-expanded={mobileOpen}
                className="flex size-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted active:bg-muted"
              >
                <Menu className="size-5.5" aria-hidden="true" />
              </button>
              {/* On a phone the rail is hidden, so the header carries the brand
                  and a way home. */}
              <Link
                href={ROLE_HOME[user.role]}
                className="flex min-h-11 items-center gap-2 rounded-lg px-1 font-semibold tracking-tight"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sprout className="size-4" aria-hidden="true" />
                </span>
                <span dir="ltr">agriLease</span>
              </Link>
            </div>

            <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1">
              <LanguageSwitcher isAuthenticated />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("accountMenu")}
                  className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                      {initials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-2 text-sm">
                    <p className="truncate font-medium">{user.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground" dir="ltr">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/profile" />}>
                    <UserRound className="size-4" aria-hidden="true" />
                    {tNav("profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} variant="destructive">
                    <LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />
                    {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
