import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";

export function AdminBreakdownList({
  title,
  counts,
  // Which common.* enum namespace names the keys (e.g. "crop" -> common.crop.WHEAT).
  labelNamespace,
}: {
  title: string;
  counts: Record<string, number>;
  labelNamespace: "equipmentType" | "crop";
}) {
  const t = useTranslations("adminConsole");
  const tCommon = useTranslations("common");
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const max = Math.max(1, ...entries.map(([, c]) => c));

  return (
    <Card className="gap-0 p-5">
      <h2 className="type-headline text-foreground">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("noDataYet")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {entries.map(([key, count]) => (
            <li key={key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{tCommon(`${labelNamespace}.${key}`)}</span>
                <span className="tabular font-semibold">{count}</span>
              </div>
              {/* A thin bar makes the relative sizes readable at a glance. */}
              <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
