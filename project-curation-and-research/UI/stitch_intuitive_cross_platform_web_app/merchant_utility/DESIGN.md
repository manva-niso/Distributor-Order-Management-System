---
name: Merchant Utility
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3e4943'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6e7a73'
  outline-variant: '#bdc9c1'
  surface-tint: '#006c4e'
  primary: '#005d42'
  on-primary: '#ffffff'
  primary-container: '#047857'
  on-primary-container: '#9ffdd3'
  inverse-primary: '#7bd8b1'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#a7000f'
  on-tertiary: '#ffffff'
  tertiary-container: '#cf1b1e'
  on-tertiary-container: '#ffe4e0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#97f5cc'
  primary-fixed-dim: '#7bd8b1'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#00513a'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeral-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
  numeral-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is built for mission-critical trade operations: wholesale ordering, invoicing, inventory verification, and ledger settlements. The audience spans high-velocity kirana store owners placing restocking orders over low-spec Android devices in bright, cluttered shop environments, alongside distributor desk clerks managing high-density batch orders via desktop monitors.

The aesthetic follows utilitarian functionalism. Visual excess, decorative blurs, and arbitrary negative space are eliminated in favor of strict vertical rhythms, immediate contrast ratios, and structural clarity. The interface communicates dependability, ledger-grade financial accuracy, and uninterrupted speed.

Key principles:
- **Zero Ambiguity:** Financial totals, quantities, and availability states must be instantly scannable without secondary verification steps.
- **Physical Grounding:** UI elements function as tactile, predictable tools tailored for thumb interactions on cracked or low-brightness screens.
- **Bilingual Balance:** Parallel English and Hindi (Devanagari) labels are treated as first-class peer elements with matched visual optical weights rather than secondary helper text.

## Colors

The palette uses high-contrast surfaces engineered for legibility across poor-quality IPS mobile screens and low-grade fluorescent desk lighting.

- **Primary (`#047857`):** Deep emerald green conveys transactional finality, trusted solvency, active stock availability, and confirmed orders. Primary actions, cart states, and verified indicators rely on this anchor tone.
- **Secondary (`#D97706`):** Alert amber reserved for low-stock thresholds, credit limits approaching exhaustion, and pending trade actions.
- **Tertiary (`#DC2626`):** Crimson reserved strictly for hard zero-stock states, overdrawn credit limits, transaction failures, and validation blocks.
- **Neutral Dark (`#0F172A`):** Deep slate provides high optical density for all product names, unit prices, and quantities, exceeding WCAG AAA contrast against white and off-white bases.
- **Surfaces & Borders:** The default background is an off-white canvas (`#F8FAFC`), paired with structural dividing lines (`#E2E8F0` and `#CBD5E1`) to separate dense lists without heavy drop shadows.

## Typography

The type system prioritizes tabular scan speed, clear numeral distinction, and clean bilingual rendering.

- **Numerals:** Currency values (₹), carton ratios, and SKU tallies use tabular figures (`font-variant-numeric: tabular-nums`) with bold weights to prevent visual jitter during real-time quantity entry.
- **Bilingual Structuring:** All major inventory labels, actions, and validation messages pair English with Hindi. Primary English text uses `body-md` or `label-lg`, paired directly with Devanagari text styled at equivalent point size with relaxed line-height (+2px) to prevent ascender and descender clipping.
- **Hierarchy:** Display sizes are constrained. Dense desktop ledger views compress line-heights to display 15+ inventory rows per screen fold, while mobile viewport styles clamp display headings to maximize the vertical interactive area.

## Layout & Spacing

The layout model adapts between two operational contexts: a high-density, keyboard-driven desktop workspace and an ergonomic, thumb-first mobile layout.

- **Desktop Grid (1024px+):** A 12-column fluid grid system with `gutter-desktop` (1.5rem) and `margin-desktop` (2rem). Supports a split-screen master-detail layout: a 4-column persistent cart/ledger summary alongside an 8-column product and inventory matrix.
- **Mobile Grid (<768px):** A single-column layout anchored with strict bottom sticky toolbars for cart totals and immediate checkout actions. Margins stay fixed at 1rem (`margin`) to keep touch boundaries within reach.
- **Touch Target Integrity:** On mobile devices, all interactive elements enforce a strict minimum boundary of 48px × 48px, achieved through balanced internal padding (`space-md`) and expanded tap bounds.

## Elevation & Depth

Visual hierarchy relies on structural dividing borders and deliberate surface tiering rather than deep ambient shadows, ensuring high contrast on budget screens under intense natural light.

- **Level 0 (Base Canvas):** Off-white base (`#F8FAFC`). Unbordered, holding top-level organizational shells.
- **Level 1 (Card & Row Surfaces):** Pure white (`#FFFFFF`) with a 1px border (`#E2E8F0`). Used for standard SKU listing rows, search inputs, and itemized ledger cards.
- **Level 2 (Dropdowns & Modals):** Pure white (`#FFFFFF`) paired with a 1px slate border (`#CBD5E1`) and a functional structural shadow (`0 4px 6px -1px rgba(15, 23, 42, 0.08)`).
- **Level 3 (Sticky Bottom Trays & Critical Dialogs):** Pure white surface, top border 2px solid `#E2E8F0`, supported by a direct containment shadow (`0 -4px 12px rgba(15, 23, 42, 0.06)`).

## Shapes

The interface uses a compact, structural radius system (`roundedness: 1`) to preserve maximum usable screen area on small viewports and maintain a clean tabular look.

- **Standard Elements (0.25rem / 4px):** Applied to buttons, input fields, quantity counter buttons, tabular rows, and status badges. Sharp enough to evoke an organized ledger while softening border intersections.
- **Containers & Panels (0.5rem / 8px):** Applied to standalone order cards, modal dialogs, and alert blocks.
- **Form Controls:** Checkboxes and radio switches maintain compact 4px and rounded circular shapes respectively, with crisp 1.5px outlines for fast scanning.

## Components

### Buttons
- **Primary Button:** 48px height minimum on mobile; background `#047857`; text `#FFFFFF`; font `label-lg`; radius 4px. Active state darkens to `#065F46`. Focused state renders a 2px offset border. Contains dual-language labels (e.g., "Add to Order / ऑर्डर जोड़ें").
- **Secondary / Stepper Buttons:** White background with 1px `#CBD5E1` border; text `#0F172A`. Quantity increment/decrement buttons (`+` / `-`) enforce 48px × 48px touch bounding boxes on mobile viewports.

### SKU & Inventory Cards (Mobile) / Data Rows (Desktop)
- **Mobile SKU Card:** 1px `#E2E8F0` border, white surface. Top row features bold SKU Name alongside bold English/Hindi packaging info (e.g., "12 x 1L Bottle / बोतल"). Center shows large bold price in `numeral-lg` ("₹1,240.00") next to low-stock or credit tags. Bottom row hosts full-width quantity adjustment steps.
- **Desktop Grid Row:** Alternate row striping (`#FFFFFF` to `#F8FAFC`), 40px row height for high visual density. Numbers use tabular figures and align right.

### Chips & Stock Indicators
- **In Stock:** 4px radius, `#ECFDF5` background, `#047857` text, 1px `#A7F3D0` border.
- **Low Stock / Credit Warning:** 4px radius, `#FFFBEB` background, `#D97706` text, 1px `#FDE68A` border.
- **Out of Stock:** 4px radius, `#FEF2F2` background, `#DC2626` text, 1px `#FECACA` border.

### Inputs & Barcode / SKU Search Fields
- Base height 48px (mobile) / 40px (desktop), 1px `#CBD5E1` border, 4px corner radius. Placeholder text contains English and Hindi context (e.g., "Search SKU, Brand, or scan barcode / नाम या बारकोड खोजें"). Focused inputs take a 2px `#047857` border without glow.

### Sticky Order Tray (Mobile PWA)
- Anchored to viewport bottom. Top border 2px `#E2E8F0`, surface `#FFFFFF`. Left block contains item count and bold order value (`numeral-lg`). Right block contains a high-contrast 48px checkout trigger button.