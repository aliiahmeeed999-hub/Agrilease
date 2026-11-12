// NASA GIBS (Global Imagery Browse Services) raster tiles: free, no key,
// NASA open-data terms (attribution requested). Web Mercator WMTS.
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export const GIBS_ATTRIBUTION = "Imagery: NASA GIBS / EOSDIS";

// Harmonized Landsat Sentinel-2 surface reflectance, true colour, 30 m.
// Daily; a given place is covered every 2-5 days, other days are blank there.
export function hlsTrueColorTiles(date: string): string {
  return `${GIBS}/HLS_S30_Nadir_BRDF_Adjusted_Reflectance/default/${date}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`;
}
export const HLS_MAX_ZOOM = 12;

// MODIS Terra MOD13 vegetation index, 16-day composites at 250 m.
export function modisNdviTiles(periodStart: string): string {
  return `${GIBS}/MODIS_Terra_L3_NDVI_16Day/default/${periodStart}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
}
export const NDVI_MAX_ZOOM = 9;

// GIBS's colour ramp for this layer (low to high NDVI), for the legend.
export const NDVI_LEGEND_STOPS = ["#fffcd0", "#e8d98f", "#bdb76b", "#86b049", "#4c9a2a", "#1d6b16", "#0b3d0a"];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

// MOD13 16-day periods start on day-of-year 1, 17, 33, ... (restarting each
// January). Returns the most recent `count` period starts that are old enough
// to have been published (composites appear ~3-4 weeks after the period starts).
export function recentNdviPeriods(count: number, now = new Date()): string[] {
  const latestAvailable = new Date(now.getTime() - 32 * 86_400_000);
  const out: string[] = [];
  let year = latestAvailable.getUTCFullYear();
  while (out.length < count && year >= 2001) {
    const starts: string[] = [];
    for (let doy = 1; doy <= 366; doy += 16) {
      const d = new Date(Date.UTC(year, 0, doy));
      if (d.getUTCFullYear() !== year) break;
      if (d <= latestAvailable) starts.push(iso(d));
    }
    out.push(...starts.reverse());
    year -= 1;
  }
  return out.slice(0, count);
}

// The same 16-day period one year earlier (periods restart each January, so
// the matching period has the same day-of-year).
export function samePeriodLastYear(periodStart: string): string {
  const d = new Date(`${periodStart}T00:00:00Z`);
  return iso(new Date(Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate())));
}

export function daysAgo(n: number, now = new Date()): string {
  return iso(new Date(now.getTime() - n * 86_400_000));
}
