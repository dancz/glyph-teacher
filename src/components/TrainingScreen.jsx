import React, { useEffect, useCallback } from 'react';
import { useTraining, TRAINING_STATES } from '../hooks/useTraining';
import { getAllSequences } from '../data';
import { getProgressSummary, resetProgress, getWeakGlyphs } from '../services/progressService';
import GlyphGrid from './GlyphGrid';

// ─── Progress ring component ──────────────────────────────────────────────────
function ProgressRing({ mastered, learning, unseen, total }) {
  if (!total) return null;
  const RADIUS = 54;
  const CIRC = 2 * Math.PI * RADIUS;
  const masteredPct = (mastered / total);
  const learningPct = (learning / total);
  const unseenPct = (unseen / total);

  const masteredLen = CIRC * masteredPct;
  const learningLen = CIRC * learningPct;
  const unseenLen   = CIRC * unseenPct;

  // Segments drawn sequentially via strokeDashoffset rotation
  const SEG_OFFSET = -Math.PI / 2; // start at top
  const masteredOff = CIRC * (1 - masteredPct);
  const learningOff = CIRC * (1 - learningPct) - masteredLen;
  const unseenOff   = -(masteredLen + learningLen);

  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Background track */}
        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
        {/* Unseen */}
        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="rgba(180,160,255,0.2)" strokeWidth="12"
          strokeDasharray={`${unseenLen} ${CIRC - unseenLen}`}
          strokeDashoffset={CIRC * 0.25 - masteredLen - learningLen}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px' }} />
        {/* Learning */}
        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#dcaaff" strokeWidth="12"
          strokeDasharray={`${learningLen} ${CIRC - learningLen}`}
          strokeDashoffset={CIRC * 0.25 - masteredLen}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px' }} />
        {/* Mastered */}
        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#00e5ff" strokeWidth="12"
          strokeDasharray={`${masteredLen} ${CIRC - masteredLen}`}
          strokeDashoffset={CIRC * 0.25}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px', filter: 'drop-shadow(0 0 6px #00e5ff)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="font-orbitron" style={{ fontSize: '1.6rem', color: '#00e5ff', lineHeight: 1 }}>{mastered}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MASTERED</span>
      </div>
    </div>
  );
}

// ─── Hexagon row for training display ────────────────────────────────────────
function TrainingHexRow({ sequence, displayIndex, inputIndex, feedbackFlags, phase }) {
  const HEX_PTS = "50,5 95,28 95,72 50,95 5,72 5,28";
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '12px 0' }}>
      {sequence.words.map((_, i) => {
        let status = 'normal';
        if (phase === TRAINING_STATES.DISPLAYING) {
          const showing = Math.floor(displayIndex / 2);
          if (i === showing && displayIndex % 2 === 0) status = 'active';
        } else if (phase === TRAINING_STATES.INPUT) {
          if (i < inputIndex) status = 'done';
          else if (i === inputIndex) status = 'active';
        } else if (phase === TRAINING_STATES.FEEDBACK) {
          status = feedbackFlags[i] ? 'done' : 'error';
        }
        return (
          <div key={i} className={`mini-hex-container ${status}`} style={{ position: 'relative', width: 44, height: 44 }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              <polygon points={HEX_PTS} className="mini-hex-outline" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Training Screen ─────────────────────────────────────────────────────
export default function TrainingScreen() {
  const training = useTraining();
  const {
    state, trainingMode, levelFilter, currentSeq, displayIndex, inputIndex,
    userInputs, feedbackFlags, pendingFeedback, summary,
    startSession, advanceDisplay, finishDisplay, handleInputEnd, handleRedo, next, skip, quit, refreshSummary,
  } = training;

  // Load summary on mount
  useEffect(() => { refreshSummary(levelFilter); }, []);

  // Auto-advance display timer with look-ahead to avoid blank frames
  useEffect(() => {
    if (state !== TRAINING_STATES.DISPLAYING || !currentSeq) return;
    const actualGlyph = Math.floor(displayIndex / 2);
    if (actualGlyph >= currentSeq.words.length) return;
    const isPause = displayIndex % 2 !== 0;
    const delay = isPause ? 500 : 1000;
    const t = setTimeout(() => {
      // Look-ahead: would the next increment go past the end?
      const nextIdx = displayIndex + 1;
      const nextGlyph = Math.floor(nextIdx / 2);
      if (nextGlyph >= currentSeq.words.length) {
        finishDisplay(); // transition directly, no blank render
      } else {
        advanceDisplay();
      }
    }, delay);
    return () => clearTimeout(t);
  }, [state, displayIndex, currentSeq, advanceDisplay, finishDisplay]);

  // ── IDLE: dashboard ────────────────────────────────────────────────────────
  if (state === TRAINING_STATES.IDLE) {
    const allSeqs = getAllSequences(levelFilter);
    const sum = summary || getProgressSummary(allSeqs);

    return (
      <>
        <div className="scroll-content flex-column px-5 py-6 w-full text-center">
          <h1 className="text-glow-cyan font-orbitron text-3xl mb-1">TRAINING</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>ADAPTIVE SEQUENCE TRAINER</p>

          {/* Progress ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <ProgressRing {...sum} />
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '24px', fontSize: '0.75rem', fontFamily: 'Share Tech Mono, monospace' }}>
            <span style={{ color: '#00e5ff' }}>■ MASTERED {sum.mastered}</span>
            <span style={{ color: '#dcaaff' }}>■ LEARNING {sum.learning}</span>
            <span style={{ color: 'rgba(180,160,255,0.3)' }}>■ UNSEEN {sum.unseen}</span>
          </div>

          {/* Mode picker */}
          <div style={{ marginBottom: '20px' }}>
            <div className="font-orbitron" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>TRAINING MODE</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => startSession(levelFilter, 'visual')}
                className="btn-secondary"
                style={{ flex: 1, flexDirection: 'column', height: 'auto', padding: '12px 8px', gap: '6px',
                  borderColor: trainingMode === 'visual' ? 'rgba(0,229,255,0.6)' : 'rgba(130,100,200,0.3)',
                  color: trainingMode === 'visual' ? '#00e5ff' : 'rgba(200,180,255,0.6)' }}
              >
                <span style={{ fontSize: '1.2rem' }}>◈</span>
                <span className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>VISUAL</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>See glyphs,{String.fromCharCode(10)}draw them</span>
              </button>
              <button
                onClick={() => startSession(levelFilter, 'text')}
                className="btn-secondary"
                style={{ flex: 1, flexDirection: 'column', height: 'auto', padding: '12px 8px', gap: '6px',
                  borderColor: trainingMode === 'text' ? 'rgba(220,170,255,0.6)' : 'rgba(130,100,200,0.3)',
                  color: trainingMode === 'text' ? '#dcaaff' : 'rgba(200,180,255,0.6)' }}
              >
                <span style={{ fontSize: '1.2rem' }}>Aa</span>
                <span className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>TEXT</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Read word,{String.fromCharCode(10)}draw from memory</span>
              </button>
              <button
                onClick={() => startSession(levelFilter, 'level')}
                className="btn-secondary"
                style={{ flex: 1, flexDirection: 'column', height: 'auto', padding: '12px 8px', gap: '6px',
                  borderColor: trainingMode === 'level' ? 'rgba(0,255,100,0.6)' : 'rgba(130,100,200,0.3)',
                  color: trainingMode === 'level' ? '#00ff66' : 'rgba(200,180,255,0.6)' }}
              >
                <span style={{ fontSize: '1.2rem' }}>↻</span>
                <span className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>BY LEVEL</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>Repeat until{String.fromCharCode(10)}correct</span>
              </button>
            </div>
          </div>

          {/* Level filter */}
          <div style={{ marginBottom: '20px' }}>
            <div className="font-orbitron" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>FILTER BY LEVEL</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
              <button className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem', opacity: levelFilter === null ? 1 : 0.5 }}
                onClick={() => refreshSummary(null)}>ALL</button>
              {[1,2,3,4,5,6,7,8].map(l => (
                <button key={l} className="btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem', opacity: levelFilter === l ? 1 : 0.5 }}
                  onClick={() => refreshSummary(l)}>L{l}</button>
              ))}
          </div>
          </div>

          {/* Weak glyphs */}
          {(() => {
            const weak = getWeakGlyphs(5).filter(g => g.attempts > 0);
            if (!weak.length) return null;
            return (
              <div style={{ marginBottom: '20px' }}>
                <div className="font-orbitron" style={{ fontSize: '0.75rem', color: '#ff7799', marginBottom: '8px' }}>
                  ⚠ WEAK GLYPHS
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {weak.map((g, i) => {
                    const vm = g.modeData?.visual;
                    const tm = g.modeData?.text;
                    return (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ width: 50, height: 50, position: 'relative',
                          border: `1px solid rgba(255,68,120,${0.3 + (g.weight / 8) * 0.5})`,
                          borderRadius: '6px', background: 'rgba(255,20,60,0.05)' }}>
                          <GlyphGrid mode="display" glyphStr={g.edgeStr} size="100%" showGuides={false} mini={true} showNodes={true} customLineClass="display-edge" />
                        </div>
                        {vm?.attempts > 0 && (
                          <div style={{ fontSize: '0.5rem', color: '#00e5ff', marginTop: '2px' }}>
                            ◈ {Math.round((vm.correct / vm.attempts) * 100)}%
                          </div>
                        )}
                        {tm?.attempts > 0 && (
                          <div style={{ fontSize: '0.5rem', color: '#dcaaff' }}>
                            Aa {Math.round((tm.correct / tm.attempts) * 100)}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Reset */}
          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button onClick={() => { resetProgress(); refreshSummary(levelFilter); }}
              style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '6px 14px', cursor: 'pointer' }}>
              RESET PROGRESS
            </button>
          </div>
        </div>

        {/* Footer: start button */}
        <div className="screen-footer">
          <button onClick={() => startSession(levelFilter)} className="btn-secondary" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
            START TRAINING
          </button>
        </div>
      </>
    );
  }

  // ── DISPLAYING ─────────────────────────────────────────────────────────────
  if (state === TRAINING_STATES.DISPLAYING) {
    const isShowing = displayIndex % 2 === 0;
    const actualIdx = Math.floor(displayIndex / 2);
    const glyphStr = isShowing && actualIdx < currentSeq.edges.length ? currentSeq.edges[actualIdx] : '';
    const glyphWord = isShowing && actualIdx < currentSeq.words.length ? currentSeq.words[actualIdx] : '';
    return (
      <div className="flex-1 flex-column py-4 w-full items-center">
        <div className="font-orbitron text-lg text-center uppercase" style={{ letterSpacing: '0.05em', color: glyphWord ? '#dcaaff' : 'var(--text-muted)' }}>
          {glyphWord ? glyphWord : 'MEMORISE SEQUENCE'}
        </div>
        <div style={{ height: '1px', width: '90%', background: 'linear-gradient(90deg, transparent, rgba(180,150,255,0.4), transparent)', margin: '8px auto' }} />
        <TrainingHexRow sequence={currentSeq} displayIndex={displayIndex} inputIndex={0} feedbackFlags={[]} phase={state} />
        <div className="flex-1 flex-center w-full px-2">
          <GlyphGrid mode="display" glyphStr={glyphStr} size="100%" />
        </div>
        <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'center', width: '100%', marginTop: 'auto' }}>
          <button onClick={quit} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '6px 14px', cursor: 'pointer', fontFamily: 'Share Tech Mono, monospace' }}>GIVE UP</button>
        </div>
      </div>
    );
  }

  // ── INPUT ──────────────────────────────────────────────────────────────────
  if (state === TRAINING_STATES.INPUT) {
    const isTextMode = trainingMode === 'text';
    const currentWord = currentSeq.words[inputIndex];
    return (
      <div className="flex-1 flex-column pt-4 pb-2 w-full items-center">
        <div className="font-orbitron text-lg text-center" style={{ letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          {isTextMode ? 'DRAW FROM MEMORY' : `DRAW GLYPH ${inputIndex + 1} / ${currentSeq.words.length}`}
        </div>
        <div style={{ height: '1px', width: '90%', background: 'linear-gradient(90deg, transparent, rgba(180,150,255,0.4), transparent)', margin: '8px auto' }} />
        <TrainingHexRow sequence={currentSeq} displayIndex={0} inputIndex={inputIndex} feedbackFlags={[]} phase={state} />

        {/* Text mode: show word prompt instead of nothing */}
        {isTextMode && (
          <div style={{ padding: '10px 20px', textAlign: 'center' }}>
            {/* Show full sentence dimly, current word bright */}
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
              {currentSeq.words.map((w, i) => (
                <span key={i} className="font-orbitron uppercase" style={{
                  fontSize: i === inputIndex ? '1.8rem' : '1rem',
                  color: i === inputIndex ? '#dcaaff' : 'rgba(180,160,255,0.25)',
                  textShadow: i === inputIndex ? '0 0 15px rgba(220,170,255,0.7)' : 'none',
                  transition: 'all 0.3s ease',
                }}>{w}</span>
              ))}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{inputIndex + 1} / {currentSeq.words.length}</div>
          </div>
        )}

        <div className="flex-1 flex-center w-full px-2">
          <GlyphGrid key={inputIndex} mode="input" onInputEnd={handleInputEnd} size="100%" />
        </div>
        <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
          <button
            onClick={handleRedo}
            disabled={userInputs.length === 0}
            style={{ fontSize: '0.8rem', color: userInputs.length === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(200,180,255,0.7)',
              background: 'none', border: '1px solid', borderColor: userInputs.length === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(130,100,200,0.4)',
              borderRadius: '4px', padding: '6px 16px', cursor: userInputs.length === 0 ? 'default' : 'pointer',
              fontFamily: 'Share Tech Mono, monospace', transition: 'all 0.2s' }}
          >Redo</button>

          {pendingFeedback ? (
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#dcaaff', borderRadius: '2px',
                animation: 'drainBar 1.5s linear forwards' }} />
            </div>
          ) : <div style={{ flex: 1 }} />}

          <button onClick={quit} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '6px 14px', cursor: 'pointer', fontFamily: 'Share Tech Mono, monospace' }}>GIVE UP</button>
        </div>
      </div>
    );
  }

  // ── FEEDBACK ───────────────────────────────────────────────────────────────
  if (state === TRAINING_STATES.FEEDBACK) {
    const allCorrect = feedbackFlags.every(Boolean);
    return (
      <>
        <div className="scroll-content flex-column px-5 py-4 w-full text-center">
          {/* Result banner */}
          <div className="font-orbitron text-2xl mb-2" style={{ color: allCorrect ? '#00e5ff' : '#ff4477', textShadow: allCorrect ? '0 0 12px #00e5ff' : '0 0 12px #ff4477' }}>
            {allCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
          </div>

          <TrainingHexRow sequence={currentSeq} displayIndex={0} inputIndex={0} feedbackFlags={feedbackFlags} phase={state} />

          {/* Per-glyph comparison */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {currentSeq.words.map((word, i) => {
              const correct = feedbackFlags[i];
              return (
                <div key={i} style={{ background: correct ? 'rgba(0,229,255,0.04)' : 'rgba(255,68,119,0.06)', border: `1px solid ${correct ? 'rgba(0,229,255,0.2)' : 'rgba(255,68,119,0.3)'}`, borderRadius: '8px', padding: '12px' }}>
                  <div className="font-orbitron uppercase mb-2" style={{ fontSize: '0.85rem', color: correct ? '#00e5ff' : '#ff4477' }}>
                    {word} {correct ? '✓' : '✗'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 70, height: 70, marginBottom: 4 }}>
                        <GlyphGrid 
                          mode="display" 
                          glyphStr={currentSeq.edges[i]} 
                          size="100%" 
                          mini={true} 
                          showNodes={true} 
                          customLineClass={correct ? "display-edge" : "error-edge"} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sentence */}
          <div className="font-orbitron uppercase mt-4" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
            {currentSeq.words.join(' ')}
          </div>
        </div>

        <div className="screen-footer" style={{ gap: '12px' }}>
          <button onClick={quit} className="btn-secondary" style={{ flex: 1 }}>GIVE UP</button>
          
          {!allCorrect && trainingMode === 'level' ? (
            <button onClick={skip} className="btn-secondary" style={{ flex: 1, borderColor: 'rgba(255,68,119,0.5)', color: '#ff4477' }}>SKIP</button>
          ) : null}

          <button onClick={next} className="btn-secondary" style={{ flex: 2, borderColor: 'rgba(0,229,255,0.5)', color: '#00e5ff' }}>
            {allCorrect || trainingMode !== 'level' ? 'NEXT →' : 'RETRY ↺'}
          </button>
        </div>
      </>
    );
  }

  return null;
}
