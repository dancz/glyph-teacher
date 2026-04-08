import { useState, useEffect, useRef, useCallback } from 'react';
import { getRandomSequence } from '../data';
import { recordResult } from '../services/progressService';
import { addScore } from '../services/scoreService';

import { GAME_STATES, AppState } from '../constants';


// Check if two sequences of edges are identical, handling edge reversibility
function compareGlyphs(expectedEdgeStr: string, actualEdgeStr: string) {
  // We represent an edge as an ordered pair "ab" where a < b
  const normalize = (str: string) => {
    let edges: string[] = [];
    for(let i=0; i<str.length; i+=2) {
      let a = str[i], b = str[i+1];
      edges.push(a < b ? a+b : b+a);
    }
    edges.sort();
    return edges.join('');
  };
  return normalize(expectedEdgeStr) === normalize(actualEdgeStr);
}

export function useGlyphGame() {
  const [gameState, setGameState] = useState<AppState>(GAME_STATES.IDLE);
  const [level, setLevel] = useState(5);
  const [sequence, setSequence] = useState<any>({ words: [], edges: [] });
  
  // Display state
  const [displayIndex, setDisplayIndex] = useState(0);
  
  // Input state
  const [inputIndex, setInputIndex] = useState(0);
  const [userInputs, setUserInputs] = useState([]); // array of edge strings
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<any>(null);
  const finishTimeoutRef = useRef<any>(null);
  
  // Combo and Results
  const [combo, setCombo] = useState(0);
  const [results, setResults] = useState<any>({ correct: 0, total: 0, speedBonus: 0, comboBonus: 0, score: 0, flags: [] });

  const startGame = useCallback((lvl) => {
    setLevel(prevLvl => {
      if (prevLvl !== lvl) setCombo(0);
      return lvl;
    });
    const seq = getRandomSequence(lvl);
    setSequence(seq);
    setGameState(GAME_STATES.PREPARE);
    setUserInputs([]);
    setDisplayIndex(0);
    setInputIndex(0);
    const time = 12 + seq.words.length * 3;
    setTotalTime(time);
    setTimeLeft(time);
  }, []);

  const stopGame = useCallback(() => {
    setCombo(0);
    setGameState(GAME_STATES.IDLE);
    clearInterval(timerRef.current);
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
  }, []);

  // Effect for handling state transitions
  useEffect(() => {
    if (gameState === GAME_STATES.PREPARE) {
      // Show "INCOMING GLYPH" for 2 seconds
      const t = setTimeout(() => {
        setGameState(GAME_STATES.DISPLAYING);
        setDisplayIndex(0);
      }, 2000);
      return () => clearTimeout(t);
    } 
    
    if (gameState === GAME_STATES.DISPLAYING) {
      // Show each glyph for 1 second, with 0.5s pause
      const isPause = displayIndex % 2 !== 0;
      const actualIndex = Math.floor(displayIndex / 2);
      
      if (actualIndex >= sequence.words.length) {
        setGameState(GAME_STATES.INPUT);
        return;
      }
      
      const delay = isPause ? 500 : 1000;
      const t = setTimeout(() => {
        setDisplayIndex(displayIndex + 1);
      }, delay);
      return () => clearTimeout(t);
    }
    
    if (gameState === GAME_STATES.RESULTS) {
      // Loop over the index for the final recap
      const t = setTimeout(() => {
        setDisplayIndex((displayIndex + 1) % sequence.words.length);
      }, 1500);
      return () => clearTimeout(t);
    }
    
    if (gameState === GAME_STATES.INPUT) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0.1) {
            clearInterval(timerRef.current);
            finishGame(userInputs, sequence.edges);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      return () => clearInterval(timerRef.current);
    }
  }, [gameState, displayIndex, sequence.words.length, userInputs, sequence.edges]);

  const finishGame = (inputs: any[], expectedEdges: any[]) => {
    clearInterval(timerRef.current!);
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    
    let correctCount = 0;
    let flags = [];
    expectedEdges.forEach((exp, i) => {
      if (inputs[i] && compareGlyphs(exp, inputs[i])) {
        correctCount++;
        flags.push(true);
      } else {
        flags.push(false);
      }
    });

    const speedBonusPercentage = correctCount === expectedEdges.length ? Math.floor((timeLeft / totalTime) * 100) : 0;

    // SCORING
    const sequenceMultiplier = Math.pow(2, expectedEdges.length - 1);
    const baseScore = correctCount * sequenceMultiplier * 5;
    const speedBonusPoints = Math.floor((speedBonusPercentage / 100) * baseScore);
    
    let baseFinalScore = baseScore + speedBonusPoints;
    
    // Apply 50% penalty if the sequence is not completely correct
    if (correctCount < expectedEdges.length) {
      baseFinalScore = Math.floor(baseFinalScore * 0.5);
    }
    
    const comboBonusPoints = Math.floor(baseFinalScore * (combo / 100));
    const finalScore = baseFinalScore + comboBonusPoints;
    
    // Update combo sequence: +1 if fully correct, reset to 0 otherwise
    const nextCombo = correctCount === expectedEdges.length ? Math.min(50, combo + 1) : 0;
    
    // Track stats even if final score is somehow 0, to make sure percentages update accurately
    addScore(level, Math.max(0, finalScore), correctCount, expectedEdges.length);
    
    if (sequence.id) {
      recordResult(sequence.id, correctCount === expectedEdges.length, expectedEdges, flags, 'visual');
    }

    setResults({
      correct: correctCount,
      total: expectedEdges.length,
      speedBonus: speedBonusPercentage,
      comboBonus: combo,
      score: finalScore,
      flags
    });
    
    setCombo(nextCombo);
    setDisplayIndex(0);
    setGameState(GAME_STATES.RESULTS);
  };

  const handleInputEnd = (inputEdgeStr) => {
    if (userInputs.length >= sequence.words.length) return;

    const newInputs = [...userInputs, inputEdgeStr];
    setUserInputs(newInputs);
    setInputIndex(newInputs.length);
    
    if (newInputs.length >= sequence.words.length) {
      finishTimeoutRef.current = setTimeout(() => {
        finishGame(newInputs, sequence.edges);
      }, 2000);
    }
  };

  const handleSkip = () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    finishGame(userInputs, sequence.edges);
  };

  const handleRedo = () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    if (userInputs.length > 0) {
      const newInputs = userInputs.slice(0, -1);
      setUserInputs(newInputs);
      setInputIndex(newInputs.length);
    }
  };

  return {
    gameState,
    sequence,
    displayIndex, // if even, show glyph Math.floor(displayIndex/2). if odd, show empty
    inputIndex,
    userInputs,
    timeLeft,
    totalTime,
    results,
    level,
    startGame,
    stopGame,
    handleInputEnd,
    handleSkip,
    handleRedo,
  };
}
