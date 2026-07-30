# praxilogue.com

The studio site for [praxilogue.com](https://praxilogue.com): a single-page record of
the practice — methodologies, projects, and the thinking behind them. Static,
no build step, served by a **Cloudflare Worker** (Workers Static Assets).

This is the practice record. The conversational-AI experiments themselves
(Adelaide, Ask Nicole, the Qantas concierge) live in the separate `praxilogue`
monorepo, deployed under nicolescheid.com.

## Edit & deploy

The site is `public/index.html`, `public/styles.css`, `public/script.js` — no
build step. Edit and `git push`; Cloudflare runs `npx wrangler deploy` (per
`wrangler.jsonc`) and serves everything in `public/`.

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
- `public/decagon/` — Voyage, the scripted travel-concierge journey simulator,
  published at `/decagon` (see below)
- `tools/generate-voice.mjs` — renders the Voyage concierge lines to audio
- `wrangler.jsonc` — Cloudflare Worker config, apex custom domain

## Voyage (`/decagon`)

A scripted two-chapter travel-concierge demo. Every concierge line is fixed, so
the voice is **pre-generated with ElevenLabs and played back by key** — no
speech API, no runtime API calls, same voice for every visitor.

- `public/decagon/index.html` — the simulator
- `public/decagon/voice-lines.js` — the concierge script: one stable key per
  line, plus the spoken wording. Shared by the page and the generator.
- `public/decagon/audio/<key>.mp3` — the rendered clips, committed

Re-render after editing a line (only changed lines cost credits):

```bash
ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node tools/generate-voice.mjs
```

`--list`, `--dry-run`, `--only=key`, and `--force` are supported; voice tuning
is via env vars documented in the script header.

Two things to keep in mind when editing the page:

- Paths to `voice-lines.js` and `audio/` are **root-absolute** (`/decagon/...`).
  Cloudflare serves this page at both `/decagon` and `/decagon/`, and relative
  paths break on the first form.
- If a clip is missing the demo still plays — it holds an estimated beat where
  the line would be, so pacing survives a partial render.
