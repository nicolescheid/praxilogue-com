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
- `wrangler.jsonc` — Cloudflare Worker config, apex custom domain
