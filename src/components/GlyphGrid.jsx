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
  const trailBeamRef = useRef(null);
  const trailCoreRef = useRef(null);
  const trailPointsRef = useRef([]);
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
      
      // Initialize trail from the starting node
      const [nx, ny] = NODE_POS[nodeIdx];
      const d = `M ${nx} ${ny}`;
      trailPointsRef.current = [{x: nx, y: ny}];
      if (trailBeamRef.current) trailBeamRef.current.setAttribute('d', d);
      if (trailCoreRef.current) trailCoreRef.current.setAttribute('d', d);
      
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
    
    // Add point to trail and update DOM directly (no React re-render)
    trailPointsRef.current.push(coords);
    
    // Build path string - limit density for performance if needed
    // Simple path: M x1 y1 L x2 y2 ...
    const d = trailPointsRef.current.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ');
    
    if (trailBeamRef.current) trailBeamRef.current.setAttribute('d', d);
    if (trailCoreRef.current) trailCoreRef.current.setAttribute('d', d);
    
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

        // Reset trail to start at the new node
        const [nx, ny] = NODE_POS[nodeIdx];
        trailPointsRef.current = [{x: nx, y: ny}];
        const rd = `M ${nx} ${ny}`;
        if (trailBeamRef.current) trailBeamRef.current.setAttribute('d', rd);
        if (trailCoreRef.current) trailCoreRef.current.setAttribute('d', rd);
      }
    }
  };

  const handlePointerUp = (e) => {
    ctmInverseRef.current = null; // Clear CTM cache
    if (mode !== 'input' || !isDrawing) return;
    setIsDrawing(false);
    lastNodeRef.current = null;
    trailPointsRef.current = [];
    
    // Clear trail visually
    if (trailBeamRef.current) trailBeamRef.current.setAttribute('d', '');
    if (trailCoreRef.current) trailCoreRef.current.setAttribute('d', '');
    
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
        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="1" />
            <stop offset="50%" stopColor="#dcaaff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffbe00" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Drawn edges / Display edges - Multi-layered for Ingress-fidelity */}
        {displayEdges.map((edge, idx) => {
          const [n1, n2] = edge;
          const p1 = NODE_POS[n1];
          const p2 = NODE_POS[n2];
          const isDrawn = mode === 'input';
          const lineClass = customLineClass || (mode === 'display' ? (mini ? 'mini-edge' : 'display-edge') : 'drawn-edge');
          
          return (
            <g key={idx} className={`edge-group ${lineClass}`}>
               {/* 1. Underlying wide glow (Outer) */}
               <line 
                  x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} 
                  className="edge-layer-glow-outer"
               />
               {/* 2. Narrow glowing beam (Inner) */}
               <line 
                  x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} 
                  className="edge-layer-glow-inner"
               />
               {/* 3. Particle "Energy" layer */}
               <line 
                  x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} 
                  className="edge-layer-particles"
               />
               {/* 4. Bright core center */}
               <line 
                  x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} 
                  className="edge-layer-core"
               />
            </g>
          );
        })}

        {/* Current drawing electric beam */}
        {mode === 'input' && (
          <g style={{ opacity: isDrawing ? 1 : 0, transition: 'opacity 0.2s' }}>
            <path
              ref={trailBeamRef}
              className="drawing-beam"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              ref={trailCoreRef}
              className="drawing-core"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Nodes - Improved Fidelity */}
        {showNodes && NODE_POS.map((pos, idx) => {
          const isActive = activeNodes.includes(idx) || (mode === 'display' && displayEdges.some(e => e[0]===idx || e[1]===idx));
          const rBase = mini ? 0.04 : 0.055;
          return (
            <g key={idx} className={`node-group ${mini ? 'mini-node' : ''} ${isActive ? 'active' : ''}`}>
              {/* Layer 1: Wide faint halo */}
              <circle cx={pos[0]} cy={pos[1]} r={rBase * 2.8} className="node-halo-outer" />
              {/* Layer 2: Glowing rim */}
              <circle cx={pos[0]} cy={pos[1]} r={rBase * 1.8} className="node-halo-inner" />
              {/* Layer 3: Center point */}
              <circle cx={pos[0]} cy={pos[1]} r={rBase} className="node-core" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
