const fs = require('fs');
const RT3 = Math.sqrt(3);
const NODE_POS = [
  [0, -1], [RT3 / 2, -1 / 2], [RT3 / 2, 1 / 2], [0, 1], [-RT3 / 2, 1 / 2], [-RT3 / 2, -1 / 2],
  [RT3 / 4, -1 / 4], [RT3 / 4, 1 / 4], [-RT3 / 4, 1 / 4], [-RT3 / 4, -1 / 4],
  [0, 0]
];

const edges = [[3, 6], [3, 9], [6, 10], [9, 10]];

const ox = 50, oy = 50, s = 40;
function pt(idx) {
  return { x: ox + NODE_POS[idx][0] * s, y: oy + NODE_POS[idx][1] * s };
}

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="dimGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="100" height="100" fill="#0b0e14" rx="20" />`;

// Inactive nodes (dimmer)
NODE_POS.forEach((p, i) => {
  if (![3,6,9,10].includes(i)) {
    const loc = pt(i);
    svg += `\n  <circle cx="${loc.x}" cy="${loc.y}" r="2" fill="#202535" />`;
    svg += `\n  <circle cx="${loc.x}" cy="${loc.y}" r="0.5" fill="#404b66" />`;
  }
});

// Edges glow layered (like GlyphGrid.jsx)
svg += `\n  <g stroke-linecap="round" stroke-linejoin="round">`;
edges.forEach(e => {
  const p1 = pt(e[0]);
  const p2 = pt(e[1]);
  // outer glow
  svg += `\n    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#00e5ff" stroke-width="5" opacity="0.4" filter="url(#glow)"/>`;
  // core
  svg += `\n    <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#ffffff" stroke-width="2" opacity="0.9" filter="url(#glow)"/>`;
});
svg += `\n  </g>`;

// Active nodes
[3,6,9,10].forEach(i => {
  const loc = pt(i);
  // outer halo
  svg += `\n  <circle cx="${loc.x}" cy="${loc.y}" r="4" fill="#00e5ff" opacity="0.5" filter="url(#dimGlow)"/>`;
  // core
  svg += `\n  <circle cx="${loc.x}" cy="${loc.y}" r="2.5" fill="#ffffff" filter="url(#glow)"/>`;
});

svg += `\n</svg>`;
fs.writeFileSync('public/favicon.svg', svg);
console.log('Saved favicon.svg');
