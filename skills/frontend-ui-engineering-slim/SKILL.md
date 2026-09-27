---
name: frontend-ui-engineering-slim
description: "Production-grade UI engineering guidelines: modular architecture, CSS hygiene, layout stability, and responsive interaction"
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
- **Touch Targets:** Interactive targets (buttons, links, toggles) must meet the minimum physical touch target of $44 \times 44\text{px}$ on touch/mobile viewports.
- **Responsive Fluidity:** Build mobile-first. Test layout integrity across standard breakpoints ($360\text{px}$, $768\text{px}$, $1024\text{px}$, $1440\text{px}$).

---

## 3. Layout Stability & Cumulative Layout Shift (CLS)

- **Dimension Reservation:** Always declare explicit `aspect-ratio` or `width`/`height` on `<img>`, `<video>`, and canvas elements to prevent content reflows during loading.
- **Skeleton Loaders:** Match the exact dimensions of incoming async data with placeholder skeletons.
- **Font Display:** Use `font-display: swap` or `optional` with matched fallback font metrics (`size-adjust`) to avoid layout jumps on font load.

---

## 4. State Management Principles

- **Derive, Don't Duplicate:** Compute derived state on the fly rather than keeping duplicate state variables in sync.
- **Single Source of Truth:** Keep mutable state at the lowest common ancestor that requires it.
- **State Machine Discipline:** Represent complex UI states explicitly (e.g., `status: 'idle' | 'loading' | 'success' | 'error'`) rather than multiple independent boolean flags (`isLoading`, `hasError`, `isSuccess`).

---

## 5. Verification Checklist

- [ ] Zero instances of `!important` across all stylesheets.
- [ ] Zero inline `style="..."` attributes used.
- [ ] All async subscriptions and DOM listeners are torn down on unmount.
- [ ] Touch targets are $\ge 44 \times 44\text{px}$ on mobile viewports.
- [ ] Images/media elements have explicit aspect ratios or bounding boxes.
- [ ] UI tested across mobile ($360\text{px}$) and desktop ($1024\text{px}+$) widths.
