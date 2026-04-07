const SEQ_KEY   = 'glyph_trainer_progress';
const GLYPH_KEY = 'glyph_trainer_glyphs';

const MODES = ['visual', 'text', 'level'];

// ─── Generic storage helpers ──────────────────────────────────────────────────
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? {}; }
  catch { return {}; }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ─── SRS weight helpers ───────────────────────────────────────────────────────
const DEFAULT_RECORD = { weight: 1.0, attempts: 0, correct: 0 };

function updatedWeight(prev, wasCorrect) {
  return wasCorrect
    ? Math.max(0.1, prev.weight * 0.6)
    : Math.min(8.0, prev.weight * 2.0);
}

function getModeRecord(obj, mode) {
  return obj?.[mode] ?? { ...DEFAULT_RECORD };
}

// ─── Sequence-level API ───────────────────────────────────────────────────────

export function getAllProgress() {
  return load(SEQ_KEY);
}

export function getAllGlyphProgress() {
  return load(GLYPH_KEY);
}

export function toggleKnownWell(id, type, isKnown) {
  const key = type === 'sequence' ? SEQ_KEY : GLYPH_KEY;
  const data = load(key);
  if (!data[id]) data[id] = {};
  data[id].knownWell = isKnown;
  save(key, data);
}

export function getStatSummary(itemData) {
  if (!itemData) return { attempts: 0, correct: 0, pct: null, knownWell: false };
  const attempts = MODES.reduce((sum, m) => sum + (itemData[m]?.attempts || 0), 0);
  const correct = MODES.reduce((sum, m) => sum + (itemData[m]?.correct || 0), 0);
  const pct = attempts > 0 ? Math.floor((correct / attempts) * 100) : null;
  return { attempts, correct, pct, knownWell: !!itemData.knownWell };
}

/**
 * Record a full-sequence result, keyed by mode.
 * Also updates per-glyph records for the same mode.
 *
 * @param {string}   seqId      - stable sequence id
 * @param {boolean}  wasCorrect - true if ALL glyphs correct
 * @param {string[]} edges      - edge strings per glyph position
 * @param {boolean[]} flags     - per-glyph correctness
 * @param {string}   mode       - 'visual' | 'text'
 */
export function recordResult(seqId, wasCorrect, edges = [], flags = [], mode = 'visual') {
  // ── Sequence record ──
  const seqAll = load(SEQ_KEY);
  if (!seqAll[seqId]) seqAll[seqId] = {};
  const prevSeq = getModeRecord(seqAll[seqId], mode);
  seqAll[seqId][mode] = {
    weight:   updatedWeight(prevSeq, wasCorrect),
    attempts: prevSeq.attempts + 1,
    correct:  prevSeq.correct + (wasCorrect ? 1 : 0),
  };
  seqAll[seqId].lastSeenAt = Date.now();
  save(SEQ_KEY, seqAll);

  // ── Per-glyph records ──
  if (edges.length && flags.length) {
    const glyphAll = load(GLYPH_KEY);
    edges.forEach((edgeStr, i) => {
      if (!edgeStr) return;
      if (!glyphAll[edgeStr]) glyphAll[edgeStr] = {};
      const prevG = getModeRecord(glyphAll[edgeStr], mode);
      glyphAll[edgeStr][mode] = {
        weight:   updatedWeight(prevG, flags[i] ?? false),
        attempts: prevG.attempts + 1,
        correct:  prevG.correct + (flags[i] ? 1 : 0),
      };
    });
    save(GLYPH_KEY, glyphAll);
  }
}

// ─── Sequence picker with glyph-weakness boost ───────────────────────────────
const GLYPH_BOOST = 0.5;

/**
 * Pick next sequence using weighted random, using mode-specific weights.
 */
export function pickNextSequence(sequences, mode = 'visual') {
  const seqAll   = load(SEQ_KEY);
  const glyphAll = load(GLYPH_KEY);

  const weighted = sequences.map(seq => {
    const seqData = seqAll[seq.id] || {};
    const seqWeight = seqData.knownWell ? 0.001 : getModeRecord(seqData, mode).weight;

    const maxGlyphWeight = seq.edges.reduce((max, edge) => {
      const gData = glyphAll[edge] || {};
      const gw = gData.knownWell ? 0.001 : getModeRecord(gData, mode).weight;
      return Math.max(max, gw);
    }, 0);

    return { seq, weight: seqWeight * (1 + maxGlyphWeight * GLYPH_BOOST) };
  });

  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let rand = Math.random() * total;
  for (const item of weighted) {
    rand -= item.weight;
    if (rand <= 0) return item.seq;
  }
  return weighted[weighted.length - 1].seq;
}

// ─── Progress summary ─────────────────────────────────────────────────────────

/**
 * Returns { total, mastered, learning, unseen } using WORST weight across modes.
 * A sequence is mastered only if it's mastered in BOTH modes that have been used.
 */
export function getProgressSummary(sequences) {
  const seqAll = load(SEQ_KEY);
  let mastered = 0, learning = 0, unseen = 0;

  sequences.forEach(seq => {
    const data = seqAll[seq.id];
    if (!data) { unseen++; return; }

    const usedModes = MODES.filter(m => data[m]?.attempts > 0);
    if (!usedModes.length) { unseen++; return; }

    const isMastered = usedModes.every(m => data[m].weight < 0.2 && data[m].attempts >= 5);
    isMastered ? mastered++ : learning++;
  });

  return { total: sequences.length, mastered, learning, unseen };
}

/**
 * Returns the N weakest individual glyphs for a given mode (or combined).
 */
export function getWeakGlyphs(n = 5, mode = null) {
  const all = load(GLYPH_KEY);

  return Object.entries(all)
    .map(([edgeStr, data]) => {
      let weight, attempts, correct;
      if (mode) {
        const r = getModeRecord(data, mode);
        ({ weight, attempts, correct } = r);
      } else {
        // Combined: use worst (max) weight across modes that have data
        const used = MODES.filter(m => data[m]?.attempts > 0);
        if (!used.length) return null;
        weight   = Math.max(...used.map(m => data[m].weight));
        attempts = used.reduce((s, m) => s + data[m].attempts, 0);
        correct  = used.reduce((s, m) => s + data[m].correct, 0);
      }
      if (!attempts) return null;
      return { edgeStr, weight, attempts, correct, modeData: data };
    })
    .filter(Boolean)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n);
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export function resetProgress() {
  localStorage.removeItem(SEQ_KEY);
  localStorage.removeItem(GLYPH_KEY);
}
