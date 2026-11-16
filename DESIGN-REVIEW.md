# CNPG Extensions website design review

Reviewed 16 November 2026 against website commit `0d5ca33`, plus the separately requested security-reporting addition. This is a recommendation document: no design changes were made.

## Recommendation

Keep Hugo, the Hextra-derived layout, Nunito Sans, IBM Plex Mono, warm paper, and the purple identity. The strongest next step is a small usability and accessibility pass, not another visual direction. The homepage communicates an approachable, technically grounded project; the catalog and evidence pages need precision more than additional marketing styling.

The review preserves the approved completeness-first copy, highlighted COMPLETE and SECURE, extension showcase, restrained motion, and maintainer bio. It does not recommend restoring decorative uppercase headings, redundant homepage sections, or a CVE table.

## What the three resources contribute

- [Anthropic frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): deliberate typography, meaningful hierarchy, restrained decoration, and a distinctive identity grounded in the subject. Its warnings about common generated designs are prompts for judgment, not reasons to discard a deliberate brand choice. Here, purple connects to the logo and CloudNativePG; the emphasized headline expresses an explicit positioning decision. Keep both.
- [Impeccable](https://github.com/pbakaus/impeccable), particularly its [polish](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/polish.md) and [audit](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/reference/audit.md) references: preserve the existing visual identity during refinement; distinguish functional problems from cosmetic preferences; evaluate actual tasks, content extremes, and mobile use. That is the right approach for this site now.
- [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines): a useful checklist for focus, touch targets, readable controls, URL state, content overflow, and loading performance. Apply the framework-independent advice. There is no reason to adopt Next.js, Vercel branding, or their copy conventions.

These were read as review resources, not installed or executed as automated skill workflows. No detector score or formal accessibility certification is claimed.

## What is already working

- The homepage has an identifiable hierarchy: promise, scope, concrete extensions, action, operating instructions, maintainer. The real extension names and actionable examples provide substance behind the marketing.
- Nunito Sans is friendly without being ornamental. IBM Plex Mono makes identifiers and commands recognizably technical. Browser inspection confirmed the intended font families loaded; a font substitution is unnecessary.
- The body palette is coherent in both modes. Purple does not compete with another brand accent. Warm paper feels less stark than white while remaining visually quiet.
- Native links, buttons, selects, and disclosures provide a good foundation. There is a skip link, explicit focus styling, labeled search, result announcements, and keyboard handling for the extension tabs.
- The two extension views and single selected image inventory are a substantial improvement over stacked distro/architecture reports. Advisory counts use text and weight, not color alone; zero-match links remain useful. Missing evidence is distinguished from zero findings.
- Theme changes use an explicit short color transition, with reduced-motion support. Keep this; no entrance animations or moving backgrounds are needed.

## Prioritized findings

Priority labels here are practical sequencing, not a claim of a complete WCAG audit. “Observed” means source or rendered evidence; “proposal” means a design judgment to consider.

### 1. Correct anchor positioning beneath sticky tabs — high priority, observed

On the desktop `pg_search` documentation view, scrolling the Usage heading into view placed its top at approximately 49px while the sticky tabs occupied the first 58px. The heading is partially covered. The same mechanism affects table-of-contents navigation.

**Recommendation:** account for the tab bar and a small reading gap in heading scroll offsets, then verify deep links and focused elements at phone and desktop widths. Relevant code: `assets/css/site.css`, `.prose h2/h3` and `.detail-view-nav`. This is a small correction with a direct navigation benefit.

### 2. Make mobile controls easier to read and tap — high priority, observed

At a 390px viewport, the theme button is 34×34px. The dependency search and image/architecture controls use 14px text and are 42px tall. The catalog search already has a 16px mobile override, but the dependency search does not.

**Recommendation:** use at least 16px for mobile text inputs and a consistent 44px touch target for standalone controls, including the theme switch and copy buttons. Keep browser zoom enabled. The 44px recommendation is a usability target; a 34px button is not automatically a WCAG AA failure because target-size rules have exceptions. Actual iPhone focus/zoom behavior still needs testing.

### 3. Strengthen control boundaries selectively — high priority, measured concern

The current `--line` token is appropriate for quiet separators but is also used for control borders. Its contrast against the page background is only 1.58:1 in light mode and 2.10:1 in dark mode. Controls can be hard to distinguish where the boundary is needed to recognize the interactive area.

**Recommendation:** introduce a separate control-border token with stronger contrast; retain the existing quiet border for decorative separators and cards. Check every relevant adjacent surface and focus state before calling this compliant. Do not darken every line on the page.

### 4. Finish URL state and copy feedback — next pass, observed in source

Catalog query and filters are serialized, but sort order is not. Dependency search text is not serialized. Image and architecture are serialized, but the controls are initialized from the URL only once; later browser history changes do not fully resynchronize these controls. Copy buttons change visible text, but the generic code-copy buttons retain the accessible name “Copy code example” and have no dedicated success announcement.

**Recommendation:** make selected filters, sort, and image state survive sharing and history navigation consistently. Decide explicitly whether dependency search should also be shareable. Announce copy success/failure with a small polite status region. Keep native anchor navigation where possible.

### 5. Improve reading measure and small technical text — next pass, observed/proposal

Desktop documentation can be roughly 900px wide; the rendered `pg_search` text column was 896px at 1280px viewport width. Long prose lines require more eye movement. Several evidence labels, license summaries, and mobile code blocks are only 12px.

**Recommendation:** constrain prose paragraphs to approximately 65–75 characters while allowing code and tables to use more width. Try 13–14px for small technical text without increasing every label. Preserve natural spacing in COMPLETE and SECURE; avoid tightening the capitals again. Validate `0/O`, `1/l/I`, underscores, braces, long versions, and long license expressions at real phone size.

### 6. Make primary navigation resilient without JavaScript — next pass, observed in source

Below 700px, the desktop navigation is hidden and the mobile navigation starts with the HTML `hidden` attribute. If JavaScript fails, the menu cannot reveal the main page links. The catalog still lists extensions, which is good, but its nonfunctional search controls remain visible.

**Recommendation:** expose a usable navigation fallback and show enhanced search controls only when enhancement is available. This fits a static site intended to be dependable.

### 7. Reduce avoidable transfer and document size — next pass, measured opportunity

The logo PNG is about 325KiB despite being displayed at around 218px wide. The six loaded homepage font files total about 689KiB uncompressed. Inspection shows that files named `.woff2` actually contain TrueType data; the CSS correctly declares TrueType, so this is a packaging/optimization opportunity rather than proof of broken rendering. The generated `pg_search` HTML is about 825KiB before transfer compression, and `ogr_fdw` contained 5,863 DOM elements because multiple inventories are present at once.

**Recommendation:** use genuine WOFF2 font assets, retaining licenses and required glyphs, and optimize the logo without changing its appearance. Measure compressed transfer size and interaction latency on a slow phone connection. Only consider loading inventories on demand if measurement justifies the extra code; preserve missing-data and no-JavaScript behavior. Avoid adding a frontend framework to solve this.

## Optional visual polish, not defects

- **Mobile action placement:** at 390px width, the homepage action row begins approximately 1,090px down the document, after three rows of extension logos. That is an understandable consequence of showing concrete examples first. Consider a small earlier “Explore extensions” link only if you want faster access; do not silently reorder the approved homepage.
- **Logo balance:** Citus and the generic GitHub graphics have different visual weights, while white tiles are prominent in dark mode. Adjust individual artwork scale/padding if needed, preserving recognizable logos and the contrast treatment already requested. Avoid indiscriminate recoloring of third-party marks.
- **Catalog emphasis:** build-system badges occupy prominent card space, although capabilities and versions matter more to most visitors. Consider making build type secondary and giving long descriptions more room. This requires no AI-written extension summaries.
- **Long guides:** Security and Getting started would benefit from a compact in-page contents list, using the same navigation pattern as extension documentation.
- **Cleanup later:** prototype comparison palettes and Doks/Hinode/gallery rules remain in `prototype.css`. Removing unused rules after a visual regression check would make future changes less fragile, without redesigning the site.

## Color and accessibility evidence

Calculated WCAG-style sRGB contrast against the current warm-paper or dark page background:

| Token | Light | Dark |
|---|---:|---:|
| Main text | 14.61:1 | 14.85:1 |
| Muted text | 5.96:1 | 8.96:1 |
| Accent/link text | 9.42:1 | 8.78:1 |
| Border line | 1.58:1 | 2.10:1 |

The text pairs exceed 4.5:1. This validates these pairs, not every component, image, state, or browser. Borders have different requirements from text and purely decorative separators need not satisfy control-boundary contrast.

The site does not depend on a red/green status scale. Active tabs have an underline, links have text, and advisory counts remain visible numerically. Preserve these redundant cues. A color-vision simulation and real assistive-technology pass are still outstanding. Vercel's preference for APCA can supplement perception checks; it should not replace the selected WCAG conformance criteria.

## Review coverage and limits

Read the shared layouts, home/catalog/detail styles, JavaScript, font declarations, and evidence markup. Inspected the rendered homepage at 390×844 and 1280×900 in dark mode, light-mode extension documentation at 1280×900, and measured the mobile `ogr_fdw` inventory controls. The sampled mobile home and inventory pages had no document-level horizontal overflow. Reproduced the desktop sticky-tab overlap. Calculated token contrast and inspected asset/document sizes.

This was a targeted first review, not testing every extension or every state. Physical iOS Safari, screen readers, 200%/400% zoom, color-vision simulation, forced colors, full keyboard journeys, slow-network performance, and a full browser matrix remain untested. No synthetic overall score is assigned to imply that missing coverage occurred.

## Suggested implementation order

1. Fix anchor overlap, mobile input sizing/touch targets, and control boundaries.
2. Complete state restoration, copy announcements, and navigation fallback.
3. Improve prose measure and font/logo delivery; measure large inventories.
4. Discuss optional homepage/catalog polish separately before changing the approved composition.

Separately authorized during this review: added “Report a vulnerability” near the top of `content/security.md`, linking GitHub private reporting, the source security policy, and published advisories. Hugo build and the site checker passed (102 extension pages, 2,908 local links). This security addition is available locally; no commit or push was made in this review.

## Follow-up implementation — 16 November 2026

Implemented the four approved improvements: heading/focus offsets below sticky tabs; larger controls and 16px mobile search/select text; a separate stronger control-border token; and shorter prose measures with larger technical text plus URL restoration for catalog sort/filter and selected image/dependency search. Font and logo assets were deliberately left untouched. Optional homepage restructuring and catalog restyling were not undertaken.

Validation: Hugo production build (including JavaScript minification) passed in an isolated output directory; the site checker validated 102 extension pages, SBOM package completeness, and 2,908 local links. `git diff --check` passed. No new browser/device verification was performed for this implementation. Changes are local and uncommitted.
