import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

export function ProfileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm font-medium transition-colors hover:border-primary/40"
    >
      {label}
      <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
    </Link>
  );
}
