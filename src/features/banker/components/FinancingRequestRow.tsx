import { useState } from "react";
import { Landmark, User } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFinancingRequestAction } from "@/features/banker/hooks/useFinancingRequestAction";
import { FINANCING_STATUS_STYLE } from "@/utils/status-style";
import { financingRequestEquipmentLabel } from "@/utils/financing-request-display";
import type { FinancingRequestListItem } from "@/types/banker";

export function FinancingRequestRow({ request }: { request: FinancingRequestListItem }) {
  const format = useFormatter();
  const t = useTranslations("bankerConsole");
  const tFinancing = useTranslations("financing");
  const tCommon = useTranslations("common");
  const { act, pendingId, error } = useFinancingRequestAction();
  const [reviewNotes, setReviewNotes] = useState(request.reviewNotes ?? "");
  const isSubmitting = pendingId === request.id;
  const isActionable =
    request.status === "SUBMITTED" || request.status === "UNDER_REVIEW" || request.status === "CHANGES_REQUESTED";

  return (
    <Card className="flex h-full flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Landmark className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium">{financingRequestEquipmentLabel(request)}</p>
            <p className="text-xs text-muted-foreground">
              {tFinancing("requestedAmount", { amount: format.number(request.requestedAmountMad) })}
            </p>
          </div>
        </div>
        <Badge className={FINANCING_STATUS_STYLE[request.status]}>{tCommon(`financingStatus.${request.status}`)}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <User className="size-3.5" />
        <span>{request.farmer.fullName}</span>
        {request.farmer.phone && <span>· {request.farmer.phone}</span>}
      </div>

      {request.purpose && <p className="mt-2 text-xs text-muted-foreground">{request.purpose}</p>}

      {isActionable && (
        <Textarea
          placeholder={t("reviewNotesPlaceholder")}
          className="mt-3 min-h-16 text-sm"
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
        />
      )}

      {!isActionable && request.reviewNotes && (
        <p className="mt-2 rounded-lg border border-border p-2 text-xs text-muted-foreground">{request.reviewNotes}</p>
      )}

      {isActionable && (
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {request.status === "SUBMITTED" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => act(request.id, "UNDER_REVIEW", reviewNotes || undefined)}
            >
              {t("requestMoreInfo")}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => act(request.id, "CHANGES_REQUESTED", reviewNotes || undefined)}
          >
            {t("requestChanges")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => act(request.id, "REJECTED", reviewNotes || undefined)}
          >
            {t("reject")}
          </Button>
          <Button
            size="sm"
            disabled={isSubmitting}
            onClick={() => act(request.id, "APPROVED", reviewNotes || undefined)}
          >
            {isSubmitting ? tCommon("saving") : t("approve")}
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </Card>
  );
}
