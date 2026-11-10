---
name: frontend-ui-engineering-slim
description: "Production-grade UI engineering guidelines: modular architecture, CSS hygiene, spacing and density budgets, layout stability, and responsive interaction. Use when building, modifying, or reviewing frontend components, CSS, or layouts, especially when a UI looks sparse, over-padded, or wastes the first screen."
---

# Frontend UI Engineering (`/frontend-ui-engineering-slim`)

High-density engineering standards for building responsive, modular, and performant user interfaces without AI styling artifacts or layout instability.

---

## 1. Architectural Invariants

### Component Separation
- **Container vs. Presentational:** Isolate data fetching, stream subscriptions, and state orchestration into container components. Keep presentational components pure, receiving props and emitting events.
- **Composition over Megastructures:** Prefer composable slot/children patterns over monolithic components parameterized with dozens of configuration flags.
- **Role Boundary (e.g. Table vs. Hand):** In multi-device or split-role apps, strictly separate shared state rendering from personal/client interaction layers.

### Lifecycle & Resource Hygiene
- **Deterministic Cleanup:** Every event listener (`addEventListener`), timer (`setInterval`, `setTimeout`), WebSocket subscription, or `AbortController` must be torn down on component unmount (`useEffect` cleanup, `ngOnDestroy`, `onDestroy`).
- **Memory Safety:** Avoid retaining detached DOM references in closures or module-level arrays.

---

## 2. CSS & Styling Mandates

### Absolute Constraints
- **Zero `!important`:** Never use `!important`. Rely on proper CSS cascading, selector specificity, and stylesheet load order.
- **Zero Inline Styles:** Never use the `style="..."` attribute. Use component-scoped CSS/SCSS or design token utility classes.
- **External Files Preferred:** Component-specific CSS/SCSS files are standard. A `<style>` tag is permitted only in single-file prototypes with explicit approval.

### Design Tokens & Layout Hygiene
- **Token Consistency:** Use design system tokens (CSS custom properties) for colors, spacing, typography, and elevations rather than arbitrary magic pixel values.
- **Touch Targets:** Interactive targets (buttons, links, toggles) must meet the minimum physical touch target of 44 x 44px on touch/mobile viewports.
- **Responsive Fluidity:** Build mobile-first. Test layout integrity across standard breakpoints (360px, 768px, 1024px, 1440px).

---

## 3. Spacing & Density

AI-generated UI tends to over-space. Generous padding looks premium in isolation, but nested containers multiply it until the first screen is mostly empty. Treat whitespace as a budget that has to earn its place.

### Spacing Encodes Relationship
- **Inside < Between:** Space inside a group is smaller than space between groups (label → field < field → field < section → section). If every gap is the same size, the hierarchy is lost; if every gap is large, the content is lost.
- **Use the Small End of the Scale:** Default to the small and middle steps of the token scale. Reach for the top steps only at section boundaries, and justify them.
- **A Scale With Fine Steps:** The scale needs enough steps below `2rem`, for example `0.25`, `0.5`, `0.75`, `1`, `1.5`, `2`, `3rem`. A coarse scale such as `1.5rem` → `2.5rem` forces "a bit more space" up to the big step. Add the missing step instead of rounding up.

### Default Budgets (Heuristics, Not Limits)

| Context | Component padding | Gap between related items | Between sections |
| :--- | :--- | :--- | :--- |
| App UI (dashboards, forms, games, tools) | `0.5rem`–`1rem` | `0.5rem`–`1rem` | `1.5rem`–`2rem` |
| Content and marketing pages | `1rem`–`1.5rem` | `1rem`–`1.5rem` | `2rem`–`4rem` desktop, about half on mobile |

- **Rows in Lists and Tables:** 40–48px rows on desktop, and at least the 44px touch target on mobile. Don't add padding beyond that.
- **Line Height:** 1.4–1.6 for body text, 1.1–1.3 for headings, 1.2–1.4 for UI labels. Don't go above 1.7.
- **Letter Spacing:** Leave body and UI text at `normal` (at most `0.02em`). Tracking of `0.05em`–`0.15em` belongs only on short uppercase or small-caps labels (eyebrows, badges). Wide tracking on mixed-case text spreads it out and slows reading.

### Anti-Patterns
- **Stacked Padding:** Every container, card, and inner wrapper adds its own padding, so the insets add up. On a 360px screen, three levels of `2rem` leave text 168px wide. Only one layer should own the page gutter, and nested cards drop or shrink their padding.
- **Double Spacing on One Axis:** The parent uses `gap` and the children also use `margin`. Pick one owner per axis, preferably `gap`. Never use spacer `<div>`s or `<br>` for layout.
- **Full-Screen Sections:** `min-height: 100vh`/`100dvh` (`min-h-screen`) on content sections or empty states. Keep full height for the app shell, or for a hero whose content really fills it.
- **Desktop Spacing on Mobile:** Scale section and container spacing down with breakpoints or `clamp()`. A `6rem` desktop section padding should not reach a 360px viewport unchanged.
- **Narrow Columns in Apps:** `max-inline-size: 65ch` is for running text. Dashboards and tools should use the available width with grids, not a single centered column. Single-task forms such as login, signup, and checkout steps are the exception: a `20rem`–`28rem` column is right for them. Shrink the space around the form, not the form itself.
- **Oversized Empty States:** Empty, loading, and error states should be compact: an icon, one line of text, and one action. They shouldn't fill the viewport.

### First-Screen Test
At 1366×768 and 360×800, the first screen shows the page heading, the primary action, and the start of the primary content without scrolling. Run the rendered check from a project where Playwright is installed:

```bash
node <skill-dir>/scripts/density-check.mjs http://localhost:4200/ --strict
```

It flags these:
- the first screen is mostly empty (under 25% of rows hold content);
- an empty band taller than 25% of the screen;
- no heading or no action on the first screen;
- nested insets that leave text under 75% of the mobile width;
- content blocks with full-screen `min-height`.

The flags are evidence to review, not automatic failures. A full-bleed hero image, for example, can be deliberate.

---

## 4. Layout Stability & Cumulative Layout Shift (CLS)

- **Dimension Reservation:** Always declare explicit `aspect-ratio` or `width`/`height` on `<img>`, `<video>`, and canvas elements to prevent content reflows during loading.
- **Skeleton Loaders:** Match the exact dimensions of incoming async data with placeholder skeletons.
- **Font Display:** Use `font-display: swap` or `optional` with matched fallback font metrics (`size-adjust`) to avoid layout jumps on font load.

---

## 5. State Management Principles

- **Derive, Don't Duplicate:** Compute derived state on the fly rather than keeping duplicate state variables in sync.
- **Single Source of Truth:** Keep mutable state at the lowest common ancestor that requires it.
- **State Machine Discipline:** Represent complex UI states explicitly (e.g., `status: 'idle' | 'loading' | 'success' | 'error'`) rather than multiple independent boolean flags (`isLoading`, `hasError`, `isSuccess`).

---

## 6. Verification Checklist

- [ ] Zero instances of `!important` across all stylesheets.
- [ ] Zero inline `style="..."` attributes used.
- [ ] All async subscriptions and DOM listeners are torn down on unmount.
- [ ] Touch targets are >= 44 x 44px on mobile viewports.
- [ ] Images/media elements have explicit aspect ratios or bounding boxes.
- [ ] UI tested across mobile (360px) and desktop (1024px+) widths.
- [ ] Spacing follows the inside < between rule, with one spacing owner per axis and no spacer elements.
- [ ] Only one layer owns the page gutter. Nested containers don't stack their own padding.
- [ ] No full-screen `min-height` on content sections or empty states. Desktop section spacing scales down on mobile.
- [ ] The first screen shows the heading, primary action, and start of content at 1366×768 and 360×800 (`scripts/density-check.mjs` has been run and its flags reviewed).
