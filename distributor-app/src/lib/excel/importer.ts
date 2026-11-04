import * as XLSX from "xlsx";
import { SeedSku, SeedRetailer } from "@/db/seed-data";

export interface SkuImportRow {
  Code?: string;
  Name: string;
  Brand?: string;
  Category?: string;
  PackSize?: string;
  UnitsPerCase?: number;
  DealerPrice: number;
  StockCases?: number;
  GstRate?: number;
  HsnCode?: string;
  SchemeType?: string; // NONE | FREE_GOODS | SLAB_DISCOUNT
  BuyQty?: number;
  GetFreeQty?: number;
  MinCases?: number;
  DiscountPct?: number;
}

export interface RetailerImportRow {
  Id?: string;
  ShopName: string;
  OwnerName: string;
  Phone: string | number;
  Address: string;
  Route?: string;
  CreditLimit?: number;
  CurrentBalance?: number;
}

export interface ParseResult {
  success: boolean;
  skus: SeedSku[];
  retailers: SeedRetailer[];
  errors: string[];
  summary: {
    totalSkusParsed: number;
    totalRetailersParsed: number;
  };
}

/**
 * Normalizes an object's keys to lowercase alphanumeric for robust matching
 */
function normalizeRow(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    normalized[cleanKey] = val;
  }
  return normalized;
}

/**
 * Parses raw JSON rows into typed SeedSku records
 */
export function parseSkuRows(rows: any[]): { skus: SeedSku[]; errors: string[] } {
  const skus: SeedSku[] = [];
  const errors: string[] = [];

  rows.forEach((raw, idx) => {
    const row = normalizeRow(raw);
    const rowNum = idx + 2; // Accounting for 1-based index and header row

    const name = String(row.name || row.itemname || row.productname || row.product || row.item || "").trim();
    if (!name) {
      errors.push(`Row ${rowNum}: Item/Product Name is required.`);
      return;
    }

    const dealerPrice = parseFloat(
      String(row.dealerprice || row.wholesaleprice || row.rate || row.caseprice || row.price || 0)
    );
    if (isNaN(dealerPrice) || dealerPrice <= 0) {
      errors.push(`Row ${rowNum} (${name}): Valid positive Wholesale Dealer Price is required.`);
      return;
    }

    const unitsPerCase = parseInt(String(row.unitspercase || row.packspercase || row.casepack || 1), 10) || 1;
    const stockCases = parseInt(String(row.stockcases || row.stock || row.inventory || row.qty || 50), 10);
    const gstRate = parseFloat(String(row.gstrate || row.gst || row.taxrate || 18.0));
    const brand = String(row.brand || row.company || "General").trim();
    const category = String(row.category || row.group || "General").trim();
    const packSize = String(row.packsize || row.size || row.weight || "1 Unit").trim();
    const hsnCode = String(row.hsncode || row.hsn || "00000000").trim();
    const code = String(row.code || row.skucode || `SKU-${Date.now().toString(36).toUpperCase()}-${idx + 1}`).trim();

    // Parse Scheme parameters
    let schemeType: SeedSku["schemeType"] = "NONE";
    const rawScheme = String(row.schemetype || row.scheme || row.offer || "").toUpperCase();

    let schemeDetail: SeedSku["schemeDetail"] = undefined;

    if (rawScheme.includes("FREE") || rawScheme.includes("B10G1") || row.buyqty) {
      schemeType = "FREE_GOODS";
      const buyQty = parseInt(String(row.buyqty || 10), 10);
      const getFreeQty = parseInt(String(row.getfreeqty || row.freeqty || 1), 10);
      const freeSkuId = row.freeskuid || row.freeitemcode ? String(row.freeskuid || row.freeitemcode).trim() : undefined;
      const freeSkuName = row.freeskuname || row.freeitemname ? String(row.freeskuname || row.freeitemname).trim() : undefined;
      schemeDetail = { buyQty, getFreeQty, freeSkuId, freeSkuName };
    } else if (rawScheme.includes("REBATE") || rawScheme.includes("FLAT") || row.flatpercase) {
      schemeType = "FLAT_REBATE";
      const flatPerCase = parseFloat(String(row.flatpercase || row.cashdiscount || 50));
      const minCasesForRebate = parseInt(String(row.mincases || 5), 10);
      schemeDetail = { flatPerCase, minCasesForRebate };
    } else if (rawScheme.includes("SLAB") || rawScheme.includes("DISCOUNT") || row.discountpct || row.tiers) {
      schemeType = "SLAB_DISCOUNT";
      const rawTiersStr = String(row.tiers || "");
      if (rawTiersStr && rawTiersStr.includes(":")) {
        const tiers = rawTiersStr
          .split(",")
          .map((part) => {
            const [m, d] = part.split(":");
            return {
              minCases: parseInt(m.trim(), 10),
              discountPct: parseFloat(d.replace("%", "").trim()),
            };
          })
          .filter((t) => !isNaN(t.minCases) && !isNaN(t.discountPct));

        schemeDetail = {
          tiers,
          minCases: tiers[0]?.minCases || 5,
          discountPct: tiers[0]?.discountPct || 3,
        };
      } else {
        const minCases = parseInt(String(row.mincases || row.tiercases || 5), 10);
        const discountPct = parseFloat(String(row.discountpct || row.discount || 3.0));
        schemeDetail = { minCases, discountPct };
      }
    }

    const packPrice = Math.round((dealerPrice / unitsPerCase) * 100) / 100;

    skus.push({
      id: code,
      code,
      name,
      brand,
      category,
      packSize,
      unitsPerCase,
      dealerPrice,
      packPrice,
      stockCases: Math.max(0, isNaN(stockCases) ? 0 : stockCases),
      hsnCode,
      gstRate: isNaN(gstRate) ? 18.0 : gstRate,
      schemeType,
      schemeDetail,
      active: true,
    });
  });

  return { skus, errors };
}

/**
 * Parses raw JSON rows into typed SeedRetailer records
 */
export function parseRetailerRows(rows: any[]): { retailers: SeedRetailer[]; errors: string[] } {
  const retailers: SeedRetailer[] = [];
  const errors: string[] = [];

  rows.forEach((raw, idx) => {
    const row = normalizeRow(raw);
    const rowNum = idx + 2;

    const shopName = String(row.shopname || row.name || row.storename || row.retailer || "").trim();
    if (!shopName) {
      errors.push(`Row ${rowNum}: Shop Name is required.`);
      return;
    }

    const rawPhone = String(row.phone || row.mobile || row.contact || "").replace(/\D/g, "").slice(-10);
    if (rawPhone.length !== 10) {
      errors.push(`Row ${rowNum} (${shopName}): Must have a valid 10-digit mobile number.`);
      return;
    }

    const ownerName = String(row.ownername || row.owner || row.proprietor || shopName).trim();
    const address = String(row.address || row.location || "Jabalpur").trim();
    const route = String(row.route || row.beat || "Napier Town Route #4").trim();
    const creditLimit = parseFloat(String(row.creditlimit || row.limit || 50000));
    const currentBalance = parseFloat(String(row.currentbalance || row.balance || row.outstanding || 0));

    const id = String(row.id || row.retailerid || `RET-${1800 + idx + 1}`).trim();

    retailers.push({
      id,
      name: shopName,
      ownerName,
      phone: rawPhone,
      address,
      route,
      creditLimit: isNaN(creditLimit) ? 50000 : creditLimit,
      currentBalance: isNaN(currentBalance) ? 0 : currentBalance,
      creditHold: currentBalance > creditLimit,
      lastOrderAt: undefined,
    });
  });

  return { retailers, errors };
}

/**
 * Universal Excel / CSV Buffer Ingestion Engine
 */
export function parseWorkbookBuffer(buffer: ArrayBuffer | Buffer): ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames;

    let skus: SeedSku[] = [];
    let retailers: SeedRetailer[] = [];
    const allErrors: string[] = [];

    // Check for explicit sheet names
    const skuSheetName = sheetNames.find((s) => /sku|product|item|catalog/i.test(s));
    const retailerSheetName = sheetNames.find((s) => /retailer|shop|customer|store/i.test(s));

    if (skuSheetName) {
      const sheet = workbook.Sheets[skuSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const parsed = parseSkuRows(rows);
      skus = parsed.skus;
      allErrors.push(...parsed.errors);
    }

    if (retailerSheetName) {
      const sheet = workbook.Sheets[retailerSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const parsed = parseRetailerRows(rows);
      retailers = parsed.retailers;
      allErrors.push(...parsed.errors);
    }

    // If no explicit sheets matched, inspect first sheet
    if (!skuSheetName && !retailerSheetName && sheetNames.length > 0) {
      const firstSheet = workbook.Sheets[sheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);
      if (rows.length > 0) {
        const sample = normalizeRow(rows[0] as Record<string, any>);
        // Heuristic: Does it have dealerprice or unitspercase -> SKUs; else Retailers
        if (sample.dealerprice || sample.wholesaleprice || sample.unitspercase || sample.brand) {
          const parsed = parseSkuRows(rows);
          skus = parsed.skus;
          allErrors.push(...parsed.errors);
        } else {
          const parsed = parseRetailerRows(rows);
          retailers = parsed.retailers;
          allErrors.push(...parsed.errors);
        }
      }
    }

    return {
      success: allErrors.length === 0 || skus.length > 0 || retailers.length > 0,
      skus,
      retailers,
      errors: allErrors,
      summary: {
        totalSkusParsed: skus.length,
        totalRetailersParsed: retailers.length,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      skus: [],
      retailers: [],
      errors: [`Excel parsing failed: ${err?.message || "Invalid file format."}`],
      summary: { totalSkusParsed: 0, totalRetailersParsed: 0 },
    };
  }
}

/**
 * Generates downloadable Excel template buffer with instructions and sample rows
 */
export function generateExcelTemplate(type: "skus" | "retailers" | "master"): Buffer {
  const wb = XLSX.utils.book_new();

  if (type === "skus" || type === "master") {
    const sampleSkus = [
      {
        Code: "SKU-BS-075",
        Name: "Glucose biscuit 75 g, case of 96",
        Brand: "Parle",
        Category: "Biscuits",
        PackSize: "75 g",
        UnitsPerCase: 96,
        DealerPrice: 777.6,
        StockCases: 340,
        GstRate: 18,
        HsnCode: "19053100",
        SchemeType: "FREE_GOODS",
        BuyQty: 10,
        GetFreeQty: 1,
        MinCases: "",
        DiscountPct: "",
      },
      {
        Code: "SKU-DT-1KG",
        Name: "Detergent powder 1 kg, case of 20",
        Brand: "Ghadi",
        Category: "Detergent",
        PackSize: "1 kg",
        UnitsPerCase: 20,
        DealerPrice: 2030.0,
        StockCases: 85,
        GstRate: 18,
        HsnCode: "34029011",
        SchemeType: "SLAB_DISCOUNT",
        BuyQty: "",
        GetFreeQty: "",
        MinCases: 5,
        DiscountPct: 3.0,
      },
      {
        Code: "SKU-TE-250",
        Name: "Tea leaf 250 g, case of 40",
        Brand: "Wagh Bakri",
        Category: "Tea",
        PackSize: "250 g",
        UnitsPerCase: 40,
        DealerPrice: 4720.0,
        StockCases: 25,
        GstRate: 5,
        HsnCode: "09024020",
        SchemeType: "NONE",
        BuyQty: "",
        GetFreeQty: "",
        MinCases: "",
        DiscountPct: "",
      },
    ];
    const wsSkus = XLSX.utils.json_to_sheet(sampleSkus);
    XLSX.utils.book_append_sheet(wb, wsSkus, "SKUs");
  }

  if (type === "retailers" || type === "master") {
    const sampleRetailers = [
      {
        Id: "RET-0001",
        ShopName: "Sharma Kirana Store",
        OwnerName: "Ramesh Sharma",
        Phone: "9826000001",
        Address: "Shop 14, Main Road, Napier Town, Jabalpur",
        Route: "Napier Town Route #4",
        CreditLimit: 50000,
        CurrentBalance: 12000,
      },
      {
        Id: "RET-0002",
        ShopName: "Verma General Store",
        OwnerName: "Sunil Verma",
        Phone: "9826000002",
        Address: "Plot 8B, Adhartal Industrial Area, Jabalpur",
        Route: "Adhartal Route #3",
        CreditLimit: 45000,
        CurrentBalance: 8500,
      },
      {
        Id: "RET-0003",
        ShopName: "Gupta Daily Needs",
        OwnerName: "Alok Gupta",
        Phone: "9826000003",
        Address: "Near Gol Bazar, Gorakhpur, Jabalpur",
        Route: "Gorakhpur Route #1",
        CreditLimit: 60000,
        CurrentBalance: 0,
      },
    ];
    const wsRetailers = XLSX.utils.json_to_sheet(sampleRetailers);
    XLSX.utils.book_append_sheet(wb, wsRetailers, "Retailers");
  }

  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(excelBuffer);
}
