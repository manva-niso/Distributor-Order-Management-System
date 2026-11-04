# PS4 Distributor: Data Architecture

Company A, Jabalpur · Data model v2 for the TDD · 2 November 2026 · Every assumption is labelled (A#)

## 1. The data model in one look

The database is split into six layers. Each layer has one job, one kind of writer and one lifetime. This is what keeps a session, a user and a business rule from ever being mixed in one table.

| Layer | What it holds | Who writes it | Lifetime | Tables |
| --- | --- | --- | --- | --- |
| 1. Session | Login state and work in progress | The user’s device | Minutes to days, auto-expires | sessions, otp\_requests, cart\_items, draft captures |
| 2. Users and access | Who you are and what you may see | Owner/desk by upload | Long, soft-deleted | users, retailers, retailer\_areas, salesmen, salesman\_retailers |
| 3. Business rules | Prices, schemes, credit policy, thresholds | Owner/desk, effective-dated | Versioned, never overwritten | price\_tiers, price\_list, schemes, scheme\_slabs, credit\_accounts, app\_config |
| 4. Master data | Catalogue and stock | Owner upload and system | Long, soft-deleted | brands, categories, skus, stock, aliases |
| 5. Transactions | What was asked, understood and ordered | Retailer, AI, desk | Permanent | captures, capture\_lines, orders, order\_lines, order\_revisions, order\_events, credit\_holds, desk\_tickets, tally\_exports |
| 6. Audit and history | Why anything changed | System only, append-only | Permanent | audit\_log, stock\_movements, import\_batches, import\_row\_changes |

A seventh, read-only layer sits on top for dashboards: star-schema views (section 2).

**Dependency rule.** A layer may read the layers above it but writes only to its own. Transactions read rules and master data and copy what they need as snapshots. Rules and master data never point at transactions. The one exception is that the system updates stock.reserved\_cases and retailers.last\_order\_at when an order is placed.

## 2. Which schema pattern: star or snowflake?

Both, in different places and for different reasons.

| Part | Pattern | Why |
| --- | --- | --- |
| Operational database (what the apps read and write) | Normalized to 3NF, with reference data snowflaked (sku → category, sku → brand, retailer → area, retailer → price tier) | Writes dominate. A brand or area name is stored once, so it can never disagree with itself |
| Reporting layer (dashboards, Tally summary, success measures) | Star schema, built as SQL views on top of the operational tables | Dashboards need one-hop joins and simple queries |

Star facts:

- **fact\_order\_line.** One row per order line. Measures: paid cases, free cases, net paise, GST paise. Dimensions: date, retailer, sku, source, status.
- **fact\_capture\_line.** One row per AI-read line. Measures: confidence score, edited\_by\_desk (1 or 0). This gives the error rate in the success measure (5% to under 1%).
- **fact\_stock\_movement.** One row per stock change. Dimensions: date, sku, reason.

A pure star is wrong for operations because it repeats brand and category names on every row. A pure snowflake is wrong for reporting because it needs long join chains for a simple tile like ‘retailers with no order in 14 days’.

## 3. Keeping session, user and business rules apart

| Distinction | Rule | How the schema enforces it |
| --- | --- | --- |
| Session vs user | A session row dies, a user row never does | sessions holds only auth (token hash, device, expires\_at, revoked\_at). Logout sets revoked\_at. A purge job deletes expired rows after 7 days |
| Session vs draft work | A dropped 3G connection or a new phone must not lose a cart | cart\_items and draft captures belong to user\_id, not session\_id. They carry expires\_at (A12: 30 days idle) |
| User vs retailer | A shop is not a person. Owner, staff and salesman are different people | users.retailer\_id lets several users share a shop. Salesmen link through salesman\_retailers (many-to-many, with from/to dates) |
| Business rules vs master data | Rules change by date and are never overwritten. Master data changes in place, with history in a ledger | price\_list and schemes carry effective\_from/valid\_to. Stock changes go through stock\_movements |
| Raw vs interpreted vs committed | What was said, what the AI understood and what was ordered are three facts | captures (raw, never edited), capture\_lines (interpreted), orders (committed). Each links to the next by id |
| Reference vs snapshot | History must not change when the catalogue does | order\_lines copies name, price, GST and scheme text at placement time |
| Money vs stock vs credit | Three different limits that fail in three different ways | stock, credit\_accounts and orders are separate, and the order service checks all three |
| Config vs code | Thresholds are data, not constants | app\_config holds AI confidence cut-offs, low-stock default, voucher type, credit policy |
| Business data vs personal data | Personal data can be erased without breaking accounts | Names and mobile numbers live only in users and retailers. Orders reference ids, so anonymising a retailer leaves the order history intact |

Assumption A13: single tenant (only Company A), so no tenant\_id column. Adding one later is a mechanical change.

### New tables added in v2

| Table | Why it was added | Key fields |
| --- | --- | --- |
| sessions | Auth state separate from the user | id, user\_id, token\_hash, device, created\_at, expires\_at, revoked\_at |
| brands, categories | Snowflake the SKU table | id, name |
| price\_tiers | Replaces the free-text tier | code, name |
| retailer\_areas | Van-list grouping without repeating area names | id, name, route\_order |
| credit\_accounts | Credit is a business rule, not an identity field | retailer\_id, limit\_paise, outstanding\_paise, as\_of, source |
| salesman\_retailers | Visit assignments over time | salesman\_id, retailer\_id, from\_date, to\_date |
| order\_revisions | Undo and revert of order edits | order\_id, revision\_no, lines\_json, totals\_json, changed\_by, reason, at |
| order\_events | Status history, one row per transition | order\_id, from\_status, to\_status, actor\_id, reason, at |
| credit\_holds | A hold has its own life (raised, released, rejected) | order\_id, exposure\_paise, limit\_paise, status, decided\_by, decided\_at, reason |
| desk\_tickets | Catches everything that is not an order (section 5.3) | id, type, retailer\_id, capture\_id, raw\_text, status, assigned\_to, resolution\_note |
| ticket\_types | Lets new request types be added as data | code, label\_en, label\_hi, owner\_role |
| capture\_line\_edits | Before/after for every desk correction | capture\_line\_id, field, before, after, by, at |
| import\_row\_changes | Row-level before/after so an upload can be undone | batch\_id, entity, key, before\_json, after\_json |
| alias\_events | Alias created, confirmed, switched off | alias\_id, action, by, at |

## 4. Normalization, step by step

Starting point: the desk’s notebook or Excel row, ‘retailer, date, item1, qty1, item2, qty2, price, scheme, total’.

| Step | Problem found | Fix |
| --- | --- | --- |
| 1NF | Repeating item columns, and several values in one cell (‘5 peti biscuit, 2 peti powder’) | One row per line in order\_lines. Raw message text kept whole in captures |
| 2NF | SKU name and units per case depend on the SKU alone, not on (order, line) | Moved to skus. Price depends on (sku, tier, effective\_from), so it gets its own price\_list |
| 3NF | Brand name depends on the brand, not on the SKU. Area name depends on the area. Tier name depends on the tier | brands, categories, retailer\_areas and price\_tiers become tables |
| 3NF | Credit limit depends on the retailer’s account, not on identity | credit\_accounts |
| BCNF check | Composite keys (sku, tier, effective\_from) and (retailer, sku) in cart\_items | Every determinant is a key, so there is nothing further to split |

### Deliberate denormalization (and why it is safe)

| Stored twice | Reason | Safety net |
| --- | --- | --- |
| order\_lines: sku name, price, GST rate, scheme text, units per case | Old orders must never change when prices or SKUs change | Snapshot written once, never updated |
| orders: subtotal, discount, GST, total | Fast listing, and Tally export needs exact stored numbers | Recomputed by the scheme engine in tests and compared |
| stock.reserved\_cases | Fast availability check | Nightly job compares to the sum of stock\_movements. A mismatch raises an alert |
| retailers.last\_order\_at | The 14-day dashboard | Rebuilt from orders if it ever looks wrong |
| capture\_lines.ai\_original (json) | Needed so a desk edit can be reverted to the AI’s first answer | Write-once |

## 5. Operations: create, change, undo, delete

Principle: **append, never overwrite.** Three tools do all the work: soft delete (a deleted\_at column), revisions (a new row instead of an edit) and compensating entries (a reversing row instead of an erase).

### 5.1 The operations matrix

| Entity | Create | Edit | Undo / revert | Delete |
| --- | --- | --- | --- | --- |
| Cart item | Tap + | Change qty | Last 10 states kept on the phone. Server holds the latest | Hard delete when the order is placed or after 30 days idle |
| Capture (raw message) | Paste or share | Never (raw stays raw) | Discard sets status DISCARDED | Soft. Raw text purged after 12 months (A12) |
| Capture line (AI draft) | AI | Person fixes. Before/after in capture\_line\_edits | Revert to ai\_original | Goes with its capture |
| Order | Retailer or desk confirms | Edit before CONFIRMED creates a new revision | Revert creates a new revision copied from the old one, so the revert is itself recorded | Never removed. Retailer may cancel while PLACED or HELD. Desk may cancel until EXPORTED |
| Order after EXPORTED | n/a | Locked | Desk records a reversal with reason and a ‘reversed in Tally’ flag | Never |
| Stock | CSV upload | CSV upload | Compensating movement. ‘Undo last upload’ restores from import\_row\_changes | None (SKU set inactive) |
| Price or scheme | Upload | New row with a new effective\_from. Old row stays | Remove a not-yet-effective row, or undo the upload batch | Soft (active = false) |
| Alias | Desk correction | confirmed\_count rises | Switch active off, logged in alias\_events | Soft |
| Retailer or user | Upload | Upload | Old values in audit\_log before/after | Deactivate. Erasure request anonymises personal fields and keeps order rows |
| Session or OTP | Login | Refresh | Logout sets revoked\_at | Purged after 7 days |
| Tally export | Generate | n/a | Re-export makes a new batch that supersedes the old one. A Tally rejection returns the orders to CONFIRMED | Never |
| Desk ticket | AI or desk | Assign, note | Reopen | Soft (DISMISSED) |

### 5.2 Keeping track of, and reverting to, the last request

- Every status change is a row in order\_events (who, when, why). Nothing is overwritten.
- Every edit to an order is a row in order\_revisions. ‘Revert to last’ means: copy revision N-1 into revision N+1. The history shows both the edit and the revert.
- Every upload is an import\_batch with row-level before/after, so the last upload can be undone as a whole.
- idempotency\_key on orders means a double tap or a retry on slow 3G creates one order, not two.
- audit\_log is the single timeline across everything, searchable by entity and actor.

### 5.3 Out-of-scope requests, demands and questions

The brief excludes delivery tracking, in-app payments and GST e-invoicing. Retailers will still ask for them. The rule: **never silently drop, never invent an answer, never act.** Every capture is classified by the AI as ORDER, QUERY or OUT\_OF\_SCOPE.

| What the retailer writes | Ticket type | What the retailer sees | What the desk sees |
| --- | --- | --- | --- |
| ‘Mera maal kahan hai?’ | DELIVERY\_STATUS | ‘Sent to our office, they will call you’ | Ticket linked to the retailer’s latest order |
| ‘Kal 20,000 bheje the’ | PAYMENT\_NOTE | Same message | Ticket with the amount as free text. No ledger is changed |
| ‘GST bill bhej do’ | INVOICE\_REQUEST | Same message | Ticket. Invoice stays in Tally |
| ‘Biscuit wapas lena hai’ | RETURN\_COMPLAINT | Same message | Ticket linked to the retailer’s last order |
| ‘Rate kam karo’ | PRICE\_REQUEST | Same message | Ticket for the salesman or owner |
| Item not in the catalogue | NEW\_ITEM\_REQUEST | Line marked ‘not in our list’ | Ticket and a capture line with sku null |
| Gibberish or unknown language | UNCLEAR | ‘We could not read this, please call’ | Ticket with the raw text |

Mixed messages (‘5 peti biscuit, aur mera maal kahan hai’) are split. The order part becomes capture\_lines. The rest becomes a desk\_ticket with the same capture\_id.

**Is the schema sufficient?** For recording, routing and resolving these requests, yes. Types live in ticket\_types, so a new one is a row, not a migration. The honest limit: there is no payment ledger and no delivery table. If those modules are built later, they will reference orders and desk\_tickets without changing today’s tables.

## 6. How the tables connect

Orders sit in the middle. They look left to find who is asking and right to find what is being sold, and they never write back except to stock.

&#91;embedded content: table map · 6 layers, 32 tables\]

Read the picture from the middle outward. Solid arrows are real foreign keys. Dashed arrows copy a value at one moment and keep no live link, which is why old orders never change when a price does.

| From (many) | To (one) | Field | Rule |
| --- | --- | --- | --- |
| sessions | users | user\_id | One user, many sessions |
| otp\_requests | users | mobile | Checked against the uploaded mobile list before an OTP is sent |
| cart\_items | users, skus | user\_id, sku\_code | One row per (user, sku) |
| users | retailers | retailer\_id | Null for desk and salesman. Several users may share one shop |
| retailers | retailer\_areas, price\_tiers | area\_id, tier\_code | Area for the van list, tier for pricing |
| credit\_accounts | retailers | retailer\_id | One per retailer |
| salesman\_retailers | salesmen, retailers | salesman\_id, retailer\_id | Many-to-many with from/to dates |
| skus | brands, categories | brand\_id, category\_id | Snowflake branches |
| price\_list | skus, price\_tiers | sku\_code, tier\_code | Key is (sku, tier, effective\_from) |
| scheme\_slabs | schemes | scheme\_id | One row per slab |
| schemes | skus | sku\_code | Effective-dated |
| stock | skus | sku\_code | One row per SKU |
| aliases | retailers, skus | retailer\_id (nullable), sku\_code | Null retailer means a global synonym |
| captures | retailers, users | retailer\_id, created\_by | Raw message, never edited |
| capture\_lines | captures, skus | capture\_id, sku\_code, alt\_sku\_1, alt\_sku\_2 | The AI’s best match and two alternatives |
| orders | retailers, captures, users | retailer\_id, capture\_id (nullable), placed\_by | capture\_id is null for catalogue orders |
| order\_lines | orders, skus | order\_id, sku\_code | Plus copied name, price, GST and scheme text |
| order\_events, order\_revisions, credit\_holds | orders | order\_id | One order, many history rows |
| desk\_tickets | retailers, ticket\_types | retailer\_id, type | Optional capture\_id and order\_id |
| tally\_export\_orders | tally\_exports, orders | batch\_id, order\_id | Join table, so an order cannot be exported twice unnoticed |
| stock\_movements | skus | sku\_code | Optional order\_id and import\_batch\_id |
| import\_row\_changes | import\_batches | batch\_id | Before and after for each changed row |
| audit\_log | any table | entity\_type, entity\_id | Polymorphic on purpose: one timeline for everything |
