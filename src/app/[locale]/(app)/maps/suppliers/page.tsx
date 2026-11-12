"use client";

import { useTranslations } from "next-intl";
import { MapPage } from "@/components/maps/MapPage";
import { SuppliersMap } from "@/features/agricultural-materials/components/SuppliersMap";

export default function SuppliersMapPage() {
  const t = useTranslations("suppliersMap");
  return (
    <MapPage title={t("title")} description={t("subtitle")}>
      {(farms) => <SuppliersMap farms={farms} />}
    </MapPage>
  );
}
