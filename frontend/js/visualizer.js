import { api, renderLayout, esc, toast, $ } from './common.js';

const CAP = 40;                       // bohat lambi list mein sirf pehle 40 nodes draw karo
let nodes = [], view = [], busy = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (renderLayout('visualizer')) init();

async function init() {
  $('bSearch').onclick = () => traverse('search');
  $('bDelete').onclick = () => traverse('delete');
  $('bHead').onclick = () => insert('head');
  $('bTail').onclick = () => insert('tail');
  $('bRev').onclick = reverse;
  $('bSort').onclick = sortView;
  $('bReset').onclick = reset;
  try { nodes = (await api('/linkedlist/state')).data.nodes; reset(); }
  catch (e) { toast(e.message, 'error'); }
}

function render(list, marks = {}) {
  view = list;
  if (!list.length) { $('chain').innerHTML = '<span class="null-end">HEAD → NULL (list khaali hai)</span>'; return; }
  const shown = list.slice(0, CAP);
  const html = shown.map((n, i) => {
    const cls = marks[n.id] || (n.isNew ? 'fresh' : '');
    const head = i === 0 ? '<span class="tag">HEAD</span>' : '';
    const tail = i === list.length - 1 ? '<span class="tag t">TAIL</span>' : '';
    return `<div class="vnode ${cls}" data-id="${esc(n.id)}">${head}${tail}<div class="d" title="${esc(n.name)}">${esc(n.name)}</div><div class="p" aria-hidden="true">●</div></div><span class="arrow" aria-hidden="true">→</span>`;
  }).join('');
  $('chain').innerHTML = html + (list.length > CAP ? `<span class="muted">… +${list.length - CAP} more nodes</span>` : '<span class="null-end">NULL</span>');
}

function info(op, steps, complexity, text) {
  $('info').innerHTML = `<p><strong>Operation:</strong> ${esc(op)}</p><p><strong>Steps:</strong> ${esc(steps)}</p>
    <p><strong>Time complexity:</strong> <span class="badge b-blue">${esc(complexity)}</span></p><p>${esc(text)}</p>
    <p class="muted" style="margin-top:8px">Preview only. Asli inventory change nahi hui.</p>`;
}
const label = () => $('vq').value.trim();

async function traverse(op) {
  if (busy) return;
  const q = label();
  if (!q) return toast('Pehle medicine ka naam likho', 'warning');
  busy = true;
  try {
    render(nodes);
    const r = (await api('/linkedlist/simulate', { method: 'POST', body: { op, q } })).data;
    for (const id of r.path) {                                       // har node par amber highlight
      const el = document.querySelector(`.vnode[data-id="${CSS.escape(id)}"]`);
      if (el) { el.classList.add('visit'); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      await sleep(400);
    }
    if (r.found) {
      const el = document.querySelector(`.vnode[data-id="${CSS.escape(r.foundId)}"]`);
      if (el) { el.classList.remove('visit'); el.classList.add(op === 'delete' ? 'del' : 'found'); }
      if (op === 'delete') { await sleep(700); render(nodes.filter(n => n.id !== r.foundId)); }
    }
    info(op === 'search' ? 'Search' : 'Delete', `${r.steps} node(s) visit hue`, r.complexity, r.explanation);
  } catch (e) { toast(e.message, 'error'); }
  busy = false;
}

function insert(where) {
  if (busy) return;
  const n = { id: 'new-' + Date.now(), name: label() || 'New Medicine', isNew: true };
  render(where === 'head' ? [n, ...nodes] : [...nodes, n]);
  info(where === 'head' ? 'Insert at Head' : 'Insert at Tail', '1 step', 'O(1)',
    where === 'head' ? 'newNode.next = head; head = newNode. Traversal ki zaroorat nahi.'
      : 'tail.next = newNode; tail = newNode. Tail pointer ki wajah se traversal nahi karna parta.');
}
function reverse() {
  if (busy) return;
  render([...view].reverse());
  info('Reverse', `${nodes.length} pointer(s) palte`, 'O(n)', 'Har node ka next pointer pichle node ki taraf mod diya jata hai (prev, cur, next teen pointers se).');
}
function sortView() {
  if (busy) return;
  render([...nodes].sort((a, b) => a.name.localeCompare(b.name)));
  info('Merge Sort (A–Z)', 'list ko bar bar aadha karke merge', 'O(n log n)', 'Slow/fast pointer se list ka beech dhoondte hain, dono hisse sort karke merge karte hain. Linked list ke liye merge sort sabse munasib hai.');
}
function reset() {
  render(nodes);
  $('info').textContent = 'Koi operation chunein, yahan steps aur complexity nazar aayegi.';
}
