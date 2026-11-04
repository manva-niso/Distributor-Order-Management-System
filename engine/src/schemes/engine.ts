/**
 * Universal FMCG Trade Scheme & Tax Pricing Engine
 * Implements deterministic FMCG wholesale scheme calculations, multi-tier slab ladders,
 * cross-SKU free goods gifting, flat cash rebates, GST half-up rounding, and invoice breakdown.
 *
 * Rules:
 * [A2] Intra-state MP GST 50/50 split (CGST + SGST), half-up rounding to 2 decimals with micro-epsilon bias.
 * [A8] Whole master cases and dynamic loose pack/piece demands.
 * [A11] Free goods: floor(ordered / buyQty) * freeQty. Valued at ₹0.00 (Circular 92/11/2019-GST).
 * [A12] Slab discount: Applied to line subtotal pre-tax.
 * [A13] Non-compounding: Either free goods OR slab discount OR flat rebate per SKU.
 * [A45] Multi-tier slab ladders select the highest qualifying threshold non-cumulatively.
 * [A46] Cross-SKU free goods gifting supported via freeSkuId and freeSkuName.
 * [A47] Flat per-case trade cash rebates applied to pre-tax gross amount.
 */

export type SchemeType = "NONE" | "FREE_GOODS" | "SLAB_DISCOUNT" | "FLAT_REBATE";

export interface SlabTier {
  minCases: number;
  discountPct: number;
}

export interface SchemeConfig {
  type?: SchemeType;
  buyQty?: number;
  getFreeQty?: number;
  freeSkuId?: string; // Cross-SKU gifting: SKU ID of gifted item
  freeSkuName?: string;
  minCases?: number; // Single-tier minimum cases
  discountPct?: number; // Single-tier discount percentage
  tiers?: SlabTier[]; // Multi-tier ladder (e.g. 5 cases = 3%, 10 cases = 5%, 20 cases = 8%)
  flatPerCase?: number; // Cash rebate per case (e.g. ₹50 off per case)
  minCasesForRebate?: number; // Minimum cases to trigger flat rebate
}

export interface InputLineItem {
  skuId: string;
  skuCode: string;
  skuName: string;
  orderedCases: number;
  orderedPacks?: number;
  dealerPrice: number; // Ex-GST wholesale case price
  packPrice?: number; // Ex-GST single packet price
  unitsPerCase?: number;
  gstRate: number; // e.g. 18 or 5
  schemeType: SchemeType;
  schemeDetail?: SchemeConfig;
}

export interface SchemeTierNudge {
  casesNeeded: number;
  targetTierPct: number;
  potentialSavings: number;
}

export interface CalculatedLineItem {
  skuId: string;
  skuCode: string;
  skuName: string;
  orderedCases: number;
  orderedPacks: number;
  freeCases: number;
  freeSkuId?: string;
  freeSkuName?: string;
  totalDeliveredCases: number;
  totalDeliveredPacks: number;
  dealerPrice: number;
  packPrice: number;
  grossAmount: number;
  discountAmount: number;
  discountPct?: number;
  discountDescription: string | null;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGstAmount: number;
  lineTotal: number;
  nextTierNudge?: SchemeTierNudge | null;
}

export interface CalculatedInvoiceSummary {
  lines: CalculatedLineItem[];
  totalOrderedCases: number;
  totalOrderedPacks: number;
  totalFreeCases: number;
  totalDeliveredCases: number;
  totalDeliveredPacks: number;
  totalGrossAmount: number;
  totalDiscountAmount: number;
  totalTaxableAmount: number;
  totalCgstAmount: number;
  totalSgstAmount: number;
  totalGstAmount: number;
  unroundedGrandTotal: number;
  roundOff: number;
  grandTotal: number;
}

/**
 * Standard half-up financial rounding to 2 decimal places (Rule [A2])
 * Uses 1e-6 bias to correct IEEE 754 binary floating-point imprecision (e.g. 9845.5 * 0.09)
 */
export function roundTo2Decimals(value: number): number {
  return Math.round((value + 1e-6) * 100) / 100;
}

/**
 * Calculates a single invoice line item with trade schemes, multi-tier ladders, and GST
 * Accurately accounts for wholesale master cases and loose packets
 */
export function calculateLineItem(item: InputLineItem): CalculatedLineItem {
  const orderedCases = Math.max(0, Math.floor(item.orderedCases || 0));
  const orderedPacks = Math.max(0, Math.floor(item.orderedPacks || 0));
  const dealerPrice = item.dealerPrice;
  const packPrice =
    item.packPrice !== undefined
      ? item.packPrice
      : roundTo2Decimals(dealerPrice / (item.unitsPerCase || 1));

  const casesGross = orderedCases * dealerPrice;
  const packsGross = orderedPacks * packPrice;
  const grossAmount = roundTo2Decimals(casesGross + packsGross);

  let freeCases = 0;
  let freeSkuId: string | undefined = undefined;
  let freeSkuName: string | undefined = undefined;
  let discountAmount = 0;
  let discountPct = 0;
  let discountDescription: string | null = null;
  let nextTierNudge: SchemeTierNudge | null = null;

  // 1. Rule [A11] & [A46]: Free Goods Scheme (Same SKU or Cross-SKU gifting)
  if (
    item.schemeType === "FREE_GOODS" &&
    item.schemeDetail?.buyQty &&
    item.schemeDetail.buyQty > 0
  ) {
    const buyQty = item.schemeDetail.buyQty;
    const getFreeQty = item.schemeDetail.getFreeQty || 1;
    const factor = Math.floor(orderedCases / buyQty);
    freeCases = factor * getFreeQty;

    if (item.schemeDetail.freeSkuId && item.schemeDetail.freeSkuName) {
      freeSkuId = item.schemeDetail.freeSkuId;
      freeSkuName = item.schemeDetail.freeSkuName;
      if (freeCases > 0) {
        discountDescription = `Buy ${buyQty} Get ${getFreeQty} Free: +${freeCases} free case(s) of ${freeSkuName}`;
      }
    } else {
      if (freeCases > 0) {
        discountDescription = `Buy ${buyQty} Get ${getFreeQty} Free: +${freeCases} free case(s)`;
      }
    }

    // Free goods upsell nudge (e.g. ordered 8 cases, buyQty is 10)
    const remainder = orderedCases % buyQty;
    if (remainder > 0 || orderedCases === 0) {
      const casesNeeded = buyQty - remainder;
      nextTierNudge = {
        casesNeeded,
        targetTierPct: 0,
        potentialSavings: roundTo2Decimals(getFreeQty * dealerPrice),
      };
    }
  }

  // 2. Rule [A12] & [A45]: Multi-Tier Slab Ladder or Single-Level Slab Discount
  else if (item.schemeType === "SLAB_DISCOUNT" && item.schemeDetail) {
    // Multi-tier ladder check
    if (item.schemeDetail.tiers && item.schemeDetail.tiers.length > 0) {
      const sortedTiers = [...item.schemeDetail.tiers].sort((a, b) => b.minCases - a.minCases);
      const activeTier = sortedTiers.find((t) => orderedCases >= t.minCases);

      if (activeTier) {
        discountPct = activeTier.discountPct;
        discountAmount = roundTo2Decimals(casesGross * (discountPct / 100));
        discountDescription = `Slab Tier (${discountPct}% on ${activeTier.minCases}+ cases): -₹${discountAmount.toFixed(2)}`;
      }

      // Upsell nudge: find the next higher tier in the ladder
      const nextHigherTier = [...sortedTiers].reverse().find((t) => t.minCases > orderedCases);
      if (nextHigherTier) {
        const casesNeeded = nextHigherTier.minCases - orderedCases;
        const targetGross = nextHigherTier.minCases * dealerPrice;
        const targetDiscount = roundTo2Decimals(targetGross * (nextHigherTier.discountPct / 100));
        const potentialSavings = roundTo2Decimals(targetDiscount - discountAmount);
        nextTierNudge = {
          casesNeeded,
          targetTierPct: nextHigherTier.discountPct,
          potentialSavings,
        };
      }
    }
    // Single-tier legacy fallback
    else if (item.schemeDetail.minCases && item.schemeDetail.discountPct) {
      if (orderedCases >= item.schemeDetail.minCases) {
        discountPct = item.schemeDetail.discountPct;
        discountAmount = roundTo2Decimals(casesGross * (discountPct / 100));
        discountDescription = `Slab Discount (${discountPct}% on ${item.schemeDetail.minCases}+ cases): -₹${discountAmount.toFixed(2)}`;
      } else {
        const casesNeeded = item.schemeDetail.minCases - orderedCases;
        const targetGross = item.schemeDetail.minCases * dealerPrice;
        const targetDiscount = roundTo2Decimals(targetGross * (item.schemeDetail.discountPct / 100));
        nextTierNudge = {
          casesNeeded,
          targetTierPct: item.schemeDetail.discountPct,
          potentialSavings: targetDiscount,
        };
      }
    }
  }

  // 3. Rule [A47]: Flat Cash Rebate Per Case (e.g. ₹50 off per case on 5+ cases)
  else if (
    item.schemeType === "FLAT_REBATE" &&
    item.schemeDetail?.flatPerCase &&
    item.schemeDetail.flatPerCase > 0
  ) {
    const minCases = item.schemeDetail.minCasesForRebate || item.schemeDetail.minCases || 1;
    if (orderedCases >= minCases) {
      const flatRate = item.schemeDetail.flatPerCase;
      discountAmount = roundTo2Decimals(orderedCases * flatRate);
      discountDescription = `Flat Cash Rebate (₹${flatRate}/case on ${minCases}+ cases): -₹${discountAmount.toFixed(2)}`;
    } else {
      const casesNeeded = minCases - orderedCases;
      nextTierNudge = {
        casesNeeded,
        targetTierPct: 0,
        potentialSavings: roundTo2Decimals(minCases * item.schemeDetail.flatPerCase),
      };
    }
  }

  const taxableAmount = roundTo2Decimals(grossAmount - discountAmount);

  // Rule [A2]: MP Intra-state 50/50 GST split
  const halfGstRate = item.gstRate / 2;
  const cgstAmount = roundTo2Decimals(taxableAmount * (halfGstRate / 100));
  const sgstAmount = roundTo2Decimals(taxableAmount * (halfGstRate / 100));
  const totalGstAmount = roundTo2Decimals(cgstAmount + sgstAmount);

  const lineTotal = roundTo2Decimals(taxableAmount + totalGstAmount);

  return {
    skuId: item.skuId,
    skuCode: item.skuCode,
    skuName: item.skuName,
    orderedCases,
    orderedPacks,
    freeCases,
    freeSkuId,
    freeSkuName,
    totalDeliveredCases: orderedCases + (freeSkuId ? 0 : freeCases),
    totalDeliveredPacks: orderedPacks,
    dealerPrice,
    packPrice,
    grossAmount,
    discountAmount,
    discountPct: discountPct > 0 ? discountPct : undefined,
    discountDescription,
    taxableAmount,
    gstRate: item.gstRate,
    cgstAmount,
    sgstAmount,
    totalGstAmount,
    lineTotal,
    nextTierNudge,
  };
}

/**
 * Calculates complete order invoice summary across all line items
 */
export function calculateOrderSummary(items: InputLineItem[]): CalculatedInvoiceSummary {
  const calculatedLines = items.map((it) => calculateLineItem(it));

  let totalOrderedCases = 0;
  let totalOrderedPacks = 0;
  let totalFreeCases = 0;
  let totalGrossAmount = 0;
  let totalDiscountAmount = 0;
  let totalTaxableAmount = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;

  for (const line of calculatedLines) {
    totalOrderedCases += line.orderedCases;
    totalOrderedPacks += line.orderedPacks;
    totalFreeCases += line.freeCases;
    totalGrossAmount += line.grossAmount;
    totalDiscountAmount += line.discountAmount;
    totalTaxableAmount += line.taxableAmount;
    totalCgstAmount += line.cgstAmount;
    totalSgstAmount += line.sgstAmount;
  }

  totalGrossAmount = roundTo2Decimals(totalGrossAmount);
  totalDiscountAmount = roundTo2Decimals(totalDiscountAmount);
  totalTaxableAmount = roundTo2Decimals(totalTaxableAmount);
  totalCgstAmount = roundTo2Decimals(totalCgstAmount);
  totalSgstAmount = roundTo2Decimals(totalSgstAmount);
  const totalGstAmount = roundTo2Decimals(totalCgstAmount + totalSgstAmount);

  const unroundedGrandTotal = roundTo2Decimals(totalTaxableAmount + totalGstAmount);
  const grandTotal = Math.round(unroundedGrandTotal);
  const roundOff = roundTo2Decimals(grandTotal - unroundedGrandTotal);

  return {
    lines: calculatedLines,
    totalOrderedCases,
    totalOrderedPacks,
    totalFreeCases,
    totalDeliveredCases: totalOrderedCases + totalFreeCases,
    totalDeliveredPacks: totalOrderedPacks,
    totalGrossAmount,
    totalDiscountAmount,
    totalTaxableAmount,
    totalCgstAmount,
    totalSgstAmount,
    totalGstAmount,
    unroundedGrandTotal,
    roundOff,
    grandTotal,
  };
}
