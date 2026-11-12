import { describe, it, expect } from "vitest";
import { POST as createEquipment } from "@/app/api/owner/equipment/route";
import { PATCH as patchEquipment } from "@/app/api/owner/equipment/[id]/route";
import { createTestUser, jsonRequest, loginAs } from "./helpers";

const BASE_SPECS = {
  name: "Test Tractor",
  type: "TRACTOR",
  manufacturer: "TestCo",
  model: "T-100",
  enginePowerHp: 150,
  hitchCapacityKg: 2000,
  maxSpeedKmh: 40,
};

describe("POST /api/owner/equipment - category/listingType/condition validation", () => {
  it("rejects a RENT listing with no dailyRateMad", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);

    const res = await createEquipment(
      jsonRequest("/api/owner/equipment", "POST", {
        ...BASE_SPECS,
        category: "TRACTOR",
        listingType: "RENT",
        condition: "NEW",
      })
    );
    expect(res.status).toBe(422);
  });

  it("rejects a SALE listing with no salePrice", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);

    const res = await createEquipment(
      jsonRequest("/api/owner/equipment", "POST", {
        ...BASE_SPECS,
        category: "TRACTOR",
        listingType: "SALE",
        condition: "NEW",
      })
    );
    expect(res.status).toBe(422);
  });

  it("rejects a USED-condition listing missing yearOfManufacture/hoursUsed", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);

    const res = await createEquipment(
      jsonRequest("/api/owner/equipment", "POST", {
        ...BASE_SPECS,
        category: "TRACTOR",
        listingType: "SALE",
        condition: "USED",
        salePrice: 150000,
      })
    );
    expect(res.status).toBe(422);
  });

  it("accepts a fully-specified RENT_AND_SALE, NEW listing", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);

    const res = await createEquipment(
      jsonRequest("/api/owner/equipment", "POST", {
        ...BASE_SPECS,
        category: "TRACTOR",
        listingType: "RENT_AND_SALE",
        condition: "NEW",
        dailyRateMad: 1200,
        salePrice: 180000,
        warrantyMonths: 24,
        dealerCertified: true,
      })
    );
    expect(res.status).toBe(201);
    const body = (await res.json()).data;
    expect(body.listingType).toBe("RENT_AND_SALE");
    expect(body.condition).toBe("NEW");
    expect(body.dailyRateMad).toBe(1200);
    expect(body.salePrice).toBe(180000);
  });

  it("accepts a fully-specified USED listing with condition details", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);

    const res = await createEquipment(
      jsonRequest("/api/owner/equipment", "POST", {
        ...BASE_SPECS,
        category: "TILLAGE",
        listingType: "SALE",
        condition: "USED",
        salePrice: 95000,
        yearOfManufacture: 2018,
        hoursUsed: 3200,
        conditionNotes: "Well maintained, recent service.",
      })
    );
    expect(res.status).toBe(201);
    const body = (await res.json()).data;
    expect(body.category).toBe("TILLAGE");
    expect(body.yearOfManufacture).toBe(2018);
  });
});

describe("PATCH /api/owner/equipment/[id] - merge-before-validate", () => {
  async function createValidListing() {
    return createEquipment(
      jsonRequest("/api/owner/equipment", "POST", {
        ...BASE_SPECS,
        category: "TRACTOR",
        listingType: "RENT",
        condition: "NEW",
        dailyRateMad: 1000,
      })
    ).then(async (res) => {
      const body = await res.json();
      return body.data.id as string;
    });
  }

  it("rejects patching condition to USED without also providing yearOfManufacture/hoursUsed", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);
    const id = await createValidListing();

    const res = await patchEquipment(jsonRequest(`/api/owner/equipment/${id}`, "PATCH", { condition: "USED" }), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(422);
  });

  it("rejects patching listingType to include SALE without also providing salePrice", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);
    const id = await createValidListing();

    const res = await patchEquipment(
      jsonRequest(`/api/owner/equipment/${id}`, "PATCH", { listingType: "RENT_AND_SALE" }),
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(422);
  });

  it("accepts patching listingType to include SALE when salePrice is provided in the same request", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);
    const id = await createValidListing();

    const res = await patchEquipment(
      jsonRequest(`/api/owner/equipment/${id}`, "PATCH", { listingType: "RENT_AND_SALE", salePrice: 200000 }),
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.listingType).toBe("RENT_AND_SALE");
    expect(body.salePrice).toBe(200000);
    // dailyRateMad from the original create should still be intact (merge, not replace)
    expect(body.dailyRateMad).toBe(1000);
  });
});
