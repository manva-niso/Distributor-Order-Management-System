import { SeedSku } from "@/db/seed-data";

export interface CartItem extends SeedSku {
  quantityCases: number;
}

export interface LineCalculation {
  quantityCases: number;
  dealerPrice: number;
  grossAmount: number;
  freeCases: number;
  discountPct: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  freeCasesValue: number;
}

export interface CartTotals {
  itemCount: number;
  totalCases: number;
  totalFreeCases: number;
  grossSubtotal: number;
  totalDiscounts: number;
  taxableSubtotal: number;
  totalGst: number;
  grandTotal: number;
  totalSavings: number;
}

/**
 * Calculates a single line item with trade schemes and GST
 */
export function calculateLineItem(item: CartItem): LineCalculation {
  const quantityCases = Math.max(0, item.quantityCases);
  const grossAmount = Math.round(quantityCases * item.dealerPrice * 100) / 100;

  let freeCases = 0;
  if (item.schemeType === "FREE_GOODS" && item.schemeDetail?.buyQty) {
    freeCases = Math.floor(quantityCases / item.schemeDetail.buyQty) * (item.schemeDetail.getFreeQty || 1);
  }

  let discountPct = 0;
  let discountAmount = 0;
  if (
    item.schemeType === "SLAB_DISCOUNT" &&
    item.schemeDetail?.minCases &&
    quantityCases >= item.schemeDetail.minCases
  ) {
    discountPct = item.schemeDetail.discountPct || 0;
    discountAmount = Math.round(grossAmount * (discountPct / 100) * 100) / 100;
  }

  const taxableAmount = Math.round((grossAmount - discountAmount) * 100) / 100;
  const gstAmount = Math.round(taxableAmount * (item.gstRate / 100) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + gstAmount) * 100) / 100;
  const freeCasesValue = Math.round(freeCases * item.dealerPrice * 100) / 100;

  return {
    quantityCases,
    dealerPrice: item.dealerPrice,
    grossAmount,
    freeCases,
    discountPct,
    discountAmount,
    taxableAmount,
    gstRate: item.gstRate,
    gstAmount,
    totalAmount,
    freeCasesValue,
  };
}

/**
 * Aggregates all cart items into grand financial totals
 */
export function calculateCartTotals(items: CartItem[]): CartTotals {
  let totalCases = 0;
  let totalFreeCases = 0;
  let grossSubtotal = 0;
  let totalDiscounts = 0;
  let taxableSubtotal = 0;
  let totalGst = 0;
  let grandTotal = 0;
  let totalFreeCasesValue = 0;

  const activeItems = items.filter((i) => i.quantityCases > 0);

  for (const item of activeItems) {
    const calc = calculateLineItem(item);
    totalCases += calc.quantityCases;
    totalFreeCases += calc.freeCases;
    grossSubtotal += calc.grossAmount;
    totalDiscounts += calc.discountAmount;
    taxableSubtotal += calc.taxableAmount;
    totalGst += calc.gstAmount;
    grandTotal += calc.totalAmount;
    totalFreeCasesValue += calc.freeCasesValue;
  }

  return {
    itemCount: activeItems.length,
    totalCases,
    totalFreeCases,
    grossSubtotal: Math.round(grossSubtotal * 100) / 100,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    taxableSubtotal: Math.round(taxableSubtotal * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    totalSavings: Math.round((totalDiscounts + totalFreeCasesValue) * 100) / 100,
  };
}
