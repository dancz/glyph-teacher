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

export function getRandomSequence(length) {
  let targetSet = 0;
  if(length >= 5) targetSet = 8; // 5 glyphs
  else if(length === 4) targetSet = 7; // 4 glyphs
  else if(length === 3) targetSet = 5; // 3 glyphs
  else if(length === 2) targetSet = 2; // 2 glyphs
  else targetSet = 0; // 1 glyph

  const validSequences = sequencesData.filter(s => s.levels.includes(targetSet));
  if(validSequences.length === 0) {
     // fallback
     return { words: ['advance'], edges: [wordToEdges['advance']] };
  }

  const seq = validSequences[Math.floor(Math.random() * validSequences.length)];
  return {
    id: seq.words.join('|').toLowerCase(),
    words: seq.words,
    edges: seq.words.map(w => getEdgesForWord(w)).filter(e => e)
  };
}

export { glyphsData, sequencesData };

/**
 * Returns all sequences with a stable string ID for progress tracking.
 * Optionally filter by level (1-8).
 */
export function getAllSequences(length = null) {
  let seqs = sequencesData;
  if (length !== null) {
    const targetSet = length >= 5 ? 8 : length === 4 ? 7 : length === 3 ? 5 : length === 2 ? 2 : 0;
    seqs = seqs.filter(s => s.levels.includes(targetSet));
  }
  return seqs.map(seq => ({
    id: seq.words.join('|').toLowerCase(),
    words: seq.words,
    edges: seq.words.map(w => getEdgesForWord(w)).filter(e => e),
  }));
}

