import { WEEKLY_SCORE_KEY } from '../constants';


export function getWeekId() {
  const d = new Date();
  // Set to Monday of this week
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function getWeeklyScores() {
  const currentWeekId = getWeekId();
  try {
    const data = JSON.parse(localStorage.getItem(WEEKLY_SCORE_KEY)) || {};
    if (data.weekId !== currentWeekId) {
      // Return empty scores for the new week
      return { weekId: currentWeekId, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, total: 0 };
    }
    return data;
  } catch (e) {
    return { weekId: currentWeekId, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, total: 0 };
  }
}

export function addScore(level: number, score: number, correctCount: number = 0, totalCount: number = 0) {
  const scores = getWeeklyScores();
  const levelKey = `L${level}`;
  
  if (score > 0) {
    scores[levelKey] = (scores[levelKey] || 0) + score;
    scores.total = (scores.total || 0) + score;
  }
  
  if (totalCount > 0) {
    const levelCorrectKey = `L${level}_correct`;
    const levelTotalKey = `L${level}_total`;
    scores[levelCorrectKey] = (scores[levelCorrectKey] || 0) + correctCount;
    scores[levelTotalKey] = (scores[levelTotalKey] || 0) + totalCount;
  }

  scores.weekId = getWeekId(); // Ensure weekId is set just in case
  localStorage.setItem(WEEKLY_SCORE_KEY, JSON.stringify(scores));
}
