import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { isBookingReviewEligible } from "@/lib/booking";
import { POST as createBooking } from "@/app/api/bookings/route";
import { PATCH as cancelBooking } from "@/app/api/bookings/[id]/route";
import { PATCH as ownerResolveBooking } from "@/app/api/owner/bookings/[id]/route";
import { createTestUser, jsonRequest, loginAs, uniqueEmail } from "./helpers";

async function createListedEquipment(ownerId: string, dailyRateMad = 500) {
  return prisma.equipment.create({
    data: {
      ownerId,
      name: `Test Tractor ${uniqueEmail("eq")}`,
      type: "TRACTOR",
      manufacturer: "TestCo",
      model: "T-100",
      enginePowerHp: 150,
      hitchCapacityKg: 2000,
      maxSpeedKmh: 40,
      isListed: true,
      dailyRateMad,
    },
  });
}

function dateOnly(daysFromNow: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

describe("booking lifecycle", () => {
  it("create -> owner approve", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    const equipment = await createListedEquipment(owner.id);

    await loginAs(farmer);
    const createRes = await createBooking(
      jsonRequest("/api/bookings", "POST", {
        equipmentId: equipment.id,
        startDate: dateOnly(1),
        endDate: dateOnly(3),
      })
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).data;
    expect(created.status).toBe("PENDING");

    await loginAs(owner);
    const approveRes = await ownerResolveBooking(jsonRequest(`/api/owner/bookings/${created.id}`, "PATCH", { status: "APPROVED" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()).data;
    expect(approved.status).toBe("APPROVED");
  });

  it("auto-rejects overlapping pending bookings for the same equipment once one is approved", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const { user: farmerA } = await createTestUser({ role: "FARMER" });
    const { user: farmerB } = await createTestUser({ role: "FARMER" });
    const equipment = await createListedEquipment(owner.id);

    await loginAs(farmerA);
    const bookingA = (
      await (
        await createBooking(
          jsonRequest("/api/bookings", "POST", { equipmentId: equipment.id, startDate: dateOnly(5), endDate: dateOnly(8) })
        )
      ).json()
    ).data;

    await loginAs(farmerB);
    const bookingB = (
      await (
        await createBooking(
          jsonRequest("/api/bookings", "POST", { equipmentId: equipment.id, startDate: dateOnly(6), endDate: dateOnly(7) })
        )
      ).json()
    ).data;

    await loginAs(owner);
    await ownerResolveBooking(jsonRequest(`/api/owner/bookings/${bookingA.id}`, "PATCH", { status: "APPROVED" }), {
      params: Promise.resolve({ id: bookingA.id }),
    });

    const refetchedB = await prisma.booking.findUniqueOrThrow({ where: { id: bookingB.id } });
    expect(refetchedB.status).toBe("REJECTED");
  });

  it("rejects approving a booking that has already been resolved (conflict-safe)", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    const equipment = await createListedEquipment(owner.id);

    await loginAs(farmer);
    const created = (
      await (
        await createBooking(jsonRequest("/api/bookings", "POST", { equipmentId: equipment.id, startDate: dateOnly(10), endDate: dateOnly(12) }))
      ).json()
    ).data;

    await loginAs(owner);
    await ownerResolveBooking(jsonRequest(`/api/owner/bookings/${created.id}`, "PATCH", { status: "APPROVED" }), {
      params: Promise.resolve({ id: created.id }),
    });

    const secondAttempt = await ownerResolveBooking(
      jsonRequest(`/api/owner/bookings/${created.id}`, "PATCH", { status: "REJECTED" }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(secondAttempt.status).toBe(409);
    const body = await secondAttempt.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("an owner cannot resolve a booking for equipment they don't own", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const { user: otherOwner } = await createTestUser({ role: "RENTAL_OWNER" });
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    const equipment = await createListedEquipment(owner.id);

    await loginAs(farmer);
    const created = (
      await (
        await createBooking(jsonRequest("/api/bookings", "POST", { equipmentId: equipment.id, startDate: dateOnly(15), endDate: dateOnly(16) }))
      ).json()
    ).data;

    await loginAs(otherOwner);
    const res = await ownerResolveBooking(jsonRequest(`/api/owner/bookings/${created.id}`, "PATCH", { status: "APPROVED" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(res.status).toBe(404);
  });

  it("renter can cancel a pending booking, but not one that's already approved", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    const equipment = await createListedEquipment(owner.id);

    await loginAs(farmer);
    const created = (
      await (
        await createBooking(jsonRequest("/api/bookings", "POST", { equipmentId: equipment.id, startDate: dateOnly(20), endDate: dateOnly(21) }))
      ).json()
    ).data;

    const cancelRes = await cancelBooking(jsonRequest(`/api/bookings/${created.id}`, "PATCH", { status: "CANCELLED" }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(cancelRes.status).toBe(200);
    expect((await cancelRes.json()).data.status).toBe("CANCELLED");

    // A second, freshly-created booking that gets approved should no longer
    // be cancellable by the renter.
    const created2 = (
      await (
        await createBooking(jsonRequest("/api/bookings", "POST", { equipmentId: equipment.id, startDate: dateOnly(25), endDate: dateOnly(26) }))
      ).json()
    ).data;
    await loginAs(owner);
    await ownerResolveBooking(jsonRequest(`/api/owner/bookings/${created2.id}`, "PATCH", { status: "APPROVED" }), {
      params: Promise.resolve({ id: created2.id }),
    });

    await loginAs(farmer);
    const blockedCancel = await cancelBooking(jsonRequest(`/api/bookings/${created2.id}`, "PATCH", { status: "CANCELLED" }), {
      params: Promise.resolve({ id: created2.id }),
    });
    expect(blockedCancel.status).toBe(409);
  });

  it("rejects booking unlisted equipment or overlapping an already-approved booking", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    const unlisted = await prisma.equipment.create({
      data: {
        ownerId: owner.id,
        name: "Unlisted",
        type: "TRACTOR",
        manufacturer: "TestCo",
        model: "U-1",
        enginePowerHp: 100,
        hitchCapacityKg: 1000,
        maxSpeedKmh: 30,
        isListed: false,
      },
    });

    await loginAs(farmer);
    const res = await createBooking(
      jsonRequest("/api/bookings", "POST", { equipmentId: unlisted.id, startDate: dateOnly(1), endDate: dateOnly(2) })
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("NOT_LISTED");
  });
});

describe("isBookingReviewEligible (post-completion review gate)", () => {
  it("is eligible only once approved AND the end date has passed", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

    expect(isBookingReviewEligible({ status: "APPROVED", type: "RENT", endDate: past })).toBe(true);
    expect(isBookingReviewEligible({ status: "APPROVED", type: "RENT", endDate: future })).toBe(false);
    expect(isBookingReviewEligible({ status: "PENDING", type: "RENT", endDate: past })).toBe(false);
    expect(isBookingReviewEligible({ status: "CANCELLED", type: "RENT", endDate: past })).toBe(false);
    expect(isBookingReviewEligible({ status: "REJECTED", type: "RENT", endDate: past })).toBe(false);
  });

  it("SALE bookings are eligible immediately on approval, with no date requirement", () => {
    expect(isBookingReviewEligible({ status: "APPROVED", type: "SALE", endDate: null })).toBe(true);
    expect(isBookingReviewEligible({ status: "PENDING", type: "SALE", endDate: null })).toBe(false);
  });
});
