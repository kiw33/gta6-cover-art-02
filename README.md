# Vice Cover Studio — GTA 6-style cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kiw33/gta6-cover-art-02/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kiw33/gta6-cover-art-02/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Studio turns any photo and a caption into GTA 6-style poster
cover art: a multi-panel layout, a Vice City sunset or neon grade, and
bold outlined lettering, exported as a share-ready PNG. It runs entirely
offline in a desktop browser — the app is plain static files under `app/`,
and your photos never leave your machine. Built by an AI agent for
make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome. No build step, no
install, no network: open the page and start with the sample photos, or
drop in your own.

## What it does

- **Any photo** — file picker or drag-and-drop onto a panel; each panel
  holds its own photo, or one photo can fill every panel.
- **Crop per panel** — click a panel to select it, then zoom and pan it
  into place with sliders, dragging, or the scroll wheel.
- **Four layouts** — Hero + 3, 2 × 2 grid, full bleed, and tilted snapshots.
- **Four grades** — Vice Sunset, Neon Nights, Palm Noir, Pastel Vice.
- **Caption** — big title, subtitle and tagline, lettered in Anton with a
  sunset gradient and a dark outline.
- **Export** — one click writes a PNG at 1080 × 1080, 1080 × 1350 or
  1920 × 1080.

## Files

- `app/index.html` — the editor page: preview stage plus the photo, panel,
  caption, layout, grade and export controls.
- `app/style.css` — the neon editor theme and the Anton `@font-face`
  (the font ships under `app/fonts/` under the SIL Open Font License).
- `app/src/render.js` — the cover engine: panel geometry, cover-fit photo
  drawing with zoom and pan, the four colour grades, vignette and grain,
  and the outlined gradient caption. The preview and the export share this
  one code path, so what you see is what the PNG holds.
- `app/src/editor.js` — the editor wiring: uploads, drag-and-drop, crop
  controls, sample photos, export, and the `?shot=` scenes.
- `app/samples/` — three sample photos to try the studio with.
- `main.ts` — the entry program (Node 22, standard library only): copies
  `app/` and `screenshots/` to the output directory and writes
  `dossier.json` with the vendored make.fun library.
- `screenshots/` — four screenshots of the app at work, taken with
  headless Chromium from the `?shot=` scenes.

## How it works

1. Add your photo with the button or by dragging it onto a panel — or
   start from a sample.
2. Pick a layout: Hero + 3, 2 × 2 grid, full bleed, or tilted snapshots.
3. Click a panel to select it, then zoom and pan the photo into place.
   One photo can fill every panel, or each panel can hold a different one.
4. Edit the big title, subtitle and tagline, and pick a colour grade.
5. Choose a post size and hit Export PNG.

## Screenshot scenes

- `?shot=cover` draws the exported 1920 × 1080 cover full-frame.
- `?shot=cover-portrait` draws the 1080 × 1350 cover full-frame.
- `?shot=cover-square` draws the 1080 × 1080 cover full-frame.
- `?shot=editor` opens the editor with the sample photos loaded.

## Notes

- Everything is original: no Rockstar Games logo, wordmark, artwork,
  character or font anywhere in the app. The only font is Anton,
  licensed under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
- The app works fully offline once served; it makes no network requests.
