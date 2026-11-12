"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, MapPin, Plus } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, Flip } from "@/lib/gsap";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader, SectionHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { Field, FormError } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { FieldMapCard } from "@/features/dashboard/components/FieldMapCard";
import { useFarm } from "@/features/farms/hooks/useFarm";
import { FarmFieldRow } from "@/features/farms/components/FarmFieldRow";
import { FieldForm } from "@/features/farms/components/FieldForm";
import { FarmWeatherCard } from "@/features/farms/components/FarmWeatherCard";
import { FarmSoilCard } from "@/features/farms/components/FarmSoilCard";
import { updateFarm } from "@/services/farm.service";
import { ApiError } from "@/services/api-client";
import type { FarmDetail } from "@/types/farm";

function FarmAttributesCard({ farm }: { farm: FarmDetail }) {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [values, setValues] = useState(farm);
  const [sizeInput, setSizeInput] = useState(String(farm.sizeHectares));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof FarmDetail>(key: K, value: FarmDetail[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    const parsedSize = Number(sizeInput);
    if (sizeInput.trim() === "" || !Number.isFinite(parsedSize) || parsedSize <= 0) {
      setError(t("sizeRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updateFarm(farm.id, {
        name: values.name,
        region: values.region,
        province: values.province ?? undefined,
        sizeHectares: parsedSize,
        latitude: values.latitude,
        longitude: values.longitude,
        elevation: values.elevation ?? undefined,
        irrigationType: values.irrigationType ?? undefined,
        waterSource: values.waterSource ?? undefined,
        soilType: values.soilType ?? undefined,
        imageUrl: values.imageUrl ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["farms", "detail", farm.id] });
      await queryClient.invalidateQueries({ queryKey: ["farms", "list"] });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tCommon("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="gap-0 p-5 sm:p-6">
      <h2 className="type-headline text-foreground">{t("farmDetails")}</h2>
      <div className="mt-4 grid grid-cols-1 gap-5 min-[420px]:grid-cols-2">
        <Field label={t("farmName")} htmlFor="farm-name">
          <Input id="farm-name" value={values.name} onChange={(e) => update("name", e.target.value)} />
        </Field>
        <Field label={t("region")} htmlFor="farm-region">
          <Input id="farm-region" value={values.region} onChange={(e) => update("region", e.target.value)} />
        </Field>
        <Field label={t("sizeHectares")} htmlFor="farm-size">
          <Input
            id="farm-size"
            type="number"
            inputMode="decimal"
            min={0}
            value={sizeInput}
            aria-invalid={!!error}
            onChange={(e) => {
              setSizeInput(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
        <Field label={t("province")} htmlFor="farm-province">
          <Input id="farm-province" value={values.province ?? ""} onChange={(e) => update("province", e.target.value)} />
        </Field>
      </div>

      <FormError className="mt-4">{error}</FormError>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={isSubmitting} onClick={handleSave}>
          {isSubmitting ? tCommon("saving") : tCommon("saveChanges")}
        </Button>
        {/* Completion feedback right next to the action that caused it. */}
        <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success">
          {saved && !error && (
            <>
              <Check className="size-4" aria-hidden="true" />
              {t("saved")}
            </>
          )}
        </p>
      </div>
    </Card>
  );
}

function FarmDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function FarmDetailPage() {
  const t = useTranslations("farms");
  const tFields = useTranslations("fields");
  const tCommon = useTranslations("common");
  const params = useParams<{ id: string }>();
  const { data: farm, isPending, isError, refetch } = useFarm(params.id);
  const [isAddingField, setIsAddingField] = useState(false);
  const fieldsSectionRef = useRef<HTMLDivElement | null>(null);
  const flipStateRef = useRef<Flip.FlipState | null>(null);

  function toggleAddingField(next: boolean) {
    const section = fieldsSectionRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (section && !reducedMotion) {
      gsap.killTweensOf(section.children);
      flipStateRef.current = Flip.getState(section.children);
    }

    setIsAddingField(next);
  }

  useGSAP(() => {
    if (!flipStateRef.current) return;
    Flip.from(flipStateRef.current, {
      duration: 0.4,
      ease: "power2.inOut",
      nested: true,
    });
    flipStateRef.current = null;
  }, [isAddingField]);

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/farms", label: t("backToFarms") }}
        title={farm ? farm.name : isError ? t("farmDetails") : <span aria-hidden="true" className="inline-block h-8 w-56 max-w-full animate-pulse rounded-lg bg-muted align-middle" />}
        description={
          farm ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {farm.region}
              {farm.province ? ` · ${farm.province}` : ""}
            </span>
          ) : undefined
        }
      />

      {isPending && <FarmDetailSkeleton />}

      {isError && <ErrorState title={t("couldNotLoad")} description={tCommon("checkConnection")} onRetry={() => refetch()} />}

      {farm && (
        <div className="flex flex-col gap-8">
          {/* The parcel map is the working surface of this page, so it gets
              the full width; details and conditions sit in a row beneath. */}
          <FieldMapCard fields={farm.fields} mode="manage" farmId={farm.id} fallbackCenter={[farm.longitude, farm.latitude]} />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <FarmAttributesCard farm={farm} />
            <FarmWeatherCard farmId={farm.id} />
            <FarmSoilCard farmId={farm.id} />
          </div>

          <section ref={fieldsSectionRef}>
            <SectionHeader
              title={tFields("title")}
              actions={
                !isAddingField && (
                  <Button size="sm" onClick={() => toggleAddingField(true)}>
                    <Plus aria-hidden="true" />
                    {tFields("addField")}
                  </Button>
                )
              }
            />

            {isAddingField && (
              <Card className="mb-4 gap-0 p-5 sm:p-6">
                <h3 className="type-headline mb-4 text-foreground">{tFields("newFieldTitle")}</h3>
                <FieldForm
                  farmId={farm.id}
                  defaultCenterLat={farm.latitude}
                  defaultCenterLng={farm.longitude}
                  onSaved={() => toggleAddingField(false)}
                  onCancel={() => toggleAddingField(false)}
                />
              </Card>
            )}

            {farm.fields.length === 0 && !isAddingField ? (
              <EmptyState icon={MapPin} title={tFields("noFieldsYet")} description={tFields("noFieldsDescription")} />
            ) : (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                {farm.fields.map((field) => (
                  <FarmFieldRow key={field.id} farmId={farm.id} field={field} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
