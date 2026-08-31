# yf-work-filter

The search and filter behaviour behind **yfkk.co/work** — the bento grid, the
progressive reveal, and the search / Solution / Year filter that lives in the nav bar.

One file, no dependencies, no build step: `work-filter.js`.

## Why this is a repo and not page code

Webflow caps page-level custom code at **10,000 characters**. This script is past it,
and shaving it to fit meant deleting comments that are the only record of two hard-won
fixes (the phantom empty cell, and the 3-chip trap). Hosting it here removes the cap,
puts the script in version control, and makes changes reviewable as diffs.

Served through jsDelivr, pinned to a tag. The site already loads Finsweet Attributes
from `cdn.jsdelivr.net`, so the host is proven on this site.

## How it is wired

Three pieces, in three places. All three have to agree.

| Piece | Where it lives |
|---|---|
| `work-filter.js` | this repo → jsDelivr → registered hosted script on the Work page |
| Search field + filter panel markup and CSS | HTML Embed inside the **Z Nav Bar (mobile)** component |
| `data-year` / `data-sol` attribute bindings | Designer, on the Work page's Collection Items |

`nav-embed.html` in this repo is a **copy for reference** of the markup pasted into the
Webflow embed. Webflow is the source of truth; if you change one, change both.

## Webflow references

- Site `[ZF] YF Agency` — `69dc81709c46348ec3a99eca`
- Page Work — `69dc81709c46348ec3a99ebd`
- Component Z Nav Bar (mobile) — `2a368872-14e6-5f49-83e9-7b1280360657`
- Collection Projects — `69dc81709c46348ec3a99f64`

## The DOM contract

The script reads what the Collection List renders. It needs:

```html
<div id="work-grid">
  <div class="w-dyn-items">
    <div class="w-dyn-item" data-year="2026">          <!-- Projects → Year -->
      <a><div class="workprojectoverlay"></div>
         <h4 class="projecttitle">…</h4></a>
      <div class="yfwrk-cardsols"><div class="w-dyn-items">
        <div class="w-dyn-item" data-sol="content"></div>   <!-- Solutions → Slug -->
        <div class="w-dyn-item" data-sol="event"></div>
      </div></div>
    </div>
  </div>
</div>
```

Break any of those selectors and the script degrades quietly rather than erroring —
`if(!wrap)return` at the top, and a card with no readable facets simply never matches a
filter. Worth knowing when debugging "the filter shows nothing".

## Filter semantics

**OR inside a category, AND across categories.** Brand + Digital gives you either; add
2026 and you get (Brand OR Digital) AND 2026. Solution matching covers every solution on
a project, not just the first, so a Campaign/Event project appears under both.

Option counts deliberately **ignore their own category**, so each number says what
clicking that option would actually give you rather than what is already on screen.

## Two traps

1. **Keep the nested Solutions collection limit at 100.** The 3-chip cap on the tiles is
   `display:none`, not a collection limit — `querySelectorAll` still finds hidden
   elements, which is how a project's fourth solution stays filterable. Cap the
   collection and solutions four and up silently vanish from the filter while the counts
   drift out of step with the tiles.

2. **The panel and scrim must end up on `<body>`.** The embed ships them inside
   `.ZNavBar`, whose stacking context puts the scrim *over* the search field — with the
   panel open you cannot click the input or Clear. The script reparents both on init.
   Don't "tidy" that away.

## Location filter

Off, via `SHOW_LOC` at the top of the file. `Projects → country` is set on 16 of 78
records; a Location filter against that hides ~80% of the portfolio the moment anyone
uses it. Populate the field, then flip the flag — the column, options and counts are
already built and derive themselves from the data.

## Deploying a change

1. Edit `work-filter.js`, commit, tag (`v1.1.0`).
2. Recompute the SRI hash:
   `openssl dgst -sha384 -binary work-filter.js | openssl base64 -A`
3. In Webflow, update the registered script's version, hosted URL and integrity hash.
4. Publish the site.

The integrity hash pins the exact bytes — if it doesn't match what jsDelivr serves the
browser refuses the script and the filter silently doesn't load. Always update the hash
and the tag together.

## Current version

- Tag: `v1.0.0`
- SRI: `sha384-RhlkwtyAyAgRROuG3tEeS0sqSdc7G/n0FlorXU7kT2KmaKCUmT5fFrDOXzLdTmny`
- jsDelivr: `https://cdn.jsdelivr.net/gh/yfagency/yf-work-filter@v1.0.0/work-filter.js`

## Provenance

The search-and-panel interaction is ported from **Work Mosaic**
(`github.com/yfagency/work-mosaic`, builder BB) — a single-file prototype recovered from
a Netlify deploy. Its `match()` semantics and three-column panel are reproduced here; its
tile mosaic is not, because the Work page's own grid engine is further along.

Built 2026-08-31 from ZF-PC. Registry entry: Notion → Claude Knowledge Base → YF Builds.
