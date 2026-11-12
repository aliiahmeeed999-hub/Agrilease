"use client";

import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { EquipmentSummaryList } from "@/features/financing/components/EquipmentSummaryList";
import { FINANCING_DOCUMENT_TYPES, type FinancingApplicationPayload, type FinancingDocumentType } from "@/types/financing";

const ACTIVITY_LABELS_KEY = "activityType";
const CLIENT_TYPE_KEY = "clientType";

// A read-only summary of the application. The wizard supplies its own
// actions (back / save draft / submit) below it, so the same summary also
// serves, unchanged, as the view of an application that has been sent.
export function StepRecap({
  values,
  documentUrls,
}: {
  values: FinancingApplicationPayload;
  documentUrls: Partial<Record<FinancingDocumentType, string>>;
  // Kept so existing callers stay valid; the summary itself never edits.
  readOnly?: boolean;
}) {
  const t = useTranslations("financing.apply");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const fmt = (n: number | undefined) => (n !== undefined ? `${format.number(Math.round(n))} ${tCommon("currencyMad")}` : "—");

  return (
    <div className="flex flex-col gap-8">
      <EquipmentSummaryList lines={values.equipmentLines ?? []} plain />

      <RecapSection title={t("recapFinancingTitle")}>
        <RecapRow label={t("recapFinancedAmount")} value={fmt(values.requestedAmountMad)} />
        <RecapRow label={t("recapDownPayment")} value={fmt(values.downPaymentMad)} />
        <RecapRow label={t("recapTerm")} value={values.termMonths ? t("monthsCount", { count: values.termMonths }) : "—"} />
        <RecapRow label={t("recapMonthlyPayment")} value={fmt(values.monthlyPaymentMad)} />
        {values.chosenOfferInstitution && (
          <RecapRow label={t("recapChosenOffer")} value={`${values.chosenOfferInstitution} — ${values.chosenOfferId ?? ""}`} />
        )}
      </RecapSection>

      <RecapSection title={t("recapIdentificationTitle")}>
        <RecapRow label={t("clientTypeLabel")} value={values.clientType ? t(`${CLIENT_TYPE_KEY}.${values.clientType}`) : "—"} />
        <RecapRow label={t("applicantNameLabel")} value={values.applicantName || "—"} />
        <RecapRow label={t("applicantIdNumberLabel")} value={values.applicantIdNumber || "—"} ltr />
        <RecapRow label={t("applicantPhoneLabel")} value={values.applicantPhone || "—"} ltr />
        <RecapRow label={t("applicantEmailLabel")} value={values.applicantEmail || "—"} ltr />
        <RecapRow
          label={t("regionLabel")}
          value={[values.commune, values.province, values.region].filter(Boolean).join(", ") || "—"}
        />
      </RecapSection>

      <RecapSection title={t("recapExploitationTitle")}>
        <RecapRow
          label={t("farmSizeLabel")}
          value={values.farmSizeHectares ? `${format.number(values.farmSizeHectares)} ${tCommon("unitHectare")}` : "—"}
        />
        <RecapRow label={t("farmCountLabel")} value={values.farmCount?.toString() ?? "—"} />
        <RecapRow label={t("employeeCountLabel")} value={values.employeeCount?.toString() ?? "—"} />
        <RecapRow
          label={t("activityTypesLabel")}
          value={values.activityTypes?.length ? values.activityTypes.map((a) => t(`${ACTIVITY_LABELS_KEY}.${a}`)).join(", ") : "—"}
        />
      </RecapSection>

      <RecapSection title={t("recapEligibilityTitle")}>
        <RecapRow label={t("hasPriorFinancingLabel")} value={values.hasPriorFinancing ? tCommon("yes") : tCommon("no")} />
        <RecapRow label={t("subsidyRequestedLabel")} value={values.subsidyRequested ? tCommon("yes") : tCommon("no")} />
      </RecapSection>

      <section>
        <h3 className="type-headline text-foreground">{t("recapDocumentsTitle")}</h3>
        <ul className="mt-2 divide-y divide-border text-sm">
          {FINANCING_DOCUMENT_TYPES.map((docType) => {
            const provided = !!documentUrls[docType];
            return (
              <li key={docType} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-foreground">{t(`documentType.${docType}`)}</span>
                {/* Icon + word, never colour alone. */}
                <span className={provided ? "flex items-center gap-1.5 font-medium text-success" : "flex items-center gap-1.5 text-muted-foreground"}>
                  {provided ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <CircleDashed className="size-4" aria-hidden="true" />
                  )}
                  {provided ? t("documentProvided") : t("documentMissing")}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function RecapSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="type-headline text-foreground">{title}</h3>
      <dl className="mt-2 text-sm">{children}</dl>
    </section>
  );
}

// Label above value on a phone (long French labels and long values both get
// the full width), side by side from the small breakpoint up.
function RecapRow({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <span aria-hidden="true" className="ledger-fill max-sm:hidden" />
      <dd className="tabular font-medium break-words text-foreground sm:text-end" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
