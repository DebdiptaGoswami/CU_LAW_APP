# DESIGN SYSTEM: LEX CURIA (The Judicial Benchmark)

## 1. Aesthetic Vision & Metaphor
* **Theme Concept:** "The High Court Bench & Judicial Library" — bridging traditional legal majesty with modern digital precision.
* **Mood:** Authoritative, prestigious, grounded, studious, luxury craftsman.
* **Key Textures:** Warm walnut/mahogany woods, deep cocoa-espresso obsidian, warm ivory parchment, polished brass/gilded accents, and realistic gavel emblems.

---

## 2. Color Tokens & Theme Architecture

### A. Dark Theme ("Midnight Chambers")
* `--bg-canvas`: `#0e0a08` (Deep Obsidian Espresso)
* `--bg-surface`: `rgba(26, 18, 14, 0.85)` (Dark Chocolate Glass)
* `--bg-surface-elevated`: `rgba(38, 26, 20, 0.95)` (Rich Roasted Cocoa)
* `--border-subtle`: `rgba(197, 160, 89, 0.15)` (Tarnished Brass Hairline)
* `--border-glow`: `rgba(218, 165, 32, 0.35)` (Burnished Gold Focus)
* `--text-primary`: `#fbf7ee` (Warm Cream / Ivory Parchment)
* `--text-secondary`: `#b8a695` (Aged Book Linen)
* `--accent-gold`: `#cfa75c` (Polished Judicial Brass)
* `--accent-wood`: `#7a3422` (Imperial Mahogany)
* `--accent-badge`: `rgba(197, 160, 89, 0.12)`

### B. Light Theme ("The Supreme Court Library")
* `--bg-canvas`: `#f8f4ec` (Ivory Linen Parchment)
* `--bg-surface`: `#ffffff` (Crisp Legal Bond Paper)
* `--bg-surface-elevated`: `#f1ebe0` (Warm Cream Wood)
* `--border-subtle`: `rgba(74, 31, 20, 0.12)` (Warm Walnut Border)
* `--border-glow`: `rgba(139, 58, 43, 0.3)` (Mahogany Focus)
* `--text-primary`: `#1f140e` (Deep Walnut Ink)
* `--text-secondary`: `#5e4d42` (Espresso Muted)
* `--accent-gold`: `#a37a2c` (Antique Brass)
* `--accent-wood`: `#5c2417` (Deep Mahogany)
* `--accent-badge`: `rgba(92, 36, 23, 0.08)`

---

## 3. Typography & Hierarchy
* **Display / Headings (`h1`, `h2`, `h3`, Card Titles):**
  * Font Family: `'Playfair Display'`, `'Cinzel'`, Georgia, serif
  * Style: Elegant, high-contrast serif with letter-spacing tracking (`0.02em`).
* **Body / Legal Text / Forms:**
  * Font Family: `'Plus Jakarta Sans'`, `'Inter'`, system-ui, sans-serif
  * Style: Clean, readable line-height (`1.65`), high legibility for 16-mark answers.
* **Statutory / Bare Act Quotes:**
  * Left border: `3px solid var(--accent-gold)`
  * Background: `var(--bg-surface-elevated)`
  * Font Style: Italicized classic serif with indent.

---

## 4. UI Elements & Motifs
* **The Gavel Motif:**
  * Realistic 3D polished wooden gavel icon/emblem integrated into the main header branding and loading states.
  * Interactive "Judge's Gavel Tap" animation on primary submit/generate buttons.
* **Cards & Containers:**
  * Border radius: `12px` (Refined, professional).
  * Backdrop blur: `blur(14px)`.
  * Shadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`.
* **Buttons:**
  * Primary Action: Rich mahogany gradient (`linear-gradient(135deg, #7a3422 0%, #4a1f14 100%)`) with gilded brass border and white serif typography.
  * Secondary / Tools: Translucent cocoa button with brass hover glow.