import { RealisticOrderScenario } from "../types";

export const REALISTIC_ORDER_SCENARIOS: RealisticOrderScenario[] = [
  // =========================================================================
  // SCENARIO 1: Daily WhatsApp text with mixed Hinglish, aliases, and courtesies
  // =========================================================================
  {
    id: "SCENARIO-01-DAILY-WHATSAPP",
    sourceType: "WHATSAPP_TEXT",
    retailerName: "Sharma Kirana Store",
    retailerRoute: "Napier Town Route #4",
    rawMessage: `bhaiya sharma store se order likho.
10 peti pila wala
2 peti shakti chai 500g
3 peti kapde dhone wala ghadi 1kg
kal subah tak delivery karwa dena urgent hai`,
    items: [
      {
        utterance: "10 peti pila wala",
        expectedSkuCode: "SKU-BS-PG075",
        expectedQuantity: 10,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "vernacular_slang",
      },
      {
        utterance: "2 peti shakti chai 500g",
        expectedSkuCode: "SKU-TE-TT500",
        expectedQuantity: 2,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "vernacular_slang",
      },
      {
        utterance: "3 peti kapde dhone wala ghadi 1kg",
        expectedSkuCode: "SKU-DT-GH1KG",
        expectedQuantity: 3,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "vernacular_slang",
      },
    ],
  },

  // =========================================================================
  // SCENARIO 2: The "Dabba" Polysemic Dilemma (Oil Tin vs Biscuit Box)
  // =========================================================================
  {
    id: "SCENARIO-02-DABBA-POLYSEMY",
    sourceType: "WHATSAPP_TEXT",
    retailerName: "Gupta Daily Needs",
    retailerRoute: "Gorakhpur Route #1",
    rawMessage: `sethji namaste
2 dabba fortune tel bhejiye
3 dabba parle g pila wala`,
    items: [
      {
        utterance: "2 dabba fortune tel bhejiye",
        expectedSkuCode: "SKU-OL-FT1L", // Or 15L Tin
        expectedQuantity: 2,
        expectedUnit: "DABBA",
        expectedDecision: "DISAMBIGUATION",
        expectedAmbiguityReason: "AMBIGUOUS_UNIT",
        categoryTag: "dabba_polysemy",
      },
      {
        utterance: "3 dabba parle g pila wala",
        expectedSkuCode: "SKU-BS-PG075",
        expectedQuantity: 3,
        expectedUnit: "DABBA",
        expectedDecision: "DISAMBIGUATION",
        expectedAmbiguityReason: "AMBIGUOUS_UNIT",
        categoryTag: "dabba_polysemy",
      },
    ],
  },

  // =========================================================================
  // SCENARIO 3: Broken Case / Cut Pack Request (Invariant [A36])
  // =========================================================================
  {
    id: "SCENARIO-03-BROKEN-CASE",
    sourceType: "WHATSAPP_TEXT",
    retailerName: "Patel Kirana Store",
    retailerRoute: "Ganjipura Route #7",
    rawMessage: `detergent powder of 1 kg case of 20 mai se 15 dedo
wagh bakri tea case of 36 me se 10 packet nikal ke bhejo`,
    items: [
      {
        utterance: "detergent powder of 1 kg case of 20 mai se 15 dedo",
        expectedSkuCode: "SKU-DT-GH1KG",
        expectedQuantity: 15,
        expectedUnit: "PACK",
        expectedDecision: "DISAMBIGUATION",
        expectedAmbiguityReason: "BROKEN_CASE",
        categoryTag: "broken_case",
      },
      {
        utterance: "wagh bakri tea case of 36 me se 10 packet nikal ke bhejo",
        expectedSkuCode: "SKU-TE-WB250",
        expectedQuantity: 10,
        expectedUnit: "PACK",
        expectedDecision: "DISAMBIGUATION",
        expectedAmbiguityReason: "BROKEN_CASE",
        categoryTag: "broken_case",
      },
    ],
  },

  // =========================================================================
  // SCENARIO 4: Fractional Vernacular Multipliers (Aadha, Derh, Dhai, Darjan)
  // =========================================================================
  {
    id: "SCENARIO-04-FRACTIONAL-WEIGHTS",
    sourceType: "WHATSAPP_TEXT",
    retailerName: "Verma General Store",
    retailerRoute: "Adhartal Route #3",
    rawMessage: `aadha peti good day biscuit
derh peti fortune tel 1L
do darjan 10 wala maggi packet`,
    items: [
      {
        utterance: "aadha peti good day biscuit",
        expectedSkuCode: "SKU-BS-GD120",
        expectedQuantity: 0.5,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "vernacular_slang",
      },
      {
        utterance: "derh peti fortune tel 1L",
        expectedSkuCode: "SKU-OL-FT1L",
        expectedQuantity: 1.5,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "vernacular_slang",
      },
      {
        utterance: "do darjan 10 wala maggi packet",
        expectedSkuCode: "SKU-FD-MG070",
        expectedQuantity: 24, // 2 * 12
        expectedUnit: "PACK",
        expectedDecision: "DISAMBIGUATION", // 24 packs < 96 packs master carton -> BROKEN_CASE!
        expectedAmbiguityReason: "BROKEN_CASE",
        categoryTag: "vernacular_slang",
      },
    ],
  },

  // =========================================================================
  // SCENARIO 5: Pure Devanagari Hindi Script (Rural Kirana Merchant)
  // =========================================================================
  {
    id: "SCENARIO-05-HINDI-DEVANAGARI",
    sourceType: "SMS",
    retailerName: "Kailash Kirana Bhandar",
    retailerRoute: "Madan Mahal Route #5",
    rawMessage: `५ पेटी पीला वाला बिस्कुट
२ पेटी घड़ी पाउडर
३ पेटी डेटॉल साबुन
१ पेटी टाटा नमक`,
    items: [
      {
        utterance: "५ पेटी पीला वाला बिस्कुट",
        expectedSkuCode: "SKU-BS-PG075",
        expectedQuantity: 5,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "hindi_script",
      },
      {
        utterance: "२ पेटी घड़ी पाउडर",
        expectedSkuCode: "SKU-DT-GH1KG",
        expectedQuantity: 2,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "hindi_script",
      },
      {
        utterance: "३ पेटी डेटॉल साबुन",
        expectedSkuCode: "SKU-PC-DT125",
        expectedQuantity: 3,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "hindi_script",
      },
      {
        utterance: "१ पेटी टाटा नमक",
        expectedSkuCode: "SKU-FD-TS1KG",
        expectedQuantity: 1,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "hindi_script",
      },
    ],
  },

  // =========================================================================
  // SCENARIO 6: Voice Transcription Artifacts (Spoken Phone Call)
  // =========================================================================
  {
    id: "SCENARIO-06-VOICE-CALL-TRANSCRIPTION",
    sourceType: "PHONE_CALL_TRANSCRIPT",
    retailerName: "Agrawal Super Mart",
    retailerRoute: "Wright Town Route #2",
    rawMessage: `hello bhaiya suniye... arey ramesh bol raha hu gol bazar se...
haan order note kariye... 5 peti toh aap woh chhota glucose biskut bhej dijiye...
aur suniye 4 peti lal sabun lifebuoy...
aur haan 2 peti bada surf excel...
bas itna hi likhiye baaki kal dekhenge`,
    items: [
      {
        utterance: "5 peti toh aap woh chhota glucose biskut bhej dijiye",
        expectedSkuCode: "SKU-BS-PG075",
        expectedQuantity: 5,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "voice_transcription",
      },
      {
        utterance: "aur suniye 4 peti lal sabun lifebuoy",
        expectedSkuCode: "SKU-PC-LB100",
        expectedQuantity: 4,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "voice_transcription",
      },
      {
        utterance: "aur haan 2 peti bada surf excel",
        expectedSkuCode: "SKU-DT-SE1KG",
        expectedQuantity: 2,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "voice_transcription",
      },
    ],
  },

  // =========================================================================
  // SCENARIO 7: Missing Unit Guardrail (Never Guess Case vs Pack)
  // =========================================================================
  {
    id: "SCENARIO-07-MISSING-UNIT",
    sourceType: "WHATSAPP_TEXT",
    retailerName: "Bajpai Provisions",
    retailerRoute: "Civil Lines Route #8",
    rawMessage: `5 dettol sabun
10 maggi packet`,
    items: [
      {
        utterance: "5 dettol sabun",
        expectedSkuCode: "SKU-PC-DT125",
        expectedQuantity: 5,
        expectedUnit: "UNKNOWN",
        expectedDecision: "DISAMBIGUATION",
        expectedAmbiguityReason: "MISSING_UNIT",
        categoryTag: "vernacular_slang",
      },
      {
        utterance: "10 maggi packet",
        expectedSkuCode: "SKU-FD-MG070",
        expectedQuantity: 10,
        expectedUnit: "PACK",
        expectedDecision: "DISAMBIGUATION", // 10 packets < 96/case -> BROKEN_CASE
        expectedAmbiguityReason: "BROKEN_CASE",
        categoryTag: "broken_case",
      },
    ],
  },

  // =========================================================================
  // SCENARIO 8: Out-of-Catalog Nonsense & Rejection
  // =========================================================================
  {
    id: "SCENARIO-08-OUT-OF-CATALOG",
    sourceType: "WHATSAPP_TEXT",
    retailerName: "Sadar Grocery Hub",
    retailerRoute: "Cantt & Sadar Route #6",
    rawMessage: `3 peti cycle tyre tube
2 peti motorcycle spark plug`,
    items: [
      {
        utterance: "3 peti cycle tyre tube",
        expectedSkuCode: null,
        expectedQuantity: 3,
        expectedUnit: "CASE",
        expectedDecision: "ESCALATE_CHOOSER",
        expectedAmbiguityReason: "UNKNOWN_SKU",
        categoryTag: "out_of_catalog",
      },
      {
        utterance: "2 peti motorcycle spark plug",
        expectedSkuCode: null,
        expectedQuantity: 2,
        expectedUnit: "CASE",
        expectedDecision: "ESCALATE_CHOOSER",
        expectedAmbiguityReason: "UNKNOWN_SKU",
        categoryTag: "out_of_catalog",
      },
    ],
  },

  // =========================================================================
  // SCENARIO 9: Multi-Item FMCG Wholesale Bulk Order (10 Diverse Lines)
  // =========================================================================
  {
    id: "SCENARIO-09-MEGA-WHOLESALE-ORDER",
    sourceType: "WHATSAPP_TEXT",
    retailerName: "Sharma Kirana Store",
    retailerRoute: "Napier Town Route #4",
    rawMessage: `10 peti pila wala
4 peti good day butter
2 peti marie gold
5 peti ghadi powder 1kg
3 peti kapde ki tikiya
2 peti bada surf excel
3 peti tata tea gold
4 peti fortune refine 1L
2 peti bada vim bar
3 peti colgate paste 100g`,
    items: [
      {
        utterance: "10 peti pila wala",
        expectedSkuCode: "SKU-BS-PG075",
        expectedQuantity: 10,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "4 peti good day butter",
        expectedSkuCode: "SKU-BS-GD120",
        expectedQuantity: 4,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "2 peti marie gold",
        expectedSkuCode: "SKU-BS-MG250",
        expectedQuantity: 2,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "5 peti ghadi powder 1kg",
        expectedSkuCode: "SKU-DT-GH1KG",
        expectedQuantity: 5,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "3 peti kapde ki tikiya",
        expectedSkuCode: "SKU-DT-CK250",
        expectedQuantity: 3,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "2 peti bada surf excel",
        expectedSkuCode: "SKU-DT-SE1KG",
        expectedQuantity: 2,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "3 peti tata tea gold",
        expectedSkuCode: "SKU-TE-TT500",
        expectedQuantity: 3,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "4 peti fortune refine 1L",
        expectedSkuCode: "SKU-OL-FT1L",
        expectedQuantity: 4,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "2 peti bada vim bar",
        expectedSkuCode: "SKU-DB-VM500",
        expectedQuantity: 2,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
      {
        utterance: "3 peti colgate paste 100g",
        expectedSkuCode: "SKU-PC-CG100",
        expectedQuantity: 3,
        expectedUnit: "CASE",
        expectedDecision: "AUTO_CONFIRM",
        categoryTag: "multi_item_order",
      },
    ],
  },
];
