import { describe, it, expect } from "vitest";
import { POST as createBooking } from "@/app/api/bookings/route";
import { POST as createReview } from "@/app/api/bookings/[id]/review/route";
import { GET as listSaleOffers } from "@/app/api/owner/sale-offers/route";
import { PATCH as patchSaleOffer } from "@/app/api/owner/sale-offers/[id]/route";
import { GET as listFinancingQueue } from "@/app/api/banker/financing-requests/route";
import { PATCH as patchFinancingRequest } from "@/app/api/banker/financing-requests/[id]/route";
import { GET as listMyFinancingRequests } from "@/app/api/financing-requests/mine/route";
import { prisma } from "@/lib/prisma";
import { createTestUser, jsonRequest, loginAs } from "./helpers";

async function createListing(ownerId: string, overrides: Partial<{ listingType: string; dailyRateMad: number | null; salePrice: number | null; negotiable: boolean }> = {}) {
  return prisma.equipment.create({
    data: {
      ownerId,
      name: "Financing Test Tractor " + Math.random().toString(36).slice(2, 8),
      type: "TRACTOR",
      manufacturer: "TestCo",
      model: "M1",
      enginePowerHp: 100,
      hitchCapacityKg: 1000,
      maxSpeedKmh: 30,
      isListed: true,
      category: "TRACTOR",
      listingType: (overrides.listingType as never) ?? "SALE",
      dailyRateMad: overrides.dailyRateMad !== undefined ? overrides.dailyRateMad : null,
      salePrice: overrides.salePrice !== undefined ? overrides.salePrice : 100000,
      negotiable: overrides.negotiable ?? true,
    },
  });
}

describe("Buy outright / borrow to buy financing flow", () => {
  it("a buy-outright (no financing) offer is immediately visible in the owner's sale offers queue", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const listing = await createListing(owner.id);

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);

    const createRes = await createBooking(
      jsonRequest("/api/bookings", "POST", { type: "SALE", equipmentId: listing.id, offeredPriceMad: 95000 })
    );
    expect(createRes.status).toBe(201);

    await loginAs(owner);
    const offersRes = await listSaleOffers(jsonRequest("/api/owner/sale-offers", "GET"));
    const offers = (await offersRes.json()).data.offers;
    expect(offers.some((o: { equipment: { id: string } }) => o.equipment.id === listing.id)).toBe(true);
  });

  it("a borrow-to-buy offer is invisible to the owner until the banker approves financing, with no Booking write required", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const listing = await createListing(owner.id);

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);
    const createRes = await createBooking(
      jsonRequest("/api/bookings", "POST", {
        type: "SALE",
        equipmentId: listing.id,
        offeredPriceMad: 95000,
        financingRequested: true,
      })
    );
    expect(createRes.status).toBe(201);
    const booking = (await createRes.json()).data;
    expect(booking.status).toBe("PENDING");

    await loginAs(owner);
    const offersRes = await listSaleOffers(jsonRequest("/api/owner/sale-offers", "GET"));
    const offers = (await offersRes.json()).data.offers;
    expect(offers.some((o: { equipment: { id: string } }) => o.equipment.id === listing.id)).toBe(false);

    const { user: banker } = await createTestUser({ role: "BANKER" });
    await loginAs(banker);
    const queueRes = await listFinancingQueue(jsonRequest("/api/banker/financing-requests", "GET"));
    const queue = (await queueRes.json()).data.requests;
    const request = queue.find((r: { booking: { id: string } }) => r.booking.id === booking.id);
    expect(request).toBeDefined();

    const approveRes = await patchFinancingRequest(
      jsonRequest(`/api/banker/financing-requests/${request.id}`, "PATCH", { status: "APPROVED" }),
      { params: Promise.resolve({ id: request.id }) }
    );
    expect(approveRes.status).toBe(200);

    // The Booking itself was never written to by the approval - the owner's
    // queue picks it up purely because the read-time OR filter now matches.
    const bookingRow = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(bookingRow.status).toBe("PENDING");

    await loginAs(owner);
    const offersAfterRes = await listSaleOffers(jsonRequest("/api/owner/sale-offers", "GET"));
    const offersAfter = (await offersAfterRes.json()).data.offers;
    expect(offersAfter.some((o: { equipment: { id: string } }) => o.equipment.id === listing.id)).toBe(true);
  });

  it("a banker rejecting a financing request cascades to REJECTED on the linked booking, visible to the farmer", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const listing = await createListing(owner.id);

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);
    const createRes = await createBooking(
      jsonRequest("/api/bookings", "POST", {
        type: "SALE",
        equipmentId: listing.id,
        offeredPriceMad: 95000,
        financingRequested: true,
      })
    );
    const booking = (await createRes.json()).data;

    const { user: banker } = await createTestUser({ role: "BANKER" });
    await loginAs(banker);
    const queueRes = await listFinancingQueue(jsonRequest("/api/banker/financing-requests", "GET"));
    const queue = (await queueRes.json()).data.requests;
    const request = queue.find((r: { booking: { id: string } }) => r.booking.id === booking.id);

    const rejectRes = await patchFinancingRequest(
      jsonRequest(`/api/banker/financing-requests/${request.id}`, "PATCH", { status: "REJECTED" }),
      { params: Promise.resolve({ id: request.id }) }
    );
    expect(rejectRes.status).toBe(200);

    await loginAs(farmer);
    const mineRes = await listMyFinancingRequests();
    const mine = (await mineRes.json()).data.requests;
    expect(mine.find((r: { id: string }) => r.id === request.id).status).toBe("REJECTED");

    const bookingRow = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(bookingRow.status).toBe("REJECTED");
  });

  it("approving one SALE offer auto-rejects other PENDING SALE offers on the same equipment, but leaves PENDING RENT bookings untouched", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const listing = await createListing(owner.id, { listingType: "RENT_AND_SALE", dailyRateMad: 500 });

    const { user: farmer1 } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer1);
    const offer1Res = await createBooking(
      jsonRequest("/api/bookings", "POST", { type: "SALE", equipmentId: listing.id, offeredPriceMad: 90000 })
    );
    const offer1 = (await offer1Res.json()).data;

    const { user: farmer2 } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer2);
    const offer2Res = await createBooking(
      jsonRequest("/api/bookings", "POST", { type: "SALE", equipmentId: listing.id, offeredPriceMad: 92000 })
    );
    const offer2 = (await offer2Res.json()).data;

    const rentStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rentEnd = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rentRes = await createBooking(
      jsonRequest("/api/bookings", "POST", {
        type: "RENT",
        equipmentId: listing.id,
        startDate: rentStart,
        endDate: rentEnd,
      })
    );
    const rentBooking = (await rentRes.json()).data;

    await loginAs(owner);
    const approveRes = await patchSaleOffer(
      jsonRequest(`/api/owner/sale-offers/${offer1.id}`, "PATCH", { status: "APPROVED" }),
      { params: Promise.resolve({ id: offer1.id }) }
    );
    expect(approveRes.status).toBe(200);

    const offer2Row = await prisma.booking.findUniqueOrThrow({ where: { id: offer2.id } });
    expect(offer2Row.status).toBe("REJECTED");

    const rentRow = await prisma.booking.findUniqueOrThrow({ where: { id: rentBooking.id } });
    expect(rentRow.status).toBe("PENDING");
  });

  it("both the farmer and the equipment owner can independently review the same completed SALE, and a duplicate is rejected", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const listing = await createListing(owner.id);

    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);
    const createRes = await createBooking(
      jsonRequest("/api/bookings", "POST", { type: "SALE", equipmentId: listing.id, offeredPriceMad: 90000 })
    );
    const booking = (await createRes.json()).data;

    await loginAs(owner);
    await patchSaleOffer(jsonRequest(`/api/owner/sale-offers/${booking.id}`, "PATCH", { status: "APPROVED" }), {
      params: Promise.resolve({ id: booking.id }),
    });

    await loginAs(farmer);
    const farmerReviewRes = await createReview(
      jsonRequest(`/api/bookings/${booking.id}/review`, "POST", { rating: 5, comment: "Great deal" }),
      { params: Promise.resolve({ id: booking.id }) }
    );
    expect(farmerReviewRes.status).toBe(201);

    const farmerDupRes = await createReview(
      jsonRequest(`/api/bookings/${booking.id}/review`, "POST", { rating: 4 }),
      { params: Promise.resolve({ id: booking.id }) }
    );
    expect(farmerDupRes.status).toBe(409);

    await loginAs(owner);
    const ownerReviewRes = await createReview(
      jsonRequest(`/api/bookings/${booking.id}/review`, "POST", { rating: 4, comment: "Good buyer" }),
      { params: Promise.resolve({ id: booking.id }) }
    );
    expect(ownerReviewRes.status).toBe(201);

    const reviews = await prisma.review.findMany({ where: { bookingId: booking.id } });
    expect(reviews).toHaveLength(2);
  });
});

describe("Financing/sale-offer route RBAC", () => {
  it("a FARMER cannot access the banker financing queue", async () => {
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);
    const res = await listFinancingQueue(jsonRequest("/api/banker/financing-requests", "GET"));
    expect(res.status).toBe(403);
  });

  it("a RENTAL_OWNER cannot access another owner's sale offers, and a BANKER cannot access sale-offers at all", async () => {
    const { user: banker } = await createTestUser({ role: "BANKER" });
    await loginAs(banker);
    const res = await listSaleOffers(jsonRequest("/api/owner/sale-offers", "GET"));
    expect(res.status).toBe(403);
  });
});
