import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/auth/password";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const FARM_LAT = 33.895;
const FARM_LNG = -5.545;

function square(centerLat: number, centerLng: number, halfSide: number) {
  return [
    [centerLat - halfSide, centerLng - halfSide],
    [centerLat - halfSide, centerLng + halfSide],
    [centerLat + halfSide, centerLng + halfSide],
    [centerLat + halfSide, centerLng - halfSide],
    [centerLat - halfSide, centerLng - halfSide],
  ];
}

function daysAgo(n: number, hour = 8, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

async function main() {
  console.log("Cleaning existing data...");
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.equipmentPerformanceSample.deleteMany();
  await prisma.equipmentTrackPoint.deleteMany();
  await prisma.equipmentAlert.deleteMany();
  await prisma.cropCycle.deleteMany();
  await prisma.task.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.field.deleteMany();
  await prisma.weatherCache.deleteMany();
  await prisma.soilCache.deleteMany();
  await prisma.farm.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.crop.deleteMany();

  console.log("Creating users...");
  const passwordHash = await hashPassword("Password123!");

  const admin = await prisma.user.create({
    data: {
      email: "admin@agrilease.ma",
      passwordHash,
      fullName: "Yassine Bennani",
      role: "ADMIN",
      region: "Rabat-Salé-Kénitra",
    },
  });

  const farmer = await prisma.user.create({
    data: {
      email: "farmer@agrilease.ma",
      passwordHash,
      fullName: "Khalid Ait Yahya",
      role: "FARMER",
      phone: "+212 6 61 23 45 67",
      region: "Fès-Meknès",
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: "owner@agrilease.ma",
      passwordHash,
      fullName: "Rachid Amrani",
      role: "RENTAL_OWNER",
      phone: "+212 6 71 98 76 54",
      region: "Fès-Meknès",
    },
  });

  console.log("Creating crop reference data...");
  await prisma.crop.createMany({
    data: [
      {
        type: "WHEAT",
        name: "Wheat",
        scientificName: "Triticum aestivum",
        category: "Cereal",
        growingSeason: "November – June (fall-planted)",
        averageYieldKgPerHa: 2500,
        waterRequirementMm: 450,
        fertilizerRequirement: "NPK 150-60-60 kg/ha",
        growthDurationDays: 180,
        minTempC: 5,
        maxTempC: 25,
      },
      {
        type: "BARLEY",
        name: "Barley",
        scientificName: "Hordeum vulgare",
        category: "Cereal",
        growingSeason: "November – May",
        averageYieldKgPerHa: 2000,
        waterRequirementMm: 400,
        fertilizerRequirement: "NPK 120-50-50 kg/ha",
        growthDurationDays: 150,
        minTempC: 5,
        maxTempC: 28,
      },
      {
        type: "OLIVES",
        name: "Olives",
        scientificName: "Olea europaea",
        category: "Fruit tree",
        growingSeason: "Perennial, harvested October – December",
        averageYieldKgPerHa: 1500,
        waterRequirementMm: 600,
        fertilizerRequirement: "NPK + compost, seasonal application",
        growthDurationDays: null,
        minTempC: 15,
        maxTempC: 30,
      },
      {
        type: "CITRUS",
        name: "Citrus",
        scientificName: "Citrus spp.",
        category: "Fruit tree",
        growingSeason: "Perennial, harvested November – March",
        averageYieldKgPerHa: 25000,
        waterRequirementMm: 900,
        fertilizerRequirement: "NPK + micronutrients, seasonal application",
        growthDurationDays: null,
        minTempC: 15,
        maxTempC: 30,
      },
      {
        type: "VEGETABLES",
        name: "Vegetables",
        scientificName: null,
        category: "Vegetable",
        growingSeason: "Year-round (varies by crop)",
        averageYieldKgPerHa: 20000,
        waterRequirementMm: 500,
        fertilizerRequirement: "NPK 100-80-100 kg/ha",
        growthDurationDays: 90,
        minTempC: 10,
        maxTempC: 30,
      },
      {
        type: "OTHER",
        name: "Other",
        scientificName: null,
        category: null,
        growingSeason: null,
        averageYieldKgPerHa: null,
        waterRequirementMm: null,
        fertilizerRequirement: null,
        growthDurationDays: null,
        minTempC: null,
        maxTempC: null,
      },
    ],
  });

  console.log("Creating farm...");
  const farm = await prisma.farm.create({
    data: {
      ownerId: farmer.id,
      name: "Ferme Ait Yahya",
      region: "Fès-Meknès",
      sizeHectares: 45,
      latitude: FARM_LAT,
      longitude: FARM_LNG,
    },
  });

  console.log("Creating weather & soil cache...");
  await prisma.weatherCache.create({
    data: {
      farmId: farm.id,
      fetchedAt: new Date(),
      temperatureC: 24.5,
      humidityPct: 55,
      windSpeedKmh: 12,
      rainfallMm: 0,
      pressureHpa: 1015,
    },
  });
  await prisma.soilCache.create({
    data: {
      farmId: farm.id,
      fetchedAt: new Date(),
      ph: 7.2,
      nitrogen: 18,
      phosphorus: 12,
      potassium: 140,
      organicMatterPct: 1.8,
      soilMoisturePct: 22,
    },
  });

  console.log("Creating fields...");
  const [wheatField, barleyField, oliveField, citrusField] = await Promise.all([
    prisma.field.create({
      data: {
        farmId: farm.id,
        name: "North Field",
        cropType: "WHEAT",
        areaHectares: 12.3,
        centerLat: FARM_LAT + 0.006,
        centerLng: FARM_LNG - 0.008,
        polygon: square(FARM_LAT + 0.006, FARM_LNG - 0.008, 0.004),
        status: "GROWING",
        plantedAt: daysAgo(120),
        expectedHarvestAt: daysAgo(-25),
      },
    }),
    prisma.field.create({
      data: {
        farmId: farm.id,
        name: "East Field",
        cropType: "BARLEY",
        areaHectares: 9.8,
        centerLat: FARM_LAT + 0.005,
        centerLng: FARM_LNG + 0.007,
        polygon: square(FARM_LAT + 0.005, FARM_LNG + 0.007, 0.0035),
        status: "GROWING",
        plantedAt: daysAgo(100),
        expectedHarvestAt: daysAgo(-10),
      },
    }),
    prisma.field.create({
      data: {
        farmId: farm.id,
        name: "Olive Grove",
        cropType: "OLIVES",
        areaHectares: 14.2,
        centerLat: FARM_LAT - 0.006,
        centerLng: FARM_LNG - 0.005,
        polygon: square(FARM_LAT - 0.006, FARM_LNG - 0.005, 0.0045),
        status: "HARVESTED",
        plantedAt: daysAgo(1800),
        expectedHarvestAt: daysAgo(15),
      },
    }),
    prisma.field.create({
      data: {
        farmId: farm.id,
        name: "Citrus Orchard",
        cropType: "CITRUS",
        areaHectares: 8.7,
        centerLat: FARM_LAT - 0.005,
        centerLng: FARM_LNG + 0.006,
        polygon: square(FARM_LAT - 0.005, FARM_LNG + 0.006, 0.003),
        status: "GROWING",
        plantedAt: daysAgo(900),
        expectedHarvestAt: daysAgo(-40),
      },
    }),
  ]);

  console.log("Creating crop cycles...");
  await prisma.cropCycle.createMany({
    data: [
      // Wheat field: prior completed season + current in-progress season
      {
        fieldId: wheatField.id,
        cropType: "WHEAT",
        plantedAt: daysAgo(480),
        harvestedAt: daysAgo(305),
        expectedHarvestAt: daysAgo(305),
        growthStage: "Harvested",
        expectedYieldKg: 30000,
        actualYieldKg: 29450,
      },
      {
        fieldId: wheatField.id,
        cropType: "WHEAT",
        plantedAt: daysAgo(120),
        expectedHarvestAt: daysAgo(-25),
        growthStage: "Vegetative",
        expectedYieldKg: 30750,
      },
      // Barley field
      {
        fieldId: barleyField.id,
        cropType: "BARLEY",
        plantedAt: daysAgo(460),
        harvestedAt: daysAgo(290),
        expectedHarvestAt: daysAgo(290),
        growthStage: "Harvested",
        expectedYieldKg: 19600,
        actualYieldKg: 20120,
      },
      {
        fieldId: barleyField.id,
        cropType: "BARLEY",
        plantedAt: daysAgo(100),
        expectedHarvestAt: daysAgo(-10),
        growthStage: "Flowering",
        expectedYieldKg: 19600,
      },
      // Olive grove
      {
        fieldId: oliveField.id,
        cropType: "OLIVES",
        plantedAt: daysAgo(2165),
        harvestedAt: daysAgo(380),
        expectedHarvestAt: daysAgo(380),
        growthStage: "Harvested",
        expectedYieldKg: 21300,
        actualYieldKg: 20780,
      },
      {
        fieldId: oliveField.id,
        cropType: "OLIVES",
        plantedAt: daysAgo(1800),
        harvestedAt: daysAgo(15),
        expectedHarvestAt: daysAgo(15),
        growthStage: "Harvested",
        expectedYieldKg: 21300,
        actualYieldKg: 21960,
      },
      // Citrus orchard
      {
        fieldId: citrusField.id,
        cropType: "CITRUS",
        plantedAt: daysAgo(1265),
        harvestedAt: daysAgo(405),
        expectedHarvestAt: daysAgo(405),
        growthStage: "Harvested",
        expectedYieldKg: 217500,
        actualYieldKg: 209800,
      },
      {
        fieldId: citrusField.id,
        cropType: "CITRUS",
        plantedAt: daysAgo(900),
        expectedHarvestAt: daysAgo(-40),
        growthStage: "Fruit development",
        expectedYieldKg: 217500,
      },
    ],
  });

  console.log("Creating workers...");
  const workerNames: Array<[string, string, boolean]> = [
    ["Youssef El Amrani", "Field Operator", true],
    ["Fatima Zahra Benali", "Equipment Technician", true],
    ["Hassan Idrissi", "Field Operator", true],
    ["Amina Chraibi", "Irrigation Specialist", true],
    ["Mohamed Ouazzani", "Field Operator", true],
    ["Nadia Fassi", "Harvest Supervisor", false],
    ["Karim Tazi", "Field Operator", false],
    ["Salma Benjelloun", "Equipment Technician", false],
  ];
  await prisma.worker.createMany({
    data: workerNames.map(([fullName, title, isOnDuty]) => ({
      farmId: farm.id,
      fullName,
      title,
      isOnDuty,
    })),
  });

  console.log("Creating equipment...");
  const tractor = await prisma.equipment.create({
    data: {
      ownerId: owner.id,
      currentFarmId: farm.id,
      name: "Field tractor RX-7",
      type: "TRACTOR",
      manufacturer: "John Deere",
      model: "6R 155",
      enginePowerHp: 155,
      hitchCapacityKg: 7200,
      maxSpeedKmh: 40,
      status: "ACTIVE",
      currentLat: FARM_LAT + 0.001,
      currentLng: FARM_LNG - 0.001,
      purchaseYear: 2022,
      imageUrl: "/images/equipment/john-deere-6r155.jpg",
      dailyRateMad: 1200,
      isListed: true,
    },
  });

  const harvester = await prisma.equipment.create({
    data: {
      ownerId: owner.id,
      currentFarmId: farm.id,
      name: "Combine Harvester",
      type: "HARVESTER",
      manufacturer: "New Holland",
      model: "TC5.30",
      enginePowerHp: 130,
      hitchCapacityKg: 0,
      maxSpeedKmh: 25,
      status: "IDLE",
      currentLat: FARM_LAT - 0.005,
      currentLng: FARM_LNG - 0.004,
      purchaseYear: 2021,
      imageUrl: "/images/equipment/new-holland-tc530.jpg",
      dailyRateMad: 2500,
      isListed: true,
    },
  });

  const utilityTractor = await prisma.equipment.create({
    data: {
      ownerId: owner.id,
      currentFarmId: farm.id,
      name: "Utility tractor",
      type: "TRACTOR",
      manufacturer: "Kubota",
      model: "M7060",
      enginePowerHp: 71,
      hitchCapacityKg: 2500,
      maxSpeedKmh: 32,
      status: "MAINTENANCE",
      currentLat: FARM_LAT + 0.0005,
      currentLng: FARM_LNG + 0.0015,
      purchaseYear: 2019,
      imageUrl: "/images/equipment/kubota-m7060.jpg",
      dailyRateMad: 800,
      isListed: false,
    },
  });

  console.log("Creating bookings...");
  await prisma.booking.create({
    data: {
      equipmentId: harvester.id,
      renterId: farmer.id,
      startDate: daysAgo(-5, 7, 0),
      endDate: daysAgo(-7, 18, 0),
      status: "PENDING",
      dailyRateMad: 2500,
      totalPriceMad: 5000,
      depositMad: 1000,
      paymentStatus: "PENDING",
      pickupLocation: "Ferme Ait Yahya - Hangar principal",
      returnLocation: "Ferme Ait Yahya - Hangar principal",
      notes: "Need it for the wheat harvest window.",
      createdAt: daysAgo(1),
    },
  });

  const approvedBooking = await prisma.booking.create({
    data: {
      equipmentId: tractor.id,
      renterId: farmer.id,
      startDate: daysAgo(10, 7, 0),
      endDate: daysAgo(8, 18, 0),
      status: "APPROVED",
      dailyRateMad: 1200,
      totalPriceMad: 2400,
      depositMad: 500,
      paymentStatus: "PAID",
      pickupLocation: "Ferme Ait Yahya - Portail nord",
      returnLocation: "Ferme Ait Yahya - Portail nord",
      createdAt: daysAgo(12),
    },
  });

  await prisma.booking.create({
    data: {
      equipmentId: tractor.id,
      renterId: farmer.id,
      startDate: daysAgo(20, 7, 0),
      endDate: daysAgo(18, 18, 0),
      status: "REJECTED",
      dailyRateMad: 1200,
      totalPriceMad: 2400,
      paymentStatus: "PENDING",
      notes: "Requested during scheduled maintenance.",
      createdAt: daysAgo(21),
    },
  });

  console.log("Creating review...");
  await prisma.review.create({
    data: {
      bookingId: approvedBooking.id,
      authorId: farmer.id,
      rating: 5,
      comment: "Tractor was in great condition and pickup was smooth.",
      createdAt: daysAgo(7),
    },
  });

  console.log("Creating maintenance records...");
  await prisma.maintenanceRecord.createMany({
    data: [
      {
        equipmentId: tractor.id,
        performedAt: daysAgo(20),
        nextDueAt: daysAgo(-70),
        cost: 800,
        mechanic: "Atelier Bennani",
        notes: "Oil & filter change, hydraulic hose inspection.",
      },
      {
        equipmentId: harvester.id,
        performedAt: daysAgo(45),
        nextDueAt: daysAgo(-45),
        cost: 1200,
        mechanic: "New Holland Service Center",
        notes: "Belt replacement and blade sharpening.",
      },
      {
        equipmentId: utilityTractor.id,
        performedAt: daysAgo(0),
        nextDueAt: daysAgo(-90),
        cost: 1500,
        mechanic: "Atelier Fassi",
        notes: "Engine service and hydraulic fluid change.",
      },
    ],
  });

  console.log("Creating notifications...");
  await prisma.notification.createMany({
    data: [
      {
        userId: farmer.id,
        type: "RENTAL_APPROVED",
        title: "Booking approved",
        message: "Your rental of Field tractor RX-7 was approved.",
        isRead: true,
        createdAt: daysAgo(11),
      },
      {
        userId: farmer.id,
        type: "HARVEST_REMINDER",
        title: "Harvest reminder",
        message: "North Field wheat is expected to be ready for harvest in 25 days.",
        isRead: false,
        createdAt: daysAgo(1),
      },
      {
        userId: farmer.id,
        type: "RAIN_EXPECTED",
        title: "Rain expected",
        message: "40mm of rain expected over the next 3 days near Ferme Ait Yahya.",
        isRead: false,
        createdAt: hoursAgo(5),
      },
      {
        userId: owner.id,
        type: "MAINTENANCE_DUE",
        title: "Maintenance due",
        message: "Utility tractor is due for scheduled maintenance.",
        isRead: false,
        createdAt: hoursAgo(1),
      },
    ],
  });

  console.log("Creating tasks (this week, primary tractor)...");
  const taskDefs = [
    { title: "Plowing – North Field", fieldId: wheatField.id, status: "COMPLETED" as const, dayOffset: 4, distanceKm: 5.2, durationMinutes: 210 },
    { title: "Spraying – Olive Grove", fieldId: oliveField.id, status: "COMPLETED" as const, dayOffset: 3, distanceKm: 4.8, durationMinutes: 180 },
    { title: "Transport – Citrus Harvest", fieldId: citrusField.id, status: "COMPLETED" as const, dayOffset: 2, distanceKm: 6.1, durationMinutes: 240 },
    { title: "Plowing – East Field", fieldId: barleyField.id, status: "COMPLETED" as const, dayOffset: 1, distanceKm: 5.4, durationMinutes: 220 },
    { title: "Irrigation Support – North Field", fieldId: wheatField.id, status: "IN_PROGRESS" as const, dayOffset: 0, distanceKm: 4.9, durationMinutes: 387 },
    { title: "Fertilizer Spreading – North Field", fieldId: wheatField.id, status: "PENDING" as const, dayOffset: 0, distanceKm: 3.3, durationMinutes: 0 },
  ];

  for (const t of taskDefs) {
    await prisma.task.create({
      data: {
        equipmentId: tractor.id,
        farmId: farm.id,
        fieldId: t.fieldId,
        title: t.title,
        status: t.status,
        scheduledStart: daysAgo(t.dayOffset, 7, 30),
        scheduledEnd: t.status === "PENDING" ? null : daysAgo(t.dayOffset, 12, 0),
        distanceKm: t.distanceKm,
        durationMinutes: t.durationMinutes,
      },
    });
  }

  console.log("Creating alerts...");
  await prisma.equipmentAlert.createMany({
    data: [
      {
        equipmentId: tractor.id,
        type: "HYDRAULIC_PRESSURE_DROP",
        severity: "WARNING",
        message: "Check hose connections",
        isResolved: false,
        createdAt: hoursAgo(2),
      },
      {
        equipmentId: tractor.id,
        type: "SERVICE_COMPLETED",
        severity: "INFO",
        message: "Oil & filter changed (today)",
        isResolved: true,
        createdAt: hoursAgo(20),
      },
      {
        equipmentId: tractor.id,
        type: "GPS_SIGNAL_UNSTABLE",
        severity: "WARNING",
        message: "Guidance accuracy reduced",
        isResolved: false,
        createdAt: hoursAgo(72),
      },
    ],
  });

  console.log("Creating today's track points...");
  const trackPoints: { equipmentId: string; lat: number; lng: number; speedKmh: number; heading: number; recordedAt: Date }[] = [];
  const routeAnchors = [
    [FARM_LAT + 0.001, FARM_LNG - 0.001],
    [FARM_LAT + 0.006, FARM_LNG - 0.008],
    [FARM_LAT + 0.007, FARM_LNG - 0.004],
    [FARM_LAT + 0.003, FARM_LNG + 0.002],
    [FARM_LAT - 0.001, FARM_LNG + 0.003],
    [FARM_LAT - 0.005, FARM_LNG - 0.004],
    [FARM_LAT - 0.002, FARM_LNG - 0.007],
    [FARM_LAT + 0.001, FARM_LNG - 0.001],
  ];
  const pointsPerLeg = 5;
  const startOfDay = daysAgo(0, 6, 30);
  let pointIndex = 0;
  for (let leg = 0; leg < routeAnchors.length - 1; leg++) {
    const [lat1, lng1] = routeAnchors[leg];
    const [lat2, lng2] = routeAnchors[leg + 1];
    for (let i = 0; i < pointsPerLeg; i++) {
      const frac = i / pointsPerLeg;
      const jitterLat = (Math.random() - 0.5) * 0.0003;
      const jitterLng = (Math.random() - 0.5) * 0.0003;
      trackPoints.push({
        equipmentId: tractor.id,
        lat: lat1 + (lat2 - lat1) * frac + jitterLat,
        lng: lng1 + (lng2 - lng1) * frac + jitterLng,
        speedKmh: 8 + Math.random() * 14,
        heading: (Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI,
        recordedAt: new Date(startOfDay.getTime() + pointIndex * 15 * 60 * 1000),
      });
      pointIndex++;
    }
  }
  await prisma.equipmentTrackPoint.createMany({ data: trackPoints });

  console.log("Creating 10-day performance samples...");
  for (const equipment of [tractor, harvester, utilityTractor]) {
    const samples = [];
    for (let i = 9; i >= 0; i--) {
      const base = equipment.id === tractor.id ? 5.5 : equipment.id === harvester.id ? 3.5 : 4.5;
      const variation = Math.sin(i * 0.7) * 1.5 + (Math.random() - 0.5) * 1.2;
      const runningHours = Math.max(0.5, base + variation);
      samples.push({
        equipmentId: equipment.id,
        date: daysAgo(i, 0, 0),
        runningHours: Number(runningHours.toFixed(1)),
        distanceKm: Number((runningHours * 4.2 + Math.random() * 2).toFixed(1)),
        tasksCompleted: Math.max(0, Math.round(runningHours / 1.8)),
        efficiencyScore: Number(Math.min(100, Math.max(40, 65 + variation * 8 + Math.random() * 10)).toFixed(1)),
      });
    }
    await prisma.equipmentPerformanceSample.createMany({ data: samples });
  }

  console.log("Seed complete.");
  console.log("Demo accounts (password: Password123!):");
  console.log(`  Farmer:  ${farmer.email}`);
  console.log(`  Owner:   ${owner.email}`);
  console.log(`  Admin:   ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
