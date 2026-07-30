# Concierge audio

Generated clips live here as `<key>.mp3`, one per entry in
[`../voice-lines.js`](../voice-lines.js). They are committed so the demo is
self-contained — the page fetches them as static assets and never calls
ElevenLabs at runtime.

To render them:

```
ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node tools/generate-voice.mjs
```

`.manifest.json` records a hash of the inputs behind each clip. Edit a line in
`voice-lines.js` and the next run re-renders only that one. See the header of
`tools/generate-voice.mjs` for flags and voice-tuning env vars.

If a clip is missing the page still plays through — it holds an estimated beat
where the line would have been, so the pacing survives.
