#!/usr/bin/env node
/**
 * Render the Voyage concierge lines to audio with ElevenLabs.
 *
 *   ELEVENLABS_API_KEY=...  ELEVENLABS_VOICE_ID=...  node tools/generate-voice.mjs
 *
 * Reads public/voyage/voice-lines.js and writes public/voyage/audio/<key>.mp3.
 * A side-car manifest records a hash of everything that shapes each clip (text,
 * neighbouring lines, voice, model, format, settings), so a re-run only spends
 * credits on lines that actually changed. Nothing else is touched.
 *
 * Flags
 *   --force            re-render every line, ignoring the manifest
 *   --only=a,b         re-render just these keys
 *   --dry-run          show what would be rendered, call nothing
 *   --list             print every key and its text, then exit
 *
 * Env
 *   ELEVENLABS_API_KEY        required
 *   ELEVENLABS_VOICE_ID       required — the concierge voice
 *   ELEVENLABS_MODEL_ID       default eleven_multilingual_v2
 *   ELEVENLABS_OUTPUT_FORMAT  default mp3_44100_128
 *   ELEVENLABS_SEED           optional integer, for reproducible renders
 *   ELEVENLABS_STABILITY / _SIMILARITY / _STYLE / _SPEED   optional numbers
 *
 * No dependencies — Node 18+ (native fetch).
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LINES_FILE = join(ROOT, "public", "voyage", "voice-lines.js");
const AUDIO_DIR = join(ROOT, "public", "voyage", "audio");
const MANIFEST_FILE = join(AUDIO_DIR, ".manifest.json");

// Overridable so the request shape can be exercised against a local stub.
const API_ROOT = process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io/v1";

/* ---- args ---- */
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const valueOf = name => {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const FORCE = has("--force");
const DRY_RUN = has("--dry-run");
const LIST = has("--list");
const ONLY = (valueOf("only") || "").split(",").map(s => s.trim()).filter(Boolean);

/* ---- config ---- */
const num = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number, got "${raw}"`);
  return n;
};
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
const SEED = process.env.ELEVENLABS_SEED ? Number(process.env.ELEVENLABS_SEED) : null;
const VOICE_SETTINGS = {
  stability: num("ELEVENLABS_STABILITY", 0.45),
  similarity_boost: num("ELEVENLABS_SIMILARITY", 0.8),
  style: num("ELEVENLABS_STYLE", 0.25),
  speed: num("ELEVENLABS_SPEED", 1.0),
  use_speaker_boost: true
};

/**
 * Load the manifest. It is plain ESM but lives in a directory with no
 * package.json, so Node would otherwise try to read it as CommonJS and choke
 * on `export`. Importing the source through a data: URL forces module parsing
 * and keeps the browser copy a plain `.js` that any static host will serve
 * correctly. The file has no imports of its own, so nothing else is affected.
 */
async function loadLines() {
  const source = await readFile(LINES_FILE, "utf8");
  const url = "data:text/javascript;base64," + Buffer.from(source, "utf8").toString("base64");
  return import(url);
}

function hashFor({ text, previous_text, next_text }) {
  return createHash("sha256")
    .update(JSON.stringify({
      text, previous_text, next_text,
      voice: VOICE_ID, model: MODEL_ID, format: OUTPUT_FORMAT,
      settings: VOICE_SETTINGS, seed: SEED
    }))
    .digest("hex")
    .slice(0, 16);
}

async function readManifest() {
  if (!existsSync(MANIFEST_FILE)) return {};
  try {
    return JSON.parse(await readFile(MANIFEST_FILE, "utf8"));
  } catch {
    console.warn("! manifest unreadable, treating every clip as stale");
    return {};
  }
}

/**
 * Best-effort look-up of the voice, purely so its name can be shown before any
 * credits are spent. Advisory only, never fatal: ElevenLabs keys carry granular
 * permissions, and a key scoped to text-to-speech alone cannot read /voices
 * while still rendering perfectly. The real test is the first line, which
 * aborts the run on failure.
 */
async function preflight() {
  let res;
  try {
    res = await fetch(`${API_ROOT}/voices/${encodeURIComponent(VOICE_ID)}`, {
      headers: { "xi-api-key": API_KEY }
    });
  } catch (err) {
    return { ok: false, reason: `could not reach ${API_ROOT} (${err.message})` };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: "this key can't read the voice list — fine if it's scoped to text-to-speech" };
  }
  if (res.status === 400 || res.status === 404) {
    return { ok: false, reason: `the API doesn't recognise voice "${VOICE_ID}"` };
  }
  if (!res.ok) return { ok: false, reason: `${res.status} ${res.statusText} from /voices` };
  const voice = await res.json().catch(() => ({}));
  return { ok: true, name: voice.name || VOICE_ID };
}

async function render(key, body) {
  const url = `${API_ROOT}/text-to-speech/${encodeURIComponent(VOICE_ID)}?output_format=${encodeURIComponent(OUTPUT_FORMAT)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 300)}` : ""}`);
    err.status = res.status;
    throw err;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!bytes.length) throw new Error("empty response body");
  await writeFile(join(AUDIO_DIR, `${key}.mp3`), bytes);
  return bytes.length;
}

async function main() {
  const { VOICE_LINES, voiceContext } = await loadLines();

  if (LIST) {
    for (const l of VOICE_LINES) console.log(`${l.key.padEnd(18)} ${l.text}`);
    console.log(`\n${VOICE_LINES.length} lines`);
    return 0;
  }

  if (ONLY.length) {
    const known = new Set(VOICE_LINES.map(l => l.key));
    const bad = ONLY.filter(k => !known.has(k));
    if (bad.length) {
      console.error(`Unknown key(s): ${bad.join(", ")}`);
      return 1;
    }
  }
  if (!DRY_RUN && (!API_KEY || !VOICE_ID)) {
    console.error("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (see the header of this file).");
    return 1;
  }

  await mkdir(AUDIO_DIR, { recursive: true });
  const manifest = await readManifest();

  const jobs = VOICE_LINES
    .filter(l => !ONLY.length || ONLY.includes(l.key))
    .map(l => {
      const ctx = voiceContext(l.key);
      const body = {
        text: l.text,
        model_id: MODEL_ID,
        voice_settings: VOICE_SETTINGS,
        ...(ctx.previous_text ? { previous_text: ctx.previous_text } : {}),
        ...(ctx.next_text ? { next_text: ctx.next_text } : {}),
        ...(SEED !== null ? { seed: SEED } : {})
      };
      const hash = hashFor(body);
      const fileExists = existsSync(join(AUDIO_DIR, `${l.key}.mp3`));
      const stale = FORCE || !fileExists || manifest[l.key]?.hash !== hash;
      return { key: l.key, body, hash, stale };
    });

  const todo = jobs.filter(j => j.stale);
  const fresh = jobs.length - todo.length;
  console.log(`${jobs.length} line(s) · ${fresh} up to date · ${todo.length} to render`);
  console.log(`voice ${VOICE_ID || "(unset)"} · model ${MODEL_ID} · ${OUTPUT_FORMAT}\n`);

  if (DRY_RUN) {
    for (const j of todo) console.log(`  would render  ${j.key}`);
    return 0;
  }
  if (!todo.length) {
    console.log("Nothing to do.");
    return 0;
  }

  const pre = await preflight();
  console.log(pre.ok ? `voice checks out: ${pre.name}\n` : `note: ${pre.reason}\n`);

  const failures = [];
  let aborted = null, rendered = 0;
  for (const [i, job] of todo.entries()) {
    const label = `[${i + 1}/${todo.length}] ${job.key}`;
    try {
      const size = await render(job.key, job.body);
      manifest[job.key] = { hash: job.hash, model: MODEL_ID, voice: VOICE_ID, bytes: size };
      rendered++;
      console.log(`  ok  ${label} — ${(size / 1024).toFixed(0)} KB`);
    } catch (err) {
      failures.push({ key: job.key, message: err.message });
      console.error(`  FAIL ${label} — ${err.message}`);
      // Some failures are systemic rather than about this line, and repeating
      // them 28 times only buries the cause. Stop on those.
      if ([401, 403].includes(err.status)) {
        aborted = "ELEVENLABS_API_KEY was rejected. Check the key is real and not a placeholder.";
      } else if (err.status === 429) {
        aborted = "Rate limited or out of credits. Wait, then re-run — finished clips are kept.";
      } else if (rendered === 0) {
        // Nothing has worked yet, so assume the setup is wrong, not the line.
        aborted = "First line failed, so this looks like a setup problem rather than one bad line.";
      }
      if (aborted) break;
    }
    // Write as we go, so an interrupted run doesn't re-bill finished clips.
    await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
    if (i < todo.length - 1) await new Promise(r => setTimeout(r, 350));
  }

  if (aborted) {
    const attempted = rendered + failures.length;
    console.error(`\nStopped after ${attempted} of ${todo.length} — ${rendered} rendered. ${aborted}`);
    return 1;
  }
  console.log(`\nDone — ${rendered} rendered, ${failures.length} failed.`);
  return failures.length ? 1 : 0;
}

// Set exitCode rather than calling process.exit(): a hard exit tears down live
// keep-alive sockets mid-flight, which trips a libuv assertion on Windows.
main().then(
  code => { process.exitCode = code; },
  err => { console.error(err); process.exitCode = 1; }
);
