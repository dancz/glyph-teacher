import rawGlyphsData from './glyphs.json';
import sequencesData from './sequences.json';

// Filter out invalid/suspicious numerical glyphs like '1' and '3'
const glyphsData = rawGlyphsData.filter(g => !/^\d+$/.test(g.names[0]));

// Create a lookup dictionary: word -> edges
const wordToEdges = {};
glyphsData.forEach(g => {
  g.names.forEach(name => {
    wordToEdges[name.toLowerCase()] = g.edges;
  });
});

export function getEdgesForWord(word) {
  if (!word) return '';
  const parsedWord = word.replace(/\s*\(.*?\)/, '').toLowerCase(); // handle "creativity(1216...)" 
  return wordToEdges[parsedWord] || '';
}

export function getRandomSequence(level) {
  // L1 portal - 1 glyph (level 1-2 often has 1-2 glyphs, but the original script mapped levels to difficulty bounds)
  // Let's map L1->1, L2->2, L3->3, etc. or just randomly pick from sequences matching the level bounds.
  // levels array in sequences.json contains [0], [2], [5], [7], [8].
  // Usually: 
  // L1: [0] -> 1 glyph
  // L2: [2] -> 2 glyphs
  // L6: [5] -> 3 or 4 glyphs
  // L7: [7] -> 4 or 5 glyphs
  // L8: [8] -> 5 glyphs
  let targetSet = 0;
  if(level >= 8) targetSet = 8;
  else if(level >= 7) targetSet = 7;
  else if(level >= 6) targetSet = 5; // Level 6-7 portals usually have 4 glyphs, some 3.
  else if(level >= 3) targetSet = 2;
  else targetSet = 0;

  const validSequences = sequencesData.filter(s => s.levels.includes(targetSet));
  if(validSequences.length === 0) {
     // fallback
     return { words: ['advance'], edges: [wordToEdges['advance']] };
  }

  const seq = validSequences[Math.floor(Math.random() * validSequences.length)];
  return {
    words: seq.words,
    edges: seq.words.map(w => getEdgesForWord(w)).filter(e => e)
  };
}

export { glyphsData, sequencesData };

/**
 * Returns all sequences with a stable string ID for progress tracking.
 * Optionally filter by level (1-8).
 */
export function getAllSequences(level = null) {
  let seqs = sequencesData;
  if (level !== null) {
    const targetSet = level >= 8 ? 8 : level >= 7 ? 7 : level >= 6 ? 5 : level >= 3 ? 2 : 0;
    seqs = seqs.filter(s => s.levels.includes(targetSet));
  }
  return seqs.map(seq => ({
    id: seq.words.join('|').toLowerCase(),
    words: seq.words,
    edges: seq.words.map(w => getEdgesForWord(w)).filter(e => e),
  }));
}

