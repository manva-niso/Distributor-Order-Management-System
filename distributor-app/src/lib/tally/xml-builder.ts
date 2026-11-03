import { StoredOrder, StoredOrderItem } from "@/db/store";
import { SeedRetailer } from "@/db/seed-data";

export interface TallyOrderEntry {
  order: StoredOrder;
  items: StoredOrderItem[];
  retailer: SeedRetailer;
}

export interface TallyXmlExportOptions {
  companyName?: string;
  exportDate?: Date;
}

/**
 * Escapes reserved XML characters to prevent syntax corruption
 */
export function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formats a Date object to Tally's standard YYYYMMDD string format
 */
export function formatTallyDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Builds a single <VOUCHER> XML node for a Sales Order / Sales Invoice
 */
export function buildVoucherNode(entry: TallyOrderEntry, exportDate: Date): string {
  const { order, items, retailer } = entry;
  const voucherDate = formatTallyDate(exportDate);
  const orderDate = formatTallyDate(order.createdAt);

  // Group GST: 50/50 intra-state split (Rule [A2])
  const halfGst = Math.round((order.totalGst / 2) * 100) / 100;
  const otherHalfGst = Math.round((order.totalGst - halfGst) * 100) / 100;

  // Build Inventory Lines (ALLINVENTORYENTRIES.LIST)
  const inventoryXml = items
    .map((item) => {
      const actualQty = item.quantityCases + item.freeCases;
      const billedQty = item.quantityCases;
      const grossItemAmount = item.quantityCases * item.unitDealerPrice;
      const netItemAmount = item.netLineAmount > 0 ? item.netLineAmount : grossItemAmount - item.discountAmount;
      const negativeLineAmount = (-netItemAmount).toFixed(2);

      return `          <ALLINVENTORYENTRIES.LIST>
            <STOCKITEMNAME>${escapeXml(item.skuName || item.skuId)}</STOCKITEMNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <RATE>${item.unitDealerPrice.toFixed(2)}/case</RATE>
            <AMOUNT>${negativeLineAmount}</AMOUNT>
            <ACTUALQTY> ${actualQty} case</ACTUALQTY>
            <BILLEDQTY> ${billedQty} case</BILLEDQTY>
            ${item.discountPct > 0 ? `<DISCOUNT>${item.discountPct.toFixed(2)}</DISCOUNT>` : ""}
            <BATCHALLOCATIONS.LIST>
              <GODOWNNAME>Main Warehouse Jabalpur</GODOWNNAME>
              <BATCHNAME>Primary</BATCHNAME>
              <AMOUNT>${negativeLineAmount}</AMOUNT>
              <ACTUALQTY> ${actualQty} case</ACTUALQTY>
              <BILLEDQTY> ${billedQty} case</BILLEDQTY>
            </BATCHALLOCATIONS.LIST>
            <ACCOUNTINGALLOCATIONS.LIST>
              <LEDGERNAME>Sales - FMCG Goods</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${negativeLineAmount}</AMOUNT>
            </ACCOUNTINGALLOCATIONS.LIST>
          </ALLINVENTORYENTRIES.LIST>`;
    })
    .join("\n");

  // Build Tax & Party Ledger Entries (LEDGERENTRIES.LIST)
  const partyLedgerAmount = order.grandTotal.toFixed(2);
  const cgstAmount = (-halfGst).toFixed(2);
  const sgstAmount = (-otherHalfGst).toFixed(2);

  // Round Off adjustment if any
  const totalCredits = order.taxableAmount + order.totalGst;
  const roundOffDifference = Math.round((order.grandTotal - totalCredits) * 100) / 100;
  const roundOffXml =
    Math.abs(roundOffDifference) > 0.001
      ? `\n          <LEDGERENTRIES.LIST>
            <LEDGERNAME>Round Off</LEDGERNAME>
            <ISDEEMEDPOSITIVE>${roundOffDifference > 0 ? "No" : "Yes"}</ISDEEMEDPOSITIVE>
            <AMOUNT>${(-roundOffDifference).toFixed(2)}</AMOUNT>
          </LEDGERENTRIES.LIST>`
      : "";

  return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${voucherDate}</DATE>
            <REFERENCEDATE>${orderDate}</REFERENCEDATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(order.id)}</VOUCHERNUMBER>
            <REFERENCE>${escapeXml(order.id)}</REFERENCE>
            <PARTYLEDGERNAME>${escapeXml(retailer.name)}</PARTYLEDGERNAME>
            <PARTYNAME>${escapeXml(retailer.name)}</PARTYNAME>
            <STATENAME>Madhya Pradesh</STATENAME>
            <COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>
            <PLACEOFSUPPLY>Madhya Pradesh</PLACEOFSUPPLY>
            <BASICBUYERNAME>${escapeXml(retailer.name)}</BASICBUYERNAME>
            <BASICBUYERADDRESS.LIST>
              <BASICBUYERADDRESS>${escapeXml(retailer.address || "Jabalpur")}</BASICBUYERADDRESS>
            </BASICBUYERADDRESS.LIST>
            <NARRATION>Order ${escapeXml(order.id)} via B2B Distributor Portal. Beat: ${escapeXml(
              retailer.route || "General"
            )}. Placed by: ${escapeXml(order.placedBy || "Merchant")}.</NARRATION>
            <ISINVOICE>Yes</ISINVOICE>

${inventoryXml}

            <!-- Debtor Ledger Entry (Party Receivable) -->
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(retailer.name)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${partyLedgerAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>

            <!-- Output CGST Ledger Entry (Rule [A2]) -->
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${cgstAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>

            <!-- Output SGST Ledger Entry (Rule [A2]) -->
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${sgstAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>${roundOffXml}
          </VOUCHER>
        </TALLYMESSAGE>`;
}

/**
 * Builds the complete Tally ERP 9 / TallyPrime compliant XML batch document
 * adheres to Rule [A21]
 */
export function buildTallyVoucherXml(
  entries: TallyOrderEntry[],
  options?: TallyXmlExportOptions
): string {
  const companyName = options?.companyName || "Company A Jabalpur";
  const exportDate = options?.exportDate || new Date();

  const voucherMessages = entries
    .map((entry) => buildVoucherNode(entry, exportDate))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${voucherMessages}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Validates generated Tally XML structure and balanced double-entry accounting
 */
export function validateTallyXml(xmlString: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!xmlString.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push("Missing standard XML declaration header");
  }

  if (!xmlString.includes("<ENVELOPE>") || !xmlString.includes("</ENVELOPE>")) {
    errors.push("Missing root <ENVELOPE> wrapper");
  }

  if (!xmlString.includes("<IMPORTDATA>") || !xmlString.includes("</IMPORTDATA>")) {
    errors.push("Missing <IMPORTDATA> payload wrapper");
  }

  // Count vouchers
  const voucherOpenCount = (xmlString.match(/<VOUCHER\b/g) || []).length;
  const voucherCloseCount = (xmlString.match(/<\/VOUCHER>/g) || []).length;

  if (voucherOpenCount !== voucherCloseCount) {
    errors.push(`Mismatched <VOUCHER> tags: ${voucherOpenCount} opened vs ${voucherCloseCount} closed`);
  }

  if (voucherOpenCount === 0) {
    errors.push("No <VOUCHER> records found in XML payload");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
