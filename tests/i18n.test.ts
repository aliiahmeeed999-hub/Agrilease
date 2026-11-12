import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH as updateLanguage } from "@/app/api/auth/language/route";
import { POST as register } from "@/app/api/auth/register/route";
import { isRtlLocale, localeFromDbValue, dbValueFromLocale } from "@/i18n/routing";
import { reconcileNotifications } from "@/lib/notifications";
import { createTestUser, jsonRequest, loginAs, uniqueEmail, TEST_PASSWORD } from "./helpers";

describe("locale <-> DB enum mapping", () => {
  it("round-trips every supported locale through dbValueFromLocale/localeFromDbValue", () => {
    for (const locale of ["en", "fr", "ar"] as const) {
      expect(localeFromDbValue(dbValueFromLocale(locale))).toBe(locale);
    }
  });

  it("falls back to the default locale for an unrecognized DB value", () => {
    expect(localeFromDbValue("XX")).toBe("fr");
  });

  it("flags only Arabic as RTL", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
    expect(isRtlLocale("fr")).toBe(false);
  });
});

describe("PATCH /api/auth/language", () => {
  it("persists a logged-in user's language preference", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    await loginAs(user);

    const res = await updateLanguage(jsonRequest("/api/auth/language", "PATCH", { locale: "ar" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.preferredLanguage).toBe("AR");

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.preferredLanguage).toBe("AR");
  });

  it("rejects an unsupported locale", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    await loginAs(user);

    const res = await updateLanguage(jsonRequest("/api/auth/language", "PATCH", { locale: "de" }));
    expect(res.status).toBe(422);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await updateLanguage(jsonRequest("/api/auth/language", "PATCH", { locale: "en" }));
    expect(res.status).toBe(401);
  });
});

describe("registration sets preferredLanguage from the active locale", () => {
  it("stores the submitted locale as the user's preferredLanguage", async () => {
    const email = uniqueEmail("register-locale");
    const res = await register(
      jsonRequest("/api/auth/register", "POST", {
        email,
        password: TEST_PASSWORD,
        fullName: "English Farmer",
        role: "FARMER",
        locale: "en",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.user.preferredLanguage).toBe("EN");
  });

  it("defaults to French when no locale is submitted", async () => {
    const email = uniqueEmail("register-nolocale");
    const res = await register(
      jsonRequest("/api/auth/register", "POST", {
        email,
        password: TEST_PASSWORD,
        fullName: "Default Farmer",
        role: "FARMER",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.user.preferredLanguage).toBe("FR");
  });
});

describe("reconcileNotifications renders content in the requested locale", () => {
  it("generates an English harvest reminder for a field harvesting soon", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await prisma.farm.create({
      data: {
        ownerId: user.id,
        name: "Test Farm",
        region: "Test Region",
        sizeHectares: 10,
        latitude: 33.5,
        longitude: -7.5,
      },
    });
    const field = await prisma.field.create({
      data: {
        farmId: farm.id,
        name: "North Field",
        cropType: "WHEAT",
        areaHectares: 5,
        centerLat: 33.5,
        centerLng: -7.5,
        polygon: [],
        status: "GROWING",
        expectedHarvestAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    });

    await reconcileNotifications(user.id, "en");
    const notification = await prisma.notification.findFirst({
      where: { userId: user.id, type: "HARVEST_REMINDER" },
    });
    expect(notification?.title).toBe(`Harvest reminder: ${field.name}`);
    expect(notification?.message).toContain("is expected to be ready for harvest");
  });

  it("generates a French harvest reminder for the same scenario in fr", async () => {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await prisma.farm.create({
      data: {
        ownerId: user.id,
        name: "Ferme Test",
        region: "Region Test",
        sizeHectares: 10,
        latitude: 33.5,
        longitude: -7.5,
      },
    });
    await prisma.field.create({
      data: {
        farmId: farm.id,
        name: "Champ Nord",
        cropType: "WHEAT",
        areaHectares: 5,
        centerLat: 33.5,
        centerLng: -7.5,
        polygon: [],
        status: "GROWING",
        expectedHarvestAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    });

    await reconcileNotifications(user.id, "fr");
    const notification = await prisma.notification.findFirst({
      where: { userId: user.id, type: "HARVEST_REMINDER" },
    });
    expect(notification?.title).toBe("Rappel de récolte : Champ Nord");
  });
});
