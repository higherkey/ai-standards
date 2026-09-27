---
name: accessibility-and-a11y-slim
description: "Web accessibility standards: WCAG 2.2 AA compliance, semantic HTML, keyboard focus trapping, and accessible labeling"
---

# Accessibility & a11y (`/accessibility-and-a11y-slim`)

High-density guidelines for achieving WCAG 2.2 Level AA compliance across web applications and UI components.

---

## 1. Semantic HTML First

Never polyfill native browser behaviors with `<div>` and ARIA when native HTML elements exist:
- **Buttons:** Use `<button type="button">` or `<button type="submit">`. Never `<div onClick={...}>`.
- **Links:** Use `<a href="...">` for navigation. Links navigate; buttons trigger actions.
- **Modals:** Use native `<dialog>` with `.showModal()` for automatic backdrop inertness and focus trapping.
- **Landmarks:** Structure pages with `<header>`, `<nav>`, `<main>`, `<aside>`, and `<footer>`.

---

## 2. Keyboard Navigation & Focus Management

- **Logical Tab Order:** Ensure the keyboard tab sequence matches visual reading order. Avoid positive `tabindex` values (`tabindex="1"`); use `0` to make an element focusable or `-1` for programmatic focus.
- **Visible Focus Indicators:** Never remove focus outlines (`outline: none`) without providing an explicit, high-contrast `:focus-visible` replacement ring.
- **Modal Focus Trap & Restore:**
  - When a modal opens: Move focus to the first interactive element inside the modal.
  - Trap Tab navigation within the modal boundary.
  - When the modal closes: Restore focus back to the triggering button.
  - Close on `Escape` key press.

---

## 3. Accessible Naming & Forms

- **Icon Buttons:** Every icon-only button must have an accessible name:
  ```html
  <button aria-label="Close dialog">
    <svg aria-hidden="true" focusable="false"><!-- icon --></svg>
  </button>
  ```
- **Decorative Elements:** Mark purely decorative icons and images with `aria-hidden="true"` or `alt=""`.
- **Form Association:** Every `<input>`, `<select>`, and `<textarea>` must have an associated `<label>` using the `for`/`id` attribute or `aria-labelledby`. Never rely solely on `placeholder` text as a label.
- **Error Feedback:** Connect error messages directly to inputs using `aria-invalid="true"` and `aria-describedby="error-msg-id"`.

---

## 4. Color, Contrast & Motion

- **Contrast Ratios (WCAG AA):**
  - Normal text ($< 18\text{pt}$ regular): Contrast ratio $\ge 4.5:1$ against background.
  - Large text ($\ge 18\text{pt}$ or $\ge 14\text{pt}$ bold): Contrast ratio $\ge 3:1$.
  - UI components and graphical boundaries: Contrast ratio $\ge 3:1$.
- **Not Color Alone:** Never use color as the sole indicator of state (e.g. green/red for success/error). Always pair color with an icon, badge text, or pattern.
- **Reduced Motion:** Wrap non-essential animations and transitions in `@media (prefers-reduced-motion: reduce)`.

---

## 5. Verification Checklist

- [ ] All interactive elements operable using `Tab`, `Enter`, and `Space`.
- [ ] No `outline: none` without high-contrast `:focus-visible` ring.
- [ ] Icon-only buttons have explicit `aria-label` and `aria-hidden="true"` on SVGs.
- [ ] Form inputs have associated `<label>` elements.
- [ ] Text contrast meets minimum $\ge 4.5:1$ (tested via color contrast tool).
- [ ] Modals trap focus and restore focus on dismissal.
- [ ] Reduced motion media query respected for UI animations.
