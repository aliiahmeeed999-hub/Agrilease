import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH as patchAdminUser } from "@/app/api/admin/users/[id]/route";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/profile/route";
import { createTestUser, jsonRequest, loginAs } from "./helpers";

describe("PATCH /api/admin/users/[id] - role and verification management", () => {
  it("lets an admin change a user's role and records an activity log entry", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: target } = await createTestUser({ role: "FARMER" });
    await loginAs(admin);

    const res = await patchAdminUser(jsonRequest(`/api/admin/users/${target.id}`, "PATCH", { role: "RENTAL_OWNER" }), {
      params: Promise.resolve({ id: target.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.role).toBe("RENTAL_OWNER");

    const logEntry = await prisma.activityLog.findFirst({
      where: { actorId: admin.id, targetId: target.id, action: "USER_ROLE_CHANGED" },
    });
    expect(logEntry).not.toBeNull();
    expect(logEntry?.metadata).toMatchObject({ fromRole: "FARMER", toRole: "RENTAL_OWNER" });
  });

  it("lets an admin verify a user and records an activity log entry", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: target } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(admin);

    const res = await patchAdminUser(
      jsonRequest(`/api/admin/users/${target.id}`, "PATCH", { verificationStatus: "VERIFIED" }),
      { params: Promise.resolve({ id: target.id }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.verificationStatus).toBe("VERIFIED");

    const logEntry = await prisma.activityLog.findFirst({
      where: { actorId: admin.id, targetId: target.id, action: "USER_VERIFIED" },
    });
    expect(logEntry).not.toBeNull();
  });

  it("blocks an admin from changing their own role", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    await loginAs(admin);

    const res = await patchAdminUser(jsonRequest(`/api/admin/users/${admin.id}`, "PATCH", { role: "FARMER" }), {
      params: Promise.resolve({ id: admin.id }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("CANNOT_MODIFY_SELF");
  });

  it("blocks an admin from modifying another admin", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: otherAdmin } = await createTestUser({ role: "ADMIN" });
    await loginAs(admin);

    const res = await patchAdminUser(
      jsonRequest(`/api/admin/users/${otherAdmin.id}`, "PATCH", { verificationStatus: "VERIFIED" }),
      { params: Promise.resolve({ id: otherAdmin.id }) }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("CANNOT_MODIFY_ADMIN");
  });

  it("rejects an empty patch body", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    const { user: target } = await createTestUser({ role: "FARMER" });
    await loginAs(admin);

    const res = await patchAdminUser(jsonRequest(`/api/admin/users/${target.id}`, "PATCH", {}), {
      params: Promise.resolve({ id: target.id }),
    });
    expect(res.status).toBe(422);
  });

  it("a non-admin cannot change roles", async () => {
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    const { user: target } = await createTestUser({ role: "FARMER" });
    await loginAs(farmer);

    const res = await patchAdminUser(jsonRequest(`/api/admin/users/${target.id}`, "PATCH", { role: "ADMIN" }), {
      params: Promise.resolve({ id: target.id }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET/PATCH /api/profile - per-role profile shape", () => {
  it("returns a Farmer profile with farmsCount", async () => {
    const { user: farmer } = await createTestUser({ role: "FARMER" });
    await prisma.farm.create({
      data: { ownerId: farmer.id, name: "Test Farm", region: "Region", sizeHectares: 5, latitude: 33, longitude: -7 },
    });
    await loginAs(farmer);

    const res = await getProfile();
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.role).toBe("FARMER");
    expect(body.farmsCount).toBe(1);
  });

  it("returns a Rental Owner profile with listingsCount and creates a RentalOwnerProfile row on first PATCH", async () => {
    const { user: owner } = await createTestUser({ role: "RENTAL_OWNER" });
    await loginAs(owner);

    const patchRes = await patchProfile(
      jsonRequest("/api/profile", "PATCH", { accountType: "COMPANY", companyName: "Amrani SARL" })
    );
    expect(patchRes.status).toBe(200);
    const body = (await patchRes.json()).data;
    expect(body.role).toBe("RENTAL_OWNER");
    expect(body.companyName).toBe("Amrani SARL");

    const stored = await prisma.rentalOwnerProfile.findUnique({ where: { userId: owner.id } });
    expect(stored?.companyName).toBe("Amrani SARL");
  });

  it("returns a Banker profile with stats and creates a BankerProfile row on first PATCH", async () => {
    const { user: banker } = await createTestUser({ role: "BANKER" });
    await loginAs(banker);

    const patchRes = await patchProfile(jsonRequest("/api/profile", "PATCH", { institutionName: "Banque Test" }));
    expect(patchRes.status).toBe(200);
    const body = (await patchRes.json()).data;
    expect(body.role).toBe("BANKER");
    expect(body.institutionName).toBe("Banque Test");
    expect(body.stats.pendingCount).toBe(0);
  });

  it("returns an Admin profile", async () => {
    const { user: admin } = await createTestUser({ role: "ADMIN" });
    await loginAs(admin);

    const res = await getProfile();
    const body = (await res.json()).data;
    expect(body.role).toBe("ADMIN");
  });
});
