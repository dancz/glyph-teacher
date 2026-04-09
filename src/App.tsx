import React, { useState } from 'react';
import { useGlyphGame } from './hooks/useGlyphGame';
import { GAME_STATES } from './constants';
import { getWeeklyScores } from './services/scoreService';
import HackScreen from './components/HackScreen';
import GlyphDictionary from './components/GlyphDictionary';
import SequenceDictionary from './components/SequenceDictionary';
import TrainingScreen from './components/TrainingScreen';
import LoginButton from './components/LoginButton';

function App() {
  const game = useGlyphGame();
  const [currentTab, setCurrentTab] = useState('hack'); // 'hack', 'glyphs', 'sequences'

  const renderContent = () => {
    if (currentTab === 'glyphs') return <GlyphDictionary />;
    if (currentTab === 'sequences') return <SequenceDictionary />;
    if (currentTab === 'train') return <TrainingScreen />;
    
    // Hack screen
    if (game.gameState === GAME_STATES.IDLE) {
      const weeklyScores = getWeeklyScores();
      return (
        <div className="scroll-content flex-column flex-center w-full p-6 text-center">
            <h1 className="text-glow-cyan font-orbitron text-4xl mb-2 mt-8">GLYPH TEACHER</h1>
            <p className="mb-8" style={{ color: 'var(--text-muted)' }}>PREPARE FOR INCOMING SEQUENCE</p>
            
            {weeklyScores.total > 0 && (
              <div className="mb-4 flex flex-column text-center">
                <span className="font-orbitron text-xs mb-1 text-glow-gold" style={{ color: 'var(--accent-gold-dim)' }}>WEEKLY SCORE</span>
                <span className="font-orbitron text-2xl" style={{ color: 'var(--accent-gold)' }}>{weeklyScores.total.toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex flex-column w-full px-8 mb-4" style={{ maxWidth: '400px' }}>
               <label className="font-orbitron mb-2 text-glow-cyan">GLYPH SEQUENCE LENGTH</label>
               <div className="flex justify-between w-full mt-4 px-4">
                  {[1, 2, 3, 4, 5].map(l => (
                     <div key={l} className="flex flex-column flex-center" style={{ gap: '6px' }}>
                       <button
                          onClick={() => game.startGame(l)}
                          className="btn-primary"
                          style={{ padding: '10px 18px', opacity: game.level === l ? 1 : 0.7 }}
                       >
                          {l}
                       </button>
                     </div>
                  ))}
               </div>
            </div>

            <div className="flex flex-column items-center w-full mt-2 mb-8" style={{ maxWidth: '300px' }}>
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(180, 150, 255, 0.4), transparent)', width: '100%', marginBottom: '15px' }} />
                {[1, 2, 3, 4, 5].map(l => {
                    const sc = weeklyScores[`L${l}`] || 0;
                    const correct = weeklyScores[`L${l}_correct`] || 0;
                    const total = weeklyScores[`L${l}_total`] || 0;
                    const pct = total > 0 ? Math.floor((correct / total) * 100) : null;
                    return (
                       <div key={l} className="flex justify-between w-full font-orbitron mb-2 px-8">
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{l} GLYPH{l > 1 ? 'S' : ''}</span>
                           <div className="flex justify-end items-center" style={{ gap: '15px' }}>
                               <span style={{ color: 'var(--accent-gold)', fontSize: '0.85rem', minWidth: '40px', textAlign: 'right' }}>{sc.toLocaleString()}</span>
                               <span style={{ color: pct !== null ? '#dcaaff' : 'transparent', fontSize: '0.85rem', minWidth: '45px', textAlign: 'right' }}>
                                   {pct !== null ? `${pct}%` : '0%'}
                               </span>
                           </div>
                       </div>
                    );
                })}
            </div>

            <div style={{ color: 'var(--accent-cyan-dim)', maxWidth: '80%', fontSize: '0.8rem', marginTop: 'auto', marginBottom: '20px' }}>
                Replication of the Ingress Glyph Hack Mini-Game. <br/>
                Created by DanPrg <br/>
                Select a sequence length above to commence hacking.
                <div style={{ marginTop: '10px', fontSize: '0.6rem', opacity: 0.5 }}>
                  {/* eslint-disable-next-line no-undef */}
                  v{__APP_VERSION__}
                </div>
            </div>
        </div>
      );
    }
    return <HackScreen game={game} />;
  };

  return (
    <div className="screen-container">
      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 100 }}>
        <LoginButton />
      </div>
      {renderContent()}
      
      {game.gameState === GAME_STATES.IDLE && (
          <nav className="bottom-nav">
              <button className={`nav-item ${currentTab === 'hack' ? 'active' : ''}`} onClick={() => setCurrentTab('hack')}>HACK</button>
              <button className={`nav-item ${currentTab === 'train' ? 'active' : ''}`} onClick={() => setCurrentTab('train')}>TRAIN</button>
              <button className={`nav-item ${currentTab === 'glyphs' ? 'active' : ''}`} onClick={() => setCurrentTab('glyphs')}>GLYPHS</button>
              <button className={`nav-item ${currentTab === 'sequences' ? 'active' : ''}`} onClick={() => setCurrentTab('sequences')}>SEQS</button>
          </nav>
      )}
    </div>
  );
}

export default App;
