import React, { useState } from 'react';
import { useGlyphGame, GAME_STATES } from './hooks/useGlyphGame';
import HackScreen from './components/HackScreen';
import GlyphDictionary from './components/GlyphDictionary';
import SequenceDictionary from './components/SequenceDictionary';
import TrainingScreen from './components/TrainingScreen';

function App() {
  const game = useGlyphGame();
  const [currentTab, setCurrentTab] = useState('hack'); // 'hack', 'glyphs', 'sequences'

  const renderContent = () => {
    if (currentTab === 'glyphs') return <GlyphDictionary />;
    if (currentTab === 'sequences') return <SequenceDictionary />;
    if (currentTab === 'train') return <TrainingScreen />;
    
    // Hack screen
    if (game.gameState === GAME_STATES.IDLE) {
      return (
        <div className="scroll-content flex-column flex-center w-full p-6 text-center">
            <h1 className="text-glow-cyan font-orbitron text-4xl mb-2 mt-8">GLYPH HACKER</h1>
            <p className="mb-8" style={{ color: 'var(--text-muted)' }}>PREPARE FOR INCOMING SEQUENCE</p>
            
            <div className="flex flex-column w-full px-8 mb-8" style={{ maxWidth: '400px' }}>
               <label className="font-orbitron mb-2 text-glow-cyan">TARGET PORTAL LEVEL</label>
               <div className="flex justify-between w-full mt-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                     <button
                        key={l}
                        onClick={() => game.startGame(l)}
                        className="btn-primary"
                        style={{ padding: '10px 15px', opacity: game.level === l ? 1 : 0.7 }}
                     >
                        L{l}
                     </button>
                  ))}
               </div>
            </div>

            <div style={{ color: 'var(--accent-cyan-dim)', maxWidth: '80%', fontSize: '0.8rem', marginTop: 'auto', marginBottom: '20px' }}>
                Replication of the Ingress Glyph Hack Mini-Game. <br/>
                Select a level above to commence hacking.
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
