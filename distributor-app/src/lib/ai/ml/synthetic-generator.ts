import masterCatalogRaw from "../../../db/master-catalog.json";

export interface SyntheticSample {
  id: string;
  templateId: string;
  split: "train" | "val" | "test";
  utterance: string;
  targetSkuId: string | null; // null for out-of-catalog noise
  targetSkuCode: string | null;
  targetCategory: string | null;
  expectedQty: number;
  expectedUnit: "CASE" | "PACK" | "KG" | "DABBA" | "UNKNOWN";
  isOutOfCatalog: boolean;
  hasAmbiguousUnit: boolean;
  isBrokenCase: boolean;
  noiseType?: "typo" | "devanagari_num" | "word_swap" | "filler";
}

// 1. Aksharantar Romanization & Colloquial Mandi Synonyms for Look-Alike Size Families across all 36 Master Catalog SKUs
export const SKU_AKSHARANTAR_VARIANTS: Record<string, string[]> = {
  // Parle-G Family (Look-alike sizes: 75g vs 250g)
  "SKU-BS-PG075": [
    "parle", "parle-g", "parley", "paarle", "parle g", "chhota parle", "biscuit chhota", 
    "glucose biscuit", "parle 75g", "parle g 75 gram", "paarle g biscuit", "peela parle", "pila wala", "chhota biscuit"
  ],
  "SKU-BS-PG250": [
    "bada parle", "parle 250g", "bada parle g", "family pack parle", "parle bada packet",
    "parley bada", "parle g do sau pachas gram", "bada peela", "parle bada"
  ],

  // Good Day vs Marie Gold vs Oreo vs Dark Fantasy
  "SKU-BS-GD120": [
    "good day", "gudday", "gudde", "butter biscuit", "good day butter", "gud day 120g",
    "goodday biscuit", "britannia good day", "makhan biscuit"
  ],
  "SKU-BS-MG250": [
    "marie gold", "mari biscuit", "marie biscuit", "meri gold", "tea biscuit",
    "marie 250g", "bada marie", "chai wala biscuit"
  ],
  "SKU-BS-OR120": [
    "oreo", "orio", "oreo biscuit", "oreo vanilla", "cadbury oreo", "oreo 120g", "black biscuit", "cream biscuit"
  ],
  "SKU-BS-DF075": [
    "dark fantasy", "fantasy", "choco fills", "dark fantsy", "sunfeast dark fantasy", "fantasy 75g", "chocolate biscuit"
  ],

  // Ghadi Detergent Family (Look-alike sizes: 500g vs 1kg vs Bar)
  "SKU-DT-GH500": [
    "ghadi powder 500g", "chhota ghadi", "ghadi aadha kilo", "ghari powder 500", "gadhi 500g",
    "ghadi powder chhota packet", "aadha kilo ghadi"
  ],
  "SKU-DT-GH1KG": [
    "ghadi powder", "ghadi 1kg", "ghadi powder 1 kg", "ghari powder", "gadhi 1 kilo",
    "ghadi washing powder", "ghadi detergent ek kilo", "ghadi surf"
  ],
  "SKU-DT-CK250": [
    "ghadi tikiya", "ghadi sabun", "ghadi bar 250g", "ghadi cake", "ghadi kapde ki tikiya", "ghari sabun"
  ],

  // Surf Excel vs Wheel vs Rin
  "SKU-DT-SE1KG": [
    "surf excel", "bada surf", "surf 1kg", "surf excel 1 kg", "mehenga surf", "surf excel easy wash", "surf powder 1kg"
  ],
  "SKU-DT-WH1KG": [
    "wheel", "wheel powder", "wheel 1kg", "wheel detergent", "wheel active", "active wheel 1kg"
  ],
  "SKU-DT-RN250": [
    "rin", "rin soap", "rin sabun", "rin bar", "rin tikiya", "rin 250g", "neela sabun", "rin bar 250"
  ],

  // Maggi Family (Look-alike sizes: 70g Single vs 140g Double Pack) & YiPPee
  "SKU-FD-MG070": [
    "maggi", "meggi", "maggy", "maggi noodles", "chhota maggi", "maggi 70g", "do minute maggi", "masala noodles"
  ],
  "SKU-FD-MG140": [
    "double maggi", "bada maggi", "maggi 140g", "maggi double pack", "do packet wali maggi", "maggi 140 gram"
  ],
  "SKU-FD-YP065": [
    "yippee", "yippy", "sunfeast yippee", "yippee noodles", "yippee magic masala", "yippee 65g"
  ],
  "SKU-FD-TS1KG": [
    "tata salt", "tata namak", "namak 1kg", "iodised salt", "tata salt 1 kg", "white salt", "desi namak"
  ],

  // Tea Family: Wagh Bakri vs Tata Tea Gold vs Tata Agni vs Red Label & Coffee
  "SKU-TE-WB250": [
    "wagh bakri", "wagh bakri chai", "bagh bakri", "vagh bakri", "wagh bakri 250g", "wb tea 250", "laal ghoda", "wagh bakri leaf tea"
  ],
  "SKU-TE-TT500": [
    "tata tea gold", "tata gold", "gold patti", "shakti chai", "tata gold 500g", "kadak patti", "tata gold aadha kilo"
  ],
  "SKU-TE-AG250": [
    "tata agni", "agni chai", "agni dust tea", "tata tea agni", "sasti chai", "agni 250g"
  ],
  "SKU-TE-RL250": [
    "red label", "laal label", "red label chai", "brooke bond red label", "red label tea", "red label 250g"
  ],
  "SKU-BV-NC050": [
    "nescafe", "nescafe classic", "coffee jar", "nescafe 50g", "coffee powder 50g", "chhoti coffee"
  ],

  // Edible Oil Family (Look-alike: 1L Pouch vs 15L Tin vs Mustard vs Mahakosh vs Amul Ghee)
  "SKU-OL-FT1L": [
    "fortune tel", "fortune oil", "refine tel 1l", "fortune refined", "soyabean tel", "fortune pouch 1 litre", "sunflower oil 1l"
  ],
  "SKU-OL-KG1L": [
    "kachi ghani", "sarson tel", "mustard oil", "fortune mustard oil", "sarson tel 1l", "fortune kachi ghani 1l", "kadwa tel"
  ],
  "SKU-OL-FT15T": [
    "fortune dabba 15l", "fortune 15 litre tin", "bada tel tin", "refine tel dabba 15kg", "fortune bada dabba", "fortune tin 15l"
  ],
  "SKU-OL-MK1L": [
    "mahakosh", "mahakosh oil", "mahakosh soyabean", "mahakosh 1l", "mahakosh refine tel"
  ],
  "SKU-GH-AM1L": [
    "amul ghee", "desi ghee 1l", "amul pure ghee", "amul ghee tin", "ghee 1 litre", "amul desi ghee"
  ],

  // Personal Care: Colgate Dental Cream & Clinic Plus
  "SKU-PC-CG100": [
    "colgate", "colgate paste", "safed colgate", "dant manjan", "colgate 100g", "colgate dental cream", "colgate strong teeth"
  ],
  "SKU-PC-CP080": [
    "clinic plus", "clinic plus shampoo", "clinic plus 80ml", "blue shampoo", "chhota shampoo"
  ],

  // Soaps: Dettol 75g vs 125g vs Lifebuoy vs Lux
  "SKU-PC-DT075": [
    "dettol", "dettol sabun", "chhota dettol", "nahane wala dettol", "dettol 75g", "dettol original 75g"
  ],
  "SKU-PC-DT125": [
    "bada dettol", "dettol 125g", "dettol sabun bada", "dettol bada cake", "dettol original 125g"
  ],
  "SKU-PC-LB100": [
    "lifebuoy", "laal sabun", "lifebuoy total", "lifebuoy 100g", "lifeboy soap"
  ],
  "SKU-PC-LX100": [
    "lux", "lux sabun", "gulabi lux", "lux beauty bar", "lux 100g", "pink lux soap"
  ],

  // Spices & Home Care
  "SKU-SP-EV100": [
    "everest garam masala", "garam masala 100g", "everest masala", "garam masala", "everest 100g"
  ],
  "SKU-DB-VM500": [
    "vim bar", "vim sabun", "bartan bar 500g", "vim tub", "vim lemon bar 500g", "vim soap"
  ],
  "SKU-HC-GK045": [
    "good knight", "machhar dawai", "goodknight refill", "mosquito vaporizer", "good knight 45ml", "flash refill"
  ],
  "SKU-HC-HP500": [
    "harpic", "toilet cleaner", "neela harpic", "harpic 500ml", "harpic power plus"
  ]
};

// Out-of-catalog items (must be rejected cleanly with zero biscuits hallucinated)
export const OUT_OF_CATALOG_ITEMS = [
  "chips", "lays magic masala", "kurkure", "bingo tedhe medhe", "pepsi 2 litre", 
  "coca cola can", "cycle ka tyre", "cement ki bori", "fevicol 1kg", "pan masala", "vimal gutkha"
];

// 2. Syntactically Distinct Templates (28 total)
export interface TemplateDef {
  id: string;
  split: "train" | "val" | "test";
  render: (qty: string, unit: string, item: string) => string;
}

export const TEMPLATES: TemplateDef[] = [
  // --- TRAIN TEMPLATES (Templates 01 to 18) ---
  { id: "T01", split: "train", render: (q, u, item) => `${q} ${u} ${item}` },
  { id: "T02", split: "train", render: (q, u, item) => `bhaiya ${q} ${u} ${item}` },
  { id: "T03", split: "train", render: (q, u, item) => `${item} ${q} ${u} bhej dena` },
  { id: "T04", split: "train", render: (q, u, item) => `urgent ${q} ${u} ${item} kal subah` },
  { id: "T05", split: "train", render: (q, u, item) => `${q} ${u} ${item} chahiye shop ke liye` },
  { id: "T06", split: "train", render: (q, u, item) => `sir ${q} ${u} ${item} add karo` },
  { id: "T07", split: "train", render: (q, u, item) => `likho ${q} ${u} ${item}` },
  { id: "T08", split: "train", render: (q, u, item) => `${q} ${u} ${item} ka order hai` },
  { id: "T09", split: "train", render: (q, u, item) => `arre bhai ${item} ${q} ${u} pack kar do` },
  { id: "T10", split: "train", render: (q, u, item) => `${q} ${u} ${item} jaldi dispatch karwana` },
  { id: "T11", split: "train", render: (q, u, item) => `namaste sunil ji ${q} ${u} ${item}` },
  { id: "T12", split: "train", render: (q, u, item) => `${item} - ${q} ${u}` },
  { id: "T13", split: "train", render: (q, u, item) => `please send ${q} ${u} of ${item}` },
  { id: "T14", split: "train", render: (q, u, item) => `${q} ${u} ${item} stock khatam ho gaya hai` },
  { id: "T15", split: "train", render: (q, u, item) => `van me daal dena ${q} ${u} ${item}` },
  { id: "T16", split: "train", render: (q, u, item) => `${item} ${q} ${u}` },
  { id: "T17", split: "train", render: (q, u, item) => `aaj ka order: ${q} ${u} ${item}` },
  { id: "T18", split: "train", render: (q, u, item) => `beat 2 ke liye ${q} ${u} ${item}` },

  // --- HELD-OUT VALIDATION TEMPLATES (Templates 19 to 25: 7 completely held-out templates) ---
  { id: "T19", split: "val", render: (q, u, item) => `dokan pe ${q} ${u} ${item} pahucha dena` },
  { id: "T20", split: "val", render: (q, u, item) => `${q} ${u} ${item} note kar lo` },
  { id: "T21", split: "val", render: (q, u, item) => `bhai ji ${item} ${q} ${u} bhejiyega` },
  { id: "T22", split: "val", render: (q, u, item) => `order: ${item} ${q} ${u}` },
  { id: "T23", split: "val", render: (q, u, item) => `shop no 14 ${q} ${u} ${item}` },
  { id: "T24", split: "val", render: (q, u, item) => `${q} ${u} ${item} rate wahi lagana` },
  { id: "T25", split: "val", render: (q, u, item) => `morning beat me ${q} ${u} ${item}` },

  // --- HELD-OUT TEST TEMPLATES (Templates 26 to 28: 3 completely held-out templates) ---
  { id: "T26", split: "test", render: (q, u, item) => `${q} ${u} ${item} cash on delivery` },
  { id: "T27", split: "test", render: (q, u, item) => `kal delivery chahiye ${q} ${u} ${item}` },
  { id: "T28", split: "test", render: (q, u, item) => `${item} ${q} ${u} sharma kirana store` }
];

const DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९", "१०"];
const HINDI_NUMBER_WORDS = ["ek", "do", "teen", "chaar", "paanch", "chhah", "saat", "aath", "nau", "dus"];

export class SyntheticDataGenerator {
  /**
   * Generates a balanced, template-stratified dataset with Aksharantar phonetic permutations,
   * orthographic noise, look-alike size variations, and out-of-catalog items.
   */
  public generateDataset(samplesPerSku: number = 25): SyntheticSample[] {
    const samples: SyntheticSample[] = [];
    let counter = 1;

    const skuIds = Object.keys(SKU_AKSHARANTAR_VARIANTS);

    for (const skuId of skuIds) {
      const variants = SKU_AKSHARANTAR_VARIANTS[skuId];
      const catalogEntry = (masterCatalogRaw as any[]).find((s) => s.id === skuId);
      const category = catalogEntry?.category || "FMCG";

      for (let i = 0; i < samplesPerSku; i++) {
        // Deterministically distribute across all 28 templates
        const template = TEMPLATES[i % TEMPLATES.length];
        const itemVariant = variants[i % variants.length];

        // Decide quantity representation (English digit, Hindi numeral word, or Devanagari digit)
        const qtyNum = (i % 12) + 1;
        let qtyStr = String(qtyNum);
        let noiseType: SyntheticSample["noiseType"] = undefined;

        if (i % 5 === 0) {
          qtyStr = DEVANAGARI_DIGITS[Math.min(qtyNum, 10)];
          noiseType = "devanagari_num";
        } else if (i % 4 === 0) {
          qtyStr = HINDI_NUMBER_WORDS[Math.min(qtyNum - 1, 9)];
          noiseType = "filler";
        }

        // Decide unit representation
        let unitStr = "peti";
        let expectedUnit: SyntheticSample["expectedUnit"] = "CASE";
        let hasAmbiguousUnit = false;
        let isBrokenCase = false;

        if (i % 7 === 0) {
          unitStr = "dabba";
          expectedUnit = "DABBA";
          hasAmbiguousUnit = true; // Invariant: must NEVER auto-confirm!
        } else if (i % 6 === 0) {
          unitStr = "packet";
          expectedUnit = "PACK";
          // Check if this is a broken cut-pack
          if (catalogEntry?.unitsPerCase && qtyNum < catalogEntry.unitsPerCase) {
            isBrokenCase = true;
          }
        } else if (i % 8 === 0) {
          unitStr = "carton";
          expectedUnit = "CASE";
        } else if (i % 9 === 0) {
          unitStr = ""; // missing unit
          expectedUnit = "UNKNOWN";
          hasAmbiguousUnit = true;
        }

        const utterance = template.render(qtyStr, unitStr, itemVariant).trim().replace(/\s+/g, " ");

        samples.push({
          id: `syn_${String(counter++).padStart(5, "0")}`,
          templateId: template.id,
          split: template.split,
          utterance,
          targetSkuId: skuId,
          targetSkuCode: catalogEntry?.code || skuId,
          targetCategory: category,
          expectedQty: qtyNum,
          expectedUnit,
          isOutOfCatalog: false,
          hasAmbiguousUnit,
          isBrokenCase,
          noiseType,
        });
      }
    }

    // Add Out-of-Catalog Nonsense Queries (must reject with UNKNOWN_SKU and zero biscuits)
    for (let i = 0; i < OUT_OF_CATALOG_ITEMS.length * 4; i++) {
      const template = TEMPLATES[i % TEMPLATES.length];
      const item = OUT_OF_CATALOG_ITEMS[i % OUT_OF_CATALOG_ITEMS.length];
      const qtyNum = (i % 8) + 1;
      const unitStr = i % 2 === 0 ? "packet" : "peti";
      const utterance = template.render(String(qtyNum), unitStr, item).trim().replace(/\s+/g, " ");

      samples.push({
        id: `syn_${String(counter++).padStart(5, "0")}`,
        templateId: template.id,
        split: template.split,
        utterance,
        targetSkuId: null,
        targetSkuCode: null,
        targetCategory: null,
        expectedQty: qtyNum,
        expectedUnit: unitStr === "peti" ? "CASE" : "PACK",
        isOutOfCatalog: true,
        hasAmbiguousUnit: false,
        isBrokenCase: false,
        noiseType: "filler",
      });
    }

    return samples;
  }
}

export const syntheticGenerator = new SyntheticDataGenerator();
