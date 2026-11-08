import * as fs from "fs";
import * as path from "path";
import { MASTER_CATALOG_SKUS } from "@/db/master-data";

export interface EvalPrompt {
  id: string;
  category:
    | "LOOK_ALIKE_SIZE_FAMILIES"
    | "UNAMBIGUOUS_SINGLE_SKU_BRANDS"
    | "REGIONAL_NUMERALS_AND_FRACTIONS"
    | "AKSHARANTAR_ROMANIZATIONS_AND_TYPOS"
    | "POLYSEMIC_AMBIGUOUS_UNITS"
    | "INJECTED_QUANTITY_SLIPS"
    | "OUT_OF_CATALOG_REJECTIONS";
  utterance: string;
  retailerId: string;
  targetSkuId: string | null;
  targetSkuName: string | null;
  expectedQty: number;
  expectedUnit: string;
  isAmbiguousUnit: boolean;
  expectedDecision: "AUTO_CONFIRM" | "SUGGEST_TOP2" | "ASK_UNIT" | "DESK_CONFIRM";
  tradeScenario: string;
}

const QUERIES_DIR = path.resolve(__dirname);
if (!fs.existsSync(QUERIES_DIR)) {
  fs.mkdirSync(QUERIES_DIR, { recursive: true });
}

export function generateEvaluationPrompts(): EvalPrompt[] {
  const prompts: EvalPrompt[] = [];
  let idCounter = 1;

  const nextId = (prefix: string) => `${prefix}-${String(idCounter++).padStart(3, "0")}`;

  // 1. LOOK-ALIKE SIZE FAMILIES (Crucial test: distinguishes 75g vs 250g, 500g vs 1kg, 1L vs 15L, 70g vs 140g)
  const sizePairs = [
    // Parle-G: 75g vs 250g
    { q: "bhaiya 2 peti chhota parle g", target: "SKU-BS-PG075", name: "Parle-G 75g", scenario: "Colloquial 'chhota' for small Parle-G" },
    { q: "bada parle g 3 peti bhej dena", target: "SKU-BS-PG250", name: "Parle-G 250g", scenario: "Colloquial 'bada' for large 250g Parle-G" },
    { q: "parle 75g 5 peti", target: "SKU-BS-PG075", name: "Parle-G 75g", scenario: "Explicit 75g metric measurement" },
    { q: "parle 250g 4 peti", target: "SKU-BS-PG250", name: "Parle-G 250g", scenario: "Explicit 250g metric measurement" },
    { q: "family pack parle 2 peti chahiye", target: "SKU-BS-PG250", name: "Parle-G 250g", scenario: "Colloquial 'family pack' modifier" },

    // Ghadi Detergent: 500g vs 1kg vs Laundry Bar
    { q: "ghadi powder aadha kilo 3 peti", target: "SKU-DT-GH500", name: "Ghadi Powder 500g", scenario: "Regional 'aadha kilo' for 500g Ghadi" },
    { q: "ghadi 1kg 5 peti bhejiyega", target: "SKU-DT-GH1KG", name: "Ghadi Powder 1kg", scenario: "Explicit 1kg Ghadi" },
    { q: "ghadi tikiya 4 peti", target: "SKU-DT-CK250", name: "Ghadi Detergent Cake 250g", scenario: "Colloquial 'tikiya' for 250g laundry soap cake" },
    { q: "ghadi powder chhota packet 2 peti", target: "SKU-DT-GH500", name: "Ghadi Powder 500g", scenario: "Colloquial 'chhota packet' for 500g" },
    { q: "ghadi ek kilo 6 peti dispatch karo", target: "SKU-DT-GH1KG", name: "Ghadi Powder 1kg", scenario: "Vernacular 'ek kilo' for 1kg" },

    // Fortune Edible Oil: 1L Pouch vs 15L Tin vs Kachi Ghani Mustard Oil
    { q: "fortune refine tel 1l 5 peti", target: "SKU-OL-FT1L", name: "Fortune Sunflower 1L Pouch", scenario: "Refined 1L pouch" },
    { q: "fortune 15 litre tin 2 peti note karo", target: "SKU-OL-FT15T", name: "Fortune 15L Tin", scenario: "15 Litre bulk tin (₹2,100+ wholesale value)" },
    { q: "bada tel tin 3 peti", target: "SKU-OL-FT15T", name: "Fortune 15L Tin", scenario: "Colloquial 'bada tel tin'" },
    { q: "fortune kachi ghani 1l 4 peti", target: "SKU-OL-KG1L", name: "Fortune Kachi Ghani Mustard 1L", scenario: "Mustard Kachi Ghani (must not confuse with Sunflower!)" },
    { q: "sarson tel 2 peti", target: "SKU-OL-KG1L", name: "Fortune Kachi Ghani Mustard 1L", scenario: "Colloquial 'sarson tel'" },

    // Dettol Soap: 75g vs 125g
    { q: "chhota dettol 5 peti bhej dena", target: "SKU-PC-DT075", name: "Dettol 75g", scenario: "Colloquial 'chhota dettol'" },
    { q: "bada dettol 4 peti", target: "SKU-PC-DT125", name: "Dettol 125g", scenario: "Colloquial 'bada dettol'" },
    { q: "dettol 75g 6 peti", target: "SKU-PC-DT075", name: "Dettol 75g", scenario: "Explicit 75g soap" },
    { q: "dettol 125g 3 peti", target: "SKU-PC-DT125", name: "Dettol 125g", scenario: "Explicit 125g soap" },

    // Maggi: 70g Single vs 140g Double Pack
    { q: "chhota maggi 5 peti", target: "SKU-FD-MG070", name: "Maggi 70g", scenario: "Colloquial 'chhota maggi'" },
    { q: "double maggi 4 peti bhej do", target: "SKU-FD-MG140", name: "Maggi 140g Double Pack", scenario: "Colloquial 'double maggi'" },
    { q: "maggi 70g 3 peti", target: "SKU-FD-MG070", name: "Maggi 70g", scenario: "Explicit 70g single pack" },
    { q: "maggi 140g 2 peti", target: "SKU-FD-MG140", name: "Maggi 140g Double Pack", scenario: "Explicit 140g double pack" },
    { q: "do packet wali maggi 3 peti", target: "SKU-FD-MG140", name: "Maggi 140g Double Pack", scenario: "Vernacular 'do packet wali'" },

    // Surf Excel vs Wheel vs Rin
    { q: "surf excel 1kg 3 peti", target: "SKU-DT-SE1KG", name: "Surf Excel 1kg", scenario: "Premium detergent 1kg" },
    { q: "wheel active 1kg 5 peti", target: "SKU-DT-WH1KG", name: "Wheel 1kg", scenario: "Economy detergent 1kg" },
    { q: "rin sabun 250g 4 peti", target: "SKU-DT-RN250", name: "Rin Bar 250g", scenario: "Rin laundry cake 250g" },
  ];

  for (const item of sizePairs) {
    prompts.push({
      id: nextId("PRM-SIZE"),
      category: "LOOK_ALIKE_SIZE_FAMILIES",
      utterance: item.q,
      retailerId: "RET-0001",
      targetSkuId: item.target,
      targetSkuName: item.name,
      expectedQty: 2,
      expectedUnit: "CASE",
      isAmbiguousUnit: false,
      expectedDecision: "AUTO_CONFIRM",
      tradeScenario: item.scenario,
    });
  }

  // 2. UNAMBIGUOUS SINGLE-SKU BRANDS (Adaptive threshold test: safe to auto-confirm at tau=0.75)
  const singleSkuItems = [
    { q: "tata salt 10 packet", target: "SKU-FD-TS1KG", name: "Tata Salt 1kg", scenario: "Unique Salt SKU (no size ambiguity)" },
    { q: "tata namak 5 peti", target: "SKU-FD-TS1KG", name: "Tata Salt 1kg", scenario: "Colloquial 'tata namak'" },
    { q: "nescafe coffee jar 2 peti", target: "SKU-BV-NC050", name: "Nescafe 50g Jar", scenario: "Unique Coffee SKU" },
    { q: "vim bar 500g 4 peti", target: "SKU-DB-VM500", name: "Vim Dishwash Bar 500g", scenario: "Unique Dishwash SKU" },
    { q: "everest garam masala 3 peti", target: "SKU-SP-EV100", name: "Everest Garam Masala 100g", scenario: "Unique Garam Masala" },
    { q: "good knight refill 5 peti", target: "SKU-HC-GK045", name: "Good Knight 45ml Refill", scenario: "Unique Mosquito Vaporizer" },
    { q: "harpic toilet cleaner 3 peti", target: "SKU-HC-HP500", name: "Harpic 500ml", scenario: "Unique Toilet Cleaner" },
    { q: "amul pure ghee 2 peti", target: "SKU-GH-AM1L", name: "Amul Ghee 1L Tin", scenario: "Unique Ghee SKU" },
    { q: "clinic plus shampoo 4 peti", target: "SKU-PC-CP080", name: "Clinic Plus 80ml", scenario: "Unique Shampoo SKU" },
    { q: "yippee noodles 3 peti", target: "SKU-FD-YP065", name: "YiPPee Noodles 65g", scenario: "Unique YiPPee SKU" },
    { q: "oreo biscuit 2 peti", target: "SKU-BS-OR120", name: "Oreo Vanilla 120g", scenario: "Unique Oreo SKU" },
    { q: "dark fantasy 3 peti", target: "SKU-BS-DF075", name: "Dark Fantasy 75g", scenario: "Unique Dark Fantasy SKU" },
  ];

  for (const item of singleSkuItems) {
    prompts.push({
      id: nextId("PRM-SINGLE"),
      category: "UNAMBIGUOUS_SINGLE_SKU_BRANDS",
      utterance: item.q,
      retailerId: "RET-0002",
      targetSkuId: item.target,
      targetSkuName: item.name,
      expectedQty: 3,
      expectedUnit: "CASE",
      isAmbiguousUnit: false,
      expectedDecision: "AUTO_CONFIRM",
      tradeScenario: item.scenario,
    });
  }

  // 3. REGIONAL NUMERALS & FRACTIONS (Devanagari digits & Hindi number words)
  const regionalNumeralItems = [
    { q: "२ पेटी पारले ७५ ग्राम", target: "SKU-BS-PG075", name: "Parle-G 75g", scenario: "Devanagari digit '२' and Hindi 'पेटी'" },
    { q: "५ पेटी घड़ी पाउडर १ किलो", target: "SKU-DT-GH1KG", name: "Ghadi 1kg", scenario: "Devanagari digits '५' and '१'" },
    { q: "३ पेटी फॉर्च्यून तेल १ लीटर", target: "SKU-OL-FT1L", name: "Fortune 1L", scenario: "Devanagari digit '३'" },
    { q: "do peti parle 250g", target: "SKU-BS-PG250", name: "Parle-G 250g", scenario: "Hindi word number 'do'" },
    { q: "paanch peti tata salt", target: "SKU-FD-TS1KG", name: "Tata Salt 1kg", scenario: "Hindi word number 'paanch'" },
    { q: "chaar peti dettol 75g", target: "SKU-PC-DT075", name: "Dettol 75g", scenario: "Hindi word number 'chaar'" },
    { q: "teen peti maggi noodles", target: "SKU-FD-MG070", name: "Maggi 70g", scenario: "Hindi word number 'teen'" },
    { q: "dus peti good day butter", target: "SKU-BS-GD120", name: "Good Day 120g", scenario: "Hindi word number 'dus'" },
  ];

  for (const item of regionalNumeralItems) {
    prompts.push({
      id: nextId("PRM-NUM"),
      category: "REGIONAL_NUMERALS_AND_FRACTIONS",
      utterance: item.q,
      retailerId: "RET-0003",
      targetSkuId: item.target,
      targetSkuName: item.name,
      expectedQty: 2,
      expectedUnit: "CASE",
      isAmbiguousUnit: false,
      expectedDecision: "AUTO_CONFIRM",
      tradeScenario: item.scenario,
    });
  }

  // 4. AKSHARANTAR ROMANIZATIONS & TYPOS (Phonetic colloquial trade slang)
  const typoItems = [
    { q: "3 peti parley g 75g", target: "SKU-BS-PG075", name: "Parle-G 75g", scenario: "Common typo 'parley'" },
    { q: "2 peti gudday biscuit", target: "SKU-BS-GD120", name: "Good Day 120g", scenario: "Phonetic 'gudday'" },
    { q: "4 peti gadhi washing powder 1kg", target: "SKU-DT-GH1KG", name: "Ghadi 1kg", scenario: "Phonetic 'gadhi'" },
    { q: "3 peti meggi noodles 70g", target: "SKU-FD-MG070", name: "Maggi 70g", scenario: "Phonetic 'meggi'" },
    { q: "2 peti vagh bakri chai", target: "SKU-TE-WB250", name: "Wagh Bakri 250g", scenario: "Phonetic 'vagh bakri'" },
    { q: "3 peti makhan biscuit", target: "SKU-BS-GD120", name: "Good Day 120g", scenario: "Colloquial Mandi synonym 'makhan biscuit'" },
    { q: "2 peti pila wala parle 75g", target: "SKU-BS-PG075", name: "Parle-G 75g", scenario: "Colloquial Mandi synonym 'pila wala'" },
    { q: "4 peti laal ghoda chai", target: "SKU-TE-WB250", name: "Wagh Bakri 250g", scenario: "Mandi visual alias 'laal ghoda'" },
  ];

  for (const item of typoItems) {
    prompts.push({
      id: nextId("PRM-TYPO"),
      category: "AKSHARANTAR_ROMANIZATIONS_AND_TYPOS",
      utterance: item.q,
      retailerId: "RET-0004",
      targetSkuId: item.target,
      targetSkuName: item.name,
      expectedQty: 3,
      expectedUnit: "CASE",
      isAmbiguousUnit: false,
      expectedDecision: "AUTO_CONFIRM",
      tradeScenario: item.scenario,
    });
  }

  // 5. POLYSEMIC AMBIGUOUS UNITS (Invariant [A16]: Must NEVER auto-confirm)
  const polysemicItems = [
    { q: "5 dabba parle g", target: "SKU-BS-PG075", name: "Parle-G 75g", scenario: "Polysemic 'dabba' (can mean 24-pack jar or master case)" },
    { q: "2 dabba fortune refine tel", target: "SKU-OL-FT1L", name: "Fortune 1L", scenario: "Polysemic 'dabba' (can mean 15L tin or 15-pack case)" },
    { q: "10 packet tata salt", target: "SKU-FD-TS1KG", name: "Tata Salt 1kg", scenario: "Loose retail packets (broken case check)" },
    { q: "3 dabba good day", target: "SKU-BS-GD120", name: "Good Day 120g", scenario: "Polysemic 'dabba' unit" },
    { q: "4 dabba dettol sabun", target: "SKU-PC-DT075", name: "Dettol 75g", scenario: "Polysemic 'dabba' unit" },
    { q: "5 parle g", target: "SKU-BS-PG075", name: "Parle-G 75g", scenario: "Missing unit entirely" },
    { q: "10 maggi", target: "SKU-FD-MG070", name: "Maggi 70g", scenario: "Missing unit entirely" },
  ];

  for (const item of polysemicItems) {
    prompts.push({
      id: nextId("PRM-AMBIG"),
      category: "POLYSEMIC_AMBIGUOUS_UNITS",
      utterance: item.q,
      retailerId: "RET-0001",
      targetSkuId: item.target,
      targetSkuName: item.name,
      expectedQty: 5,
      expectedUnit: item.q.includes("dabba") ? "DABBA" : item.q.includes("packet") ? "PACK" : "UNKNOWN",
      isAmbiguousUnit: true,
      expectedDecision: "ASK_UNIT",
      tradeScenario: item.scenario,
    });
  }

  // 6. INJECTED QUANTITY SLIPS (Testing soft warning vs scheme promo suppression)
  const slipItems = [
    { q: "20 peti dettol 75g", target: "SKU-PC-DT075", name: "Dettol 75g", qty: 20, isSlip: true, scenario: "10x Typo slip (usual: 2 cases, max: 3) -> WARNING" },
    { q: "25 peti parle 75g", target: "SKU-BS-PG075", name: "Parle-G 75g", qty: 25, isSlip: true, scenario: "12x Typo slip (usual: 2 cases, max: 3) -> WARNING" },
    { q: "10 peti parle 75g", target: "SKU-BS-PG075", name: "Parle-G 75g", qty: 10, isSlip: false, scenario: "Hits Buy 10 Get 1 Scheme -> SUPPRESS WARNING" },
    { q: "2 peti dettol 75g", target: "SKU-PC-DT075", name: "Dettol 75g", qty: 2, isSlip: false, scenario: "Normal habitual order -> NO WARNING" },
    { q: "30 peti ghadi 1kg", target: "SKU-DT-GH1KG", name: "Ghadi 1kg", qty: 30, isSlip: true, scenario: "10x Typo slip on Ghadi -> WARNING" },
  ];

  for (const item of slipItems) {
    prompts.push({
      id: nextId("PRM-SLIP"),
      category: "INJECTED_QUANTITY_SLIPS",
      utterance: item.q,
      retailerId: "RET-PRIOR-TEST", // Seeded retailer with prior median = 2 cases
      targetSkuId: item.target,
      targetSkuName: item.name,
      expectedQty: item.qty,
      expectedUnit: "CASE",
      isAmbiguousUnit: false,
      expectedDecision: item.isSlip ? "SUGGEST_TOP2" : "AUTO_CONFIRM",
      tradeScenario: item.scenario,
    });
  }

  // 7. OUT-OF-CATALOG REJECTIONS (Strict guardrail: Zero biscuits or arbitrary SKUs hallucinated)
  const oocItems = [
    { q: "10 packet chips", scenario: "Potato chips (not distributed by Company A)" },
    { q: "5 packet lays magic masala", scenario: "Lays chips (not distributed)" },
    { q: "4 packet kurkure", scenario: "Kurkure snacks (not distributed)" },
    { q: "2 bori cement", scenario: "Hardware / Building material" },
    { q: "2 cycle tyre", scenario: "Automotive hardware" },
    { q: "10 can coca cola", scenario: "Carbonated soda (not distributed)" },
    { q: "5 dabba fevicol 1kg", scenario: "Adhesive hardware" },
  ];

  for (const item of oocItems) {
    prompts.push({
      id: nextId("PRM-OOC"),
      category: "OUT_OF_CATALOG_REJECTIONS",
      utterance: item.q,
      retailerId: "RET-0001",
      targetSkuId: null,
      targetSkuName: null,
      expectedQty: 5,
      expectedUnit: "PACK",
      isAmbiguousUnit: false,
      expectedDecision: "DESK_CONFIRM",
      tradeScenario: item.scenario,
    });
  }

  const outputPath = path.join(QUERIES_DIR, "eval_prompts.json");
  fs.writeFileSync(outputPath, JSON.stringify(prompts, null, 2), "utf-8");
  console.log(`Generated and saved ${prompts.length} curated evaluation prompts to: ${outputPath}`);

  return prompts;
}

if (require.main === module) {
  generateEvaluationPrompts();
}
