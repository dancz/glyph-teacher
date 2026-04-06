import React, { useMemo, useState } from 'react';
import { sequencesData, getEdgesForWord } from '../data';
import GlyphGrid from './GlyphGrid';

export default function SequenceDictionary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState(null);

  const getTargetSet = (lvl) => {
    if(lvl >= 8) return 8;
    if(lvl >= 7) return 7;
    if(lvl >= 6) return 5; 
    if(lvl >= 3) return 2;
    return 0;
  };

  // Group sequences by length (number of words)
  const groupedSequences = useMemo(() => {
    const groups = {};
    
    // Sort and filter exactly like the dictionary search
    sequencesData.forEach(seq => {
        if (levelFilter !== null) {
            const target = getTargetSet(levelFilter);
            if (!seq.levels.includes(target)) return;
        }

        const sentence = seq.words.join(' ').toLowerCase();
        if (searchTerm && !sentence.includes(searchTerm.toLowerCase())) return;
        
        const len = seq.words.length;
        if (!groups[len]) groups[len] = [];
        // Only push if not completely identical
        const exists = groups[len].some(s => s.words.join(' ') === seq.words.join(' '));
        if (!exists) {
            groups[len].push(seq);
        }
    });
    
    return groups;
  }, [searchTerm, levelFilter]);

  const lengths = Object.keys(groupedSequences).sort((a,b) => parseInt(a) - parseInt(b));

  return (
    <div className="scroll-content w-full flex-column py-6 px-4">
      <h1 className="text-glow-cyan font-orbitron text-3xl mb-6 text-center">SEQUENCES</h1>
      
      <div className="mb-6 w-full max-w-sm mx-auto">
        <input 
          type="text" 
          placeholder="SEARCH SEQUENCES..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black font-orbitron p-3 text-glow-cyan"
          style={{ border: '1px solid var(--accent-cyan-dim)', borderRadius: '4px', outline: 'none' }}
        />
      </div>

      <div className="flex flex-wrap justify-center mb-8 max-w-md mx-auto" style={{ gap: '8px' }}>
          <button 
             className="btn-primary" 
             style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: levelFilter === null ? 1 : 0.5 }}
             onClick={() => setLevelFilter(null)}
          >
             ALL
          </button>
          {[1,2,3,4,5,6,7,8].map(l => (
             <button
               key={l}
               className="btn-primary"
               style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: levelFilter === l ? 1 : 0.5 }}
               onClick={() => setLevelFilter(l)}
             >
               L{l}
             </button>
          ))}
      </div>

      <div className="w-full flex-column max-w-md mx-auto" style={{ gap: '30px' }}>
        {lengths.map(len => (
           <div key={len} className="flex-column">
              <h2 className="font-orbitron text-left mb-4" style={{ color: '#dcaaff', borderBottom: '1px solid rgba(220, 170, 255, 0.3)', paddingBottom: '5px' }}>
                  {len}-GLYPH SEQUENCES
              </h2>
              
              <div className="flex-column" style={{ gap: '15px' }}>
                  {groupedSequences[len].map((seq, idx) => (
                      <div key={idx} className="flex-column p-4" style={{ background: 'rgba(20, 20, 35, 0.6)', border: '1px solid rgba(130, 100, 200, 0.2)', borderRadius: '8px' }}>
                          <div className="flex justify-start items-center mb-3" style={{ gap: '10px', flexWrap: 'wrap' }}>
                             {seq.words.map((word, wIdx) => {
                                 const edges = getEdgesForWord(word);
                                 return (
                                     <div key={wIdx} style={{ width: '40px', height: '40px' }}>
                                         <GlyphGrid 
                                            mode="display" 
                                            glyphStr={edges} 
                                            size="100%" 
                                            mini={true} 
                                            customLineClass="display-edge"
                                         />
                                     </div>
                                 )
                             })}
                          </div>
                          <div className="font-orbitron uppercase" style={{ fontSize: '0.9rem', color: '#fff', textShadow: '0 0 5px rgba(0, 229, 255, 0.4)', lineHeight: '1.4' }}>
                              {seq.words.join(' ')}
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        ))}
        {lengths.length === 0 && (
          <div className="text-center font-orbitron mt-8" style={{ color: 'var(--text-muted)' }}>NO SEQUENCES FOUND</div>
        )}
      </div>
    </div>
  );
}
