# yf-work-filter

The grid and filter behind **yfkk.co/work**: the bento grid, the progressive reveal, and
a filter that works like **Work Mosaic** (YF Builds): an always-visible search bar in the
filter row under the nav; clicking or typing in it drops a panel with one column per facet (Solution, Tactic,
Industry, Region, Company, Year) with live counts; hovering an option dims the tiles it
would hide. A breadcrumb row under the nav always
says what you are looking at, and an empty state has its own reset.

One file, no dependencies, no build step: `work-filter.js`.

## Why this is a repo and not page code

Webflow caps page-level custom code at **10,000 characters**, and the page-code endpoint
rejects `<script>` from the API. The script is past the cap and its comments are the only
record of several hard-won fixes. Hosting it here removes the cap, puts it in version
control, and makes changes reviewable as diffs.

## How it is wired (v2.1)

Everything you can see is a native Webflow element with a real class bound to variables,
so the Designer canvas matches the live page. The script only reads, clones and toggles.

| Piece | Where it lives |
|---|---|
| `work-filter.js` | this repo → jsDelivr (pinned to a **commit SHA**) → registered hosted script `yf_work_filter`, Work page footer |
| Filter panel, breadcrumb row, empty state | Native elements in the Work Filter Bar on the Work page (`yfwrk-panel*`, `yfwrk-fopt*`, `yfwrk-crumb*`, `yfwrk-reset*`, `yfwrk-empty`). The panel is `display:none` until opened, like a Dropdown list. |
| Search bar | Native block on the Work page, first item of the filter row under the nav (`yfwrk-search*`): a 1px pill that stretches across the row, followed by the count, active chips, Reset and the grid/list toggle. Phones: the search takes its own line. The nav component carries no search (it was removed 2026-10-27, with its *Show Work search* prop). |
| Hovers | Native hover states on `yfwrk-fopt`, `yfwrk-panel-close`, `yfwrk-search-field` |
| States CSS (panel open, option on/dimmed, peek, has text, empty, focus) | HTML Embed on the Work page, named "Work Filter Code (states: …)" |
| Facet data | The CMS-bound elements already inside every card (added for the list view) |

The old inline footer script, the v1 nav embed and the v2.0 dropdown pills are gone.

## Webflow references

- Site `[ZF] YF Agency` — `69dc81709c46348ec3a99eca`
- Page Work — `69dc81709c46348ec3a99ebd`
- Collection Projects — `69dc81709c46348ec3a99f64`
- Staging: `yf2025-b2e129e09a76cdd78ea8ab6b1a04d750.webflow.io/work` (staging only; production publishing is Z's call)

## The DOM contract

```
#work-grid > .w-dyn-items > .w-dyn-item          one card per project
[data-workfilter]                                 the filter bar (position: relative)
  [data-yf-panel]                                 filter panel; .is-open while open
    [data-yf-facet="solution|tactic|industry|region|company|year"]   one column each
      [data-yf-facet-label] [data-yf-facet-n]     heading + selected-count badge
      [data-yf-template="option"]                 cloned once per value
        [data-yf-opt-label] [data-yf-opt-n] [data-yf-opt-mark]
    [data-yf-panel-close]                         "Show results"
  [data-yf-crumbs]                                breadcrumb row
    [data-yf-template="crumb"] > [data-yf-crumb-label]
[data-yf-count-shown] [data-yf-count-sep] [data-yf-count-total]   any number
[data-yf-reset]                                   any number (panel, breadcrumb, empty state)
[data-yf-search]                                  search bar in the filter row (one only)
  [data-yf-search-input] [data-yf-search-close]   close = clear the text
#work-grid.is-peek / .is-peek-hit                 while an option is hovered
#work-grid[data-yf-empty]                         set by the script when nothing matches;
                                                  CSS shows the following .yfwrk-empty
```

Facets are read from each card, exact text, never a prefix match:

| Facet | Selector |
|---|---|
| Solution | `.yfwrk-cardsols .yfwrk-sol-label` |
| Tactic | `.yfwrk-cardtacs .yfsolp-chip-label` |
| Industry | `.yfwrk-rowindustry` |
| Region | `.yfwrk-rowflag[alt]` |
| Company | `.yfwrk-rowclient` |
| Year | `.yfwrk-rowyear` |

Reading the Solutions list only is what fixed the Brand count (v1 read every nested
list, so the tactic "Brand Website" counted as Brand: 17 shown, 15 true).

Break a selector and the script degrades quietly: no `#work-grid`, it returns; a card
with no readable facet never matches that filter.

## Filter semantics

- **OR inside a facet, AND across facets.**
- A facet's counts **ignore its own selection**, so each number says what clicking it
  would give you. Options that would give nothing are dimmed (`is-zero`).
- Search matches the project title and every facet value (company included); every word typed must match.
- State lives in the URL: `?solution=Brand&year=2025&q=…`, so filtered views can be shared.
- Every change sends a GA4 `filter_apply` event (`filter_facet`, `filter_value`,
  `filter_action`, `results`).
- The panel opens on a click or focus in the search bar and on typing; it closes on
  Show results, Esc, Enter in the search, or a click anywhere outside it and the bar.
- Peek is mouse only (`hover:hover` and a fine pointer); touch devices skip it.
- `window.yfWorkFilter` exposes `version`, `state()` and `count()` for debugging.

## Traps

1. **Nested collection lists cap at 5 items.** Two projects already sit at exactly 5
   tactics. A sixth tactic on any project will silently drop out of the filter.
2. **One `[data-yf-search]` only.** The script binds the first one it finds. A stray copy
   inside the nav component once hid the real one.
3. **Placeholder text.** Text blocks made through the Webflow API keep
   "This is some text inside of a div block." until their inner String node is set.

## Deploying a change

Tag pushes hang through the session proxy and API tag creation is refused, so releases
pin jsDelivr to the **full commit SHA** (immutable, so the SRI stays valid forever).

1. Edit `work-filter.js`, bump the version in the header and in `window.yfWorkFilter`.
2. Commit and push to `main`. Note the full SHA.
3. SRI: `openssl dgst -sha384 -binary work-filter.js | openssl base64 -A`
   and check it against what jsDelivr serves for that SHA.
4. In Webflow, register a new version of `yf_work_filter` with the new URL and hash, and
   apply that version to the Work page footer.
5. Publish to **staging** and check: search bar opens the panel, counts, peek on hover,
   breadcrumb, reset, URL reload, list view, empty state, 375px and 768px, console.

If the hash doesn't match the served bytes the browser refuses the script and the filter
silently doesn't load.

## Current version

See the YF Builds row or `git log`; the registered script is pinned to the commit that
bumped `version` in `window.yfWorkFilter`.

## History

- 2026-10-28 (Webflow only, script unchanged) — list view hover follows Z's directional
  demo: a full-row fill in the brand colour (row link `::after`, `--yfl-c`) scales in
  from the edge the pointer enters by and retracts toward the edge it leaves by
  (`--yfl-o`, set in the list view embed's script). The thumbnail tile stays as it was;
  the old clip-path flood out of the tile is gone.
- 2026-10-27 (Webflow only, script unchanged) — restyled to Z's Figma (YF Website 2026 — For
  Zia, node 4967:23963): soft filled 430px search pill (no border), regular-weight count,
  light sentence-case Reset, grid/list as a pale track with a yellow knob, active chips on
  their own line under the search; nav language switcher as globe + EN + chevron. Icons are
  the Figma SVGs as mask-image classes (yfwrk-search-icon, yfwrk-reset-icon,
  yfwrk-viewicon-grid / -list, yfnav-langchev).
- 2026-10-27 (Webflow only, script unchanged) — search moved from the nav into the filter
  row under the nav, restyled as the 1px pill; grid/list toggle sits beside it; panel drops
  below the row; nav is identical on every page again.
- v2.1.1 (2026-10-26) — only the visible search field opens the panel; the nav search is a
  slim underline field beside the nav links (no box, no thick lines); peek dims without an
  outline.
- v2.1.0 (2026-10-26) — Work Mosaic interaction: nav search bar opens a six-column filter
  panel; option hover peeks the matching tiles. Replaces the v2.0 dropdown pills (Z: "search
  bar, not drop down pills").
- v2.0.1 (2026-10-26) — every `[data-yf-reset]` is bound (breadcrumb + empty state).
- v2.0.0 (2026-10-26) — six facets, native Webflow UI, nav search, breadcrumb, URL state,
  GA4; grid engine moved here from the Work page footer.
- v1.0.0 (2026-08-31) — search-and-panel port of Work Mosaic (BB). Superseded.

Built from ZF-PC. Registry entry: Notion → Claude Knowledge Base → YF Builds.
