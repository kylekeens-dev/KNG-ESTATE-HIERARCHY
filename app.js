const $ = (id) => document.getElementById(id);
let chartData = { nodes: [] };
let isAdmin = false;
let toastTimer;

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const detail = data.error || `Server returned HTTP ${response.status}.`;
    throw new Error(detail);
  }
  if (!contentType.includes('application/json')) {
    throw new Error('The website is not connected to its Node.js server. In Render, deploy this repository as a Web Service (Blueprint), not a Static Site.');
  }
  return data;
}
function showToast(message) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function childrenOf(parentId) { return chartData.nodes.filter(n => n.parentId === parentId); }
function renderNode(node, isRoot = false) {
  const kids = childrenOf(node.id);
  const name = node.name ? `<span class="node-name">${escapeHtml(node.name)}</span>` : '<span class="node-name empty">Name not assigned</span>';
  const tools = isAdmin ? `<div class="node-tools"><button data-edit="${escapeHtml(node.id)}">Edit</button><button data-add-child="${escapeHtml(node.id)}">＋ Add below</button></div>` : '';
  return `<li><div class="node-card ${isRoot ? 'root' : ''}"><span class="node-role">${escapeHtml(node.role)}</span>${name}${tools}</div>${kids.length ? `<ul>${kids.map(child => renderNode(child)).join('')}</ul>` : ''}</li>`;
}
function render() {
  const roots = chartData.nodes.filter(n => n.parentId === null);
  $('chart').innerHTML = roots.length ? `<ul class="tree">${roots.map(n => renderNode(n, true)).join('')}</ul>` : '<div class="loading">No top-level position. Add a position to get started.</div>';
  $('positionCount').textContent = `${chartData.nodes.length} POSITIONS`;
  $('adminToolbar').classList.toggle('hidden', !isAdmin);
  $('loginOpen').classList.toggle('hidden', isAdmin);
  $('logoutBtn').classList.toggle('hidden', !isAdmin);
}
async function load() {
  // Load and display the public chart first. A failed session check must not hide it.
  chartData = await api('/api/chart');
  render();
  try {
    const me = await api('/api/me');
    isAdmin = Boolean(me.admin);
    render();
  } catch (err) {
    isAdmin = false;
    render();
    showToast('Chart loaded, but admin status could not be checked.');
    console.error('Admin session check failed:', err);
  }
}
function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }
function fillParentOptions(selected = null, excludeId = null) {
  const options = chartData.nodes.filter(n => n.id !== excludeId).map(n => `<option value="${escapeHtml(n.id)}" ${n.id === selected ? 'selected' : ''}>${escapeHtml(n.role)}${n.name ? ' — ' + escapeHtml(n.name) : ''}</option>`).join('');
  $('parentInput').innerHTML = `<option value="">Top level (no manager)</option>${options}`;
}
function openPosition(node = null, parentId = null) {
  $('positionForm').reset(); $('positionError').textContent = '';
  $('editingId').value = node ? node.id : '';
  $('positionModalTitle').textContent = node ? 'Edit position' : 'Add a position';
  $('roleInput').value = node ? node.role : '';
  $('nameInput').value = node ? node.name : '';
  fillParentOptions(node ? node.parentId : parentId, node ? node.id : null);
  $('deletePosition').classList.toggle('hidden', !node);
  openModal('positionModal'); $('roleInput').focus();
}
$('loginOpen').addEventListener('click', () => { $('loginError').textContent = ''; $('password').value = ''; openModal('loginModal'); $('password').focus(); });
$('logoutBtn').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }); isAdmin = false; render(); showToast('You have been logged out.'); });
$('addPosition').addEventListener('click', () => openPosition());
document.addEventListener('click', e => {
  const edit = e.target.closest('[data-edit]');
  const add = e.target.closest('[data-add-child]');
  if (edit) openPosition(chartData.nodes.find(n => n.id === edit.dataset.edit));
  if (add) openPosition(null, add.dataset.addChild);
  const close = e.target.closest('[data-close]'); if (close) closeModal(close.dataset.close);
});
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('loginError').textContent = '';
  try { await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) }); isAdmin = true; closeModal('loginModal'); render(); showToast('Admin access enabled.'); }
  catch (err) { $('loginError').textContent = err.message; }
});
$('positionForm').addEventListener('submit', async e => {
  e.preventDefault(); $('positionError').textContent = '';
  const id = $('editingId').value;
  const node = { id: id || (crypto.randomUUID ? crypto.randomUUID() : 'node-' + Date.now()), role: $('roleInput').value.trim(), name: $('nameInput').value.trim(), parentId: $('parentInput').value || null };
  if (!node.role) { $('positionError').textContent = 'Please enter a position title.'; return; }
  if (id) chartData.nodes = chartData.nodes.map(n => n.id === id ? node : n); else chartData.nodes.push(node);
  try { await api('/api/chart', { method: 'PUT', body: JSON.stringify(chartData) }); closeModal('positionModal'); render(); showToast('Organisation chart saved.'); }
  catch (err) { $('positionError').textContent = err.message; await load(); }
});
$('deletePosition').addEventListener('click', async () => {
  const id = $('editingId').value;
  if (!id || !confirm('Delete this position and move its direct reports up one level?')) return;
  const target = chartData.nodes.find(n => n.id === id);
  chartData.nodes = chartData.nodes.filter(n => n.id !== id).map(n => n.parentId === id ? { ...n, parentId: target.parentId } : n);
  try { await api('/api/chart', { method: 'PUT', body: JSON.stringify(chartData) }); closeModal('positionModal'); render(); showToast('Position deleted.'); }
  catch (err) { $('positionError').textContent = err.message; await load(); }
});
load().catch(err => {
  console.error('KNG chart loading failed:', err);
  $('chart').innerHTML = `<div class="loading">Unable to load chart: ${escapeHtml(err.message)}<br><br><span style="color:#aaa">If this is hosted on Render, make sure you created it using <b>New → Blueprint</b> and not <b>Static Site</b>.</span></div>`;
});
