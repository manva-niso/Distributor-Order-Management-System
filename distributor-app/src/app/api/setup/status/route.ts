import { NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { getNeonSql, isNeonConfigured } from "@/db/neon";

export async function GET() {
  const stats = dbStore.getStoreStats();
  const retailers = dbStore.getAllRetailers().map((r) => ({
    id: r.id,
    name: r.name,
    ownerName: r.ownerName,
    phone: r.phone,
    route: r.route,
    creditLimit: r.creditLimit,
    currentBalance: r.currentBalance,
    availableCredit: r.creditLimit - r.currentBalance,
  }));

  const skus = dbStore.getAllSkus().map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    brand: s.brand,
    category: s.category,
    packSize: s.packSize,
    unitsPerCase: s.unitsPerCase,
    dealerPrice: s.dealerPrice,
    stockCases: s.stockCases,
    schemeType: s.schemeType,
    gstRate: s.gstRate,
  }));

  let neonInfo = {
    configured: isNeonConfigured(),
    connected: false,
    skusCount: 0,
    retailersCount: 0,
    ordersCount: 0,
  };

  if (isNeonConfigured()) {
    try {
      const sql = getNeonSql();
      if (sql) {
        const skuRes = await sql`SELECT count(*)::int as count FROM skus;`;
        const retRes = await sql`SELECT count(*)::int as count FROM retailers;`;
        const ordRes = await sql`SELECT count(*)::int as count FROM orders;`;
        neonInfo = {
          configured: true,
          connected: true,
          skusCount: Number((skuRes as any[])[0]?.count ?? 0),
          retailersCount: Number((retRes as any[])[0]?.count ?? 0),
          ordersCount: Number((ordRes as any[])[0]?.count ?? 0),
        };
      }
    } catch (neonErr) {
      console.warn("Neon status check error:", neonErr);
    }
  }

  return NextResponse.json({
    success: true,
    stats,
    database: neonInfo,
    retailers,
    skus,
  });
}
