# The Plain-English Non-Technical Guide to the IsoLabs Order Engine (`@isolabs/order-engine`)

> **Who is this guide for?**  
> Anyone! Whether you are a business owner, an evaluator, an investor, a kirana shopkeeper, or someone without any engineering background, this document explains **what this specific Engine does, why it was created, how it translates messy shopkeeper messages into exact orders, and how it protects the business from costly mistakes.**

---

## 1. What is this Engine?

In one sentence:  
**The Engine is the "brain" that listens to messy WhatsApp messages, voice notes, and paper slips from neighborhood kirana stores, understands what product and quantity they actually want, and does the exact wholesale math with zero human guesswork.**

It lives in its own dedicated folder called `engine/` (packaged as `@isolabs/order-engine`).

```
                HOW THE ENGINE FITS INTO THE BIG PICTURE:
                ==========================================

   Kirana Store WhatsApp / Voice Note        
          "bhaiya 5 peti pila wala aur 2 dabba tel bhejo"
                              │
                              ▼
   ┌─────────────────────────────────────────────────────┐
   │             THE ENGINE (@isolabs/order-engine)      │
   │  • Decodes Hindi, Hinglish & local nicknames        │
   │  • Resolves "pila wala" -> Parle-G 75g              │
   │  • Flags "dabba" -> Asks user (Never Guesses!)      │
   │  • Calculates wholesale rates, schemes & GST taxes  │
   └──────────────────────────┬──────────────────────────┘
                              │
                              ▼
            Clean, Perfect Cart & Tally Invoice
```

---

## 2. Why Did We Build It? (The ₹52.5 Lakh Problem)

In Jabalpur, a typical wholesale distributor handles **600 kirana store orders every day**, doing **₹90 Crore in sales every year**.

Under manual ordering via phone calls and WhatsApp, **₹52.5 Lakhs is lost every year** because of three simple human failure modes:

```
  [1] Wrong Item or Quantity Shipped (5% error rate)
      9,000 botched deliveries/year x ₹350 return & driver cost  = ₹31.50 Lakhs loss
  
  [2] Re-Typing Staff (6 office clerks typing into Tally)
      6 clerks x ₹2.60 Lakhs annual salary                       = ₹15.60 Lakhs cost
  
  [3] Post-Booking Stockouts (finding out too late)
      Warehouse out-of-stock after order is already booked        =  ₹5.40 Lakhs loss
  ---------------------------------------------------------------------------------
  TOTAL PREVENTABLE LOSS BLEEDING OUT EVERY YEAR:                 = ₹52.50 LAKHS / YEAR
```

The Engine was built to take order error rates from **5% down to under 1%**, and reduce office entry re-typing so the distributor saves over **₹40 Lakhs annually**.

---

## 3. Why is the Engine in its Own Dedicated Folder (`engine/`)?

Think of building a car:
- The **website app** (`distributor-app`) is the car’s body, steering wheel, seats, and touchscreens.
- The **Engine** (`engine/`) is the high-performance engine under the hood.

We decoupled the Engine completely so that:
1. **Safety & Zero Breakage:** We can make the language recognition smarter, train AI models, or adjust regional dialect rules in complete isolation without ever touching or risking the store database or website.
2. **Speed on Cheap Phones:** The Engine runs in **under 10 milliseconds**. It doesn't drain low-end Android phone batteries or freeze on slow 3G connections.
3. **Plug-and-Play Anywhere:** If the distributor later wants to launch a native Android app, an automated WhatsApp chatbot, or a voice assistant, the exact same Engine can be plugged in with zero code rewriting.

---

## 4. How the Engine Understands Shopkeeper Talk

Kirana merchants in Jabalpur do not type formal catalog names like *"Parle-G Gluco Biscuits 75g Case of 96"*. They type in Hindi, Hinglish, or local shorthand with colloquial pack descriptors.

Here is how the Engine understands them:

### A. Number Words and Local Fractions
Shopkeepers write numbers as digits, English words, Hindi words, or local fractions:
- `"5"` or `"५"` $\to 5$
- `"do peti"` or `"two cases"` $\to 2$ cases
- `"aadha peti"` $\to 0.5$ cases (half case)
- `"derh peti"` $\to 1.5$ cases
- `"dhai peti"` $\to 2.5$ cases
- `"sawa peti"` $\to 1.25$ cases
- `"ek darjan packet"` $\to 12$ loose packets (the Engine knows *darjan* means a multiplier of 12!)

### B. Regional Jabalpur Product Nicknames
The Engine contains a built-in regional alias dictionary (`SEED_ALIASES`) mapped to Jabalpur FMCG trade:

| What the Shopkeeper Writes | What the Engine Recognizes | Exact Warehouse Product |
| :--- | :--- | :--- |
| *"pila wala"* / *"pila biscuit"* / *"chhota biscuit"* | Parle-G 75g yellow pack | `SKU-BS-075` |
| *"shakti chai"* / *"kadak patti"* | Tata Tea Gold 500g | `SKU-TE-TT500` |
| *"surajmukhi tel"* / *"chidiya tel"* / *"refine"* | Fortune Sunflower Refined Oil 1L | `SKU-OL-FT1L` |
| *"kapde dhone wala ghadi"* | Ghadi Detergent Powder 1kg | `SKU-DT-1KG` |
| *"bartan bar"* / *"ghadi tikiya"* | Ghadi Detergent Cake 250g | `SKU-DT-CK250` |
| *"nahane wala dettol"* | Dettol Bathing Soap 125g | `SKU-PC-DT125` |
| *"lal sabun"* | Lifebuoy Soap 100g | `SKU-PC-LB100` |

### C. Conversational Courtesy Stripping (Clean WhatsApp & Call Transcripts)
Shopkeepers almost never send just a sterile list of items. A real WhatsApp text or voice call transcript looks like this:
> *"bhaiya namaste, sharma store se order likho... 10 peti pila wala aur 2 peti shakti chai... kal subah tak delivery karwa dena urgent hai"*

If a basic computer program reads this, it might mistakenly try to look up *"sharma store"* or *"delivery"* in the product catalog and throw errors.  
The Engine contains an **Intelligent Courtesy Filter**:
- It identifies and strips greeting headers (*"bhaiya namaste"*, *"order likho"*, *"se bol raha hu"*).
- It identifies and strips delivery footers (*"kal subah tak delivery karwa dena"*, *"urgent hai"*, *"baaki kal dekhenge"*).
- It isolates **only the true product lines** so the cart is 100% clean, with zero bogus items.

---

## 5. The Two Golden Safety Guardrails

No AI or computer algorithm is allowed to make wild guesses that could cost money. The Engine enforces two hard, unbreakable safety rules:

### Guardrail 1: The "Dabba" Rule (Invariant [A16] "Ask, Never Guess")
In Madhya Pradesh wholesale, the word **"dabba"** (or *dibba*) has three completely different meanings:
1. In edible oil: 1 *dabba* = a **15-Liter / 15-Kg large tin**.
2. In biscuits or confectionery: 1 *dabba* = an **inner counter display box** (12 to 24 loose packs).
3. In wholesale talk: 1 *dabba* = a **master corrugated carton (peti / case of 96 packs)**.

**The Danger of Guessing:**  
If a shopkeeper types *"2 dabba parle g pila wala"* and a computer blindly assumes 2 master cartons (192 packs) instead of 2 counter boxes (48 packs), the driver delivers 4 times too much. The shopkeeper rejects the shipment at the door, and the distributor loses ₹350 on fuel and driver turnaround.

**The Engine's Fix:**  
The Engine treats `"dabba"` as an **Ambiguous Unit**. It immediately pauses and shows a 1-tap question card:
> *"Customer wrote '2 dabba'. Did you mean 2 Master Cases (peti) or 2 Loose Inner Boxes / Tins?"*

One tap resolves the order with 100% certainty. **Zero guesswork, zero delivery returns.**

---

### Guardrail 2: Broken Cases / Cut Packs (Invariant [A36])
Wholesale distributors prefer shipping full sealed cartons. But sometimes a small village shopkeeper only wants 15 packets out of a sealed carton of 20:
> *"detergent powder case of 20 mai se 15 dedo"*

**The Engine's Fix:**  
The Engine recognizes that 15 packets is less than a full case of 20 (`BROKEN_CASE`). It provides the merchant with two clear options:
1. **Take 15 Loose Packs:** Keep the exact quantity requested at the single-pack retail rate.
2. **Round Up to 1 Full Case (20 packs):** Upgrade to a sealed wholesale box and save money per pack.

---

## 6. How the Engine Thinks: The 5-Tier Cascade

Instead of relying solely on expensive, slow AI models, the Engine works through 5 smart layers from cheapest and fastest to smartest:

```
  ┌────────────────────────────────────────────────────────┐
  │ TIER 0: INSTANT MEMORY LOOKUP (< 1 ms, Free)           │
  │ Checks exact shopkeeper nicknames ("pila wala").       │
  └──────────────────────────┬─────────────────────────────┘
                             │ Not in memory?
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ TIER 1: SENTENCE STRUCTURE PARSER (< 5 ms, Free)       │
  │ Strips polite filler words, finds numbers, units,      │
  │ and detects broken cases ("mai se 15 dedo").           │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ TIER 2: CANDIDATE RETRIEVAL (< 10 ms, Free)            │
  │ Compares spelling, brand, and category to find the top │
  │ 3 most likely matching products from the catalog.      │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ TIER 3: CALIBRATED CERTAINTY SCORE                     │
  │ Honest probability calculation:                        │
  │  • Sure (>= 85%): Accepts automatically.               │
  │  • Medium (50% - 84%): Shows 1-tap question card.      │
  │  • Unsure (< 50%): Hands over to Tier 4 or human clerk.│
  └──────────────────────────┬─────────────────────────────┘
                             │ Unsure?
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ TIER 4: CLOSED-SET AI CHOOSER (Gemini Fallback)        │
  │ Given strictly the top 3 candidate options.            │
  │ Can ONLY pick Option A, B, C, or "None of these".      │
  │ FORBIDDEN from inventing new products or changing units│
  └──────────────────────────┬─────────────────────────────┘
                             │ Still doubtful?
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │ TIER 5: HUMAN ORDER DESK SAFETY NET                    │
  │ Flags order for 1-click human clerk review. Once the   │
  │ clerk resolves it, the Engine remembers it for next time│
  └────────────────────────────────────────────────────────┘
```

### The Clerk Learning Loop (How the Engine Gets Smarter Every Day)
When an order desk clerk in Jabalpur reviews an ambiguous or unrecognized handwriting note and manually selects the correct product (e.g. mapping an odd shop slang like *"bhaiya apna wala ghadi"* to `Ghadi Detergent 1kg`), the Engine **instantly memorizes this mapping in the database for that specific shopkeeper**.

The next time that shopkeeper sends that phrase:
- It skips all AI and search algorithms.
- It resolves instantly at **Tier 0** in less than 1 millisecond.
- It is accepted with 98% certainty.
- The clerk never has to touch or re-type it again.

---

## 7. The Scheme & Tax Calculator Inside the Engine

The Engine doesn't just recognize product names; it also computes the complex wholesale math:
1. **Free Goods Math:** If the company offers *"Buy 10 cases of Parle-G, get 1 free"*, the Engine adds 1 free case at ₹0 rate, locking physical stock in the warehouse so the driver never forgets to load it.
2. **Slab Discounts:** If an order hits a tier threshold (e.g., *"5+ cases gets 3% off"*), the discount is deducted automatically before tax.
3. **Flawless GST Breakdown:** Computes Central GST (CGST) and State GST (SGST) split exactly 50/50 and rounds to 2 decimal places, ensuring zero rounding discrepancies when exported to Tally ERP.

---

---

## 8. Why Did the Computer Think "Chips" Were Butter Cookies at 98% Accuracy, and How Did We Fix It?

### The Real-Life Problem
A shopkeeper typed:
> *"10 peti chips"*

Our distributor sells biscuits, soaps, cooking oils, detergents, and tea. We **do not sell potato chips**.

Instead of saying *"Sorry, we don't sell chips"*, the computer confidently replied:
> *"Great! You ordered 10 cases of Britannia Good Day Butter Cookies! We are 98% confident!"*

Obviously, if a truck arrives at a village shop with ₹13,000 worth of sweet butter cookies when the shopkeeper wanted salty potato chips, the shopkeeper will be furious and reject the delivery.

### Why Did This Happen? (In Simple Terms)
1. **The Pronunciation Trap:** To understand Indian accents and spelling mistakes (like *biskut* instead of *biscuit*), the computer converts words into sound codes. But the computer was programmed to turn the sound *"ch"* into the letter *"c"*.
   - So `"chips"` was heard as `"cips"`.
   - Meanwhile, `"cookies"` was heard as `"cukis"`.
   - The computer compared `"cips"` and `"cukis"`. They both start with *c*, both have an *i*, and both end with *s*. The computer thought: *"Hey, chips sounds 60% like cookies!"*
2. **The "Only One Witness" Trap:** The computer had three detectives working for it:
   - Detective 1 (Spelling): *"Zero match. Chips is not in our catalog."*
   - Detective 2 (Meaning / Category): *"Zero match. Chips is not soap, tea, or oil."*
   - Detective 3 (Sound): *"Wait, chips sounds a tiny bit like cookies!"*
   Because Detectives 1 and 2 said nothing, the computer asked ONLY Detective 3. And because Detective 3 was the only one who spoke up, the computer treated Detective 3's wild guess as **100% agreement**!
3. **The Overconfident Multiplier:** The computer had a math formula designed to add extra points if the customer gave a number (10) and a packaging box (*peti*). Because 10 and *peti* were clear, it pushed the confidence score all the way to **98%**!

### How We Fixed It (The New Golden Rule)
1. **Separated Sound Sounds:** The sound *"ch"* (च as in *chai* or *chips*) is no longer confused with the hard *"k"* sound (क as in *cookies*). Chips is chips; cookies is cookies.
2. **The "Two Witnesses" Rule:** The computer is no longer allowed to confirm an order based on a solitary guess. At least **two independent signals** (like spelling AND category meaning) must agree before the computer is allowed to confirm. If only one detective has a faint guess, the score is capped at 50% and flagged for human review.
3. **The Honest "I Don't Have It" Guardrail:** If someone asks for items not in our catalog (like *chips*, *kurkure*, *cold drinks*, *bicycle tyres*, or *spark plugs*), the computer immediately stops and says:
   > *"Confidence: 12% (Unknown Item). We do not carry 'chips'. Did you mean to browse our biscuit, detergent, or edible oil catalog?"*
   It honestly reports 12% certainty and asks the customer to choose, rather than making a wild, expensive guess.

---

## 9. Summary: How the Engine Solves the Real-World Problems

| Real-World Problem | How the Engine Handles It | Business Outcome |
| :--- | :--- | :--- |
| **"pila wala 5 peti"** | Translates vernacular alias to Parle-G 75g (`SKU-BS-075`). | Instant match, zero manual searching. |
| **"10 peti chips"** | Recognizes item is out of catalog; drops confidence to 12% and flags `UNKNOWN_SKU`. | **Zero hallucination.** Never sends wrong goods. |
| **"2 dabba tel"** | Flags polysemic unit; asks user if they mean a 15L tin or a master case. | Eliminates ₹350 return cost on wrong shipment. |
| **"case mai se 15 dedo"** | Detects broken case; offers loose-pack rate vs full-case wholesale discount. | Protects distributor margins, prevents damaged packs. |
| **"५ पेटी बिस्कुट"** | Translates Devanagari numerals and Hindi script. | Works for vernacular shopkeepers who don't know English. |
| **Complex trade discounts** | Calculates free goods, slab discounts, and 50/50 GST instantly. | Zero math mistakes, 100% Tally-compliant invoices. |

---

## 10. How the App Speaks Authentic Mandi Hindi & Prevents Warehouse Stock Fights (In Plain English)

### A. Why We Used "Zero-AI" for Hindi Translation
Why didn't we just plug in ChatGPT or Google Translate to translate the website into Hindi?
1. **Instant Speed (0.05 milliseconds vs 3 seconds):** When a shopkeeper taps a button on a 3G phone, they cannot wait 3 seconds for an AI cloud server to translate a word. Our built-in Mandi dictionary translates words in less than 0.05 milliseconds.
2. **Zero Invoicing Hallucinations:** Generative AI models can hallucinate and change numbers! On a commercial tax invoice, if an AI accidentally changes a ₹777 price or a 9% GST tax rate, the distributor breaks the law. With our deterministic engine, numbers and prices are 100% sacred and never altered.
3. **Mandi Slang vs Textbook Hindi:** Generic translation produces formal literary Hindi like *"थोक डिब्बा"* (thok dibba) or *"शॉपिंग कार्ट"* (shopping cart). Real Mandi traders say **पूरी पेटी** (whole case), **खुले पैकेट** (loose packs), **स्टॉक समाप्त** (out of stock), and **उधार सीमा** (credit limit).
4. **The "Random Catalog" Transliteration Engine:** If a distributor uploads a brand-new Excel price sheet with products like *"Kisan Chana Dal 1kg"* or registers a new shop *"Raju Kirana & General Store"*, our phonetic sound-matching engine automatically writes them in clean Devanagari Hindi (*"किसान चना दाल 1 किलो"*, *"राजू किराना व जनरल स्टोर"*) with zero AI costs or monthly API bills.
5. **Never Resets on Page Turn:** When a shopkeeper clicks "हिन्दी" on one page, the whole app (cart, orders, login, walkthrough) stays in Hindi without asking them to click it again.

### B. The "Movie Ticket Seat Selection" Warehouse Stock Guard
What happens if two rival Kirana stores open the app at 9:00 AM and there are only 5 cases of Marie Gold left in the warehouse?
- **Just like booking seats in a movie theatre:** The moment Sharma Kirana buys those 5 cases, Verma General's screen immediately drops from 5 to 0 cases live without needing to refresh the page.
- If Verma already had those cases sitting in their cart, the app immediately flashes a bright red warning banner and locks the "Place Order" button, politely telling them the goods just sold out.
- This prevents messy warehouse stockouts, double-dispatching, or angry phone calls from merchants whose orders had to be cancelled.

### C. The 100% Precision Learned Scorer & Slip Guard (Auto-Confirming Without Shipping Wrong Pack Sizes)
Why didn't we just use a simple score threshold (like 80% or 85%) for auto-confirming WhatsApp orders?
- **The Pack-Size Trap:** If a merchant writes *"2 peti parle g"*, a naive algorithm might auto-confirm Parle-G 75g even if the store always orders 250g or 500g family packs.
- **The Learned Scorer Fix:** We trained an empirical mathematical model that evaluates 12 trade signals simultaneously (pack-size match, retailer order history, brand family topology, and query similarity):
  1. **Segmented Thresholds:** For single-SKU products (Tata Salt, Nescafe, Harpic) where size confusion is impossible, the Engine auto-confirms smoothly ($\ge 75\%$). For look-alike size families (Parle-G 75g/250g/500g, Ghadi 500g/1kg), it demands a strict $94.5\%$ threshold.
  2. **10× Slip Protection:** If a merchant who usually orders 3 cases accidentally types 30 cases, the system catches the typo and gently prompts for confirmation. But if they ordered 10 cases specifically to unlock the "Buy 10 Get 1 Free" scheme, the Engine knows it's intentional and doesn't annoy the merchant with a false alarm!
  3. **Empirical Benchmark:** In comprehensive 3-way testing across 444 trade queries, this engine eliminated 100% of silent false-positive cart errors (0 errors across 119 auto-confirmed lines), achieving **100% precision** (96.9% 95% Wilson Lower Confidence Bound) and +9.5% higher top-1 accuracy (76.8% vs 67.3%).

---

*This document is maintained as the authoritative plain-English specification for `@isolabs/order-engine` and the IsoLabs platform in `Build Docs/`.*
