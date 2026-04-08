import { useState, useCallback, useRef } from 'react';
import { getAllSequences } from '../data';
import { pickNextSequence, recordResult, getProgressSummary } from '../services/progressService';

import { TRAINING_STATES, AppState } from '../constants';


function parseEdges(edgeStr: string) {
  if (!edgeStr) return [];
  const edges = [];
  for (let i = 1; i < edgeStr.length; i += 2) {
    const a = parseInt(edgeStr.charAt(i - 1), 11);
    const b = parseInt(edgeStr.charAt(i), 11);
    edges.push([a, b]);
  }
  return edges;
}

function compareGlyphs(expectedEdgeStr: string, actualEdgeStr: string) {
  const normalize = (str: string) => {
    let edges: string[] = [];
    for (let i = 0; i < str.length; i += 2) {
      let a = str[i], b = str[i + 1];
      edges.push(a < b ? a + b : b + a);
    }
    edges.sort();
    return edges.join('');
  };
  return normalize(expectedEdgeStr) === normalize(actualEdgeStr);
}

export function useTraining() {
  const [state, setState] = useState<AppState>(TRAINING_STATES.IDLE);
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [trainingMode, setTrainingMode] = useState('visual'); // 'visual' | 'text'
  const [currentSeq, setCurrentSeq] = useState(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [inputIndex, setInputIndex] = useState(0);
  const [userInputs, setUserInputs] = useState([]);
  const [feedbackFlags, setFeedbackFlags] = useState([]);
  const [pendingFeedback, setPendingFeedback] = useState(false); // brief delay after last glyph
  const [summary, setSummary] = useState(null);

  const displayTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const refreshSummary = useCallback((lvl?: number | null) => {
    const newLevel = lvl !== undefined ? lvl : levelFilter;
    if (lvl !== undefined) setLevelFilter(lvl);
    const seqs = getAllSequences(newLevel);
    setSummary(getProgressSummary(seqs));
  }, [levelFilter]);

  const startSession = useCallback((lvl: number | null = levelFilter, mode: string = trainingMode) => {
    clearTimeout(feedbackTimerRef.current);
    setLevelFilter(lvl);
    setTrainingMode(mode);
    const seqs = getAllSequences(lvl);
    setSummary(getProgressSummary(seqs));
    const seq = pickNextSequence(seqs, mode);
    setCurrentSeq(seq);
    setUserInputs([]);
    setInputIndex(0);
    setFeedbackFlags([]);
    setPendingFeedback(false);
    setDisplayIndex(0);
    setState(mode === 'text' ? TRAINING_STATES.INPUT : TRAINING_STATES.DISPLAYING);
  }, [levelFilter, trainingMode]);

  // Called by TrainingScreen to advance display frames
  const advanceDisplay = useCallback(() => {
    setDisplayIndex(prev => prev + 1);
  }, []);

  // Called by TrainingScreen when the last frame finishes — skips the blank render
  const finishDisplay = useCallback(() => {
    setState(TRAINING_STATES.INPUT);
    setInputIndex(0);
  }, []);

  const handleInputEnd = useCallback((inputEdgeStr) => {
    const newInputs = [...userInputs, inputEdgeStr];
    setUserInputs(newInputs);

    if (newInputs.length >= currentSeq.edges.length) {
      // Pre-compute flags so redo can clear them
      const flags = currentSeq.edges.map((exp, i) =>
        newInputs[i] ? compareGlyphs(exp, newInputs[i]) : false
      );
      setFeedbackFlags(flags);
      setInputIndex(newInputs.length - 1);
      setPendingFeedback(true);

      // Give user 1.5 s to redo before committing
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        const allCorrect = flags.every(Boolean);
        recordResult(currentSeq.id, allCorrect, currentSeq.edges, flags, trainingMode);
        refreshSummary();
        setState(TRAINING_STATES.FEEDBACK);
        setPendingFeedback(false);
      }, 1500);
    } else {
      setInputIndex(newInputs.length);
    }
  }, [userInputs, currentSeq, refreshSummary]);

  const handleRedo = useCallback(() => {
    // Cancel any pending feedback commit
    clearTimeout(feedbackTimerRef.current);
    setPendingFeedback(false);
    setFeedbackFlags([]);
    if (userInputs.length > 0) {
      const newInputs = userInputs.slice(0, -1);
      setUserInputs(newInputs);
      setInputIndex(newInputs.length);
    }
  }, [userInputs]);

  const next = useCallback(() => {
    if (trainingMode === 'level' && feedbackFlags.length > 0 && !feedbackFlags.every(Boolean)) {
      // Retry the same sequence
      setUserInputs([]);
      setInputIndex(0);
      setFeedbackFlags([]);
      setPendingFeedback(false);
      setDisplayIndex(0);
      setState(TRAINING_STATES.DISPLAYING);
    } else {
      startSession(levelFilter, trainingMode);
    }
  }, [startSession, levelFilter, trainingMode, feedbackFlags]);

  const skip = useCallback(() => {
    startSession(levelFilter, trainingMode);
  }, [startSession, levelFilter, trainingMode]);

  const quit = useCallback(() => {
    clearTimeout(feedbackTimerRef.current);
    setState(TRAINING_STATES.IDLE);
    setCurrentSeq(null);
    setPendingFeedback(false);
    refreshSummary();
  }, [refreshSummary]);

  return {
    state,
    trainingMode,
    levelFilter,
    currentSeq,
    displayIndex,
    inputIndex,
    userInputs,
    feedbackFlags,
    pendingFeedback,
    summary,
    startSession,
    advanceDisplay,
    finishDisplay,
    handleInputEnd,
    handleRedo,
    next,
    skip,
    quit,
    refreshSummary,
  };
}
