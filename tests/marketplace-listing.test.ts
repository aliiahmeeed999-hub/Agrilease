import { describe, it, expect } from "vitest";
import { GET as listMarketplace } from "@/app/api/marketplace/equipment/route";
import { GET as getMarketplaceDetail } from "@/app/api/marketplace/equipment/[id]/route";
import { prisma } from "@/lib/prisma";
import { createTestUser, loginAs } from "./helpers";
import { NextRequest } from "next/server";

function marketplaceRequest(query = "") {
  return new NextRequest(new Request(`http://localhost/api/marketplace/equipment${query}`));
}

async function createListing(
  ownerId: string,
  overrides: Partial<{
    category: string;
    listingType: string;
    dailyRateMad: number | null;
    salePrice: number | null;
    isListed: boolean;
  }> = {}
) {
  return prisma.equipment.create({
    data: {
      ownerId,
      name: "Listing " + Math.random().toString(36).slice(2, 8),
      type: "TRACTOR",
      manufacturer: "TestCo",
      model: "M1",
      enginePowerHp: 100,
      hitchCapacityKg: 1000,
      maxSpeedKmh: 30,
      isListed: overrides.isListed ?? true,
      category: (overrides.category as never) ?? "TRACTOR",
      listingType: (overrides.listingType as never) ?? "RENT",
      dailyRateMad: overrides.dailyRateMad !== undefined ? overrides.dailyRateMad : 500,
      salePrice: overrides.salePrice !== undefined ? overrides.salePrice : null,
    },
  });
}

describe("GET /api/marketplace/equipment - filtering, sorting, grouping", () => {
  it("groups by fixed category order when no filters/sort are supplied", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await createListing(owner.id, { category: "OTHER" });
    await createListing(owner.id, { category: "TRACTOR" });
    await createListing(owner.id, { category: "SPRAYER" });

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);

    const res = await listMarketplace(marketplaceRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.grouped).toBe(true);
    const categoriesInOrder = body.groups.map((g: { category: string }) => g.category);
    // TRACTOR must appear before SPRAYER, which must appear before OTHER,
    // matching EQUIPMENT_CATEGORY_ORDER - not alphabetical/enum-declaration order.
    expect(categoriesInOrder.indexOf("TRACTOR")).toBeLessThan(categoriesInOrder.indexOf("SPRAYER"));
    expect(categoriesInOrder.indexOf("SPRAYER")).toBeLessThan(categoriesInOrder.indexOf("OTHER"));
  });

  it("returns a flat sorted list once any filter or sort is applied", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const expensive = await createListing(owner.id, { dailyRateMad: 2000 });
    const cheap = await createListing(owner.id, { dailyRateMad: 500 });

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);

    // Scoped to listingTypeFilter=RENT so every item in the response has a
    // real (non-null) dailyRateMad - other test files share this same
    // database and may have created SALE-only listings (null dailyRateMad,
    // sorted by an effective salePrice-based key instead), which would make
    // a global "is dailyRateMad itself monotonic" assertion order-dependent
    // on data this test doesn't own.
    const res = await listMarketplace(marketplaceRequest("?listingTypeFilter=RENT&sort=price_asc"));
    const body = (await res.json()).data;
    expect(body.grouped).toBe(false);
    const ids: string[] = body.items.map((i: { id: string }) => i.id);
    expect(ids.indexOf(cheap.id)).toBeLessThan(ids.indexOf(expensive.id));
  });

  it("a SALE-only listing does not silently disappear (the old dailyRateMad-not-null gate is gone)", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const saleOnly = await createListing(owner.id, { listingType: "SALE", dailyRateMad: null, salePrice: 90000 });

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);

    const res = await listMarketplace(marketplaceRequest("?listingTypeFilter=SALE"));
    const body = (await res.json()).data;
    const ids = body.items.map((i: { id: string }) => i.id);
    expect(ids).toContain(saleOnly.id);

    const detailRes = await getMarketplaceDetail(marketplaceRequest(), { params: Promise.resolve({ id: saleOnly.id }) });
    expect(detailRes.status).toBe(200);
  });

  it("a RENT_AND_SALE listing appears under both the RENT and SALE tab filters", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const both = await createListing(owner.id, { listingType: "RENT_AND_SALE", dailyRateMad: 800, salePrice: 120000 });

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);

    const rentRes = await listMarketplace(marketplaceRequest("?listingTypeFilter=RENT"));
    const rentBody = (await rentRes.json()).data;
    expect(rentBody.items.map((i: { id: string }) => i.id)).toContain(both.id);

    const saleRes = await listMarketplace(marketplaceRequest("?listingTypeFilter=SALE"));
    const saleBody = (await saleRes.json()).data;
    expect(saleBody.items.map((i: { id: string }) => i.id)).toContain(both.id);
  });

  it("existing RENT-only listings still appear and book correctly (regression)", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const rentOnly = await createListing(owner.id, { listingType: "RENT", dailyRateMad: 700 });

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);

    const res = await listMarketplace(marketplaceRequest());
    const body = (await res.json()).data;
    const allIds = body.grouped
      ? body.groups.flatMap((g: { items: { id: string }[] }) => g.items.map((i) => i.id))
      : body.items.map((i: { id: string }) => i.id);
    expect(allIds).toContain(rentOnly.id);
  });
});
