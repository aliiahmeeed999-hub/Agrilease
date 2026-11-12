import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ConditionReport } from "@/types/marketplace";
import type { Condition } from "@/generated/prisma/enums";

export function ConditionReportCard({ condition, report }: { condition: Condition; report: ConditionReport }) {
  const t = useTranslations("marketplace");
  const format = useFormatter();

  if (condition === "USED") {
    // Nothing was reported for this machine: show no card rather than an empty one.
    const hasContent =
      report.yearOfManufacture !== null ||
      report.hoursUsed !== null ||
      Boolean(report.conditionNotes) ||
      report.conditionPhotos.length > 0;
    if (!hasContent) return null;

    return (
      <Card className="gap-0 p-5 sm:p-6">
        <h2 className="type-headline text-foreground">{t("conditionReportTitle")}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {report.yearOfManufacture !== null && (
            <div>
              <dt className="text-muted-foreground">{t("yearOfManufactureLabel")}</dt>
              <dd className="tabular mt-0.5 text-base font-semibold text-foreground">{report.yearOfManufacture}</dd>
            </div>
          )}
          {report.hoursUsed !== null && (
            <div>
              <dt className="text-muted-foreground">{t("hoursUsedLabel")}</dt>
              <dd className="tabular mt-0.5 text-base font-semibold text-foreground">
                {format.number(report.hoursUsed)} {t("hoursUnit")}
              </dd>
            </div>
          )}
        </dl>
        {report.conditionNotes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">{t("conditionNotesLabel")}</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{report.conditionNotes}</p>
          </div>
        )}
        {report.conditionPhotos.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {report.conditionPhotos.map((url, i) => (
              // Local/relative paths, same convention as Equipment.imageUrl elsewhere.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={t("conditionPhotoAlt", { number: i + 1 })}
                loading="lazy"
                className="aspect-square w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}
      </Card>
    );
  }

  if (report.warrantyMonths === null && !report.dealerCertified) {
    return null;
  }

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <h2 className="type-headline text-foreground">{t("conditionReportTitle")}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {report.warrantyMonths !== null && (
          <Badge variant="outline">{t("warrantyMonthsValue", { months: report.warrantyMonths })}</Badge>
        )}
        {report.dealerCertified && <Badge variant="outline">{t("dealerCertifiedLabel")}</Badge>}
      </div>
    </Card>
  );
}
