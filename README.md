# yf-work-filter

The grid and filter behind **yfkk.co/work**: the bento grid, the progressive reveal,
six filters (Solution, Tactic, Industry, Region, Company, Year), search from the nav,
live counts, a breadcrumb row that always says what you are looking at, and an empty
state with its own reset.

One file, no dependencies, no build step: `work-filter.js`.

## Why this is a repo and not page code

Webflow caps page-level custom code at **10,000 characters**, and the page-code endpoint
rejects `<script>` from the API. The script is past the cap and its comments are the only
record of several hard-won fixes. Hosting it here removes the cap, puts it in version
control, and makes changes reviewable as diffs.

## How it is wired (v2)

Everything you can see is a native Webflow element with a real class bound to variables,
so the Designer canvas matches the live page. The script only reads, clones and toggles.

| Piece | Where it lives |
|---|---|
| `work-filter.js` | this repo → jsDelivr (pinned to a **commit SHA**) → registered hosted script `yf_work_filter`, Work page footer |
| Filter bar, dropdowns, breadcrumb row, empty state | Native elements on the Work page (`yfwrk-f*`, `yfwrk-crumb*`, `yfwrk-reset*`, `yfwrk-empty`) |
| Nav search | Native block inside **Z Nav Bar (mobile)**, shown only where the instance prop **Show Work search** is on (Work page only) |
| States CSS (open, selected, dimmed, hover, focus, empty, phone tweaks) | HTML Embed on the Work page, named "Work Filter Code (states: …)" |
| Facet data | The CMS-bound elements already inside every card (added for the list view) |

The old inline footer script and the v1 nav embed are gone.

## Webflow references

- Site `[ZF] YF Agency` — `69dc81709c46348ec3a99eca`
- Page Work — `69dc81709c46348ec3a99ebd`
- Component Z Nav Bar (mobile) — `2a368872-14e6-5f49-83e9-7b1280360657`, prop *Show Work search*
- Collection Projects — `69dc81709c46348ec3a99f64`
- Staging: `yf2025-b2e129e09a76cdd78ea8ab6b1a04d750.webflow.io/work` (staging only; production publishing is Z's call)

## The DOM contract

```
#work-grid > .w-dyn-items > .w-dyn-item          one card per project
[data-workfilter]                                 the filter bar
  [data-yf-facet="solution|tactic|industry|region|company|year"]
    [data-yf-facet-n]                             selected-count badge on the toggle
    [data-yf-template="option"]                   cloned once per value
      [data-yf-opt-label] [data-yf-opt-n] [data-yf-opt-mark]
  [data-yf-crumbs]                                breadcrumb row
    [data-yf-count-shown] [data-yf-count-sep] [data-yf-count-total]
    [data-yf-template="crumb"] > [data-yf-crumb-label]
[data-yf-reset]                                   any number (breadcrumb + empty state)
[data-yf-search]                                  nav search (one only)
  [data-yf-search-toggle] [data-yf-search-field] [data-yf-search-input] [data-yf-search-close]
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
5. Publish to **staging** and check: counts, dropdowns, breadcrumb, reset, search, URL
   reload, list view, empty state, 375px and 768px, console.

If the hash doesn't match the served bytes the browser refuses the script and the filter
silently doesn't load.

## Current version

- `v2.0.1` — commit `73b8a93116a173385e962dad6ddb13608321e138`
- SRI: `sha384-iniqliIAXiA5oy4qvLXG82Ra7JvWJ4jO5dAyVT/+SZQXlBoNWfEGo3pPOZaYYnDx`
- `https://cdn.jsdelivr.net/gh/yfagency/yf-work-filter@73b8a93116a173385e962dad6ddb13608321e138/work-filter.js`

## History

- v2.0.1 (2026-10-26) — every `[data-yf-reset]` is bound (breadcrumb + empty state).
- v2.0.0 (2026-10-26) — six facets, native Webflow UI, nav search, breadcrumb, URL state,
  GA4; grid engine moved here from the Work page footer.
- v1.0.0 (2026-08-31) — search-and-panel port of Work Mosaic (BB). Superseded.

Built from ZF-PC. Registry entry: Notion → Claude Knowledge Base → YF Builds.
