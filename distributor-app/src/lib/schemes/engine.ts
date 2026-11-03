/**
 * Pure Scheme & Pricing Calculation Engine
 * Implements deterministic FMCG wholesale scheme calculations, GST half-up rounding,
 * and invoice breakdown for Company A, Jabalpur.
 *
 * Rules:
 * [A2] Intra-state MP GST 50/50 split (CGST + SGST), half-up rounding to 2 decimals.
 * [A8] Whole master cases exclusively.
 * [A11] Free goods: floor(ordered / buyQty) * freeQty. Valued at ₹0.00.
 * [A12] Slab discount: Applied to line subtotal pre-tax.
 * [A13] Non-compounding: Either free goods OR slab discount per SKU.
 */

export interface SchemeConfig {
  type: "NONE" | "FREE_GOODS" | "SLAB_DISCOUNT";
  buyQty?: number;
  getFreeQty?: number;
  minCases?: number;
  discountPct?: number;
}

export interface InputLineItem {
  skuId: string;
  skuCode: string;
  skuName: string;
  orderedCases: number;
  dealerPrice: number; // Ex-GST wholesale case price
  gstRate: number; // e.g. 18 or 5
  schemeType: "NONE" | "FREE_GOODS" | "SLAB_DISCOUNT";
  schemeDetail?: {
    buyQty?: number;
    getFreeQty?: number;
    minCases?: number;
    discountPct?: number;
  };
}

export interface CalculatedLineItem {
  skuId: string;
  skuCode: string;
  skuName: string;
  orderedCases: number;
  freeCases: number;
  totalDeliveredCases: number;
  dealerPrice: number;
  grossAmount: number;
  discountAmount: number;
  discountDescription: string | null;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGstAmount: number;
  lineTotal: number;
}

export interface CalculatedInvoiceSummary {
  lines: CalculatedLineItem[];
  totalOrderedCases: number;
  totalFreeCases: number;
  totalDeliveredCases: number;
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
 * Calculates a single invoice line item with trade schemes and GST
 */
export function calculateLineItem(item: InputLineItem): CalculatedLineItem {
  const orderedCases = Math.max(0, Math.floor(item.orderedCases));
  const dealerPrice = item.dealerPrice;
  const grossAmount = roundTo2Decimals(orderedCases * dealerPrice);

  let freeCases = 0;
  let discountAmount = 0;
  let discountDescription: string | null = null;

  // Rule [A11]: Free Goods Scheme (e.g., Buy 10 Get 1 Free)
  if (
    item.schemeType === "FREE_GOODS" &&
    item.schemeDetail?.buyQty &&
    item.schemeDetail.buyQty > 0
  ) {
    const buyQty = item.schemeDetail.buyQty;
    const getFreeQty = item.schemeDetail.getFreeQty || 1;
    const factor = Math.floor(orderedCases / buyQty);
    freeCases = factor * getFreeQty;

    if (freeCases > 0) {
      discountDescription = `Buy ${buyQty} Get ${getFreeQty} Free: +${freeCases} free case(s)`;
    }
  }

  // Rule [A12]: Slab Tier Discount (e.g., 3% off on 5+ cases)
  else if (
    item.schemeType === "SLAB_DISCOUNT" &&
    item.schemeDetail?.minCases &&
    item.schemeDetail?.discountPct
  ) {
    if (orderedCases >= item.schemeDetail.minCases) {
      const pct = item.schemeDetail.discountPct;
      discountAmount = roundTo2Decimals(grossAmount * (pct / 100));
      discountDescription = `Slab Discount (${pct}% on ${item.schemeDetail.minCases}+ cases): -₹${discountAmount.toFixed(2)}`;
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
    freeCases,
    totalDeliveredCases: orderedCases + freeCases,
    dealerPrice,
    grossAmount,
    discountAmount,
    discountDescription,
    taxableAmount,
    gstRate: item.gstRate,
    cgstAmount,
    sgstAmount,
    totalGstAmount,
    lineTotal,
  };
}

/**
 * Calculates complete order invoice summary across all line items
 */
export function calculateOrderSummary(items: InputLineItem[]): CalculatedInvoiceSummary {
  const calculatedLines = items.map((it) => calculateLineItem(it));

  let totalOrderedCases = 0;
  let totalFreeCases = 0;
  let totalGrossAmount = 0;
  let totalDiscountAmount = 0;
  let totalTaxableAmount = 0;
  let totalCgstAmount = 0;
  let totalSgstAmount = 0;

  for (const line of calculatedLines) {
    totalOrderedCases += line.orderedCases;
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
    totalFreeCases,
    totalDeliveredCases: totalOrderedCases + totalFreeCases,
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
