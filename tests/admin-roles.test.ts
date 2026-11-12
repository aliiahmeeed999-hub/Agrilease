import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as listAdminUsers } from "@/app/api/admin/users/route";
import { PATCH as patchAdminEquipment } from "@/app/api/admin/equipment/[id]/route";
import { GET as listAdminTransactions } from "@/app/api/admin/transactions/route";
import * as adminTransactionsRoute from "@/app/api/admin/transactions/route";
import { GET as listActivityLog } from "@/app/api/admin/activity-log/route";
import { createTestUser, jsonRequest, loginAs, uniqueEmail } from "./helpers";

function adminUsersRequest(query = "") {
  return jsonRequest(`/api/admin/users${query}`, "GET");
}

describe("GET /api/admin/users - search and filter", () => {
  it("filters by role", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    await createTestUser({ role: "BANKER" });
    await createTestUser({ role: "FARMER" });
    await loginAs(admin);

    const res = await listAdminUsers(adminUsersRequest("?role=BANKER"));
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.users.length).toBeGreaterThan(0);
    expect(body.users.every((u: { role: string }) => u.role === "BANKER")).toBe(true);
  });

  it("filters by verificationStatus", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: target } = await createTestUser({ role: "FARMER" });
    await prisma.user.update({ where: { id: target.id }, data: { verificationStatus: "VERIFIED" } });
    await loginAs(admin);

    const res = await listAdminUsers(adminUsersRequest("?verificationStatus=VERIFIED"));
    const body = (await res.json()).data;
    expect(body.users.some((u: { id: string }) => u.id === target.id)).toBe(true);
    expect(body.users.every((u: { verificationStatus: string }) => u.verificationStatus === "VERIFIED")).toBe(true);
  });

  it("searches by name or email", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const searchEmail = uniqueEmail("distinctive-search-target");
    const { user: target } = await createTestUser({ role: "FARMER", email: searchEmail });
    await loginAs(admin);

    const res = await listAdminUsers(adminUsersRequest(`?search=${encodeURIComponent(searchEmail.split("@")[0])}`));
    const body = (await res.json()).data;
    expect(body.users.map((u: { id: string }) => u.id)).toContain(target.id);
  });
});

describe("Listings moderation - flag/remove/moderation-flag write an ActivityLog entry", () => {
  async function createListing(ownerId: string) {
    return prisma.equipment.create({
      data: {
        ownerId,
        name: "Moderation Test Tractor",
        type: "TRACTOR",
        manufacturer: "TestCo",
        model: "M1",
        enginePowerHp: 100,
        hitchCapacityKg: 1000,
        maxSpeedKmh: 30,
        isListed: true,
        category: "TRACTOR",
        listingType: "RENT",
        dailyRateMad: 500,
      },
    });
  }

  it("flagging a listing records LISTING_FLAGGED", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const listing = await createListing(owner.id);
    await loginAs(admin);

    const res = await patchAdminEquipment(jsonRequest(`/api/admin/equipment/${listing.id}`, "PATCH", { isFlagged: true }), {
      params: Promise.resolve({ id: listing.id }),
    });
    expect(res.status).toBe(200);

    const logEntry = await prisma.activityLog.findFirst({
      where: { actorId: admin.id, targetId: listing.id, action: "LISTING_FLAGGED" },
    });
    expect(logEntry).not.toBeNull();
  });

  it("removing a listing sets isListed=false and records LISTING_REMOVED", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const listing = await createListing(owner.id);
    await loginAs(admin);

    const res = await patchAdminEquipment(jsonRequest(`/api/admin/equipment/${listing.id}`, "PATCH", { isListed: false }), {
      params: Promise.resolve({ id: listing.id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data.isListed).toBe(false);

    const logEntry = await prisma.activityLog.findFirst({
      where: { actorId: admin.id, targetId: listing.id, action: "LISTING_REMOVED" },
    });
    expect(logEntry).not.toBeNull();
  });

  it("setting requiresModeration records LISTING_MODERATION_FLAG_SET", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    const listing = await createListing(owner.id);
    await loginAs(admin);

    const res = await patchAdminEquipment(
      jsonRequest(`/api/admin/equipment/${listing.id}`, "PATCH", { requiresModeration: true }),
      { params: Promise.resolve({ id: listing.id }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.requiresModeration).toBe(true);

    const logEntry = await prisma.activityLog.findFirst({
      where: { actorId: admin.id, targetId: listing.id, action: "LISTING_MODERATION_FLAG_SET" },
    });
    expect(logEntry).not.toBeNull();
    expect(logEntry?.metadata).toMatchObject({ requiresModeration: true });
  });
});

describe("GET /api/admin/transactions - read-only ledger", () => {
  it("has no mutation handlers exported from the route file", () => {
    expect((adminTransactionsRoute as Record<string, unknown>).POST).toBeUndefined();
    expect((adminTransactionsRoute as Record<string, unknown>).PATCH).toBeUndefined();
    expect((adminTransactionsRoute as Record<string, unknown>).DELETE).toBeUndefined();
  });

  it("lists both RENT and SALE transactions for admins only", async () => {
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);
    const forbidden = await listAdminTransactions(jsonRequest("/api/admin/transactions", "GET"));
    expect(forbidden.status).toBe(403);

    const { user: admin } = await createTestUser({ role: "ADMIN" });
    await loginAs(admin);
    const res = await listAdminTransactions(jsonRequest("/api/admin/transactions", "GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(Array.isArray(body.transactions)).toBe(true);
  });
});

describe("GET /api/admin/activity-log", () => {
  it("is admin-only and returns entries with actor attribution", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: target } = await createTestUser({ role: "FARMER" });
    await loginAs(admin);

    await prisma.activityLog.create({
      data: { actorId: admin.id, action: "USER_VERIFIED", targetType: "USER", targetId: target.id },
    });

    const res = await listActivityLog(jsonRequest("/api/admin/activity-log", "GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.entries.some((e: { targetId: string }) => e.targetId === target.id)).toBe(true);
    expect(body.entries[0].actor.id).toBeDefined();
  });

  it("a non-admin cannot access the activity log", async () => {
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);
    const res = await listActivityLog(jsonRequest("/api/admin/activity-log", "GET"));
    expect(res.status).toBe(403);
  });
});
