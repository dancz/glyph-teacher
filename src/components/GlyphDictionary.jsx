import React, { useMemo, useState } from 'react';
import { glyphsData } from '../data';
import GlyphGrid from './GlyphGrid';
import { getAllGlyphProgress, getStatSummary, toggleKnownWell } from '../services/progressService';

export default function GlyphDictionary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [progress, setProgress] = useState(getAllGlyphProgress());

  const handleToggleKnown = (edgeStr, isKnown) => {
      toggleKnownWell(edgeStr, 'glyph', isKnown);
      setProgress(getAllGlyphProgress());
  };

  const filteredGlyphs = useMemo(() => {
    if (!searchTerm) return glyphsData;
    return glyphsData.filter(g => 
      g.names.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm]);

  return (
    <div className="scroll-content w-full flex-column py-6 px-4">
      <h1 className="text-glow-cyan font-orbitron text-3xl mb-6 text-center">GLYPH DICTIONARY</h1>
      
      <div className="mb-6 w-full max-w-sm mx-auto">
        <input 
          type="text" 
          placeholder="SEARCH GLYPHS..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black font-orbitron p-3 text-glow-cyan"
          style={{ border: '1px solid var(--accent-cyan-dim)', borderRadius: '4px', outline: 'none' }}
        />
      </div>

      <div className="grid w-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '20px' }}>
        {filteredGlyphs.map((glyph, i) => {
          const summary = getStatSummary(progress[glyph.edges]);
          return (
          <div key={i} className="flex-column items-center justify-start p-4" style={{ background: 'rgba(20, 20, 35, 0.6)', border: `1px solid ${summary.knownWell ? 'rgba(0, 255, 100, 0.4)' : 'rgba(130, 100, 200, 0.2)'}`, borderRadius: '8px', position: 'relative' }}>
            <div className="w-full flex justify-end" style={{ marginBottom: '5px' }}>
               <label className="font-orbitron" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={summary.knownWell} onChange={(e) => handleToggleKnown(glyph.edges, e.target.checked)} />
                  <span style={{ fontSize: '0.5rem', color: summary.knownWell ? '#00ff66' : 'var(--text-muted)' }}>KNOWN WELL</span>
               </label>
            </div>
            <div style={{ width: '80px', height: '80px', marginBottom: '15px' }}>
                <GlyphGrid 
                    mode="display" 
                    glyphStr={glyph.edges} 
                    size="100%" 
                    mini={true} 
                    showNodes={true}
                    customLineClass={summary.knownWell ? "success-edge" : "display-edge"}
                />
            </div>
            {glyph.names.map((name, idx) => (
                <div key={idx} className="font-orbitron text-center uppercase" style={{ fontSize: '0.8rem', color: idx === 0 ? '#fff' : '#a0bdff', textShadow: idx === 0 ? '0 0 5px rgba(0, 229, 255, 0.5)' : 'none', marginBottom: '4px' }}>
                    {name}
                </div>
            ))}
            {summary.attempts > 0 && (
                <div className="font-orbitron" style={{ fontSize: '0.75rem', color: '#dcaaff', marginTop: '8px' }}>
                    SUCCESS {summary.pct}%
                </div>
            )}
          </div>
        )})}
      </div>
      {filteredGlyphs.length === 0 && (
          <div className="text-center font-orbitron mt-8" style={{ color: 'var(--text-muted)' }}>NO GLYPHS FOUND</div>
      )}
    </div>
  );
}
