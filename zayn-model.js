/* zayn-model.js — Zayn's adaptive-curriculum brain.
   Pure functions take the model as an argument (Node-testable). The load/save
   wrappers touch localStorage (browser only). Works as a browser global
   (window.ZaynModel) and a Node module (module.exports). */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ZaynModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'zayn_model';
  const CORRUPT_KEY = 'zayn_model_corrupt';
  const DOB = '2025-04-01';
  const CHOICES_BY_STATUS = { new: 2, working: 3, mastered: 4 };
  const THEME_STAGE = {
    animals: 1, food: 1, body: 1, colors: 1,
    home: 2, go: 2, nature: 2, arabic: 2,
    abc: 3, huruf: 3,
    numbers: 4, shapes: 4,
    arabicnumbers: 5,
  };
  const PILLARS = ['Language', 'Wonder', 'Roots & Faith', 'Heart & Hands'];

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function defaultModel() {
    return { v: 1, dob: DOB, stageOverride: null, unlocks: {}, items: {}, themes: {},
             week: null, // cached weekly plan {weekKey, stage, days[]} — set by generateWeek (Task 2)
             simple: false, updatedTs: 0 };
  }

  function monthsOld(nowMs, dob) {
    const d = new Date(dob), n = new Date(nowMs);
    return (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth())
           - (n.getDate() < d.getDate() ? 1 : 0);
  }
  function ageStage(nowMs, dob) {
    const m = monthsOld(nowMs, dob || DOB);
    return m < 18 ? 1 : m < 24 ? 2 : m < 36 ? 3 : m < 48 ? 4 : 5;
  }

  function themeMastery(model, id) { const t = model.themes[id]; return t ? t.mastery : 0; }
  function themeStatus(model, id) {
    const t = model.themes[id];
    if (!t || t.attempts === 0) return 'new';
    return t.mastery > 0.70 ? 'mastered' : t.mastery >= 0.34 ? 'working' : 'new';
  }
  function stageThemes(stage) { return Object.keys(THEME_STAGE).filter(id => THEME_STAGE[id] === stage); }
  function stageMastered(model, stage) {
    const ts = stageThemes(stage); if (!ts.length) return false;
    return ts.filter(id => themeMastery(model, id) > 0.70).length / ts.length >= 0.75;
  }
  function autoStage(model, nowMs) {
    let s = ageStage(nowMs, model.dob);
    while (s < 5 && stageMastered(model, s)) s++;
    return s;
  }
  function effectiveStage(model, nowMs) {
    return model.stageOverride != null ? clamp(model.stageOverride, 1, 5)
                                       : clamp(autoStage(model, nowMs), 1, 5);
  }
  function isUnlocked(model, id, nowMs) {
    return THEME_STAGE[id] <= effectiveStage(model, nowMs) || !!model.unlocks[id];
  }
  function unlockedThemes(model, nowMs) {
    return Object.keys(THEME_STAGE).filter(id => isUnlocked(model, id, nowMs));
  }
  function topInterests(model, n) {
    const byTheme = {};
    Object.keys(model.items).forEach(k => {
      const theme = k.slice(0, k.indexOf('-'));
      byTheme[theme] = (byTheme[theme] || 0) + model.items[k].taps;
    });
    return Object.keys(byTheme).sort((a, b) => byTheme[b] - byTheme[a]).slice(0, n || 3);
  }

  function recordTap(model, key, nowMs) {
    const it = model.items[key] || (model.items[key] = { taps: 0, lastTs: 0 });
    it.taps++; it.lastTs = nowMs; model.updatedTs = nowMs; return model;
  }
  function recordAnswer(model, themeId, correct, nowMs) {
    const t = model.themes[themeId] || (model.themes[themeId] = { seen: 0, correct: 0, attempts: 0, mastery: 0 });
    t.seen++; t.attempts++; if (correct) t.correct++;
    t.mastery = t.mastery * 0.7 + (correct ? 1 : 0) * 0.3;
    model.updatedTs = nowMs; return model;
  }
  function findChoices(model, themeId) { return CHOICES_BY_STATUS[themeStatus(model, themeId)]; }

  // A backup/restore payload must look like a real v1 model — not, say, a voice
  // pack ({created, clips}) — before we let it replace Zayn's progress.
  function isValidBackup(o) {
    return !!o && typeof o === 'object' && !Array.isArray(o)
      && o.v === 1
      && typeof o.items === 'object' && o.items !== null && !Array.isArray(o.items)
      && typeof o.themes === 'object' && o.themes !== null && !Array.isArray(o.themes);
  }

  function load() {
    let raw = null;
    try {
      raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return defaultModel();
      const merged = Object.assign(defaultModel(), JSON.parse(raw));
      // schema migrations live here, keyed on the stored version
      if (merged.v !== 1) { merged.v = 1; } // v1 is current; future versions migrate then set v
      return merged;
    } catch (e) {
      // one bad write must NOT silently wipe progress — stash the raw string so
      // it can be recovered (or mailed to a human) before starting fresh.
      try {
        if (typeof localStorage !== 'undefined' && raw) {
          localStorage.setItem(CORRUPT_KEY, JSON.stringify({ ts: Date.now(), raw: String(raw) }));
        }
      } catch (e2) {}
      if (typeof console !== 'undefined') {
        console.warn('zayn-model: stored model was unreadable — raw copy stashed to localStorage["' + CORRUPT_KEY + '"], starting from defaults.', e);
      }
      return defaultModel();
    }
  }
  let _saveT = null;
  function save(model) {
    try {
      if (typeof localStorage === 'undefined') return;
      clearTimeout(_saveT);
      _saveT = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); } catch (e) {} }, 500);
    } catch (e) {}
  }
  // immediate write — also cancels a pending debounced save (used by the
  // pagehide/visibilitychange flush so the last taps survive iOS suspending the PWA)
  function saveNow(model) { try { clearTimeout(_saveT); localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); } catch (e) {} }

  // ---- seeded RNG (deterministic per week) ----
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // fill {fav}/{working} placeholders from ctx with safe fallbacks
  function fill(str, ctx) {
    return str
      .replace(/\{fav\}/g, ctx.favLabel || 'something he loves')
      .replace(/\{favTheme\}/g, ctx.favTheme || 'his favorites')
      .replace(/\{working\}/g, ctx.workingLabel || 'a new word');
  }

  // each entry: { pillar, minStage, kind, emoji, title, detail }  (title/detail may use {fav}/{working})
  // INVARIANT: every pillar in PILLARS must have at least one minStage:1 entry, so the
  // per-pillar candidate pool in generateWeek is never empty at the stage floor (1).
  const ACTIVITY_BANK = [
    // Language
    { pillar: 'Language', minStage: 1, kind: 'real', emoji: '🗣️', title: 'Name three things', detail: 'On your walk, point at and name three things out loud together. Pause so he can try the word.' },
    { pillar: 'Language', minStage: 2, kind: 'real', emoji: '💬', title: 'Narrate lunch', detail: 'Say what you are doing as you make his food: "cutting the {working}…". Live narration grows vocabulary.' },
    { pillar: 'Language', minStage: 1, kind: 'app', emoji: '⭐', title: 'For Zayn session', detail: 'Open the ⭐ For Zayn tile and let him tap and hear 6 pictures.' },
    { pillar: 'Language', minStage: 1, kind: 'real', emoji: '📖', title: 'One book, twice', detail: 'Read one short board book, then read it again — repetition is how the words stick.' },
    // Wonder
    { pillar: 'Wonder', minStage: 1, kind: 'real', emoji: '💧', title: 'Water play', detail: 'Let him pour water between two cups at the sink. Talk about full and empty.' },
    { pillar: 'Wonder', minStage: 1, kind: 'real', emoji: '🔎', title: 'Find a {fav}', detail: 'Go on a hunt for a {fav} (or a picture of one) around the house and celebrate when he spots it.' },
    { pillar: 'Wonder', minStage: 2, kind: 'real', emoji: '🌳', title: 'Outside texture walk', detail: 'Touch a leaf, a rock, and grass. Name each and how it feels — soft, hard, bumpy.' },
    { pillar: 'Wonder', minStage: 1, kind: 'app', emoji: '🔎', title: 'Find It round', detail: 'Play one short Find It round in a theme he likes.' },
    // Roots & Faith
    { pillar: 'Roots & Faith', minStage: 1, kind: 'real', emoji: '🤲', title: 'Bismillah together', detail: 'Say "Bismillah" together before a meal today, slowly, so he hears the rhythm.' },
    { pillar: 'Roots & Faith', minStage: 1, kind: 'real', emoji: '🤝', title: 'Salaam greetings', detail: 'Greet each other with "As-salaamu alaykum" today and wave — link the word to the action.' },
    { pillar: 'Roots & Faith', minStage: 1, kind: 'real', emoji: '🌙', title: "Name Allah's creations", detail: 'On your walk, point to the sky, a tree, a bird and say "Allah made the…". Gentle wonder.' },
    { pillar: 'Roots & Faith', minStage: 2, kind: 'app', emoji: '☪️', title: 'Arabic first words', detail: 'Open the Arabic First Words theme and say a couple together.' },
    // Heart & Hands
    { pillar: 'Heart & Hands', minStage: 1, kind: 'real', emoji: '🎨', title: 'Scribble together', detail: 'Big paper, chunky crayon — let him scribble. Name the colors he grabs.' },
    { pillar: 'Heart & Hands', minStage: 1, kind: 'real', emoji: '🫶', title: 'Helper moment', detail: 'Give him one tiny job — drop socks in the basket — and thank him warmly. Builds belonging.' },
    { pillar: 'Heart & Hands', minStage: 3, kind: 'app', emoji: '✍️', title: 'Trace a letter', detail: 'Open Trace It and trace one letter together with the Pencil.' },
    { pillar: 'Heart & Hands', minStage: 1, kind: 'real', emoji: '🪩', title: 'Dance break', detail: 'One song, dance together, name body parts as you move — "hands up, feet stomp!".' },
  ];

  function isoWeekKey(nowMs) {
    const d = new Date(nowMs); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // nearest Thursday
    const week1 = new Date(d.getFullYear(), 0, 4);
    const wk = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return d.getFullYear() + '-W' + String(wk).padStart(2, '0');
  }

  /**
   * Build a deterministic 7-day plan. Seed = weekKey + favTheme + workingTheme (NOT stage).
   * The same seed with a different stage yields a different plan because stage filters the
   * candidate pool, changing pool lengths before index selection — intentional, so a stage
   * advance produces age-appropriate activities immediately rather than a stale plan.
   * Pass ctx.stage = effectiveStage(model, nowMs). `generatedTs` mirrors model.updatedTs
   * (the model state the plan was built from), used by the UI only as a regenerate seed-bump.
   */
  function generateWeek(model, weekKey, ctx) {
    ctx = ctx || {};
    const stage = ctx.stage ?? 1;
    const rng = mulberry32(hashStr(weekKey + ':' + (ctx.favTheme || '') + ':' + (ctx.workingTheme || '')));
    const days = [];
    for (let d = 0; d < 7; d++) {
      const pillar = PILLARS[d % 4]; // L,W,R,H,L,W,R -> Roots&Faith on days 2 & 6 (guaranteed)
      const pool = ACTIVITY_BANK.filter(a => a.pillar === pillar && a.minStage <= stage);
      if (!pool.length) throw new Error(`generateWeek: no activities for pillar "${pillar}" at stage ${stage}`);
      const a = pool[Math.floor(rng() * pool.length)];
      days.push({ dow: d, pillar, emoji: a.emoji, kind: a.kind,
                  title: fill(a.title, ctx), detail: fill(a.detail, ctx) });
    }
    return { weekKey, stage, generatedTs: (model.updatedTs || 0), days };
  }

  return { STORAGE_KEY, CORRUPT_KEY, DOB, THEME_STAGE, CHOICES_BY_STATUS, PILLARS, clamp, defaultModel, monthsOld, ageStage,
           themeMastery, themeStatus, stageThemes, stageMastered, autoStage, effectiveStage,
           isUnlocked, unlockedThemes, topInterests, recordTap, recordAnswer, findChoices,
           isValidBackup, load, save, saveNow,
           hashStr, mulberry32, ACTIVITY_BANK, isoWeekKey, generateWeek };
});
