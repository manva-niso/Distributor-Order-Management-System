/**
 * Centralized Bilingual Trade Dictionary (Jabalpur Mandi & Vyapar Terminology)
 * Pure deterministic mapping - Zero AI latency, zero external API costs.
 */

import { transliterateToHindi } from "./transliterate";

export type Language = "en" | "hi";

export interface SkuLocalization {
  nameHi: string;
  brandHi: string;
  categoryHi: string;
  packSizeHi?: string;
}

export const BRAND_HINDI_MAP: Record<string, string> = {
  Parle: "पार्ले",
  Britannia: "ब्रिटानिया",
  Cadbury: "कैडबरी",
  Sunfeast: "सनफीस्ट",
  "Tata Tea": "टाटा टी",
  "Wagh Bakri": "वाघ बकरी",
  "Brooke Bond": "ब्रुक बॉन्ड",
  Nestle: "नेस्ले",
  Ghadi: "घड़ी",
  HUL: "एचयूएल",
  Fortune: "फॉर्च्यून",
  Dhara: "धारा",
  Saffola: "सफोला",
  Aashirvaad: "आशीर्वाद",
  Patanjali: "पतंजलि",
  Dabur: "डाबर",
  Colgate: "कोलगेट",
  Dettol: "डेटॉल",
  Lifebuoy: "लाइफबॉय",
  Godrej: "गोदरेज",
  Vim: "विम",
  Rin: "रिन",
  Surf: "सर्फ एक्सेल",
  Haldiram: "हल्दीराम",
  Bikaji: "बीकाजी",
  Balaji: "बालाजी",
  Kissan: "किसान",
  General: "सामान्य",
};

export const CATEGORY_HINDI_MAP: Record<string, string> = {
  Biscuits: "बिस्कुट",
  "Biscuits & Confectionery": "बिस्कुट व नमकीन",
  Tea: "चाय पत्ती",
  "Tea & Beverages": "चाय व पेय",
  Detergent: "डिटर्जेंट व साबुन",
  "Laundry & Fabric Care": "धुलाई व कपड़ा देखभाल",
  Soap: "साबुन",
  "Personal Care & Hygiene": "पर्सनल केयर",
  "Cooking Oil": "खाद्य तेल",
  "Edible Oils & Ghee": "तेल व घी",
  "Flour & Grains": "आटा व अनाज",
  "Spices & Masala": "मसाले",
  "Packaged Food & Snacks": "नमकीन व स्नैक्स",
  "Packaged Food": "पैकेटबंद खाद्य सामग्री",
  "Home Care": "घरेलू सामान",
  "General Grocery": "किराना सामान",
};

export const SKU_HINDI_MAP: Record<string, SkuLocalization> = {
  // Biscuits & Confectionery
  "SKU-BS-PG075": {
    nameHi: "पारले-जी ग्लूकोज बिस्कुट 75g (पेटी 96 पैकेट)",
    brandHi: "पार्ले",
    categoryHi: "बिस्कुट",
    packSizeHi: "75 ग्राम",
  },
  "SKU-BS-075": {
    nameHi: "पारले-जी ग्लूकोज बिस्कुट 75g (पेटी 96 पैकेट)",
    brandHi: "पार्ले",
    categoryHi: "बिस्कुट",
    packSizeHi: "75 ग्राम",
  },
  "SKU-BS-PG250": {
    nameHi: "पारले-जी फैमिली पैक 250g (पेटी 32 पैकेट)",
    brandHi: "पार्ले",
    categoryHi: "बिस्कुट",
    packSizeHi: "250 ग्राम",
  },
  "SKU-BS-GD120": {
    nameHi: "गुड डे बटर कुकीज 120g (पेटी 48 पैकेट)",
    brandHi: "ब्रिटानिया",
    categoryHi: "बिस्कुट",
    packSizeHi: "120 ग्राम",
  },
  "SKU-BS-MG250": {
    nameHi: "मैरी गोल्ड चाय बिस्कुट 250g (पेटी 36 पैकेट)",
    brandHi: "ब्रिटानिया",
    categoryHi: "बिस्कुट",
    packSizeHi: "250 ग्राम",
  },
  "SKU-BS-OR120": {
    nameHi: "ओरियो वैनिला क्रीम बिस्कुट 120g (पेटी 24 पैकेट)",
    brandHi: "कैडबरी",
    categoryHi: "बिस्कुट",
    packSizeHi: "120 ग्राम",
  },
  "SKU-BS-DF075": {
    nameHi: "डार्क फैंटेसी चोको फिल्स 75g (पेटी 24 पैकेट)",
    brandHi: "सनफीस्ट",
    categoryHi: "बिस्कुट",
    packSizeHi: "75 ग्राम",
  },

  // Tea & Beverages
  "SKU-TE-TT500": {
    nameHi: "टाटा टी गोल्ड प्रीमियम चाय 500g (पेटी 20 पैकेट)",
    brandHi: "टाटा टी",
    categoryHi: "चाय पत्ती",
    packSizeHi: "500 ग्राम",
  },
  "SKU-TE-AG250": {
    nameHi: "टाटा टी अग्नि कड़क डस्ट 250g (पेटी 40 पैकेट)",
    brandHi: "टाटा टी",
    categoryHi: "चाय पत्ती",
    packSizeHi: "250 ग्राम",
  },
  "SKU-TE-WB250": {
    nameHi: "वाघ बकरी प्रीमियम पत्ती चाय 250g (पेटी 32 पैकेट)",
    brandHi: "वाघ बकरी",
    categoryHi: "चाय पत्ती",
    packSizeHi: "250 ग्राम",
  },
  "SKU-TE-WBR250": {
    nameHi: "वाघ बकरी प्रीमियम पत्ती चाय 250g (पेटी 32 पैकेट)",
    brandHi: "वाघ बकरी",
    categoryHi: "चाय पत्ती",
    packSizeHi: "250 ग्राम",
  },
  "SKU-TE-RL250": {
    nameHi: "रेड लेबल कड़क चाय 250g (पेटी 36 पैकेट)",
    brandHi: "ब्रुक बॉन्ड",
    categoryHi: "चay पत्ती",
    packSizeHi: "250 ग्राम",
  },

  // Detergents & Laundry
  "SKU-DT-1KG": {
    nameHi: "घड़ी डिटर्जेंट पाउडर 1 किलो (पेटी 20 पैकेट)",
    brandHi: "घड़ी",
    categoryHi: "डिटर्जेंट",
    packSizeHi: "1 किलो",
  },
  "SKU-DT-GH1KG": {
    nameHi: "घड़ी डिटर्जेंट पाउडर 1 किलो (पेटी 20 पैकेट)",
    brandHi: "घड़ी",
    categoryHi: "डिटर्जेंट",
    packSizeHi: "1 किलो",
  },
  "SKU-DT-SX1KG": {
    nameHi: "सर्फ एक्सेल क्विक वॉश 1 किलो (पेटी 16 पैकेट)",
    brandHi: "एचयूएल",
    categoryHi: "डिटर्जेंट",
    packSizeHi: "1 किलो",
  },
  "SKU-DT-CK250": {
    nameHi: "घड़ी डिटर्जेंट बट्टी 250g (पेटी 80 बट्टी)",
    brandHi: "घड़ी",
    categoryHi: "डिटर्जेंट",
    packSizeHi: "250 ग्राम",
  },
  "SKU-DT-RN250": {
    nameHi: "रिन सुप्रीम डिटर्जेंट बार 250g (पेटी 72 बट्टी)",
    brandHi: "एचयूएल",
    categoryHi: "डिटर्जेंट",
    packSizeHi: "250 ग्राम",
  },

  // Soaps & Personal Care
  "SKU-SP-DT075": {
    nameHi: "डेटॉल ओरिजिनल साबुन 75g (पेटी 96 साबुन)",
    brandHi: "डेटॉल",
    categoryHi: "साबुन",
    packSizeHi: "75 ग्राम",
  },
  "SKU-SP-LF075": {
    nameHi: "लाइफबॉय टोटल सुरक्षा साबुन 75g (पेटी 96 साबुन)",
    brandHi: "लाइफबॉय",
    categoryHi: "साबुन",
    packSizeHi: "75 ग्राम",
  },
  "SKU-SP-LX100": {
    nameHi: "लक्स मखमली ग्लो साबुन 100g (पेटी 72 साबुन)",
    brandHi: "एचयूएल",
    categoryHi: "साबुन",
    packSizeHi: "100 ग्राम",
  },
  "SKU-SP-DW155": {
    nameHi: "विम बर्तन बार नींबू 155g (पेटी 84 बट्टी)",
    brandHi: "विम",
    categoryHi: "बर्तन बार",
    packSizeHi: "155 ग्राम",
  },

  // Edible Cooking Oils
  "SKU-OL-FT1LT": {
    nameHi: "फॉर्च्यून सोयाबीन तेल 1 लीटर पाउच (पेटी 15 पाउच)",
    brandHi: "फॉर्च्यून",
    categoryHi: "खाद्य तेल",
    packSizeHi: "1 लीटर",
  },
  "SKU-OL-DH1LT": {
    nameHi: "धारा कच्ची घानी सरसों तेल 1 ली. बोतल (पेटी 12 बोतल)",
    brandHi: "धारा",
    categoryHi: "खाद्य तेल",
    packSizeHi: "1 लीटर",
  },
  "SKU-OL-SF1LT": {
    nameHi: "सफोला गोल्ड कुकिंग ऑयल 1 लीटर (पेटी 12 पाउच)",
    brandHi: "सफोला",
    categoryHi: "खाद्य तेल",
    packSizeHi: "1 लीटर",
  },

  // Packaged Food & Noodles
  "SKU-FD-MG070": {
    nameHi: "मैगी 2-मिनट मसाला नूडल्स 70g (पेटी 96 पैकेट)",
    brandHi: "नेस्ले",
    categoryHi: "पैकेटबंद खाद्य",
    packSizeHi: "70 ग्राम",
  },
  "SKU-FD-MG70": {
    nameHi: "मैगी 2-मिनट मसाला नूडल्स 70g (पेटी 96 पैकेट)",
    brandHi: "नेस्ले",
    categoryHi: "पैकेटबंद खाद्य",
    packSizeHi: "70 ग्राम",
  },
  "SKU-FD-YP070": {
    nameHi: "यिप्पी मैजिक मसाला नूडल्स 70g (पेटी 72 पैकेट)",
    brandHi: "सनफीस्ट",
    categoryHi: "पैकेटबंद खाद्य",
    packSizeHi: "70 ग्राम",
  },
  "SKU-FD-KP065": {
    nameHi: "किसान फ्रेश टोमैटो सॉस 65g (पेटी 120 पाउच)",
    brandHi: "किसान",
    categoryHi: "सॉस",
    packSizeHi: "65 ग्राम",
  },

  // Flour & Grains
  "SKU-AT-AS05K": {
    nameHi: "आशीर्वाद शरबती आटा 5 किलो (पेटी 4 बैग)",
    brandHi: "आशीर्वाद",
    categoryHi: "आटा",
    packSizeHi: "5 किलो",
  },
  "SKU-AT-AS10K": {
    nameHi: "आशीर्वाद चक्की फ्रेश आटा 10 किलो (पेटी 2 बैग)",
    brandHi: "आशीर्वाद",
    categoryHi: "आटा",
    packSizeHi: "10 किलो",
  },

  // Namkeen & Snacks
  "SKU-SN-HL150": {
    nameHi: "हल्दीराम भुजिया सेव 150g (पेटी 40 पैकेट)",
    brandHi: "हल्दीराम",
    categoryHi: "नमकीन",
    packSizeHi: "150 ग्राम",
  },
  "SKU-SN-HL200": {
    nameHi: "हल्दीराम आलू भुजिया 200g (पेटी 30 पैकेट)",
    brandHi: "हल्दीराम",
    categoryHi: "नमकीन",
    packSizeHi: "200 ग्राम",
  },

  // Oral Care
  "SKU-PC-CG100": {
    nameHi: "कोलगेट स्ट्रॉन्ग टीथ मंजन 100g (पेटी 48 ट्यूब)",
    brandHi: "कोलगेट",
    categoryHi: "मंजन",
    packSizeHi: "100 ग्राम",
  },
  "SKU-PC-DB100": {
    nameHi: "डाबर लाल दंत मंजन पेस्ट 100g (पेटी 48 ट्यूब)",
    brandHi: "डाबर",
    categoryHi: "मंजन",
    packSizeHi: "100 ग्राम",
  },
};

export const ROUTE_HINDI_MAP: Record<string, string> = {
  "Napier Town Route #4": "नेपियर टाउन रूट #4",
  "Adhartal Route #3": "अधारताल रूट #3",
  "Gorakhpur Route #1": "गोरखपुर रूट #1",
  "Garha Route #5": "गढ़ा रूट #5",
  "Wright Town Route #2": "राइट टाउन रूट #2",
  "Cantt & Sadar Route #6": "कैंट व सदर रूट #6",
  "Ganjipura Route #7": "गंजीपुरा रूट #7",
  "Civil Lines Route #8": "सिविल लाइंस रूट #8",
};

export const RETAILER_HINDI_MAP: Record<string, { nameHi: string; ownerNameHi: string }> = {
  "RET-0001": { nameHi: "शर्मा किराना स्टोर", ownerNameHi: "रमेश शर्मा" },
  "RET-0002": { nameHi: "वर्मा जनरल स्टोर", ownerNameHi: "सुनील वर्मा" },
  "RET-0003": { nameHi: "गुप्ता डेली नीड्स", ownerNameHi: "आलोक गुप्ता" },
  "RET-0004": { nameHi: "महालक्ष्मी प्रोविजन स्टोर", ownerNameHi: "कैलाश पटेल" },
  "RET-0005": { nameHi: "अग्रवाल सुपर मार्ट", ownerNameHi: "विवेक अग्रवाल" },
  "RET-0006": { nameHi: "सदर ग्रोसरी हब", ownerNameHi: "संजय चौकसे" },
  "RET-0007": { nameHi: "पटेल किराना स्टोर", ownerNameHi: "सुरेश पटेल" },
  "RET-0008": { nameHi: "बाजपेई प्रोविजन्स", ownerNameHi: "नवीन बाजपेई" },
};

/**
 * Returns localized SKU text with bulletproof fallback
 */
export function getSkuDisplay(sku: {
  id?: string;
  code?: string;
  name: string;
  nameHi?: string;
  brand?: string;
  brandHi?: string;
  category?: string;
  categoryHi?: string;
}, lang: Language) {
  if (lang !== "hi") {
    return {
      name: sku.name,
      brand: sku.brand || "",
      category: sku.category || "",
    };
  }

  const mapped = sku.code ? SKU_HINDI_MAP[sku.code] : (sku.id ? SKU_HINDI_MAP[sku.id] : undefined);

  return {
    name: sku.nameHi || mapped?.nameHi || transliterateToHindi(sku.name),
    brand: sku.brandHi || mapped?.brandHi || (sku.brand ? BRAND_HINDI_MAP[sku.brand] || transliterateToHindi(sku.brand) : ""),
    category: sku.categoryHi || mapped?.categoryHi || (sku.category ? CATEGORY_HINDI_MAP[sku.category] || transliterateToHindi(sku.category) : ""),
  };
}

export const RETAILER_NAME_FALLBACK_MAP: Record<string, string> = {
  "Sharma Kirana Store": "शर्मा किराना स्टोर",
  "Sharma Kirana": "शर्मा किराना स्टोर",
  "Verma General Store": "वर्मा जनरल स्टोर",
  "Verma General": "वर्मा जनरल स्टोर",
  "Gupta Daily Needs": "गुप्ता डेली नीड्स",
  "Mahalaxmi Provision Store": "महालक्ष्मी प्रोविजन स्टोर",
  "Mahalaxmi Provisions": "महालक्ष्मी प्रोविजन स्टोर",
  "Agarwal Super Mart": "अग्रवाल सुपर मार्ट",
  "Sadar Grocery Hub": "सदर ग्रोसरी हब",
  "Patel Kirana Store": "पटेल किराना स्टोर",
  "Bajpai Provisions": "बाजपेई प्रोविजन्स",
};

/**
 * Returns localized retailer text with bulletproof fallback
 */
export function getRetailerDisplay(retailer: {
  id?: string;
  name: string;
  nameHi?: string;
  ownerName?: string;
  ownerNameHi?: string;
  route?: string;
  routeHi?: string;
}, lang: Language) {
  if (lang !== "hi") {
    return {
      name: retailer.name,
      ownerName: retailer.ownerName || "",
      route: retailer.route || "",
    };
  }

  const mapped = retailer.id ? RETAILER_HINDI_MAP[retailer.id] : undefined;
  const nameFromFallback = RETAILER_NAME_FALLBACK_MAP[retailer.name];

  return {
    name: retailer.nameHi || mapped?.nameHi || nameFromFallback || transliterateToHindi(retailer.name),
    ownerName: retailer.ownerNameHi || mapped?.ownerNameHi || (retailer.ownerName ? transliterateToHindi(retailer.ownerName) : ""),
    route: retailer.routeHi || (retailer.route ? ROUTE_HINDI_MAP[retailer.route] || transliterateToHindi(retailer.route) : ""),
  };
}

/**
 * UI Dictionary with natural Mandi vocabulary
 */
export const TRADE_DICT = {
  en: {
    // Nav
    navCatalogue: "Catalogue",
    navQuickOrder: "Quick Order",
    navCart: "My Cart",
    navOrders: "Orders",

    // Stock & Badges
    casesLeft: (n: number) => `${n} Cases Left`,
    inStock: (n: number) => `In Stock (${n})`,
    outOfStock: "Out of Stock",
    caseLabel: "Case:",
    packLabel: "Pack:",
    singlePackRate: "Single Pack:",
    exGst: "Ex-GST",
    inclGst: "Incl. GST",
    inclTax: "Incl.",
    perCase: "/case",
    perPack: "/pack",
    packsPerCase: "packs/case",
    unitsPerCase: (u: number) => `Case of ${u}`,
    notifyWhenRestocked: "Notify When Available (स्टॉक अलर्ट)",

    // Cart summary
    orderedCases: "Ordered Master Cases:",
    orderedPacks: "Ordered Loose Packs:",
    freePromotional: "Promotional Free Cases (₹0):",
    grossSubtotal: "Gross Subtotal (Ex-GST):",
    totalDiscounts: "Total Trade Discounts:",
    taxableSubtotal: "Taxable Subtotal:",
    cgst: "CGST (Central Tax):",
    sgst: "SGST (State Tax):",
    grandTotalPayable: "Grand Total Payable (Incl. GST):",
    confirmOrder: "Confirm & Place Order",
    submittingOrder: "Submitting Order to Desk...",
    emptyCartBtn: "Empty Cart",
    cartIsEmptyTitle: "Your order cart is empty",
    cartIsEmptySubtitle: "Add master cases from our wholesale FMCG catalogue to prepare your van delivery order.",
    browseCatalogueBtn: "Browse Wholesale Catalogue",
    creditHoldWarning: "Order will be placed under CREDIT_HOLD status for clerk review before dispatch.",

    // Quick Order
    voiceMode: "Hindi Voice",
    textMode: "WhatsApp Text",
    photoMode: "Slip Photo",
    parseOrderMessage: "Parse Order Message",
    parsing: "Parsing Message...",
    confirmMoveToCart: (items: number) => `Confirm & Move to Cart (${items} items) →`,
    uploadAudioPrompt: "Tap to Upload WhatsApp Audio / Voice Note",
    audioFormatsSupport: "Supports M4A, MP3, WAV, WebM audio notes",
    instantVoiceTest: "⚡ 1-Click Hindi Audio Test",
    voiceNoteCaptureTitle: "Hindi Voice Note Capture:",

    // Order status badges
    statusPlaced: "Pending Desk Review",
    statusVerified: "Approved for Dispatch",
    statusCreditHold: "Credit Hold",
    statusTallyExported: "Billed in Tally",
    statusCancelled: "Cancelled",
    statusDispatched: "Dispatched in Van",
    statusDelivered: "Delivered",
  },
  hi: {
    // Nav (Authentic trade words: सामान सूची, बोलकर/लिखकर, कार्ट, पुराने आर्डर)
    navCatalogue: "सामान सूची",
    navQuickOrder: "बोलकर/लिखकर",
    navCart: "कार्ट",
    navOrders: "पुराने आर्डर",

    // Stock & Badges
    casesLeft: (n: number) => `केवल ${n} पेटी शेष`,
    inStock: (n: number) => `स्टॉक उपलब्ध (${n})`,
    outOfStock: "स्टॉक खत्म",
    caseLabel: "पेटी:",
    packLabel: "पैकेट:",
    singlePackRate: "सिंगल पैकेट:",
    exGst: "बिना टैक्स",
    inclGst: "जीएसटी सहित",
    inclTax: "टैक्स सहित",
    perCase: "/पेटी",
    perPack: "/पैकेट",
    packsPerCase: "पैकेट/पेटी",
    unitsPerCase: (u: number) => `${u} पैकेट की पेटी`,
    notifyWhenRestocked: "स्टॉक आने पर सूचित करें",

    // Cart summary (Mandi standard accounting)
    orderedCases: "ऑर्डर की गई पेटी:",
    orderedPacks: "ऑर्डर किए गए खुले पैकेट:",
    freePromotional: "मुफ्त योजना पेटी (₹0):",
    grossSubtotal: "मूल राशि (बिना टैक्स):",
    totalDiscounts: "कुल योजना छूट:",
    taxableSubtotal: "टैक्स योग्य रकम:",
    cgst: "सीजीएसटी (केंद्र टैक्स):",
    sgst: "एसजीएसटी (राज्य टैक्स):",
    grandTotalPayable: "कुल देय राशि (जीएसटी सहित):",
    confirmOrder: "ऑर्डर पक्का करें",
    submittingOrder: "ऑर्डर भेजा जा रहा है...",
    emptyCartBtn: "कार्ट खाली करें",
    cartIsEmptyTitle: "आपकी कार्ट खाली है",
    cartIsEmptySubtitle: "अपनी दुकान के लिए माल मंगाने हेतु थोक सामान सूची से पेटियां जोड़ें।",
    browseCatalogueBtn: "थोक सामान सूची देखें",
    creditHoldWarning: "यह ऑर्डर उधार सीमा से अधिक होने के कारण वितरक स्वीकृति हेतु रखा जाएगा।",

    // Quick Order
    voiceMode: "हिंदी आवाज / वॉइस",
    textMode: "व्हाट्सएप टेक्स्ट",
    photoMode: "पर्ची फोटो",
    parseOrderMessage: "ऑर्डर तैयार करें",
    parsing: "पहचाना जा रहा है...",
    confirmMoveToCart: (items: number) => `पुष्टि कर कार्ट में जोड़ें (${items} सामान) →`,
    uploadAudioPrompt: "व्हाट्सएप वॉइस नोट या ऑडियो अपलोड करें",
    audioFormatsSupport: "M4A, MP3, WAV, WebM ऑडियो सपोर्टेड",
    instantVoiceTest: "⚡ 1-क्लिक हिंदी ऑडियो टेस्ट",
    voiceNoteCaptureTitle: "हिंदी वॉइस नोट आर्डर:",

    // Order status badges
    statusPlaced: "वितरक समीक्षा बाकी",
    statusVerified: "डिलीवरी स्वीकृत",
    statusCreditHold: "उधार सीमा जांच (स्वीकृति बाकी)",
    statusTallyExported: "बिल बन गया (टैली)",
    statusCancelled: "निरस्त",
    statusDispatched: "गाड़ी रवाना",
    statusDelivered: "डिलीवरी संपन्न",
  },
};
