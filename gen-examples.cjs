const fs = require('fs');
const dst = 'c:/projects/cellblock/public/examples/';
const COLS = 100, ROWS = 100, CS = 9;

function mkCells(cols, rows, id) {
  const c = {};
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) c[`${x},${y}`] = id;
  return c;
}

function fillRandom(cells, cols, rows, weights) {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
    let r = Math.random() * total, cum = 0;
    for (const w of weights) { cum += w.weight; if (r < cum) { cells[`${x},${y}`] = w.id; break; } }
  }
}

function write(name, data) {
  fs.writeFileSync(dst + name, JSON.stringify(data, null, 2));
  const rules = data.layers.reduce((s, l) => s + l.rules.length, 0);
  console.log(`${name}: ${data.grid.cols}x${data.grid.rows} ${data.species.length} species ${rules} rules`);
}

// ── Conway Gliders (4-way Gosper Gun Battle) ──────────────────────────────────
{
  // Gosper Glider Gun — fires SE, bounding box 36×9
  const GUN = [
    [24,0],
    [22,1],[24,1],
    [12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
    [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],
    [0,4],[1,4],[10,4],[16,4],[20,4],[21,4],
    [0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],
    [10,6],[16,6],[24,6],
    [11,7],[15,7],
    [12,8],[13,8],
  ];

  const cells = mkCells(COLS, ROWS, 'sp1');
  function placeGun(tf) {
    GUN.forEach(([x,y]) => {
      const [cx,cy] = tf(x,y);
      if (cx>=0 && cx<COLS && cy>=0 && cy<ROWS) cells[`${cx},${cy}`] = 'sp2';
    });
  }

  // SE — top-left corner, fires toward bottom-right
  placeGun((x,y) => [1+x,    3+y]);
  // NW — bottom-right corner (180°: x→35-x, y→8-y), fires toward top-left
  placeGun((x,y) => [99-x,   97-y]);
  // SW — top-right corner (90° CW: x→8-y, y→x), fires toward bottom-left
  placeGun((x,y) => [97-y,   1+x]);
  // NE — bottom-left corner (90° CCW: x→y, y→35-x), fires toward top-right
  placeGun((x,y) => [2+y,    98-x]);

  write('Gliders.json', {
    version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
    species:[{id:'sp1',name:'Dead',color:'#000000'},{id:'sp2',name:'Alive',color:'#49aa3c'}],
    layers:[{id:'l1',name:'Base',visible:true,cells,rules:[
      {id:'r1',raw:'Alive + <2Alive -> Dead * 1.0'},
      {id:'r2',raw:'Alive + >3Alive -> Dead * 1.0'},
      {id:'r3',raw:'Dead + 3Alive -> Alive * 1.0'},
    ]}],
    activeLayerId:'l1', activeSpeciesId:'sp2', resetSpeciesIds:['sp1','sp2'],
  });
}

// ── Forest Fire ───────────────────────────────────────────────────────────────
{
  const cells = mkCells(COLS, ROWS, 'ground');
  fillRandom(cells, COLS, ROWS, [
    {id:'ground',weight:8},{id:'young',weight:22},{id:'old',weight:70},
  ]);
  for (let i = 0; i < 4; i++) {
    const x = 5 + Math.floor(Math.random() * (COLS - 10));
    const y = 5 + Math.floor(Math.random() * (ROWS - 10));
    cells[`${x},${y}`] = 'fire';
  }
  write('ForestFire.json', {
    version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
    species:[
      {id:'ground',name:'Ground',color:'#1a0e05'},
      {id:'young', name:'Young', color:'#66cc22'},
      {id:'old',   name:'Old',   color:'#1a5c08'},
      {id:'fire',  name:'Fire',  color:'#ff6600'},
      {id:'ash',   name:'Ash',   color:'#484040'},
    ],
    layers:[{id:'l1',name:'Forest',visible:true,cells,rules:[
      {id:'r1',raw:'Ground -> Young * 0.002'},
      {id:'r2',raw:'Young -> Old * 0.003'},
      {id:'r3',raw:'Old + >6Old -> Fire * 0.0001'},
      {id:'r4',raw:'Young + >=1Fire -> Fire * 0.08'},
      {id:'r5',raw:'Old + >=1Fire -> Fire * 0.18'},
      {id:'r6',raw:'Fire -> Ash * 0.3'},
      {id:'r7',raw:'Ash -> Ground * 0.05'},
    ]}],
    activeLayerId:'l1', activeSpeciesId:'fire', resetSpeciesIds:['ground','young','old'],
  });
}

// ── Crystals ──────────────────────────────────────────────────────────────────
{
  const cells = mkCells(COLS, ROWS, 'water');
  const nSeeds = 12 + Math.floor(Math.random() * 10);
  for (let i = 0; i < nSeeds; i++) {
    cells[`${Math.floor(Math.random()*COLS)},${Math.floor(Math.random()*ROWS)}`] = 'ice';
  }
  write('crystals.json', {
    version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
    species:[{id:'water',name:'Water',color:'#0f4b70'},{id:'ice',name:'Ice',color:'#b9e8ff'}],
    layers:[{id:'l1',name:'Base',visible:true,cells,rules:[
      {id:'r1',raw:'Water + 1Ice -> Ice * 0.02'},
      {id:'r2',raw:'Water + 2Ice -> Ice * 0.1'},
      {id:'r3',raw:'Water + 3Ice -> Ice * 0.4'},
      {id:'r4',raw:'Ice + >=5Ice -> Water * 0.002'},
      {id:'r5',raw:'Ice + >=6Ice -> Water * 0.01'},
      {id:'r6',raw:'Ice + <2Ice -> Water * 0.05'},
    ]}],
    activeLayerId:'l1', activeSpeciesId:'ice', resetSpeciesIds:['water'],
  });
}

// ── Eat (RPS) ─────────────────────────────────────────────────────────────────
write('eat.json', {
  version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
  species:[
    {id:'sp1',name:'Empty',   color:'#000000'},
    {id:'sp2',name:'Species1',color:'#ff0000'},
    {id:'sp3',name:'Species2',color:'#00ff00'},
    {id:'sp4',name:'Species3',color:'#0000ff'},
  ],
  layers:[{id:'l1',name:'Simulator',visible:true,cells:mkCells(COLS,ROWS,'sp1'),rules:[
    {id:'r1',raw:'Empty + 8Empty -> Species1 * 0.00001'},
    {id:'r2',raw:'Empty + 8Empty -> Species2 * 0.00001'},
    {id:'r3',raw:'Empty + 8Empty -> Species3 * 0.00001'},
    {id:'r4',raw:'Empty + >=1Species1 -> Species1 * 0.1'},
    {id:'r5',raw:'Empty + >=1Species2 -> Species2 * 0.1'},
    {id:'r6',raw:'Empty + >=1Species3 -> Species3 * 0.1'},
    {id:'r7',raw:'Species1 + >=2Species2 -> Species2 * 0.1'},
    {id:'r8',raw:'Species2 + >=2Species3 -> Species3 * 0.1'},
    {id:'r9',raw:'Species3 + >=2Species1 -> Species1 * 0.1'},
  ]}],
  activeLayerId:'l1', activeSpeciesId:'sp2', resetSpeciesIds:['sp1'],
});

// ── Animating Patches ─────────────────────────────────────────────────────────
{
  const mkP = () => mkCells(COLS, ROWS, 'sp1');
  write('animating-patches.json', {
    version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
    species:[
      {id:'sp1',name:'Init',    color:'#202020'},
      {id:'sp2',name:'Color1',  color:'#800000'},
      {id:'sp3',name:'Color2',  color:'#808000'},
      {id:'sp4',name:'Color3',  color:'#800080'},
      {id:'sp5',name:'Color4',  color:'#008000'},
      {id:'sp6',name:'Eraser',  color:'#202020'},
      {id:'sp7',name:'Eraser2', color:'#202020'},
    ],
    layers:[
      {id:'lsim',name:'Simulator',visible:true,cells:mkP(),rules:[
        {id:'sr1', raw:'Init -> Color1 * 0.0001'},
        {id:'sr2', raw:'Init -> Color2 * 0.0001'},
        {id:'sr3', raw:'Init -> Color3 * 0.0001'},
        {id:'sr4', raw:'Init -> Color4 * 0.0001'},
        {id:'sr5', raw:'Init + >=4Color1 -> Color1 * 1.0'},
        {id:'sr6', raw:'Init + >=4Color2 -> Color2 * 1.0'},
        {id:'sr7', raw:'Init + >=4Color3 -> Color3 * 1.0'},
        {id:'sr8', raw:'Init + >=4Color4 -> Color4 * 1.0'},
        {id:'sr9', raw:'Init + >=1Color1 -> Color1 * 0.1'},
        {id:'sr10',raw:'Init + >=1Color2 -> Color2 * 0.1'},
        {id:'sr11',raw:'Init + >=1Color3 -> Color3 * 0.1'},
        {id:'sr12',raw:'Init + >=1Color4 -> Color4 * 0.1'},
        {id:'sr13',raw:'Color1 + 8Color1 -> Eraser * 0.0001'},
        {id:'sr14',raw:'Color2 + 8Color2 -> Eraser * 0.0001'},
        {id:'sr15',raw:'Color3 + 8Color3 -> Eraser * 0.0001'},
        {id:'sr16',raw:'Color4 + 8Color4 -> Eraser * 0.0001'},
        {id:'sr17',raw:'Eraser -> Eraser2 * 1.0'},
        {id:'sr18',raw:'Eraser2 -> Init * 1.0'},
        {id:'sr19',raw:'Color1 + >=1Eraser -> Eraser * 0.75'},
        {id:'sr20',raw:'Color2 + >=1Eraser -> Eraser * 0.75'},
        {id:'sr21',raw:'Color3 + >=1Eraser -> Eraser * 0.75'},
        {id:'sr22',raw:'Color4 + >=1Eraser -> Eraser * 0.75'},
      ]},
      {id:'limg',name:'Image',visible:true,cells:mkP(),rules:[
        {id:'ir1', raw:'Init + Simulator:Color1 -> Color1 * 1.0'},
        {id:'ir2', raw:'Init + Simulator:Color2 -> Color2 * 1.0'},
        {id:'ir3', raw:'Init + Simulator:Color3 -> Color3 * 1.0'},
        {id:'ir4', raw:'Init + Simulator:Color4 -> Color4 * 1.0'},
        {id:'ir5', raw:'Color1 + Simulator:Color2 -> Color2 * 1.0'},
        {id:'ir6', raw:'Color1 + Simulator:Color3 -> Color3 * 1.0'},
        {id:'ir7', raw:'Color1 + Simulator:Color4 -> Color4 * 1.0'},
        {id:'ir8', raw:'Color2 + Simulator:Color1 -> Color1 * 1.0'},
        {id:'ir9', raw:'Color2 + Simulator:Color3 -> Color3 * 1.0'},
        {id:'ir10',raw:'Color2 + Simulator:Color4 -> Color4 * 1.0'},
        {id:'ir11',raw:'Color3 + Simulator:Color1 -> Color1 * 1.0'},
        {id:'ir12',raw:'Color3 + Simulator:Color2 -> Color2 * 1.0'},
        {id:'ir13',raw:'Color3 + Simulator:Color4 -> Color4 * 1.0'},
        {id:'ir14',raw:'Color4 + Simulator:Color1 -> Color1 * 1.0'},
        {id:'ir15',raw:'Color4 + Simulator:Color2 -> Color2 * 1.0'},
        {id:'ir16',raw:'Color4 + Simulator:Color3 -> Color3 * 1.0'},
      ]},
    ],
    activeLayerId:'limg', activeSpeciesId:'sp2', resetSpeciesIds:['sp1'],
  });
}

// ── Food ──────────────────────────────────────────────────────────────────────
{
  const mkP = () => mkCells(COLS, ROWS, 'sp1');
  write('food.json', {
    version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
    species:[
      {id:'sp1',name:'Init',    color:'#202020'},
      {id:'sp2',name:'Color1',  color:'#ff0000'},
      {id:'sp3',name:'Color2',  color:'#00ff00'},
      {id:'sp4',name:'Color3',  color:'#0000ff'},
      {id:'sp5',name:'Eraser',  color:'#202020'},
      {id:'sp6',name:'Eraser2', color:'#202020'},
    ],
    layers:[
      {id:'lsim',name:'Simulator',visible:true,cells:mkP(),rules:[
        {id:'sr1', raw:'Init -> Color1 * 0.000001'},
        {id:'sr2', raw:'Init -> Color2 * 0.000001'},
        {id:'sr3', raw:'Init -> Color3 * 0.000001'},
        {id:'sr4', raw:'Init + >=4Color1 -> Color1 * 1.0'},
        {id:'sr5', raw:'Init + >=4Color2 -> Color2 * 1.0'},
        {id:'sr6', raw:'Init + >=4Color3 -> Color3 * 1.0'},
        {id:'sr7', raw:'Init + >=1Color1 -> Color1 * 0.1'},
        {id:'sr8', raw:'Init + >=1Color2 -> Color2 * 0.1'},
        {id:'sr9', raw:'Init + >=1Color3 -> Color3 * 0.1'},
        {id:'sr10',raw:'Color1 + >=1Color2 + >=1Color3 -> Eraser * 0.001'},
        {id:'sr11',raw:'Color2 + >=1Color3 + >=1Color1 -> Eraser * 0.001'},
        {id:'sr12',raw:'Color3 + >=1Color1 + >=1Color2 -> Eraser * 0.001'},
        {id:'sr13',raw:'Eraser -> Eraser2 * 1.0'},
        {id:'sr14',raw:'Eraser2 -> Init * 1.0'},
        {id:'sr15',raw:'Color1 + >=1Eraser -> Eraser * 0.75'},
        {id:'sr16',raw:'Color2 + >=1Eraser -> Eraser * 0.75'},
        {id:'sr17',raw:'Color3 + >=1Eraser -> Eraser * 0.75'},
      ]},
      {id:'limg',name:'Image',visible:true,cells:mkP(),rules:[
        {id:'ir1',raw:'Init + Simulator:Color1 -> Color1 * 1.0'},
        {id:'ir2',raw:'Init + Simulator:Color2 -> Color2 * 1.0'},
        {id:'ir3',raw:'Init + Simulator:Color3 -> Color3 * 1.0'},
        {id:'ir4',raw:'Color1 + Simulator:Color2 -> Color2 * 1.0'},
        {id:'ir5',raw:'Color1 + Simulator:Color3 -> Color3 * 1.0'},
        {id:'ir6',raw:'Color2 + Simulator:Color1 -> Color1 * 1.0'},
        {id:'ir7',raw:'Color2 + Simulator:Color3 -> Color3 * 1.0'},
        {id:'ir8',raw:'Color3 + Simulator:Color2 -> Color2 * 1.0'},
        {id:'ir9',raw:'Color3 + Simulator:Color1 -> Color1 * 1.0'},
      ]},
    ],
    activeLayerId:'limg', activeSpeciesId:'sp2', resetSpeciesIds:['sp1'],
  });
}

// ── Abstract Impressionism ────────────────────────────────────────────────────
{
  const families = [
    {tiers:['Color1','Color1a','Color1b','Color1c'], hex:['#800000','#400000','#200000','#400000']},
    {tiers:['Color2','Color2a','Color2b','Color2c'], hex:['#808000','#404000','#202000','#404000']},
    {tiers:['Color3','Color3a','Color3b','Color3c'], hex:['#800080','#400040','#200020','#400040']},
    {tiers:['Color4','Color4a','Color4b','Color4c'], hex:['#008000','#004000','#002000','#004000']},
  ];
  const species = [{id:'sinit',name:'Init',color:'#202020'}];
  families.forEach(f => f.tiers.forEach((name,ti) => species.push({id:'sp'+name,name,color:f.hex[ti]})));

  const pRules = []; let pn=0; const pid=()=>'pr'+(++pn);
  ['Color1','Color2','Color3','Color4'].forEach(c => pRules.push({id:pid(),raw:`Init + >=4${c} -> ${c} * 1.0`}));
  ['Color1','Color2','Color3','Color4'].forEach(c => pRules.push({id:pid(),raw:`Init + >=1${c} -> ${c} * 0.1`}));
  ['Color1','Color2','Color3','Color4'].forEach(c => pRules.push({id:pid(),raw:`Init -> ${c} * 0.00001`}));
  families.forEach(f => { for(let i=0;i<4;i++) { const from=f.tiers[i],to=f.tiers[(i+1)%4]; pRules.push({id:pid(),raw:`${from} + >=3${from} -> ${to} * 1.0`}); }});

  const tierGroups = [
    ['Color1','Color2','Color3','Color4'],
    ['Color1a','Color2a','Color3a','Color4a'],
    ['Color1b','Color2b','Color3b','Color4b'],
    ['Color1c','Color2c','Color3c','Color4c'],
  ];
  const iRules = []; let im=0; const iid=()=>'ir'+(++im);
  tierGroups.forEach(tier => tier.forEach((src,si) => tier.forEach((dst,di) => {
    iRules.push({id:iid(),raw:`Init + Patches:${src} -> ${dst} * ${si===di?0.05:0.01}`});
  })));

  const mkP = () => mkCells(COLS, ROWS, 'sinit');
  write('abstract-impressionism.json', {
    version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS}, species,
    layers:[
      {id:'lpatches',name:'Patches',visible:true,cells:mkP(),rules:pRules},
      {id:'limage',  name:'Image',  visible:true,cells:mkP(),rules:iRules},
    ],
    activeLayerId:'limage', activeSpeciesId:'spColor1', resetSpeciesIds:['sinit'],
  });
}

// ── Plasma ────────────────────────────────────────────────────────────────────
write('plasma.json', {
  version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
  species:[
    {id:'sp1',name:'Initial',color:'#000000'},
    {id:'sp2',name:'Color1', color:'#000040'},
    {id:'sp3',name:'Color2', color:'#000080'},
    {id:'sp4',name:'Color3', color:'#0000c0'},
    {id:'sp5',name:'Color4', color:'#0000ff'},
  ],
  layers:[{id:'l1',name:'Field',visible:true,cells:mkCells(COLS,ROWS,'sp1'),rules:[
    {id:'r1',raw:'Color1 + >=1Color2 -> Color2 * 1.0'},
    {id:'r2',raw:'Color2 + >=1Color2 -> Color3 * 1.0'},
    {id:'r3',raw:'Color3 + >=1Color3 -> Color4 * 1.0'},
    {id:'r4',raw:'Color4 + >=1Color4 -> Color1 * 1.0'},
    {id:'r5',raw:'Initial -> Color1 * 0.1'},
    {id:'r6',raw:'Initial -> Color2 * 0.1'},
    {id:'r7',raw:'Initial -> Color3 * 0.1'},
    {id:'r8',raw:'Initial -> Color4 * 0.1'},
  ]}],
  activeLayerId:'l1', activeSpeciesId:'sp2', resetSpeciesIds:['sp1'],
});

// ── Rain ──────────────────────────────────────────────────────────────────────
write('rain.json', {
  version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
  species:[
    {id:'sp1',name:'Color1',color:'#000040'},
    {id:'sp2',name:'Color2',color:'#000080'},
    {id:'sp3',name:'Color3',color:'#0000c0'},
    {id:'sp4',name:'Color4',color:'#0000ff'},
  ],
  layers:[{id:'l1',name:'Field',visible:true,cells:mkCells(COLS,ROWS,'sp1'),rules:[
    {id:'r1',raw:'Color1 + >=1Color2 -> Color2 * 1.0'},
    {id:'r2',raw:'Color2 + >=1Color2 -> Color3 * 1.0'},
    {id:'r3',raw:'Color3 + >=1Color3 -> Color4 * 1.0'},
    {id:'r4',raw:'Color4 + >=1Color4 -> Color1 * 1.0'},
    {id:'r5',raw:'Color1 -> Color2 * 0.0001'},
  ]}],
  activeLayerId:'l1', activeSpeciesId:'sp2', resetSpeciesIds:['sp1'],
});

// ── Patches ───────────────────────────────────────────────────────────────────
write('patches.json', {
  version:1, grid:{cols:COLS,rows:ROWS,cellSize:CS},
  species:[
    {id:'sp1',name:'Init',    color:'#202020'},
    {id:'sp2',name:'Color1',  color:'#800000'},
    {id:'sp3',name:'Color2',  color:'#808000'},
    {id:'sp4',name:'Color3',  color:'#800080'},
    {id:'sp5',name:'Color4',  color:'#008000'},
    {id:'sp6',name:'Border',  color:'#000080'},
    {id:'sp7',name:'Border2', color:'#0000ff'},
    {id:'sp8',name:'Border3', color:'#000080'},
  ],
  layers:[{id:'l1',name:'Patches',visible:true,cells:mkCells(COLS,ROWS,'sp1'),rules:[
    {id:'r1', raw:'Init + >=4Color1 -> Color1 * 1.0'},
    {id:'r2', raw:'Init + >=4Color2 -> Color2 * 1.0'},
    {id:'r3', raw:'Init + >=4Color3 -> Color3 * 1.0'},
    {id:'r4', raw:'Init + >=4Color4 -> Color4 * 1.0'},
    {id:'r5', raw:'Init + >=1Color1 -> Color1 * 0.1'},
    {id:'r6', raw:'Init + >=1Color2 -> Color2 * 0.1'},
    {id:'r7', raw:'Init + >=1Color3 -> Color3 * 0.1'},
    {id:'r8', raw:'Init + >=1Color4 -> Color4 * 0.1'},
    {id:'r9', raw:'Init -> Color1 * 0.00001'},
    {id:'r10',raw:'Init -> Color2 * 0.00001'},
    {id:'r11',raw:'Init -> Color3 * 0.00001'},
    {id:'r12',raw:'Init -> Color4 * 0.00001'},
    {id:'r13',raw:'Color1 + >=1Color2 -> Border * 1.0'},
    {id:'r14',raw:'Color1 + >=1Color3 -> Border * 1.0'},
    {id:'r15',raw:'Color1 + >=1Color4 -> Border * 1.0'},
    {id:'r16',raw:'Color2 + >=1Color3 -> Border * 1.0'},
    {id:'r17',raw:'Color2 + >=1Color4 -> Border * 1.0'},
    {id:'r18',raw:'Color3 + >=1Color4 -> Border * 1.0'},
    {id:'r19',raw:'Border + >=1Border2 -> Border2 * 1.0'},
    {id:'r20',raw:'Border -> Border2 * 0.001'},
    {id:'r21',raw:'Border2 -> Border3 * 1.0'},
    {id:'r22',raw:'Border3 -> Border * 1.0'},
  ]}],
  activeLayerId:'l1', activeSpeciesId:'sp2', resetSpeciesIds:['sp1'],
});

console.log('\nDone. Files:', fs.readdirSync(dst).sort().join(', '));
