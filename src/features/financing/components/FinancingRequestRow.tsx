import { ArrowRight, Landmark, MessageSquareText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FINANCING_STATUS_STYLE } from "@/utils/status-style";
import { financingRequestEquipmentLabel } from "@/utils/financing-request-display";
import { cn } from "@/utils/cn";
import type { FinancingRequestListItem } from "@/types/banker";

export function FinancingRequestRow({ request }: { request: FinancingRequestListItem }) {
  const format = useFormatter();
  const t = useTranslations("financing");
  const tCommon = useTranslations("common");
  const isResumable = request.status === "DRAFT" || request.status === "CHANGES_REQUESTED";

  return (
    <Card className="flex flex-col gap-0 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Landmark className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <p className="type-headline text-foreground">{financingRequestEquipmentLabel(request)}</p>
            <Badge className={FINANCING_STATUS_STYLE[request.status]}>{tCommon(`financingStatus.${request.status}`)}</Badge>
          </div>
          <p className="tabular mt-0.5 text-sm text-muted-foreground">
            {t("requestedAmount", { amount: format.number(request.requestedAmountMad) })}
          </p>
        </div>
      </div>

      {/* What the bank said is the most important thing on a request that
          needs changes, so it reads as a message, not a footnote. */}
      {request.reviewNotes && (
        <div className="mt-4 flex gap-3 rounded-xl bg-muted/50 p-3.5">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">{t("reviewNotesLabel")}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground">{request.reviewNotes}</p>
          </div>
        </div>
      )}

      {isResumable && (
        <Link
          href={`/financing/apply/${request.id}`}
          className={cn(
            buttonVariants({ variant: request.status === "CHANGES_REQUESTED" ? "default" : "outline" }),
            "mt-4 sm:w-fit"
          )}
        >
          {t("resumeCta")}
          <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
        </Link>
      )}
    </Card>
  );
}
