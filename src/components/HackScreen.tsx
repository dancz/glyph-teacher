import React, { useState, useEffect } from 'react';
import GlyphGrid from './GlyphGrid';
import { HEX_PTS } from '../constants';

export default function HackScreen({ game }: { game: any }) {
  const {
    gameState,
    sequence,
    displayIndex,
    inputIndex,
    userInputs,
    timeLeft,
    totalTime,
    results,
    stopGame,
    handleInputEnd,
    handleSkip,
    handleRedo,
    startGame,
    level
  } = game;

  const [hexagonsContent, setHexagonsContent] = useState<any[]>([]);

  // Provide rendering elements based on state
  useEffect(() => {
    let hexes: any[] = [];
    for (let i = 0; i < sequence.words.length; i++) {
        let status = 'normal';
        let glyphStr = '';
        if (gameState === 'DISPLAYING') {
            const actualIndex = Math.floor(displayIndex / 2);
            if (i === actualIndex && displayIndex % 2 === 0) {
                status = 'active';
                glyphStr = sequence.edges[i];
            } else if (i < actualIndex) {
                // Not strictly showing glyphs in top bar during display in standard, but let's just highlight box
                status = 'normal';
            }
        } else if (gameState === 'INPUT') {
            if (i < inputIndex) {
                 status = 'done';
                 glyphStr = userInputs[i];
            } else if (i === inputIndex) {
                 status = 'active';
            }
        } else if (gameState === 'RESULTS') {
            const isCorrect = results.flags ? results.flags[i] : false;
            if (i === displayIndex) {
                 status = isCorrect ? 'active' : 'error-active';
            } else {
                 status = isCorrect ? 'done' : 'error';
            }
            // Always show the correct glyph, ignoring what the user falsely drew
            glyphStr = sequence.edges[i];
        }
        hexes.push({ status, glyphStr });
    }
    setHexagonsContent(hexes);
  }, [gameState, sequence, displayIndex, inputIndex, userInputs, results.flags]);

  const renderTimer = () => {
    const widthPercentage = (timeLeft / totalTime) * 100;
    return (
      <div className="w-full h-2 mb-4 relative" style={{ backgroundColor: 'var(--bg-grid-color)' }}>
        <div 
          style={{
            position: 'absolute',
            top: 0, bottom: 0, left: 0,
            width: `${Math.max(0, widthPercentage)}%`,
            backgroundColor: 'var(--accent-gold)',
            boxShadow: '0 0 10px var(--accent-gold-glow)',
            transition: 'width 0.1s linear'
          }}
        />
      </div>
    );
  };

  const renderHexagonsRow = () => {
      return (
          <div className="flex-center my-4 w-full" style={{ gap: '10px', flexWrap: 'wrap' }}>
              {hexagonsContent.map((h, i) => (
                  <div key={i} className={`mini-hex-container ${h.status}`} style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0 }}>
                     <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                        <polygon points={HEX_PTS} className="mini-hex-outline" />
                     </svg>
                     <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                         {h.glyphStr && (
                             <GlyphGrid 
                               mode="display" 
                               glyphStr={h.glyphStr} 
                               size={38} 
                               mini={true} 
                               customLineClass={h.status.includes('error') ? 'error-edge' : 'display-edge'} 
                             />
                         )}
                     </div>
                  </div>
              ))}
          </div>
      );
  }

  if (gameState === 'PREPARE') {
    return (
      <div className="flex-1 flex-center flex-column">
        <h2 className="text-glow-gold font-orbitron text-2xl animate-pulse">INCOMING GLYPH(S)</h2>
      </div>
    );
  }

  if (gameState === 'DISPLAYING') {
    const isShowing = displayIndex % 2 === 0;
    const actualIndex = Math.floor(displayIndex / 2);
    const glyphStr = isShowing ? sequence.edges[actualIndex] : '';
    
    return (
      <div className="flex-1 flex-center flex-column py-6 w-full">
        <div className="font-orbitron text-xl mb-2 text-center" style={{ letterSpacing: '0.05em' }}>
            Incoming glyph sequence
        </div>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 10%, rgba(180, 150, 255, 0.4) 50%, transparent 90%)', width: '90%', marginBottom: '10px' }} />
        {renderHexagonsRow()}
        <div className="flex-1 flex-center w-full px-2">
            <GlyphGrid mode="display" glyphStr={glyphStr} size="100%" />
        </div>
      </div>
    );
  }

  if (gameState === 'INPUT') {
    return (
      <div className="flex-1 flex-column pt-6 pb-4 relative w-full items-center">
        {renderTimer()}
        {renderHexagonsRow()}
        
        <div className="flex-1 flex-center w-full px-2">
            <GlyphGrid 
              key={inputIndex}
              mode="input" 
              onInputEnd={handleInputEnd} 
              size="100%" 
            />
        </div>
        
        <div className="flex justify-between w-full mt-auto mb-2 px-6 items-start">
          <button 
            onClick={handleRedo}
            className="btn-secondary"
            disabled={userInputs.length === 0}
            style={{ opacity: userInputs.length === 0 ? 0.3 : 1 }}
          >
            Redo
          </button>

          <button onClick={handleSkip} className="btn-abort">
            X
          </button>

          <button 
            onClick={handleSkip}
            className="btn-secondary"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'RESULTS') {
    const actualIndex = displayIndex;
    return (
      <>
        {/* Scrollable content area — grows/shrinks freely */}
        <div className="flex-1 flex-column w-full px-6 pt-10 text-center" style={{ overflowY: 'auto' }}>
          {renderHexagonsRow()}

          {/* Fixed-height word slot — never reflowing the layout below */}
          <div style={{ height: '5.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
            <h1 
              className="font-orbitron uppercase" 
              style={{ 
                fontSize: `clamp(1rem, ${Math.min(7, 85 / Math.max(sequence.words[actualIndex].length, 5))}vw, 2.4rem)`, 
                color: '#a0bdff', 
                letterSpacing: '0.05em', 
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}
            >
              {sequence.words[actualIndex]}
            </h1>
          </div>

          <div className="w-full px-2 py-6" style={{ background: 'linear-gradient(180deg, rgba(20,20,35,0.9), rgba(10,10,20,0.9))', border: '1px solid rgba(130, 100, 200, 0.4)', borderRadius: '6px', maxWidth: '350px', margin: '0 auto' }}>
              <div className="flex flex-column text-center mb-6">
                  <span className="font-orbitron text-sm mb-2" style={{ color: '#a0bdff', letterSpacing: '0.05em' }}>HACKING BONUS:</span>
                  <span className="font-orbitron font-bold text-4xl" style={{ color: '#dcaaff' }}>{Math.floor((results.correct / results.total) * 100)}%</span>
              </div>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(180, 150, 255, 0.4) 50%, transparent 95%)', margin: '20px 0' }}></div>
              <div className="flex flex-column text-center mt-6">
                  <span className="font-orbitron text-sm mb-2" style={{ color: '#a0bdff', letterSpacing: '0.05em' }}>SPEED BONUS:</span>
                  <span className="font-orbitron font-bold text-4xl" style={{ color: '#dcaaff' }}>{results.speedBonus}%</span>
              </div>
              {results.score > 0 && (
                <>
                  <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 5%, rgba(180, 150, 255, 0.4) 50%, transparent 95%)', margin: '20px 0' }}></div>
                  <div className="flex flex-column text-center mt-6">
                      <span className="font-orbitron text-sm mb-2" style={{ color: '#a0bdff', letterSpacing: '0.05em' }}>SCORE GAINED:</span>
                      <span className="font-orbitron font-bold text-4xl text-glow-gold" style={{ color: 'var(--accent-gold)' }}>+{results.score}</span>
                  </div>
                </>
              )}
          </div>
        </div>

        {/* Footer: always at the bottom of screen-container, never moves */}
        <div className="screen-footer" style={{ justifyContent: 'center', gap: '20px' }}>
          <button onClick={() => startGame(level)} className="btn-secondary" style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}>Next</button>
          <button onClick={stopGame} className="btn-secondary">Done</button>
        </div>
      </>
    );
  }

  return null;
}
