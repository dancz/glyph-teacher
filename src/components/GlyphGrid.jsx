import React, { useState, useRef, useEffect, useCallback } from 'react';
import './GlyphGrid.css';

const RT3 = Math.sqrt(3);
const NODE_POS = [
  [0, -1], [RT3 / 2, -1 / 2], [RT3 / 2, 1 / 2], [0, 1], [-RT3 / 2, 1 / 2], [-RT3 / 2, -1 / 2],
  [RT3 / 4, -1 / 4], [RT3 / 4, 1 / 4], [-RT3 / 4, 1 / 4], [-RT3 / 4, -1 / 4],
  [0, 0]
];

// Hexagon boundary
const HEXAGON_PTS = [
  [0, -1], [RT3 / 2, -1 / 2], [RT3 / 2, 1 / 2], [0, 1], [-RT3 / 2, 1 / 2], [-RT3 / 2, -1 / 2]
].map(p => `${p[0]},${p[1]}`).join(' ');

/**
 * Parses an edge string (e.g. "0112" -> [[0,1], [1,2]])
 * or handles arrays of edges.
 */
function parseEdges(edgeStr) {
  if (!edgeStr) return [];
  if (Array.isArray(edgeStr)) return edgeStr; // already parsed
  const edges = [];
  for (let i = 1; i < edgeStr.length; i += 2) {
    const a = parseInt(edgeStr.charAt(i - 1), 11);
    const b = parseInt(edgeStr.charAt(i), 11);
    // ensure order a < b for canonical comparison later if needed, but here we just trace
    edges.push([a, b]);
  }
  return edges;
}

export default function GlyphGrid({
  mode = 'display', // 'display' | 'input'
  glyphStr = '',   // string of edges to display
  onInputEnd = null, // callback(inputStr)
  size = 300,
  showGuides = true,
  mini = false,
  customLineClass = '',
  showNodes = !mini
}) {
  const svgRef = useRef(null);
  
  // State for input mode
  const [activeNodes, setActiveNodes] = useState([]);
  const [drawnEdges, setDrawnEdges] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Refs for tracking drawing securely and high-performance pointer updates
  const activeLineRef = useRef(null);
  const ctmInverseRef = useRef(null);
  const lastNodeRef = useRef(null);
  const pointerCoordsRef = useRef({ x: 0, y: 0 });

  // Derived display edges depending on mode
  const displayEdges = mode === 'display' ? parseEdges(glyphStr) : drawnEdges;

  const getPointerCoords = (e) => {
    if (!svgRef.current) return null;
    
    let ctmInv = ctmInverseRef.current;
    if (!ctmInv) {
      const CTM = svgRef.current.getScreenCTM();
      if (!CTM) return null;
      ctmInv = CTM.inverse();
    }
    
    // Support mouse and touch
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
    
    // Convert to SVG coordinate system
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(ctmInv);
    return { x: svgP.x, y: svgP.y };
  };

  const findNearestNode = (x, y, threshold = 0.25) => {
    let nearestIdx = -1;
    let minDist = Infinity;
    
    for (let i = 0; i < NODE_POS.length; i++) {
      const [nx, ny] = NODE_POS[i];
      const dist = Math.hypot(nx - x, ny - y);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    
    if (minDist <= threshold) return nearestIdx;
    return -1;
  };

  const handlePointerDown = (e) => {
    if (mode !== 'input') return;
    
    // Cache CTM on pointer down to avoid layout thrashing during drawing
    const CTM = svgRef.current?.getScreenCTM();
    if (CTM) {
      ctmInverseRef.current = CTM.inverse();
    }

    const coords = getPointerCoords(e);
    if (!coords) {
      ctmInverseRef.current = null;
      return;
    }
    
    pointerCoordsRef.current = coords;
    
    const nodeIdx = findNearestNode(coords.x, coords.y);
    if (nodeIdx !== -1) {
      setIsDrawing(true);
      lastNodeRef.current = nodeIdx;
      setActiveNodes([nodeIdx]);
      setDrawnEdges([]);
      e.target.setPointerCapture(e.pointerId);
    } else {
      ctmInverseRef.current = null;
    }
  };

  const handlePointerMove = (e) => {
    if (mode !== 'input' || !isDrawing) return;
    const coords = getPointerCoords(e);
    if (!coords) return;
    
    pointerCoordsRef.current = coords; // Save for render phase
    
    // Direct DOM mutation for high-performance drawing (bypass React state)
    if (activeLineRef.current) {
        activeLineRef.current.setAttribute('x2', coords.x);
        activeLineRef.current.setAttribute('y2', coords.y);
    }
    
    const nodeIdx = findNearestNode(coords.x, coords.y, 0.25); // Better precision Snap
    if (nodeIdx !== -1) {
      const lastNode = lastNodeRef.current;
      if (lastNode !== nodeIdx) {
        // Did we hit a new node?
        // Update ref immediately to prevent race conditions causing duplicate entries
        lastNodeRef.current = nodeIdx;
        
        // Add to active nodes and drawn edges
        setActiveNodes(prev => {
          if (prev[prev.length - 1] === nodeIdx) return prev;
          return [...prev, nodeIdx];
        });
        
        let a = lastNode;
        let b = nodeIdx;
        if (a > b) { let tmp = a; a = b; b = tmp; }
        
        // Prevent duplicate edges
        setDrawnEdges(prev => {
          const exists = prev.some(e => e[0] === a && e[1] === b);
          if (exists) return prev;
          return [...prev, [a, b]];
        });
      }
    }
  };

  const handlePointerUp = (e) => {
    ctmInverseRef.current = null; // Clear CTM cache
    if (mode !== 'input' || !isDrawing) return;
    setIsDrawing(false);
    lastNodeRef.current = null;
    e.target.releasePointerCapture(e.pointerId);
    
    if (onInputEnd) {
      // Serialize edges to string format: "ab" for each edge
      // Sort edges for canonical representation
      const sortedEdges = [...drawnEdges].map(e => (e[0] < e[1] ? e : [e[1], e[0]]));
      sortedEdges.sort((e1, e2) => {
        if (e1[0] !== e2[0]) return e1[0] - e2[0];
        return e1[1] - e2[1];
      });
      
      const resultStr = sortedEdges.map(e => e[0].toString(11) + e[1].toString(11)).join('');
      onInputEnd(resultStr, drawnEdges, activeNodes);
    }
  };

  const handlePointerCancel = (e) => {
    if (isDrawing) handlePointerUp(e);
  };

  // Reset state if mode or glyph changes
  useEffect(() => {
    if (mode === 'display') {
      setIsDrawing(false);
      setActiveNodes([]);
      setDrawnEdges([]);
      lastNodeRef.current = null;
    }
  }, [mode, glyphStr]);

  return (
    <div className="glyph-grid-container" style={mini ? {width: size, height: size} : { width: size }}>
      <svg 
        ref={svgRef}
        viewBox="-1.05 -1.15 2.1 2.3"
        width="100%" 
        height="100%"
        className={`glyph-svg ${mode === 'input' ? 'inputting' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Background hexagon guide */}
        {showGuides && (
          <polygon 
            points={HEXAGON_PTS} 
            className="guide-hexagon"
          />
        )}

        {/* Drawn edges / Display edges */}
        {displayEdges.map((edge, idx) => {
          const [n1, n2] = edge;
          const p1 = NODE_POS[n1];
          const p2 = NODE_POS[n2];
          return (
             <line 
                key={idx} 
                x1={p1[0]} y1={p1[1]} 
                x2={p2[0]} y2={p2[1]} 
                className={`glyph-edge ${customLineClass || (mode === 'display' ? (mini ? 'mini-edge' : 'display-edge') : 'drawn-edge')}`}
             />
          );
        })}

        {/* Current drawing line */}
        {isDrawing && activeNodes.length > 0 && (
          <line
            ref={activeLineRef}
            x1={NODE_POS[activeNodes[activeNodes.length - 1]][0]}
            y1={NODE_POS[activeNodes[activeNodes.length - 1]][1]}
            x2={pointerCoordsRef.current.x} 
            y2={pointerCoordsRef.current.y}
            className="drawing-edge"
          />
        )}

        {/* Nodes */}
        {showNodes && NODE_POS.map((pos, idx) => {
          const isActive = activeNodes.includes(idx) || (mode === 'display' && displayEdges.some(e => e[0]===idx || e[1]===idx));
          return (
            <circle 
              key={idx} 
              cx={pos[0]} 
              cy={pos[1]} 
              r={mini ? "0.05" : "0.08"} 
              className={`glyph-node ${mini ? 'mini-node' : ''} ${isActive ? 'active' : ''}`}
            />
          );
        })}
      </svg>
    </div>
  );
}
