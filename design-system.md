# Rave Design System

**Last updated:** 2026-09-27
**Version:** 1.0.0

---

## 1. Design Direction

**Tone:** Editorial / Technical Minimalist — Clean, precise, quietly confident. The platform serves hackathon participants, organizers, and judges. It should feel like a well-crafted tool, not a marketing site.

**Differentiator:** A refined warm-neutral palette with a single muted accent (muted teal/cyan), editorial typography using a distinctive display font, and a layout system built on subtle asymmetry and generous whitespace. No purple gradients, no glassmorphism, no neon.

---

## 2. Color Palette

### 2.1 Core Palette (Light Mode)

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| `--color-bg` | `#FAFAF8` | `oklch(0.985 0.003 85)` | Page background |
| `--color-bg-elevated` | `#FFFFFF` | `oklch(1 0 0)` | Cards, modals, dropdowns |
| `--color-fg` | `#1A1A18` | `oklch(0.15 0.005 85)` | Primary text |
| `--color-fg-muted` | `#6B6B63` | `oklch(0.48 0.01 85)` | Secondary text, metadata |
| `--color-border` | `#E5E3DB` | `oklch(0.88 0.01 85)` | Borders, dividers |
| `--color-border-strong` | `#D4D1C8` | `oklch(0.82 0.015 85)` | Focus rings, active states |
| `--color-accent` | `#0D9488` | `oklch(0.55 0.15 185)` | Primary actions, links, key UI |
| `--color-accent-hover` | `#0F766E` | `oklch(0.48 0.14 185)` | Hover states |
| `--color-accent-subtle` | `#CCF5F1` | `oklch(0.92 0.08 185)` | Badges, backgrounds |
| `--color-accent-fg` | `#FFFFFF` | `oklch(1 0 0)` | Text on accent |

### 2.2 Dark Mode

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| `--color-bg` | `#161614` | `oklch(0.12 0.003 85)` | Page background |
| `--color-bg-elevated` | `#1D1D1A` | `oklch(0.16 0.003 85)` | Cards, modals, dropdowns |
| `--color-fg` | `#F5F5F0` | `oklch(0.95 0.005 85)` | Primary text |
| `--color-fg-muted` | `#9A9A90` | `oklch(0.58 0.01 85)` | Secondary text, metadata |
| `--color-border` | `#2A2A26` | `oklch(0.22 0.01 85)` | Borders, dividers |
| `--color-border-strong` | `#3A3A34` | `oklch(0.28 0.015 85)` | Focus rings, active states |
| `--color-accent` | `#14B8A6` | `oklch(0.62 0.16 185)` | Primary actions, links, key UI |
| `--color-accent-hover` | `#0D9488` | `oklch(0.55 0.15 185)` | Hover states |
| `--color-accent-subtle` | `#1A3A38` | `oklch(0.22 0.08 185)` | Badges, backgrounds |
| `--color-accent-fg` | `#161614` | `oklch(0.12 0.003 85)` | Text on accent |

### 2.3 Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-success` | `oklch(0.55 0.15 145)` | `oklch(0.62 0.15 145)` | Success states, completed |
| `--color-warning` | `oklch(0.65 0.18 75)` | `oklch(0.72 0.16 75)` | Warnings, pending |
| `--color-error` | `oklch(0.55 0.22 25)` | `oklch(0.62 0.2 25)` | Errors, destructive |
| `--color-info` | `oklch(0.55 0.18 240)` | `oklch(0.62 0.16 240)` | Info, neutral actions |

### 2.4 Event Status Colors

| Status | Light | Dark | Usage |
|--------|-------|------|-------|
| `draft` | `oklch(0.55 0.02 260)` | `oklch(0.6 0.02 260)` | Muted purple-gray |
| `registration` | `oklch(0.55 0.15 145)` | `oklch(0.62 0.15 145)` | Green |
| `submission` | `oklch(0.55 0.18 240)` | `oklch(0.62 0.16 240)` | Blue |
| `judging` | `oklch(0.65 0.18 75)` | `oklch(0.72 0.16 75)` | Amber |
| `results` | `oklch(0.55 0.15 185)` | `oklch(0.62 0.15 185)` | Teal (accent) |
| `archived` | `oklch(0.48 0.01 85)` | `oklch(0.55 0.01 85)` | Neutral gray |

---

## 3. Typography

### 3.1 Font Families

| Role | Font | Weights | Source |
|------|------|---------|--------|
| Display | **Satoshi** | 400, 500, 600, 700, 900 | Google Fonts |
| UI / Body | **Geist** | 400, 500, 600, 700 | Google Fonts |
| Mono | **Geist Mono** | 400, 500, 600 | Google Fonts |

**Rationale:** Satoshi brings geometric warmth and distinctive character at display sizes. Geist is a clean, highly legible UI font optimized for interfaces. Both are modern, distinct from Inter/Roboto defaults.

### 3.2 Type Scale

| Token | Size | Weight | Line-height | Letter-spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `--text-xs` | 12px | 400 | 1.5 | 0.02em | Captions, fine print, timestamps |
| `--text-sm` | 14px | 400 | 1.5 | 0 | Labels, metadata, form hints |
| `--text-base` | 16px | 400 | 1.6 | 0 | Body text, paragraphs |
| `--text-lg` | 18px | 500 | 1.5 | -0.01em | Lead paragraphs, emphasized body |
| `--text-xl` | 24px | 600 | 1.3 | -0.02em | H3, section titles, card titles |
| `--text-2xl` | 32px | 700 | 1.2 | -0.02em | H2, major sections |
| `--text-3xl` | 48px | 700 | 1.1 | -0.03em | H1, page titles, hero |
| `--text-4xl` | 64px | 900 | 1.05 | -0.04em | Hero display, landing |

### 3.3 Specialized Tokens

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-display` | 48px | 700 | Hero headlines (Satoshi) |
| `--text-heading-1` | 32px | 700 | Page H1 (Satoshi) |
| `--text-heading-2` | 24px | 600 | Section H2 (Satoshi) |
| `--text-heading-3` | 20px | 600 | Card H3 (Satoshi) |
| `--text-body` | 16px | 400 | Body text (Geist) |
| `--text-body-strong` | 16px | 500 | Emphasized body (Geist) |
| `--text-label` | 14px | 500 | Form labels (Geist) |
| `--text-meta` | 12px | 400 | Metadata, timestamps (Geist) |
| `--text-mono` | 13px | 400 | Code, IDs, URLs (Geist Mono) |
| `--text-button` | 14px | 600 | Button text (Geist) |

---

## 4. Spacing & Layout

### 4.1 Base Unit
**4px** — All spacing values are multiples of 4px.

### 4.2 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing, icon gaps |
| `--space-2` | 8px | Small gaps, inline elements |
| `--space-3` | 12px | Component internal padding |
| `--space-4` | 16px | Standard padding, card gaps |
| `--space-5` | 20px | Medium spacing |
| `--space-6` | 24px | Section gaps, card padding |
| `--space-8` | 32px | Large section gaps |
| `--space-10` | 40px | Major section gaps |
| `--space-12` | 48px | Page-level gaps |
| `--space-16` | 64px | Hero gaps, landing sections |
| `--space-20` | 80px | Large landing gaps |
| `--space-24` | 96px | Extra large gaps |

### 4.3 Layout Constraints

| Token | Value | Usage |
|-------|-------|-------|
| `--container-sm` | 640px | Narrow content, forms |
| `--container-md` | 896px | Standard content, articles |
| `--container-lg` | 1152px | Wide content, dashboards |
| `--container-xl` | 1408px | Full-width layouts |
| `--container-2xl` | 1664px | Ultra-wide, gallery grids |

### 4.4 Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `--bp-xs` | 375px | Mobile portrait |
| `--bp-sm` | 640px | Mobile landscape / small tablet |
| `--bp-md` | 768px | Tablet portrait |
| `--bp-lg` | 1024px | Tablet landscape / small desktop |
| `--bp-xl` | 1280px | Desktop |
| `--bp-2xl` | 1536px | Wide desktop |

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` | 0 | Sharp corners, tables, code |
| `--radius-sm` | 4px | Buttons, inputs, badges |
| `--radius-md` | 8px | Cards, dropdowns, modals |
| `--radius-lg` | 12px | Large cards, sheets |
| `--radius-xl` | 16px | Hero elements |
| `--radius-full` | 9999px | Pills, avatars, progress |

**Default radius:** `--radius-md` (8px) — Clean, modern, not overly rounded.

---

## 6. Shadows & Elevation

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgb(0 0 0 / 0.03)` | Subtle, cards at rest |
| `--shadow-sm` | `0 1px 3px rgb(0 0 0 / 0.05), 0 1px 2px rgb(0 0 0 / 0.03)` | Default card shadow |
| `--shadow-md` | `0 4px 8px -2px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)` | Elevated cards, dropdowns |
| `--shadow-lg` | `0 12px 24px -4px rgb(0 0 0 / 0.06), 0 4px 8px -4px rgb(0 0 0 / 0.04)` | Modals, sheets |
| `--shadow-xl` | `0 20px 40px -8px rgb(0 0 0 / 0.08), 0 8px 16px -8px rgb(0 0 0 / 0.05)` | Full-screen overlays |
| `--shadow-focus` | `0 0 0 3px var(--color-accent-subtle)` | Focus rings |

**Dark mode:** Shadows use `rgb(0 0 0 / 0.2)` base with adjusted opacity.

---

## 7. Motion

### 7.1 Durations
| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 120ms | Micro-interactions, hover |
| `--duration-base` | 200ms | Standard transitions |
| `--duration-slow` | 300ms | Modals, drawers, page transitions |
| `--duration-slower` | 400ms | Complex orchestrations |

### 7.2 Easing
| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Entrances, reveals |
| `--ease-in` | `cubic-bezier(0.55, 0.06, 0.68, 0.19)` | Exits, dismissals |
| `--ease-in-out` | `cubic-bezier(0.42, 0, 0.58, 1)` | Toggles, loops |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful bounces (sparingly) |

### 7.3 Motion Principles
- **Respect `prefers-reduced-motion`** — Disable all non-essential animation
- **Animate only `transform` and `opacity`** — No layout-triggering properties
- **Entrance ≥ Exit duration** — Feel responsive, not sluggish
- **Stagger reveals** — 40-60ms delay per item in lists/grids

---

## 8. Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| `--z-base` | 0 | Default content |
| `--z-dropdown` | 10 | Dropdown menus, popovers |
| `--z-sticky` | 20 | Sticky headers, sidebars |
| `--z-drawer` | 30 | Side sheets, mobile nav |
| `--z-modal` | 40 | Dialogs, modals |
| `--z-toast` | 50 | Toasts, notifications |
| `--z-overlay` | 100 | Full-screen overlays |

---

## 9. Component Patterns

### 9.1 Button Variants
- **Primary:** `bg-accent text-accent-fg` — Main CTAs
- **Secondary:** `bg-bg-elevated text-fg border-border` — Secondary actions
- **Ghost:** `bg-transparent text-fg hover:bg-accent-subtle` — Subtle actions
- **Outline:** `bg-transparent text-fg border-border hover:bg-accent-subtle` — Alternative secondary
- **Destructive:** `bg-error/10 text-error hover:bg-error/20` — Dangerous actions
- **Link:** `text-accent underline-offset-2 hover:underline` — Navigation links

### 9.2 Card Variants
- **Default:** `bg-bg-elevated border border-border shadow-xs` — Standard content cards
- **Interactive:** `bg-bg-elevated border border-border shadow-sm hover:shadow-md transition-shadow` — Clickable cards
- **Elevated:** `bg-bg-elevated border border-border shadow-md` — Modals, important surfaces
- **Borderless:** `bg-transparent border-none` — Content sections without elevation

### 9.3 Input States
- **Default:** `bg-bg border-border`
- **Focus:** `border-accent ring-2 ring-accent-subtle`
- **Error:** `border-error ring-2 ring-error/20`
- **Disabled:** `bg-muted opacity-50 cursor-not-allowed`

### 9.4 Badge Variants
- **Default:** `bg-muted text-fg-muted`
- **Accent:** `bg-accent-subtle text-accent`
- **Success:** `bg-success/10 text-success`
- **Warning:** `bg-warning/10 text-warning`
- **Error:** `bg-error/10 text-error`
- **Outline:** `bg-transparent border-border text-fg-muted`

---

## 10. Iconography

- **Library:** `lucide-react` (consistent 2px stroke, 24x24 viewBox)
- **Stroke width:** 2 (default), 1.5 for smaller sizes
- **Sizes:** 14px (inline), 16px (default), 20px (large), 24px (hero)
- **Usage:** Meaningful only — never decorative filler

---

## 11. Form Patterns

- **Label above input** — Always visible, not placeholder-only
- **Helper text below** — `text-sm text-fg-muted`
- **Error text below** — `text-sm text-error` with inline icon
- **Field grouping** — `fieldset` + `legend` for related fields
- **Inline validation** — On blur, not on change
- **Submit feedback** — Loading state on button, toast on complete

---

## 12. Empty States

**Structure:** Illustration/icon + Empathetic title + Explanation + Primary CTA

```tsx
<EmptyState
  icon={FolderOpenIcon}
  title="No hackathons yet"
  description="Discover events and register to start building."
  action={<Button>Explore hackathons</Button>}
/>
```

---

## 13. Loading States

- **Skeleton** — Match final layout structure, not generic rectangles
- **Page-level** — Minimal spinner only for initial loads < 300ms
- **Inline** — Inline spinner for buttons, progress for uploads

---

## 14. Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Visible focus states (`outline: 2px solid var(--color-accent)`)
- [ ] Semantic HTML (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`)
- [ ] ARIA labels on icon-only buttons
- [ ] Color never sole indicator (always + icon/text)
- [ ] 4.5:1 contrast minimum for text
- [ ] 3:1 contrast for UI elements
- [ ] `prefers-reduced-motion` respected
- [ ] Text resizes to 200% without horizontal scroll
- [ ] Skip link on all pages

---

## 15. Content Guidelines

### Voice & Tone
- **Conversational, not corporate** — "Create your team" not "Team Creation"
- **Active verbs** — "Submit project" not "Submission"
- **Specific over clever** — "Registration closes March 1" not "Time's running out"
- **Errors explain + guide** — "Email needs an @ symbol" not "Invalid input"

### Naming Conventions
- **Events** — "Hackathons" (user-facing), "Events" (organizer-facing)
- **Projects** — "Projects" or "Submissions"
- **Teams** — "Teams"
- **Participants** — "Participants" or "Hackers"

---

## 16. Implementation Notes

### CSS Variables Mapping (Tailwind v4)

```css
@theme inline {
  /* Colors */
  --color-bg: var(--color-bg);
  --color-bg-elevated: var(--color-bg-elevated);
  --color-fg: var(--color-fg);
  --color-fg-muted: var(--color-fg-muted);
  --color-border: var(--color-border);
  --color-border-strong: var(--color-border-strong);
  --color-accent: var(--color-accent);
  --color-accent-hover: var(--color-accent-hover);
  --color-accent-subtle: var(--color-accent-subtle);
  --color-accent-fg: var(--color-accent-fg);
  
  /* Semantic */
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);
  --color-info: var(--color-info);
  
  /* Typography */
  --font-display: "Satoshi", sans-serif;
  --font-sans: "Geist", sans-serif;
  --font-mono: "Geist Mono", monospace;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-xs: 0 1px 2px rgb(0 0 0 / 0.03);
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.05), 0 1px 2px rgb(0 0 0 / 0.03);
  --shadow-md: 0 4px 8px -2px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03);
  --shadow-lg: 0 12px 24px -4px rgb(0 0 0 / 0.06), 0 4px 8px -4px rgb(0 0 0 / 0.04);
  --shadow-xl: 0 20px 40px -8px rgb(0 0 0 / 0.08), 0 8px 16px -8px rgb(0 0 0 / 0.05);
  --shadow-focus: 0 0 0 3px var(--color-accent-subtle);
  
  /* Z-index */
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-drawer: 30;
  --z-modal: 40;
  --z-toast: 50;
  --z-overlay: 100;
}
```

---

## 17. Migration Tracking

| Pattern | Current | Target | Files | Priority | Status |
|---------|---------|--------|-------|----------|--------|
| Color palette | Default shadcn (slate) | Warm neutral + teal | globals.css | P1 | In progress |
| Typography | Inter Variable | Satoshi + Geist | globals.css, components | P1 | In progress |
| Border radius | 0.625rem (10px) | 8px (md) | globals.css, components | P1 | In progress |
| Shadows | Default | Custom scale | globals.css, components | P2 | Planned |
| Button variants | shadcn default | Custom variants | button.tsx | P2 | Planned |
| Card variants | shadcn default | Custom variants | card.tsx | P2 | Planned |
| Form patterns | Basic | Full patterns | form-field.tsx, new components | P2 | Planned |