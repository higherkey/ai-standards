---
name: longest-contentful-paint-slim
description: "Core Web Vitals LCP optimization: sub-part breakdown, TTFB reduction, fetchpriority, and render-blocking elimination"
---

# Longest Contentful Paint (`/longest-contentful-paint-slim`)

High-density guidelines for optimizing Largest Contentful Paint (LCP) to achieve $\le 2.5\text{s}$ at the 75th percentile of real users.

---

## 1. The LCP Breakdown Model

LCP is composed of four distinct time slices:

```
[  1. TTFB  ][ 2. Load Delay ][ 3. Load Duration ][ 4. Render Delay ]
      └───────────────────────────────────────────────────┘
                            Total LCP Time
```

1. **Time to First Byte (TTFB):** Target $< 800\text{ms}$. Time until the first byte of HTML arrives.
2. **Resource Load Delay:** Target $< 10\%$ of LCP. Time from HTML arrival until the browser requests the LCP resource.
3. **Resource Load Duration:** Target $< 40\%$ of LCP. Time spent downloading the LCP image or font asset.
4. **Element Render Delay:** Target $< 10\%$ of LCP. Time from asset download completion until pixels paint.

---

## 2. Core Optimization Invariants

### 1. Reduce TTFB ($< 800\text{ms}$)
- Serve static assets and cached HTML pages via edge CDNs with `stale-while-revalidate`.
- Avoid redirect chains on root URLs.
- Minimize server-side query blocking during initial document generation.

### 2. Eliminate Resource Load Delay
- **Never Hide the Hero:** Never load the LCP image via CSS `background-image`, dynamic `fetch()`, or client-side JavaScript. Place the standard `<img>` directly in the initial HTML response.
- **Priority Hinting:** Always mark the hero image with `fetchpriority="high"`.
  ```html
  <img src="/hero.webp" fetchpriority="high" loading="eager" width="1200" height="600" alt="Hero">
  ```
- **Preload Only When Late-Discovered:** If the LCP image cannot be declared early in HTML, preload it in `<head>`:
  ```html
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">
  ```

### 3. Compress Resource Load Duration
- **Modern Codecs:** Serve images in AVIF or WebP formats, falling back to optimized JPEG.
- **Responsive Resolution:** Always declare `srcset` and `sizes` to avoid sending 4K images to mobile viewports ($375\text{px}$).
- **SVGs & Text:** For text-based LCP candidates, subset fonts and use modern WOFF2 formats with `font-display: swap`.

### 4. Eliminate Render-Blocking Resources
- **Inline Critical CSS:** Inline minimal above-the-fold CSS ($< 14\text{KB}$) in a `<style>` block in `<head>`.
- **Defer Everything Else:** Mark non-critical scripts with `defer` or `type="module"`. Asynchronously load secondary stylesheets.

---

## 3. Deep Reference

For full framework patterns (Next.js, Astro, Nuxt) and DevTools performance observer snippets, consult [references/LCP.md](references/LCP.md).

---

## 4. Verification Checklist

- [ ] LCP hero element is present directly in the server-delivered HTML string.
- [ ] Hero image has `fetchpriority="high"` and `loading="eager"`.
- [ ] Explicit `width`, `height`, or aspect-ratio declared on LCP image.
- [ ] No non-critical synchronous `<script>` tags blocking `<head>`.
- [ ] Text fonts use WOFF2 with `font-display: swap`.
- [ ] LCP target $< 2.5\text{s}$ verified via DevTools performance traces.
