const STORAGE_KEY = 'kng-estate-org-chart-v1';
const starter = [
  {id:'gm',title:'General Manager',name:'',parent:null},
  {id:'community',title:'Community Director',name:'',parent:'gm'},
  {id:'orgs',title:'Orgs Director',name:'',parent:'gm'},
  {id:'wallstreet',title:'WallStreet Director',name:'',parent:'gm'},
  {id:'admin-manager',title:'Administration Manager',name:'',parent:'community'},
  {id:'culture-manager',title:'Culture Manager',name:'',parent:'community'},
  {id:'gangs-manager',title:'Manager Of Gangs',name:'',parent:'orgs'},
  {id:'legal-manager',title:'Manager Of Legal',name:'',parent:'orgs'},
  {id:'wolf',title:'Wolf of WallStreet',name:'',parent:'wallstreet'},
  {id:'tickets-responsible',title:'Tickets Responsible',name:'',parent:'admin-manager'},
  {id:'admin-responsible',title:'Administration Responsible',name:'',parent:'admin-manager'},
  {id:'entertainment',title:'Entertainment Responsible',name:'',parent:'culture-manager'},
  {id:'moderation',title:'Moderation Responsible',name:'',parent:'culture-manager'},
  {id:'influencer',title:'Influencer Responsible',name:'',parent:'culture-manager'},
  {id:'gang-adms',title:'Gangs ADMs',name:'',parent:'gangs-manager'},
  {id:'legal-adm',title:'Legal ADM',name:'',parent:'legal-manager'},
  {id:'ws-responsible',title:'WallStreet Responsible',name:'',parent:'wolf'},
  {id:'tickets-team',title:'Tickets Team ADM',name:'',parent:'tickets-responsible'},
  {id:'knowledge',title:'Knowledge ADM',name:'',parent:'admin-responsible'},
  {id:'discord',title:'Discord ADM',name:'',parent:'admin-responsible'},
  {id:'action',title:'Action ADM',name:'',parent:'entertainment'},
  {id:'interactions',title:'Interactions ADM',name:'',parent:'entertainment'},
  {id:'calls',title:'Calls ADM',name:'',parent:'moderation'},
  {id:'order',title:'Order ADM',name:'',parent:'moderation'},
  {id:'influencer-team',title:'Influencer Team',name:'',parent:'influencer'},
  {id:'ws-criminal-a',title:'WS_CriminalA ADM',name:'',parent:'ws-responsible'},
  {id:'ws-criminal-b',title:'WS_CriminalB ADM',name:'',parent:'ws-responsible'}
];
let positions = loadData();
let selectedId = null;
let editingId = null;
const $ = id => document.getElementById(id);

function loadData(){
  try { const saved = localStorage.getItem(STORAGE_KEY); if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed))return parsed;} } catch(e) { console.warn('Could not read saved chart',e); }
  return structuredClone(starter);
}
function saveData(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(positions)); }
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function childrenOf(id){return positions.filter(p=>p.parent===id);}
function renderTreeNode(position, isRoot=false){
  const children=childrenOf(position.id);
  const selected=selectedId===position.id?' selected':'';
  const name=position.name?`<span class="person">${escapeHtml(position.name)}</span>`:'';
  const card=`<button class="node${isRoot?' root-node':''}${selected}" data-node="${escapeHtml(position.id)}" type="button"><span>${escapeHtml(position.title)}</span>${name}</button>`;
  const branch=children.length?`<ul>${children.map(child=>renderTreeNode(child)).join('')}</ul>`:'';
  return `<li${isRoot?' class="tree-root"':''}>${card}${branch}</li>`;
}
function render(){
  const roots=positions.filter(p=>p.parent===null);
  $('positionCount').textContent=`${positions.length} POSITIONS`;
  if(!roots.length){$('chart').innerHTML='<div class="empty-state">No top-level position found. Open Edit chart and add a position.</div>';return;}
  $('chart').innerHTML=`<ul class="tree">${roots.map(root=>renderTreeNode(root,true)).join('')}</ul>`;
  $('chart').querySelectorAll('[data-node]').forEach(btn=>btn.addEventListener('click',()=>selectPosition(btn.dataset.node)));
  refreshParentOptions();
  requestAnimationFrame(fitChartToPage);
}
function refreshParentOptions(){
  const select=$('parentSelect');const current=select.value;
  select.innerHTML='<option value="">Top level</option>'+positions.filter(p=>p.id!==editingId).map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.title)}${p.name?' — '+escapeHtml(p.name):''}</option>`).join('');
  if([...select.options].some(o=>o.value===current))select.value=current;
}
function selectPosition(id){
  const p=positions.find(x=>x.id===id);if(!p)return;
  selectedId=id;editingId=id;$('formHeading').textContent='Edit position';$('savePosition').textContent='Save changes';$('cancelEdit').hidden=false;
  $('roleTitle').value=p.title;$('personName').value=p.name||'';refreshParentOptions();$('parentSelect').value=p.parent||'';
  $('selectedNote').textContent=`Editing: ${p.title}. Update the details or remove this position.`;
  render();$('editor').hidden=false;$('editToggle').textContent='Close editor';
  $('positionForm').dataset.mode='edit';
  if(!$('deletePosition')){const b=document.createElement('button');b.type='button';b.id='deletePosition';b.className='button button-quiet danger-text';b.textContent='Delete position';b.addEventListener('click',deleteSelected);$('positionForm').querySelector('.form-actions').appendChild(b);}
  $('editor').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function resetForm(){editingId=null;selectedId=null;$('positionForm').reset();$('formHeading').textContent='Add a position';$('savePosition').textContent='Add position';$('cancelEdit').hidden=true;$('selectedNote').textContent='Select a chart position to edit it. You can also add roles beneath any existing position.';$('positionForm').dataset.mode='add';const del=$('deletePosition');if(del)del.remove();refreshParentOptions();render();}
function hasDescendant(id,parentId){if(id===parentId)return true;return childrenOf(id).some(child=>hasDescendant(child.id,parentId));}
$('positionForm').addEventListener('submit',e=>{
  e.preventDefault();const title=$('roleTitle').value.trim();const name=$('personName').value.trim();const parent=$('parentSelect').value||null;if(!title)return;
  if(editingId){if(parent&&hasDescendant(editingId,parent)){toast('A position cannot report to itself or one of its own sub-positions.');return;}const p=positions.find(x=>x.id===editingId);Object.assign(p,{title,name,parent});toast('Position updated.');}
  else {if(!parent&&positions.some(p=>p.parent===null)){toast('There is already a top-level position. Choose who this role reports to.');return;}const id='pos-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);positions.push({id,title,name,parent});toast('Position added.');}
  saveData();resetForm();
});
function deleteSelected(){if(!editingId)return;const id=editingId;const toDelete=new Set([id]);let changed=true;while(changed){changed=false;positions.forEach(p=>{if(toDelete.has(p.parent)&&!toDelete.has(p.id)){toDelete.add(p.id);changed=true;}});}if(!confirm(`Delete this position and its ${toDelete.size-1} position(s) underneath it?`))return;positions=positions.filter(p=>!toDelete.has(p.id));saveData();resetForm();toast('Position removed.');}
$('cancelEdit').addEventListener('click',resetForm);
$('editToggle').addEventListener('click',()=>{const panel=$('editor');panel.hidden=!panel.hidden;$('editToggle').textContent=panel.hidden?'Edit chart':'Close editor';if(!panel.hidden){resetForm();panel.scrollIntoView({behavior:'smooth',block:'nearest'});}});
$('closeEditor').addEventListener('click',()=>{$('editor').hidden=true;$('editToggle').textContent='Edit chart';});
$('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(positions,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='kng-estate-organisation.json';a.click();URL.revokeObjectURL(url);toast('Chart data exported.');});
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed)||!parsed.every(p=>p.id&&p.title&&('parent'in p)))throw new Error('Invalid chart file');const ids=new Set(parsed.map(p=>p.id));if(parsed.some(p=>p.parent!==null&&!ids.has(p.parent)))throw new Error('Missing parent position');positions=parsed;saveData();resetForm();toast('Chart imported successfully.');}catch(err){alert('Could not import this file. Please choose a valid KNG chart JSON export.');}e.target.value='';});
$('resetBtn').addEventListener('click',()=>{if(!confirm('Reset the chart to the original KNG structure? This will replace the saved chart in this browser.'))return;positions=structuredClone(starter);saveData();resetForm();toast('Original KNG structure restored.');});

// Scale the complete hierarchy to the available panel width so desktop users
// can see every department at once without a horizontal scrollbar.
function fitChartToPage(){
  const viewport=$('chartViewport');
  const chart=$('chart');
  const tree=chart.querySelector('.tree');
  if(!viewport||!chart||!tree)return;
  tree.style.transform='none';
  tree.style.transformOrigin='top center';
  chart.style.width='max-content';
  chart.style.height='auto';
  const naturalWidth=tree.scrollWidth;
  const naturalHeight=tree.scrollHeight;
  const availableWidth=Math.max(240,viewport.clientWidth-36);
  const scale=Math.min(1,availableWidth/naturalWidth);
  tree.style.transform=`scale(${scale})`;
  chart.style.width=`${naturalWidth*scale}px`;
  chart.style.height=`${naturalHeight*scale}px`;
  viewport.style.height=`${Math.ceil(naturalHeight*scale+64)}px`;
}
window.addEventListener('resize',()=>requestAnimationFrame(fitChartToPage));

let toastTimer;function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2500);}
render();
