const NS = 'http://www.w3.org/2000/svg';
const STORAGE_KEY = 'playmaker-tackle-v1';
const POSITION_LABELS = {
  offense: ['LT', 'LG', 'C', 'RG', 'RT', 'QB', 'RB', 'X', 'Z', 'Y', 'TE', 'H'],
  defense: ['DE', 'DT', 'NT', 'DT', 'DE', 'LB', 'LB', 'LB', 'CB', 'CB', 'S', 'S'],
  special: ['LT', 'LG', 'C', 'RG', 'RT', 'K', 'H', 'W', 'W', 'P', 'G', 'G']
};
const $ = id => document.getElementById(id);
const els = Object.fromEntries(['field','playList','playCount','playName','formationInput','situationInput','categoryInput','playerCountSelect','notesInput','playerLabel','playerColor','assignmentInput','selectionEmpty','selectionFields','searchInput','saveStatus','toast','lineStyle','importFile'].map(id => [id, $(id)]));
const state = { plays: [], books:[{id:uid(),name:'Main Playbook'}], activeBookId:null, activeId: null, side: 'offense', tool: 'select', drawing: null, selectedPlayerId: null, drag: null, playing: false, animationStart: 0, raf: 0, suppressClick: false, settings: {teamName:'My Team',teamColor:'#e6a833',logo:'',fieldLines:true,fieldTheme:'dark',roster:[],personnel:[],formations:[]} };
state.activeBookId=state.books[0].id;

function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function svg(tag, attrs = {}, text) { const el = document.createElementNS(NS, tag); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, String(v)); if (text !== undefined) el.textContent = text; return el; }
function add(parent, tag, attrs, text) { const el = svg(tag, attrs, text); parent.append(el); return el; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function point(event) { const p = els.field.createSVGPoint(); p.x = event.clientX; p.y = event.clientY; const t = p.matrixTransform(els.field.getScreenCTM().inverse()); return { x: clamp(Math.round(t.x), 25, 975), y: clamp(Math.round(t.y), 25, 595) }; }
function activePlay() { return state.plays.find(p => p.id === state.activeId); }
function defaultPlayers(side, count) {
  const labels = POSITION_LABELS[side];
  const line = side === 'defense' ? 255 : 365;
  return Array.from({length: count}, (_, i) => {
    let x, y;
    if (side === 'offense' || side === 'special') {
      if (i < 5) { x = 340 + i * 80; y = line; }
      else if (i === 5) { x = 500; y = 445; }
      else if (i === 6) { x = 540; y = 515; }
      else { x = [145,855,240,760,90][i-7] ?? 500; y = i === 10 ? 390 : 365; }
    } else {
      if (i < 5) { x = 315 + i * 93; y = line; }
      else if (i < 8) { x = 340 + (i-5)*160; y = 175; }
      else { x = [125,875,370,630][i-8] ?? 500; y = i < 10 ? 220 : 95; }
    }
    return { id: uid(), label: labels[i] || `P${i+1}`, x, y, color: side === 'defense' ? '#df654e' : '#e8ad3c', assignment: '', rosterId:'', route: [], optionRoute:[], lineStyle: 'solid', endCap:'arrow', pathShape:'straight' };
  });
}
function makePlay(side = state.side, name = 'New play') { return { id: uid(), bookId:state.activeBookId, side, name, formation: side === 'offense' ? 'Shotgun' : side === 'defense' ? 'Base 4-3' : 'Standard', situation: '', category:'', count: 11, notes: '', players: defaultPlayers(side, 11), ballPath: [], annotations:[], intendedReceiverId:'' }; }
function seed() {
  const offense = makePlay('offense', 'Trips Right Flood');
  offense.formation = 'Shotgun Trips'; offense.situation = '3rd & medium'; offense.notes = 'QB reads deep to shallow. RB checks protection before releasing.';
  const route = (label, points, assignment) => { const p = offense.players.find(x => x.label === label); if (p) { p.route = points; p.assignment = assignment; } };
  route('X', [{x:170,y:250},{x:255,y:170}], 'Clear the deep third.');
  route('Z', [{x:845,y:270},{x:740,y:195},{x:640,y:175}], 'Deep out.');
  route('Y', [{x:260,y:300},{x:430,y:285},{x:600,y:245}], 'Cross at intermediate depth.');
  route('RB', [{x:635,y:440},{x:680,y:350},{x:780,y:325}], 'Check protection, then release to flat.');
  const defense = makePlay('defense', 'Cover 3 Base'); defense.formation = '4-3'; defense.situation = 'Early downs'; defense.notes = 'Corners and free safety take deep thirds. Linebackers cover underneath zones.';
  defense.players[8].route = [{x:170,y:155}]; defense.players[9].route = [{x:830,y:155}];
  const special = makePlay('special', 'Field Goal'); special.formation = 'Field goal'; special.notes = 'Confirm protection and kicker timing.';
  return [offense, defense, special];
}
function load() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const data = JSON.parse(raw); if (Array.isArray(data.plays) && data.plays.length) { state.plays = data.plays; state.books=Array.isArray(data.books)&&data.books.length?data.books:state.books;state.activeBookId=data.activeBookId||state.books[0].id;state.plays.forEach(p=>p.bookId ||= state.books[0].id);state.activeId = data.activeId; state.side = data.side || 'offense'; state.settings={...state.settings,...(data.settings||{})}; } } } catch (_) { toast('Could not load saved plays'); }
  if (!state.plays.length) { state.plays = seed(); state.activeId = state.plays[0].id; save(); }
  if (!activePlay()) state.activeId = state.plays[0].id;
  state.activeBookId=activePlay().bookId||state.books[0].id;
  state.side = activePlay().side;
  render();
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, plays: state.plays, books:state.books, activeBookId:state.activeBookId, activeId: state.activeId, side: state.side, settings:state.settings })); els.saveStatus.textContent = `Saved ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`; } catch (_) { els.saveStatus.textContent = 'Save failed — export a backup'; toast('Local save failed. Export a backup.'); } }
function changed(renderAll = false) { save(); if (renderAll) render(); else renderField(); }
function toast(message) { els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2800); }
function selectPlay(id) { if (!state.plays.some(p => p.id === id)) return; stopAnimation(); state.activeId = id; state.side = activePlay().side; state.activeBookId=activePlay().bookId;state.selectedPlayerId = null; state.drawing = null; save(); render(); }
function renderList() {
  const query = els.searchInput.value.trim().toLowerCase();
  const inBook=state.plays.filter(p=>p.bookId===state.activeBookId);const visible = inBook.filter(p => p.side === state.side && `${p.name} ${p.formation} ${p.category||''} ${p.situation}`.toLowerCase().includes(query));
  els.playCount.textContent = inBook.length; els.playList.replaceChildren();
  if (!visible.length) { const div = document.createElement('div'); div.className = 'empty-list'; div.textContent = query ? 'No matching plays.' : 'No plays here yet. Press + to add one.'; els.playList.append(div); return; }
  for (const play of visible) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `play-item${play.id === state.activeId ? ' active' : ''}`; button.onclick = () => selectPlay(play.id);
    const mini = document.createElement('span'); mini.className = 'play-mini'; mini.textContent = play.side === 'offense' ? 'O' : play.side === 'defense' ? 'D' : 'ST';
    const txt = document.createElement('span'); txt.className = 'play-text'; const strong = document.createElement('strong'); strong.textContent = play.name || 'Untitled play'; const small = document.createElement('small'); small.textContent = [play.formation, play.category, play.situation].filter(Boolean).join(' · ') || 'No details'; txt.append(strong,small); button.append(mini,txt); els.playList.append(button);
  }
}
function renderSelection() {
  const player = activePlay()?.players.find(p => p.id === state.selectedPlayerId);
  els.selectionEmpty.hidden = !!player; els.selectionFields.hidden = !player;
  if (player) { els.playerLabel.value = player.label; els.playerColor.value = player.color; els.assignmentInput.value = player.assignment || ''; els.lineStyle.value=player.lineStyle||'solid'; $('endCap').value=player.endCap||'arrow'; $('pathShape').value=player.pathShape||'straight'; if(typeof renderSelectionExtras==='function')renderSelectionExtras(player); }
}
function render() {
  const p = activePlay(); if (!p) return;
  document.querySelectorAll('[data-side]').forEach(b => { b.classList.toggle('active', b.dataset.side === state.side); b.setAttribute('aria-selected', String(b.dataset.side === state.side)); });
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === state.tool));
  els.field.classList.toggle('route-mode', state.tool !== 'select');
  els.playName.value = p.name; els.formationInput.value = p.formation; els.situationInput.value = p.situation; $('categoryInput').value=p.category||''; els.playerCountSelect.value = String(p.count); els.notesInput.value = p.notes;
  if(typeof renderExtras==='function')renderExtras();
  renderList(); renderSelection(); renderField();
}
function drawBackground(root) {
  const light=state.settings.fieldTheme==='light';
  add(root,'rect',{x:0,y:0,width:1000,height:620,fill:light?'#dce9df':'#315d48'});
  if(state.settings.fieldLines!==false){
    for(let i=0;i<13;i++){ const y=i*51.6667; add(root,'line',{x1:0,y1:y,x2:1000,y2:y,stroke:i===6?(light?'#aa792c':'#f5d78d'):(light?'#7aa18a':'#a8c5ac'),'stroke-width':i===6?5:2,opacity:i===6?1:.48}); if(i>0&&i<12){ const n=Math.abs(6-i)*5; add(root,'text',{x:65,y:y-7,fill:light?'#4b7059':'#d4e4d5','font-size':20,opacity:.5,'font-weight':800},String(n)); add(root,'text',{x:915,y:y-7,fill:light?'#4b7059':'#d4e4d5','font-size':20,opacity:.5,'font-weight':800},String(n)); } }
    for(const x of [320,680]) for(let y=22;y<620;y+=52) add(root,'line',{x1:x,y1:y,x2:x,y2:y+15,stroke:light?'#729a7d':'#bdd3bf','stroke-width':2,opacity:.6});
  }
  add(root,'line',{x1:0,y1:310,x2:1000,y2:310,stroke:light?'#aa792c':'#f4d38a','stroke-width':3,'stroke-dasharray':'11 8'});
}
function defs(root) { const d=add(root,'defs'); for(const [id,color] of [['route-arrow','#f3bc56'],['def-arrow','#ff8269'],['ball-arrow','#ffffff']]){ const m=add(d,'marker',{id,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'}); add(m,'path',{d:'M 0 0 L 10 5 L 0 10 z',fill:color}); } }
function drawPath(root, points, color, style, marker, opacity=1, cap='arrow', shape='straight') {
  if (!points || points.length<2) return;
  if(style==='zone'){const first=points[0],last=points.at(-1);add(root,'ellipse',{cx:(first.x+last.x)/2,cy:(first.y+last.y)/2,rx:Math.max(25,Math.abs(first.x-last.x)/2),ry:Math.max(25,Math.abs(first.y-last.y)/2),fill:color,'fill-opacity':.16,stroke:color,'stroke-width':4,'stroke-dasharray':'10 7'});return;}
  let pts=points;
  if(style==='motion'){pts=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),steps=Math.max(2,Math.round(len/16));for(let j=1;j<steps;j++){const t=j/steps,side=j%2?1:-1;pts.push({x:a.x+dx*t-dy/len*7*side,y:a.y+dy*t+dx/len*7*side});}pts.push(b);}}
  const attrs={fill:'none',stroke:color,'stroke-width':style==='block'?8:5,'stroke-linecap':'round','stroke-linejoin':'round',opacity};
  if(style==='dashed') attrs['stroke-dasharray']='12 10';
  if(shape==='smooth'&&pts.length>2&&style!=='motion'){let d=`M ${pts[0].x} ${pts[0].y}`;for(let i=1;i<pts.length-1;i++){const mid={x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2};d+=` Q ${pts[i].x} ${pts[i].y} ${mid.x} ${mid.y}`;}d+=` Q ${pts.at(-2).x} ${pts.at(-2).y} ${pts.at(-1).x} ${pts.at(-1).y}`;add(root,'path',{...attrs,d,...(cap==='arrow'&&style!=='block'?{'marker-end':`url(#${marker})`}:{})});}
  else add(root,'polyline',{...attrs,points:pts.map(p=>`${p.x},${p.y}`).join(' '),...(cap==='arrow'&&style!=='block'?{'marker-end':`url(#${marker})`}:{})});
  const last=pts.at(-1),prev=pts.at(-2),angle=Math.atan2(last.y-prev.y,last.x-prev.x);if(cap==='dot')add(root,'circle',{cx:last.x,cy:last.y,r:8,fill:color});if(cap==='bar'||style==='block'){const dx=Math.cos(angle+Math.PI/2)*15,dy=Math.sin(angle+Math.PI/2)*15;add(root,'line',{x1:last.x-dx,y1:last.y-dy,x2:last.x+dx,y2:last.y+dy,stroke:color,'stroke-width':6});}
}
function diagram(play, interactive=false) {
  const root=svg('svg',{viewBox:'0 0 1000 620',xmlns:NS}); drawBackground(root); defs(root);
  for(const p of play.players){ const route=[{x:p.x,y:p.y},...(p.route||[])]; drawPath(root,route,play.side==='defense'?'#ff8269':'#f3bc56',p.lineStyle||'solid',play.side==='defense'?'def-arrow':'route-arrow',1,p.endCap||'arrow',p.pathShape||'straight'); if(p.optionRoute?.length)drawPath(root,[{x:p.x,y:p.y},...p.optionRoute],'#c3ebf2','dashed','ball-arrow',1,'arrow','straight'); }
  if(play.ballPath?.length){drawPath(root,play.ballPath,'#ffffff','dashed','ball-arrow');const start=play.ballPath[0];add(root,'ellipse',{cx:start.x,cy:start.y,rx:12,ry:7,fill:'#8a4d29',stroke:'#ffffff','stroke-width':2});add(root,'line',{x1:start.x-4,y1:start.y,x2:start.x+4,y2:start.y,stroke:'#ffffff','stroke-width':1.5});}
  if(interactive && state.drawing?.playId===play.id){ const src=state.drawing.type==='ball'?[]:[play.players.find(p=>p.id===state.drawing.playerId)].filter(Boolean).map(p=>({x:p.x,y:p.y})); drawPath(root,[...src,...state.drawing.points],'#ffffff','dashed','ball-arrow',.8); }
  for(const p of play.players){
    const g=add(root,'g',{'class':'player',transform:`translate(${p.x} ${p.y})`,'data-player':p.id});
    if(interactive && p.id===state.selectedPlayerId) add(g,'circle',{r:29,fill:'none',stroke:'#ffffff','stroke-width':3,opacity:.8});
    if(play.intendedReceiverId===p.id)add(g,'circle',{r:27,fill:'none',stroke:'#ffffff','stroke-width':3,'stroke-dasharray':'5 4'});
    add(g,'circle',{r:22,fill:p.color||'#e8ad3c',stroke:'#17313a','stroke-width':3});
    add(g,'text',{'text-anchor':'middle','dominant-baseline':'central',fill:'#10252e','font-size':p.label.length>3?12:16,'font-weight':900},p.label);
    const named=state.settings.roster?.find(x=>x.id===p.rosterId);if(named)add(g,'text',{'text-anchor':'middle',y:39,fill:state.settings.fieldTheme==='light'?'#15352b':'#ffffff','font-size':15,'font-weight':750},named.name);
    if(interactive){g.addEventListener('pointerdown', e => playerPointerDown(e,p));g.addEventListener('dragover',e=>e.preventDefault());g.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(state.settings.roster?.some(r=>r.id===id)){p.rosterId=id;state.selectedPlayerId=p.id;changed(true);}});}
  }
  for(const note of play.annotations||[]){const g=add(root,'g',{'data-note':note.id});add(g,'rect',{x:note.x-8,y:note.y-23,width:Math.max(50,note.text.length*9+16),height:30,rx:5,fill:'#102a32','fill-opacity':.85});add(g,'text',{x:note.x,y:note.y,fill:'#ffffff','font-size':18,'font-weight':700},note.text);if(interactive)g.addEventListener('click',e=>{e.stopPropagation();if(confirm(`Remove text note “${note.text}”?`)){play.annotations=play.annotations.filter(n=>n.id!==note.id);changed();}});}
  return root;
}
function renderField() { const p=activePlay(); if(!p)return; const d=diagram(p,true); els.field.replaceChildren(...d.childNodes); $('finishPathBtn').disabled=!state.drawing; if(state.playing){cancelAnimationFrame(state.raf);renderAnimationFrame();} }
function playerPointerDown(e, player) {
  e.preventDefault(); e.stopPropagation();
  state.suppressClick=true;
  setTimeout(()=>{state.suppressClick=false;},350);
  state.selectedPlayerId=player.id; renderSelection();
  if(state.tool==='route'||state.tool==='option') { state.drawing={type:state.tool,playId:activePlay().id,playerId:player.id,points:[]}; els.lineStyle.value=player.lineStyle||'solid'; toast(`Drawing ${player.label} ${state.tool} — click points, then Finish path`); renderField(); return; }
  if(state.tool==='ball') { state.drawing={type:'ball',playId:activePlay().id,points:[{x:player.x,y:player.y}]}; toast('Draw ball movement, then Finish path'); renderField(); return; }
  state.drag={id:player.id,pointerId:e.pointerId}; els.field.setPointerCapture(e.pointerId); renderField();
}
function finishDrawing() {
  const d=state.drawing, play=activePlay(); if(!d||!play)return;
  if(d.type==='route'||d.type==='option'){const player=play.players.find(p=>p.id===d.playerId); if(player && d.points.length){player[d.type==='option'?'optionRoute':'route']=d.points; if(d.type==='route'){player.lineStyle=els.lineStyle.value;player.endCap=$('endCap').value;player.pathShape=$('pathShape').value;}}}
  else if(d.points.length>1) play.ballPath=d.points;
  state.drawing=null; changed();
}
function stopAnimation() { state.playing=false; cancelAnimationFrame(state.raf); const old=$('animationDots'); if(old)old.remove(); $('animateBtn').textContent='Animate'; }
function renderAnimationFrame() {
  if(!state.playing)return; const p=activePlay(); if(!p)return;
  const speed=Number($('animationSpeed').value)||1,elapsed=((performance.now()-state.animationStart)*speed)%4200, t=elapsed/4200;
  const old=$('animationDots'); if(old)old.remove(); const group=svg('g',{id:'animationDots'});
  for(const player of p.players){ const pts=[{x:player.x,y:player.y},...(player.route||[])]; if(pts.length<2)continue; const pos=along(pts,t); add(group,'circle',{cx:pos.x,cy:pos.y,r:9,fill:'#fff',stroke:'#13313a','stroke-width':3}); }
  if(p.ballPath?.length>1){const pos=along(p.ballPath,t); add(group,'ellipse',{cx:pos.x,cy:pos.y,rx:10,ry:6,fill:'#8a4d29',stroke:'#fff','stroke-width':2});}
  els.field.append(group); state.raf=requestAnimationFrame(renderAnimationFrame);
}
function along(pts,t){let lengths=[],total=0;for(let i=1;i<pts.length;i++){const n=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);lengths.push(n);total+=n;}let remaining=t*total;for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]||i===lengths.length-1){const a=lengths[i]?remaining/lengths[i]:0;return {x:pts[i].x+(pts[i+1].x-pts[i].x)*a,y:pts[i].y+(pts[i+1].y-pts[i].y)*a};}remaining-=lengths[i];}return pts.at(-1);}
function startAnimation() { if(state.playing){stopAnimation();return;} state.playing=true;state.animationStart=performance.now();$('animateBtn').textContent='Stop animation';renderAnimationFrame(); }

document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{state.side=b.dataset.side;const first=state.plays.find(p=>p.bookId===state.activeBookId&&p.side===state.side);if(first)selectPlay(first.id);else{state.activeId=null;const p=makePlay(state.side);state.plays.push(p);selectPlay(p.id);} });
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{finishDrawing();state.tool=b.dataset.tool;render();});
els.field.addEventListener('pointermove',e=>{if(!state.drag)return;const play=activePlay(),player=play.players.find(p=>p.id===state.drag.id);if(!player)return;Object.assign(player,point(e));renderField();});
els.field.addEventListener('pointerup',e=>{if(!state.drag)return;state.drag=null;save();});
els.field.addEventListener('pointercancel',()=>{state.drag=null;save();});
els.field.addEventListener('click',e=>{if(state.suppressClick){state.suppressClick=false;return;}if(e.target.closest?.('.player'))return;if(state.tool==='select'){state.selectedPlayerId=null;renderSelection();renderField();return;}if(state.tool==='text'){const text=prompt('Text annotation');if(text?.trim()){const pos=point(e);activePlay().annotations.push({id:uid(),x:pos.x,y:pos.y,text:text.trim().slice(0,60)});changed();}return;}if(!state.drawing){if(state.tool==='ball')state.drawing={type:'ball',playId:activePlay().id,points:[]};else{toast('Select a player first');return;}}const p=point(e);const last=state.drawing.points.at(-1);if(!last||Math.hypot(p.x-last.x,p.y-last.y)>5)state.drawing.points.push(p);renderField();});
els.field.addEventListener('dblclick',e=>{e.preventDefault();finishDrawing();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){state.drawing=null;renderField();}if(e.key==='Enter'&&state.drawing&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();finishDrawing();}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&state.drawing){e.preventDefault();state.drawing.points.pop();renderField();}});
els.lineStyle.onchange=()=>{const player=activePlay()?.players.find(p=>p.id===state.selectedPlayerId);if(player && !state.drawing){player.lineStyle=els.lineStyle.value;changed();}};
$('endCap').onchange=()=>{const player=activePlay()?.players.find(p=>p.id===state.selectedPlayerId);if(player&&!state.drawing){player.endCap=$('endCap').value;changed();}};
$('pathShape').onchange=()=>{const player=activePlay()?.players.find(p=>p.id===state.selectedPlayerId);if(player&&!state.drawing){player.pathShape=$('pathShape').value;changed();}};
$('newPlayBtn').onclick=()=>{finishDrawing();const p=makePlay(state.side);state.plays.unshift(p);els.searchInput.value='';selectPlay(p.id);els.playName.focus();els.playName.select();};
$('duplicateBtn').onclick=()=>{const p=activePlay();if(!p)return;const copy=structuredClone(p);copy.id=uid();copy.name=`${p.name} copy`;copy.players.forEach(player=>player.id=uid());state.plays.unshift(copy);selectPlay(copy.id);toast('Play duplicated');};
$('deleteBtn').onclick=()=>{const p=activePlay();if(!p)return;if(!confirm(`Delete “${p.name}”?`))return;state.plays=state.plays.filter(x=>x.id!==p.id);if(!state.plays.some(x=>x.bookId===state.activeBookId))state.plays.push(makePlay(p.side));selectPlay((state.plays.find(x=>x.bookId===state.activeBookId&&x.side===state.side)||state.plays.find(x=>x.bookId===state.activeBookId)).id);toast('Play deleted');};
$('flipBtn').onclick=()=>{const p=activePlay();if(!p)return;p.players.forEach(x=>{x.x=1000-x.x;(x.route||[]).forEach(pt=>pt.x=1000-pt.x);});(p.ballPath||[]).forEach(pt=>pt.x=1000-pt.x);changed();toast('Play flipped');};
$('animateBtn').onclick=startAnimation;
$('finishPathBtn').onclick=finishDrawing;
$('clearPathBtn').onclick=()=>{const p=activePlay();if(!p)return;if(state.drawing){state.drawing=null;renderField();return;}const player=p.players.find(x=>x.id===state.selectedPlayerId);if(player){if(state.tool==='option')player.optionRoute=[];else player.route=[];changed();toast(`${player.label} path cleared`);}else{p.ballPath=[];changed();toast('Ball path cleared');}};
els.searchInput.oninput=renderList;
for(const [id,key,full] of [['playName','name',true],['formationInput','formation',true],['situationInput','situation',true],['categoryInput','category',true],['notesInput','notes',false]])els[id].oninput=()=>{const p=activePlay();if(!p)return;p[key]=els[id].value;save();if(full)renderList();};
els.playerCountSelect.onchange=()=>{const p=activePlay();if(!p)return;const count=Number(els.playerCountSelect.value);if(count<p.count&&!confirm(`Reduce to ${count} players? Extra players and their routes will be removed.`)){els.playerCountSelect.value=String(p.count);return;}if(count>p.count){const template=defaultPlayers(p.side,count);p.players.push(...template.slice(p.count));}else p.players=p.players.slice(0,count);p.count=count;state.selectedPlayerId=null;changed(true);};
els.playerLabel.oninput=()=>{const p=activePlay()?.players.find(x=>x.id===state.selectedPlayerId);if(p){p.label=els.playerLabel.value;changed();}};
els.playerColor.oninput=()=>{const p=activePlay()?.players.find(x=>x.id===state.selectedPlayerId);if(p){p.color=els.playerColor.value;changed();}};
els.assignmentInput.oninput=()=>{const p=activePlay()?.players.find(x=>x.id===state.selectedPlayerId);if(p){p.assignment=els.assignmentInput.value;save();}};
$('exportBtn').onclick=()=>{const contents=JSON.stringify({version:3,exportedAt:new Date().toISOString(),plays:state.plays,books:state.books,activeBookId:state.activeBookId,settings:state.settings},null,2),filename=`tackle-playbook-${new Date().toISOString().slice(0,10)}.json`;if(window.playmakerNative?.saveBackup){window.playmakerNative.saveBackup({filename,contents});return;}if(window.webkit?.messageHandlers?.nativeSave){window.webkit.messageHandlers.nativeSave.postMessage({filename,contents});return;}const blob=new Blob([contents],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup downloaded');};
$('importBtn').onclick=()=>els.importFile.click();
els.importFile.onchange=async()=>{const file=els.importFile.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.plays)||!data.plays.length||data.plays.some(p=>!['offense','defense','special'].includes(p.side)||!Array.isArray(p.players)||p.players.length>12||typeof p.name!=='string'))throw Error('Invalid playbook');if(!confirm(`Import ${data.plays.length} plays? This will replace the plays saved on this device. Export a backup first if needed.`))return;state.plays=data.plays;state.books=Array.isArray(data.books)&&data.books.length?data.books:[{id:uid(),name:'Imported Playbook'}];state.plays.forEach(p=>p.bookId ||=state.books[0].id);state.activeBookId=state.books[0].id;state.settings={...state.settings,...(data.settings||{})};state.activeId=state.plays[0].id;state.side=state.plays[0].side;state.selectedPlayerId=null;save();render();toast(`${data.plays.length} plays imported`);}catch(err){toast('Could not import this backup');}finally{els.importFile.value='';}};
$('printBtn').onclick=()=>{const plays=state.plays.filter(p=>p.side===state.side);const popup=window.open('','_blank');if(!popup){toast('Allow pop-ups to print the playbook');return;}const pages=plays.map((p,i)=>{const markup=new XMLSerializer().serializeToString(diagram(p));const assignments=p.players.filter(x=>x.assignment).map(x=>`<li><b>${escapeHtml(x.label)}</b> ${escapeHtml(x.assignment)}</li>`).join('');return `<section class="page"><header><small>${escapeHtml(p.side.toUpperCase())} · ${escapeHtml(p.formation||'FORMATION')}</small><h1>${escapeHtml(p.name||'Untitled play')}</h1><p>${escapeHtml(p.situation||'')}</p></header>${markup}<div class="details"><div><h2>Coaching notes</h2><p>${escapeHtml(p.notes||'—').replace(/\n/g,'<br>')}</p></div><div><h2>Assignments</h2><ul>${assignments||'<li>—</li>'}</ul></div></div><footer>${i+1} / ${plays.length}</footer></section>`;}).join('');popup.document.write(`<!doctype html><html><head><title>${escapeHtml(state.side)} playbook</title><style>body{font:14px Arial,sans-serif;margin:0;color:#18313b}.page{box-sizing:border-box;min-height:100vh;padding:24px 28px;break-after:page}.page:last-child{break-after:auto}header{display:flex;align-items:baseline;gap:18px}small{font-size:11px;letter-spacing:.1em;font-weight:bold;color:#567079}h1{font-size:24px;margin:10px 0}header p{margin-left:auto;color:#567079}.page svg{width:100%;height:auto;max-height:66vh;border:1px solid #ccd6d8}.details{display:grid;grid-template-columns:1fr 1fr;gap:25px}.details h2{font-size:14px;margin:15px 0 5px}.details p,.details ul{margin:0;line-height:1.4}.details ul{padding-left:20px}footer{text-align:right;color:#87989e;font-size:11px}@page{size:landscape;margin:8mm}@media print{.page{padding:0;min-height:0}}</style></head><body>${pages}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);popup.document.close();};
load();
