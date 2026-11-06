import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { SEED_RETAILERS, SEED_USERS, SEED_SKUS } from "./seed-data";

async function runSeed() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url || url.includes("ep-sample-pool")) {
    console.error("No valid DATABASE_URL or POSTGRES_URL configured in .env.local");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log("Seeding Neon Database...");

  // 1. Seed Retailers
  console.log(`Seeding ${SEED_RETAILERS.length} retailers...`);
  for (const r of SEED_RETAILERS) {
    await db
      .insert(schema.retailers)
      .values({
        id: r.id,
        name: r.name,
        ownerName: r.ownerName,
        phone: r.phone,
        address: r.address,
        route: r.route,
        salesmanId: r.salesmanId,
        creditLimit: r.creditLimit.toString(),
        currentBalance: r.currentBalance.toString(),
        creditHold: r.creditHold,
        lastOrderAt: r.lastOrderAt,
      })
      .onConflictDoNothing();
  }

  // 2. Seed Users
  console.log(`Seeding ${SEED_USERS.length} users...`);
  for (const u of SEED_USERS) {
    await db
      .insert(schema.users)
      .values({
        id: u.id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        retailerId: u.retailerId,
        active: u.active,
      })
      .onConflictDoNothing();
  }

  // 3. Seed SKUs
  console.log(`Seeding ${SEED_SKUS.length} SKUs...`);
  for (const s of SEED_SKUS) {
    await db
      .insert(schema.skus)
      .values({
        id: s.id,
        code: s.code,
        name: s.name,
        brand: s.brand,
        category: s.category,
        packSize: s.packSize,
        unitsPerCase: s.unitsPerCase,
        dealerPrice: s.dealerPrice.toString(),
        packPrice: (s.packPrice || 0).toString(),
        stockCases: s.stockCases,
        hsnCode: s.hsnCode,
        gstRate: s.gstRate.toString(),
        schemeType: s.schemeType,
        schemeDetail: s.schemeDetail as any,
        active: s.active,
      })
      .onConflictDoNothing();
  }

  console.log("Successfully seeded Neon Database!");
}

runSeed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
