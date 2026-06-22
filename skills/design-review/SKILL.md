---
name: design-review
description: "Audit and verify user interfaces from a design, layout, aesthetics, accessibility, and consistency perspective"
---

# User Interface & Design Review Workflow

Use this workflow to systematically review front-end layouts, styles, visual assets, and copy. 

---

## Expert Persona
Before starting the review, dynamically assume an expert identity suited for auditing this interface and copy, such as a *Principal UI/UX Designer*, *Conversion Rate Optimization (CRO) Expert*, *Small Business Marketing Strategy Consultant*, or *Web Accessibility (a11y) Specialist*. State this identity at the beginning of your response.

---

## 1. Quality Check Mandate
Before concluding any design review, you must systematically audit the interface and copy to identify any **errors, false assumptions, or missed opportunities** in the design, typography, layout, or accessibility.

---

## 2. Aesthetics & Styling Audit
Verify that the interface looks premium, modern, and aligned with the active project's branding:
- **Colors:** Check that only the brand's HSL/custom variables are used (avoid generic raw colors). Verify that neutral greys and brand accents are balanced.
- **Typography:** Confirm that the project's official typography, fonts, and standard body scale are loaded and applied correctly.
- **Micro-Animations:** Inspect hover transitions, active states, and sliding elements (like the navigation progress bar or drawer) for fluid motion and tactile response.

---

## 3. Layout & Responsiveness Audit
Verify layout boundaries and responsive breakpoints:
- **Mobile UX:** The hamburger menu must open, close, and navigate cleanly on mobile screens (<=768px). Check that text headers wrap gracefully without double-line breaks or overlapping.
- **Desktop & Tablet:** Test viewports between 992px and 1200px (intermediate range) to ensure components do not clip and that horizontal grids scale smoothly.
- **Global Spacing:** Ensure all margins, paddings, and card gaps use the global spacing tokens defined in the project's stylesheets.

---

## 4. Content & Copy Audit
Review page copy for positioning and tone:
- **The Guide vs. The Hero:** Confirm the copy positions the customer as the hero, and the brand as the guide (e.g. using frameworks like StoryBrand where applicable).
- **Brand Messaging:** Ensure messaging avoids off-brand jargon, aligns with the project's strategic positioning, and remains clear and customer-centric.
- **CTAs:** Verify that all conversion points route uniformly to the project's official conversion endpoints (e.g., booking calendar, contact form, signup page).

---

## 5. Accessibility (a11y) & Usability
Check that the design is usable by all clients:
- **Keyboard Navigation:** Confirm focus states are visible and links are tabbable.
- **Contrast & Elements:** Ensure color is not the only indicator of a state (use symbols or icons). Touch targets must be at least 44x44px.
- **Alt Text:** Add descriptive alt text to all structural images and custom SVGs.
