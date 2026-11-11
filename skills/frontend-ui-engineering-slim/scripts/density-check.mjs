#!/usr/bin/env node
// Rendered whitespace and density check. Uses the project's own Playwright, so it has no dependencies of its own.
// Usage: node density-check.mjs <url-or-file> [--viewports 1366x768,360x800] [--strict] [--json]
// Run it from a directory where `playwright` or `@playwright/test` resolves (usually the frontend project).
// Exit code: 0 on success, 1 when --strict is set and any flag fired, 2 on usage or runtime errors.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const usage = 'Usage: node density-check.mjs <url-or-file> [--viewports 1366x768,360x800] [--strict] [--json]';
let viewportsRaw = '1366x768,360x800';
let viewportValueIndex = -1;
for (let i = 0; i < args.length; i++) {
  let value;
  if (args[i] === '--viewports') { viewportValueIndex = i + 1; value = args[i + 1]; }
  else if (args[i].startsWith('--viewports=')) value = args[i].slice('--viewports='.length);
  else continue;
  if (!value || value.startsWith('--')) {
    console.error(`--viewports needs a value like 1366x768,360x800\n${usage}`);
    process.exit(2);
  }
  viewportsRaw = value;
}
const target = args.find((a, i) => !a.startsWith('--') && i !== viewportValueIndex);
if (!target) {
  console.error(usage);
  process.exit(2);
}
const url = /^[a-z]+:\/\//i.test(target) ? target : pathToFileURL(path.resolve(target)).href;
if (url.startsWith('file:') && !fs.existsSync(new URL(url))) {
  console.error(`File not found: ${target}`);
  process.exit(2);
}
const viewports = viewportsRaw.split(',').map((v) => {
  if (!/^\d+x\d+$/.test(v)) return null;
  const [width, height] = v.split('x').map(Number);
  return width > 0 && height > 0 ? { width, height } : null;
});
if (viewports.includes(null)) {
  console.error(`Invalid --viewports "${viewportsRaw}": each entry must be WxH with both greater than 0.\n${usage}`);
  process.exit(2);
}

const req = createRequire(path.join(process.cwd(), 'noop.js'));
let chromium;
for (const mod of ['playwright', '@playwright/test']) {
  try { ({ chromium } = req(mod)); break; } catch { /* try the next one */ }
}
if (!chromium) {
  console.error('Playwright not found. Run from a project that has playwright or @playwright/test installed.');
  process.exit(2);
}

// Runs in the page, scrolled to the top. Measures how much of the first screen holds content and finds the gaps.
function measure() {
  const vw = innerWidth;
  const vh = innerHeight;
  const visible = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    return !(r.right <= 0 || r.left >= innerWidth);
  };
  const isFixed = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') return true;
    }
    return false;
  };
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const hasOwnText = (el) => ownText(el).length > 0;
  const media = 'img,svg,video,canvas,picture,iframe,input,select,textarea,button';
  const content = [...document.body.querySelectorAll('*')].filter(
    (el) => !el.closest('svg *, button *') && visible(el) && (el.matches(media) || hasOwnText(el)) && !isFixed(el),
  );
  const rects = content.map((el) => el.getBoundingClientRect()).map((r) => ({
    top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, width: r.width,
  }));

  // Rows covered by any content box, from the top of the page through two screens.
  const total = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, vh);
  const span = Math.min(total, vh * 2);
  const truncated = total > span;
  const covered = new Uint8Array(Math.ceil(span));
  for (const r of rects) {
    for (let y = Math.max(0, Math.floor(r.top)); y < Math.min(span, Math.ceil(r.bottom)); y++) covered[y] = 1;
  }
  let foldRows = 0;
  for (let y = 0; y < Math.min(vh, span); y++) foldRows += covered[y];
  let largestGap = 0;
  let gapStart = 0;
  const firstContent = covered.indexOf(1);
  if (firstContent >= 0) {
    const consider = (len, endY) => { if (len > largestGap) { largestGap = len; gapStart = endY - len; } };
    let run = 0;
    for (let y = firstContent; y < span; y++) {
      if (covered[y]) { if (run) consider(run, y); run = 0; } else run++;
    }
    // A run reaching the window end is a gap only when the page continues below it.
    if (run && truncated) consider(run, Math.ceil(span));
  }

  const inFold = (el) => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0; };
  const heading = [...document.querySelectorAll('h1,h2')].some((el) => visible(el) && inFold(el));
  const action = [...document.querySelectorAll('button,[role=button],input[type=submit],a[href]')]
    .some((el) => visible(el) && inFold(el) && !el.closest('nav'));

  // Stacked inline inset: padding + margin + border added by each paragraph and all its ancestors.
  // max-width is ignored on purpose: a measure limit (65ch) is a choice, nested padding is the bug.
  const px = (v) => parseFloat(v) || 0;
  const insetOf = (el) => {
    let inset = 0;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'contents') continue;
      if (n.getBoundingClientRect().width <= 1) return null; // Inside a collapsed or hidden container.
      const ml = px(s.marginLeft);
      const mr = px(s.marginRight);
      const centered = s.maxWidth !== 'none' && Math.abs(ml - mr) < 1; // Auto-centering margins are not an inset.
      inset += Math.max(0, px(s.paddingLeft) + px(s.paddingRight) + (centered ? 0 : ml + mr)
        + px(s.borderLeftWidth) + px(s.borderRightWidth));
    }
    return inset;
  };
  const textWidths = content
    .filter((el) => ownText(el).length >= 40)
    .map(insetOf)
    .filter((inset) => inset !== null)
    .map((inset) => Math.max(0, vw - inset))
    .sort((a, b) => a - b);
  let textRatio = null;
  if (textWidths.length) {
    const mid = textWidths.length >> 1;
    const median = textWidths.length % 2 ? textWidths[mid] : (textWidths[mid - 1] + textWidths[mid]) / 2;
    textRatio = Math.min(1, Math.max(0, median / vw));
  }

  const fullHeight = [...document.body.querySelectorAll('*')]
    .filter((el) => el.parentElement !== document.body && el.id !== 'root' && el.id !== 'app')
    .filter((el) => !el.closest('svg *, button *') && visible(el))
    .filter((el) => { const mh = getComputedStyle(el).minHeight; return mh.endsWith('px') && parseFloat(mh) >= vh * 0.95; })
    .slice(0, 5)
    .map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.classList[0] ? `.${el.classList[0]}` : ''));

  const describeAt = (y) => {
    if (y < 0 || y >= vh) return '?';
    const el = document.elementFromPoint(vw / 2, y);
    return el ? el.tagName.toLowerCase() + (el.classList[0] ? `.${el.classList[0]}` : '') : '?';
  };
  return {
    viewport: `${vw}x${vh}`,
    foldCoverage: foldRows / vh,
    largestGapPx: largestGap,
    largestGapAt: largestGap ? `${gapStart}px (${describeAt(gapStart + largestGap / 2)})` : '-',
    headingInFold: heading,
    actionInFold: action,
    medianTextWidthRatio: textRatio,
    fullHeightBlocks: fullHeight,
    vh,
  };
}

function flagsFor(m) {
  const mobile = Number(m.viewport.split('x')[0]) <= 480;
  const flags = [];
  if (m.foldCoverage < 0.25) flags.push(`first screen only ${Math.round(m.foldCoverage * 100)}% content rows (< 25%)`);
  if (m.largestGapPx > m.vh * 0.25) flags.push(`empty band ${m.largestGapPx}px at ${m.largestGapAt} (> 25% of screen height)`);
  if (!m.headingInFold) flags.push('no h1/h2 on the first screen');
  if (!m.actionInFold) flags.push('no button or link outside nav on the first screen');
  if (mobile && m.medianTextWidthRatio !== null && m.medianTextWidthRatio < 0.75) {
    flags.push(`nested padding and margins leave text ${Math.round(m.medianTextWidthRatio * 100)}% of the width (< 75%)`);
  }
  if (m.fullHeightBlocks.length) flags.push(`full-screen min-height on: ${m.fullHeightBlocks.join(', ')}`);
  return flags;
}

let browser;
let fired = 0;
const results = [];
try {
  browser = await chromium.launch();
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    let res = null;
    try {
      res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (error) {
      if (error.name !== 'TimeoutError') throw error;
      await page.waitForLoadState('load');
    }
    if (/^https?:/i.test(url) && res && !res.ok()) throw new Error(`HTTP ${res.status()}`);
    if (page.url() === 'about:blank') throw new Error(`Navigation to ${url} ended on about:blank`);
    await page.waitForTimeout(300);
    await page.evaluate(() => scrollTo(0, 0));
    const m = await page.evaluate(measure);
    const flags = flagsFor(m);
    fired += flags.length;
    results.push({
      ...m,
      foldCoverage: +m.foldCoverage.toFixed(2),
      medianTextWidthRatio: m.medianTextWidthRatio === null ? null : +m.medianTextWidthRatio.toFixed(2),
      flags,
    });
    await page.close();
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      console.log(`${r.viewport}: fold coverage ${r.foldCoverage}, largest gap ${r.largestGapPx}px, ` +
        `heading ${r.headingInFold ? 'yes' : 'no'}, action ${r.actionInFold ? 'yes' : 'no'}, ` +
        `text room after nested insets ${r.medianTextWidthRatio ?? 'n/a'}`);
      for (const f of r.flags) console.log(`  FLAG ${f}`);
    }
  }
  process.exitCode = args.includes('--strict') && fired ? 1 : 0;
} catch (error) {
  console.error(`density-check failed: ${error.message}`);
  process.exitCode = 2;
} finally {
  await browser?.close().catch(() => {});
}
