export interface SoilSnapshot {
  ph: number | null;
  nitrogen: number | null;
  organicMatterPct: number | null;
  // Always null - SoilGrids has no phosphorus/potassium property and no live
  // soil-moisture reading (see src/lib/soil.ts for why these aren't a mislabeled
  // proxy instead). Kept as explicit fields so the UI can show "not available
  // from this source" rather than silently omitting them.
  phosphorus: null;
  potassium: null;
  soilMoisturePct: null;
  fetchedAt: string;
  source: string;
  stale: boolean;
}
