import { describe, it, expect, vi, afterEach } from "vitest";
import { extraterrestrialRadiation, hargreavesEt0, estimateIrrigationNeed } from "@/lib/irrigation";

describe("extraterrestrialRadiation (FAO-56 solar geometry)", () => {
  it("stays within the physically plausible range for Earth (0-45 MJ/m^2/day)", () => {
    for (const lat of [-60, -33.85, 0, 33.85, 60]) {
      for (const doy of [1, 90, 180, 270, 365]) {
        const ra = extraterrestrialRadiation(lat, doy);
        expect(ra).toBeGreaterThanOrEqual(0);
        expect(ra).toBeLessThan(45);
      }
    }
  });

  it("is deterministic for the same latitude and day of year", () => {
    expect(extraterrestrialRadiation(33.85, 180)).toBe(extraterrestrialRadiation(33.85, 180));
  });

  it("is higher near the equator than near the poles at the equinox", () => {
    const equatorial = extraterrestrialRadiation(0, 80);
    const polar = extraterrestrialRadiation(80, 80);
    expect(equatorial).toBeGreaterThan(polar);
  });
});

describe("hargreavesEt0 (FAO-56 Hargreaves-Samani reference evapotranspiration)", () => {
  it("is non-negative and deterministic", () => {
    const date = new Date("2026-07-01T00:00:00Z");
    const et0 = hargreavesEt0(35, 20, 33.85, date);
    expect(et0).toBeGreaterThan(0);
    expect(hargreavesEt0(35, 20, 33.85, date)).toBe(et0);
  });

  it("increases with a wider day/night temperature swing, holding mean temperature constant", () => {
    const date = new Date("2026-07-01T00:00:00Z");
    const narrow = hargreavesEt0(28, 22, 33.85, date); // mean 25, swing 6
    const wide = hargreavesEt0(35, 15, 33.85, date); // mean 25, swing 20
    expect(wide).toBeGreaterThan(narrow);
  });

  it("never goes negative when Tmax < Tmin (bad input, shouldn't happen but must not produce NaN/negative)", () => {
    const et0 = hargreavesEt0(15, 20, 33.85, new Date("2026-07-01T00:00:00Z"));
    expect(Number.isNaN(et0)).toBe(false);
    expect(et0).toBeGreaterThanOrEqual(0);
  });
});

describe("estimateIrrigationNeed (mocked NASA POWER + SoilGrids)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function nasaPowerResponse() {
    const dates = ["20260701", "20260702", "20260703"];
    const T2M_MAX: Record<string, number> = {};
    const T2M_MIN: Record<string, number> = {};
    const PRECTOTCORR: Record<string, number> = {};
    for (const d of dates) {
      T2M_MAX[d] = 35;
      T2M_MIN[d] = 20;
      PRECTOTCORR[d] = 2;
    }
    return { properties: { parameter: { T2M_MAX, T2M_MIN, PRECTOTCORR, ALLSKY_SFC_SW_DWN: {} } } };
  }

  function soilGridsResponse() {
    return {
      properties: {
        layers: [
          {
            name: "wv0033",
            unit_measure: { d_factor: 10 },
            depths: [
              { label: "0-5cm", values: { mean: 320 } },
              { label: "15-30cm", values: { mean: 310 } },
            ],
          },
          {
            name: "wv1500",
            unit_measure: { d_factor: 10 },
            depths: [
              { label: "0-5cm", values: { mean: 160 } },
              { label: "15-30cm", values: { mean: 170 } },
            ],
          },
        ],
      },
    };
  }

  it("computes a positive net irrigation need when ETc exceeds effective rainfall", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = url.toString();
      if (href.includes("power.larc.nasa.gov")) {
        return new Response(JSON.stringify(nasaPowerResponse()), { status: 200 });
      }
      if (href.includes("rest.isric.org")) {
        return new Response(JSON.stringify(soilGridsResponse()), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await estimateIrrigationNeed(33.85, -5.5, "WHEAT");
    expect(result).not.toBeNull();
    expect(result!.etcTotalMm).toBeGreaterThan(0);
    expect(result!.netIrrigationNeedMm).toBeGreaterThanOrEqual(0);
    // With ~35/20 C over 3 days and only 2mm/day rain, ETc should clearly exceed
    // effective rainfall for a high-Kc crop like wheat.
    expect(result!.netIrrigationNeedMm).toBeGreaterThan(0);
    expect(result!.soilWaterHoldingCapacityMm).not.toBeNull();
    expect(result!.soilWaterHoldingCapacityMm).toBeGreaterThan(0);
  });

  it("returns null if the NASA POWER request fails outright", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("error", { status: 500 }))
    );

    const result = await estimateIrrigationNeed(33.85, -5.5, "WHEAT");
    expect(result).toBeNull();
  });

  it("still returns a usable estimate (with null water-holding capacity) if only SoilGrids fails", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = url.toString();
      if (href.includes("power.larc.nasa.gov")) {
        return new Response(JSON.stringify(nasaPowerResponse()), { status: 200 });
      }
      return new Response("error", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await estimateIrrigationNeed(33.85, -5.5, "WHEAT");
    expect(result).not.toBeNull();
    expect(result!.soilWaterHoldingCapacityMm).toBeNull();
    expect(result!.etcTotalMm).toBeGreaterThan(0);
  });
});
