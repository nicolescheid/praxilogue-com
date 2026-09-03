# praxilogue.com

The studio site for [praxilogue.com](https://praxilogue.com): a single-page record of
the practice — methodologies, projects, and the thinking behind them. Static,
no build step, served by a **Cloudflare Worker** (Workers Static Assets).

This is the practice record. The conversational-AI experiments themselves
(Adelaide, Ask Nicole, the Qantas concierge) live in the separate `praxilogue`
monorepo, deployed under nicolescheid.com.

## Edit & deploy

The site is `public/index.html`, `public/styles.css`, `public/script.js` — no
build step. Edit, then deploy by hand:

```
npx wrangler deploy
```

There is **no git integration and no CI**: pushing to GitHub stores the change
but publishes nothing. `wrangler deploy` reads `wrangler.jsonc` and uploads
everything in `public/`. Push for history, deploy to publish — they are two
separate steps.

## Local preview

```
npx serve public
```

## Structure

- `public/index.html` — content and structure
- `public/styles.css` — design tokens (dual type system: Fraunces for prose,
  IBM Plex Mono for structural chrome), layout, both color themes
- `public/script.js` — rail progress, section counter, reveal-on-scroll,
  magnetic hover on project rows
- `public/favicon.svg` — the ∴ mark
- `public/valence/index.html` — Valence, the interactive day/night poem,
  published at `/valence`
- `public/voyage/` — Voyage, the scripted travel-concierge journey simulator,
  published at `/voyage` (see below)
- `public/critical/index.html` — Thinking is Critical, Module 2 (Addressing
  Biases), published at `/critical` (see below)
- `tools/generate-voice.mjs` — renders the Voyage concierge lines to audio
- `public/_redirects` — static-asset redirects; currently just the old
  `/decagon` path pointing at `/voyage`
- `wrangler.jsonc` — Cloudflare Worker config, apex custom domain

## Voyage (`/voyage`)

A scripted two-chapter travel-concierge demo. Every concierge line is fixed, so
the voice is **pre-generated with ElevenLabs and played back by key** — no
speech API, no runtime API calls, same voice for every visitor.

- `public/voyage/index.html` — the simulator
- `public/voyage/voice-lines.js` — the concierge script: one stable key per
  line, plus the spoken wording. Shared by the page and the generator.
- `public/voyage/audio/<key>.mp3` — the rendered clips, committed

It was first published at `/decagon`, named for the job it was built for. The
path is now neutral so the piece can be reused; `/decagon` 301s to `/voyage`
via `public/_redirects`, so links already sent out still land.

Re-render after editing a line (only changed lines cost credits):

```bash
ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node tools/generate-voice.mjs
```

`--list`, `--dry-run`, `--only=key`, and `--force` are supported; voice tuning
is via env vars documented in the script header.

Two things to keep in mind when editing the page:

- Paths to `voice-lines.js` and `audio/` are **root-absolute** (`/voyage/...`).
  Cloudflare serves this page at both `/voyage` and `/voyage/`, and relative
  paths break on the first form.
- If a clip is missing the demo still plays — it holds an estimated beat where
  the line would be, so pacing survives a partial render.

## Thinking is Critical (`/critical`)

Module 2 of a short course on the human half of working with AI. A single
self-contained page: prose with an interactive "lab" set into each section
(a question-phrasing highlighter, a mark-your-reading exercise that feeds a
scepticism bar chart, prompt builders, a load-bearing-claim picker, a
read-without-rebutting counter, and a closing card built from the reader's
own inputs).

- **V1 is entirely client-side.** No API calls; the labs are heuristics and
  scripted samples, and the page says so. Inputs persist in `localStorage`
  under `tic-m2-v1` so the closing card survives a reload. A later version
  puts a model behind each lab.
- Its own design (Newsreader / IBM Plex, light paper with a dark set via
  `prefers-color-scheme`), deliberately separate from the home page's scene
  deck. Only the favicon and the ∴ mark are shared.
- Favicon path is root-absolute (`/favicon.svg`) for the same `/critical`
  vs `/critical/` reason as Voyage.
