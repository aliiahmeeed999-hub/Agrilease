"use client";

import { useTranslations } from "next-intl";
import { MapPage } from "@/components/maps/MapPage";
import { ClimateMap } from "@/features/climate/components/ClimateMap";

export default function ClimateMapPage() {
  const t = useTranslations("climateMap");
  return (
    <MapPage title={t("title")} description={t("subtitle")}>
      {(farms) => <ClimateMap farms={farms} />}
    </MapPage>
  );
}
