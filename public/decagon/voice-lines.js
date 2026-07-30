/**
 * Voyage — concierge voice lines.
 *
 * The demo is scripted, so every concierge line is fixed and known ahead of
 * time. Each one gets a stable key; `tools/generate-voice.mjs` renders these
 * through ElevenLabs into `audio/<key>.mp3`, and the page plays them by key.
 *
 * `text` is what the voice SAYS. The bubble text in index.html is what the
 * screen SHOWS — they differ deliberately: the spoken version drops emoji and
 * ✓ marks, and spells out times ("the seven thirty") so TTS reads them well.
 *
 * Array order is narrative order. The generator feeds each line's neighbours to
 * ElevenLabs as previous_text/next_text so prosody carries across the script.
 * Where a line is one of several branches, `prev`/`next` name the real
 * neighbours so a branch isn't given its sibling as context.
 *
 * Editing a `text` value changes its hash, and the generator re-renders just
 * that clip on the next run.
 */

export const VOICE_LINES = [
  /* ---- Chapter 1 · booking & departure ---- */
  {
    key: "greeting",
    text: "Morning, Alex. Where are we headed?"
  },
  {
    key: "ask-where-when",
    text: "On it — where to, and when?"
  },
  {
    key: "friday-options",
    text: "Here's what's open Friday morning."
  },

  // Branch: whichever flight the viewer taps.
  {
    key: "flight-0730",
    text: "Nice — the seven thirty is held and booked, seat 14C.",
    next: "car-question"
  },
  {
    key: "flight-1115",
    text: "Nice — the eleven fifteen is held and booked, seat 14C.",
    prev: "friday-options",
    next: "car-question"
  },

  {
    key: "car-question",
    text: "You land at 9:05am. Your usual airport taxi's already set — and I know Avis is your preferred car brand, so which vehicle type would you like for this trip?",
    prev: "friday-options"
  },

  // Branch: whichever car the viewer selects.
  {
    key: "car-standard",
    text: "Done — Corporate Cabs for Friday morning, and your Standard Car waiting on arrival in Adelaide.",
    next: "hotel"
  },
  {
    key: "car-fullsize",
    text: "Done — Corporate Cabs for Friday morning, and your Fullsize Car waiting on arrival in Adelaide.",
    prev: "car-question",
    next: "hotel"
  },
  {
    key: "car-suv",
    text: "Done — Corporate Cabs for Friday morning, and your Fullsize SUV waiting on arrival in Adelaide.",
    prev: "car-question",
    next: "hotel"
  },

  {
    key: "hotel",
    text: "And I've booked your preferred Adelaide accommodation — a Garden Room at the Hilton, King bed.",
    prev: "car-question"
  },
  {
    key: "all-set",
    text: "That's flight, ride, car, and a room — all set. I'll check you in before you fly."
  },
  {
    key: "checkin-offer",
    text: "Check-in just opened for tomorrow. Want me to check you in and hold 14C?"
  },
  {
    key: "checked-in",
    text: "Checked in. Boarding pass is on your phone, ready to go."
  },
  {
    key: "notif-taxi",
    text: "Your taxi is on its way, arriving at your door in about 20 minutes."
  },
  {
    key: "taxi-tracking",
    text: "Your taxi's about 20 minutes out — I'll track it live. Have a great trip; I'll be here in Adelaide."
  },

  /* ---- Chapter 2 · the extended trip ---- */

  // Branch: chapter 2 opens cold (jumped to via the Ch 2 tab) or continues on
  // from chapter 1.
  {
    key: "ch2-welcome",
    text: "Welcome to Adelaide, Alex — car's collected, you're checked in for Sunday. What's up?",
    prev: null,
    next: "rebook-offer"
  },
  {
    key: "ch2-continue",
    text: "Enjoying Adelaide? Two days in — anything you need?",
    prev: "taxi-tracking",
    next: "rebook-offer"
  },

  {
    key: "rebook-offer",
    text: "Love that. Want me to move your Sunday flight to Monday evening so you get the full weekend?",
    prev: "ch2-welcome"
  },
  {
    key: "rebooked",
    text: "Rebooked — here's the change."
  },
  {
    key: "extended",
    text: "I've also updated your booking with Avis and extended your hotel stay, so nothing lapses over the extra nights."
  },
  {
    key: "bag-offer",
    text: "One thought — if you're shopping all weekend, want me to add an extra bag for the trip home, so you're not caught out at the gate?"
  },
  {
    key: "bag-added",
    text: "Added. Extra bag on VY603 Monday. Go enjoy the weekend."
  },
  {
    key: "to-airport",
    text: "Time to head to the airport. Your rental's due back, and your flight leaves at 6:05pm. I'll take you door to gate — starting directions now."
  },

  /* ---- Chapter 2 finale · turn-by-turn map guidance ---- */
  {
    key: "map-1",
    text: "Return your rental. Follow the Avis return lane, straight ahead."
  },
  {
    key: "map-2",
    text: "Bay A-12, free return parking. Closest return bay to the Terminal 1 entrance."
  },
  {
    key: "map-3",
    text: "Bag drop, right inside. Terminal 1 entry — your extra bag is pre-tagged."
  },
  {
    key: "map-4",
    text: "The Lounge, level 2. Up the escalator — you're early, relax before boarding."
  },
  {
    key: "lounge",
    text: "You're at the Lounge — checked in, bags dropped, car returned, an hour to spare. Boarding's gate 14 at 5:35. Safe flight home, Alex."
  }
];

/** key -> spoken text. What the page uses at runtime. */
export const VOICE_TEXT = Object.fromEntries(
  VOICE_LINES.map(l => [l.key, l.text])
);

/**
 * key -> { previous_text, next_text } for ElevenLabs prosody continuity.
 * Defaults to array neighbours; `prev`/`next` on a line override that, and an
 * explicit `null` means "no context on that side".
 */
export function voiceContext(key) {
  const i = VOICE_LINES.findIndex(l => l.key === key);
  if (i < 0) return {};
  const line = VOICE_LINES[i];
  const resolve = (side, fallback) => {
    if (!(side in line)) return fallback ? fallback.text : undefined;
    if (line[side] === null) return undefined;
    const found = VOICE_LINES.find(l => l.key === line[side]);
    return found ? found.text : undefined;
  };
  return {
    previous_text: resolve("prev", VOICE_LINES[i - 1]),
    next_text: resolve("next", VOICE_LINES[i + 1])
  };
}
