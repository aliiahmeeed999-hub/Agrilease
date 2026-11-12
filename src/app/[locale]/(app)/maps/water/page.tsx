"use client";

import { useTranslations } from "next-intl";
import { MapPage } from "@/components/maps/MapPage";
import { WaterMap } from "@/features/water-resources/components/WaterMap";

export default function WaterMapPage() {
  const t = useTranslations("waterMap");
  return (
    <MapPage title={t("title")} description={t("subtitle")}>
      {(farms) => <WaterMap farms={farms} />}
    </MapPage>
  );
}
