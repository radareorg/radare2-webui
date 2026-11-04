'use strict';
/* r2 tiles: a keyboard driven tiling frontend for radare2 (dwm style) */
/* eslint-disable no-control-regex */

const $ = (id) => document.getElementById(id);
const ROOT = window.location.pathname.split('/').slice(0, -2).join('/');
const COLOR = 'e scr.color=3;'; /* r2 http resets scr.color on every request */
const LAYOUTS = { tile: '[]=', monocle: '[M]', grid: '[+]', split: '[|]' };
const PRESETS = ['pd $R', 'px $R*16', 'pxr $R*8', 'pdco', 'pds', 'agf', 'afl', 'iz', 'ii', 'is', 'iS', 'ie', 'i', 'f', 'axt', 'afi', 'dr=', 'dbt', 'dm', 'console'];
const PRINT = ['pd $R', 'px $R*16', 'pxr $R*8', 'pdco', 'pds', 'agf'];
const DESCRIPTIONS = ['Disassembly with instruction bytes', 'Hex dump with ASCII', 'Hex dump with pointer references', 'Decompiler with offsets', 'Disassembly summary', 'Function graph', 'Functions', 'Strings', 'Imports', 'Symbols', 'Sections', 'Entry points', 'File information', 'Flags', 'Cross references', 'Function information', 'Registers', 'Backtrace', 'Memory maps', 'Command output'];
const PANE_ACTIONS = PRESETS.map((value, i) => ({ value, detail: DESCRIPTIONS[i] }));
PANE_ACTIONS.push({ value: 'projects', detail: 'Open or save a binary project' }, { value: 'notes', detail: 'Edit notes saved with the project' }, { value: 'r2pm', detail: 'Search, install or uninstall packages' });
PANE_ACTIONS.push({ value: 'open-file', detail: 'Open a file and replace the current files and analysis' });
const HELP = `r2 tiles — dwm for radare2

 Open a frame: click + New frame, press o, or press alt+p.
 Type any r2 command and press Enter. Use ↑↓ to choose a preset.
 Examples: pd $R     px 256 @ main     aflj
 Decompiler: choose pdco to show offsets alongside decompiled code.
 Press c to change the focused frame's command.
 Press e to filter eval variables, choose a key, edit key=value and Enter to save.
 Press | to split the frame side by side; - splits it top and bottom.
 Click ↻ in a frame title to cycle its contents (shift-click reverses).
 Click ⇄ to link/unlink a frame's seek. Linked frames follow any frame's seek.
 y / Y yank the selected bytes (or one byte) / paste r2's yank buffer.
 m then key sets a visual mark; ' then key jumps to it.
 Projects opens binary projects; Notes edits project notes; r2pm manages packages.
 Open file (or O) replaces the current files, flags and analysis with a new file.
 Help: click the circled ?, press ? or F1. Escape or Close dismisses help.

 window manager (alt+key)              pane (focused)
 j k        focus next / prev          j k ↑↓     step seek or move cursor
 J K        move pane down / up        J K PgUp/Dn page
 h l        shrink / grow master       ^d ^u      half page
 i d        more / less masters        enter      follow jump / seek to line
 enter      zoom pane to master        u U ⌫      undo / redo seek
 ⇧enter     new console                g          goto (fuzzy flags)
 p          new pane (fuzzy)           :          r2 command (into console)
 ⇧c         close pane                 c          change pane command
 t m g      tile / monocle / grid      p P        cycle print mode
 space      next layout                /          filter lines
 1-9        view tag                   x          xrefs to here
 ⇧1-9       send pane to tag           ;  n       comment / rename function
 r          refresh                    o  q  r  ? new / close / refresh / help

 $R in a command expands to the pane height in rows.
 Each pane has its own address and seek history. Click addresses to seek there.
 Wheel / trackpad over disassembly or hex seeks by rows; other panes scroll.
 Shift+wheel scrolls horizontally. Filtered panes scroll their matching lines.
 Drag bytes to select; shift-click extends; copy copies hex; escape clears.
 Click the layout symbol to cycle modes. Drag pane separators to resize.`;

const S = { tag: 1, lay: 'tile', mfact: 0.55, nmaster: 1, gcols: [], grows: [], splits: {}, hist: [], panes: [] };
const panes = [];
let cur = null;
let seek = '';
let lastSeek = '';
let file = '';
let queue = Promise.resolve();
const uiTools = {};
let initializing = true;

async function request (c) {
  const r = await fetch(ROOT + '/cmd', { method: 'POST', body: c });
  if (!r.ok) throw new Error(`r2 request failed (HTTP ${r.status})`);
  return r.text();
}

function r2 (c, receive) {
  const p = queue.then(async () => {
    const out = await request(typeof c === 'function' ? c() : c);
    return receive ? receive(out) : out;
  });
  queue = p.catch(() => toast('r2 is not responding'));
  return p;
}

/* Keep each request at the pane's address, including compound commands. Silent
 * seeks leave r2's seek history alone; restore the backend offset in the same
 * serialized request so another pane never observes this temporary context. */
function r2At (p, c) {
  return r2(() => `ss ${p ? p.addr : seek};${c};ss ${seek}`);
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => '&#' + c.charCodeAt(0) + ';');
const strip = (s) => s.replace(/\x1b\[[\d;?]*[A-Za-z]/g, '');
const norm = (a) => { try { return '0x' + BigInt(a).toString(16); } catch (e) { return a; } };
const address = (a) => /^0x[0-9a-f]+$/i.test(a.trim()) ? norm(a.trim()) : '';
const vis = () => panes.filter((p) => p.tag === S.tag);
const stepOf = (c) => /@/.test(c) ? 0 : /^p[di]\b/.test(c.trim()) ? 'i' : /^px[wqr]?\b/.test(c.trim()) ? 16 : 0;
const rowHeight = (p) => parseFloat(window.getComputedStyle(p.pre).lineHeight) || 16.2;
const pageRows = (p) => Math.max(1, Math.floor(p.pre.clientHeight / rowHeight(p)));

/* Hex row width depends on the print mode, hex.cols and asm.bits. Use row
 * addresses, not references within the row, and retain precision above 2^53. */
function rowBytes (p) {
  const a = p.lines.map((l) => /^\s*(0x[0-9a-f]+)\s/i.exec(l.t)).filter(Boolean).slice(0, 2);
  if (a.length === 2) {
    const n = BigInt(a[1][1]) - BigInt(a[0][1]);
    if (n > 0n && n <= 65536n) return Number(n);
  }
  return /^pxr\b/.test(p.cmd.trim()) ? 8 : 16;
}

/* Share one navigation queue between keys and wheels. Coalesce input while
 * HTTP is busy instead of queuing a seek and a full repaint for every pixel. */
const motions = [];
let moving = false;
let motionTimer;
function seekRows (p, d) {
  const last = motions[motions.length - 1];
  if (last && last.p === p && last.command === p.cmd && last.navigation === p.navigation) last.d += d;
  else motions.push({ p, command: p.cmd, navigation: p.navigation, d, step: stepOf(p.cmd) === 'i' ? 'i' : rowBytes(p) });
  if (!moving && !motionTimer) motionTimer = setTimeout(flushMotions, 32);
}

async function flushMotions () {
  motionTimer = null;
  moving = true;
  try {
    while (motions.length) {
      const { p, command, navigation, d, step } = motions.shift();
      if (!d || !panes.includes(p) || p.cmd !== command || p.navigation !== navigation || p.tag !== S.tag) continue;
      const a = address(await r2At(p, (step === 'i' ? `sso ${d}` : `ss${d < 0 ? '-' : '+'}${Math.abs(d) * step}`) + ';?v $$'));
      if (!panes.includes(p) || p.cmd !== command || p.navigation !== navigation) continue;
      if (setAddress(p, a)) await refresh(p);
    }
  } catch (e) {
    motions.length = 0;
  } finally {
    moving = false;
  }
}

function wheel (p, e) {
  if (!stepOf(p.cmd) || p.filter || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return;
  e.preventDefault();
  setFocus(p);
  const now = Date.now();
  if (now - (p.wheelTime || 0) > 200 || Math.sign(p.wheelDelta) !== Math.sign(e.deltaY)) p.wheelDelta = 0;
  p.wheelTime = now;
  p.wheelDelta += e.deltaY * (e.deltaMode === 1 ? 1 : e.deltaMode === 2 ? pageRows(p) : 1 / rowHeight(p));
  const rows = Math.trunc(p.wheelDelta);
  if (rows) { p.wheelDelta -= rows; seekRows(p, rows); }
}

/* ansi to html */
const PAL = ['#000', '#c33', '#3c3', '#cc3', '#36c', '#c3c', '#3cc', '#ccc', '#666', '#f66', '#6f6', '#ff6', '#69f', '#f6f', '#6ff', '#fff'];
function c256 (n) {
  if (n < 16) return PAL[n];
  if (n >= 232) return `rgb(${Array(3).fill((n - 232) * 10 + 8)})`;
  n -= 16;
  return `rgb(${[n / 36 | 0, (n / 6 | 0) % 6, n % 6].map((v) => v && v * 40 + 55)})`;
}
function sgr (st, code) {
  const a = code.split(';').map(Number);
  for (let i = 0; i < a.length; i++) {
    const n = a[i];
    if (!n) st = {};
    else if (n === 1) st.b = 1;
    else if (n === 7) st.inv = 1;
    else if (n === 22) delete st.b;
    else if (n === 27) delete st.inv;
    else if (n === 39) delete st.fg;
    else if (n === 49) delete st.bg;
    else if (n >= 30 && n < 38) st.fg = PAL[n - 30];
    else if (n >= 40 && n < 48) st.bg = PAL[n - 40];
    else if (n >= 90 && n < 98) st.fg = PAL[n - 82];
    else if (n >= 100 && n < 108) st.bg = PAL[n - 92];
    else if (n === 38 || n === 48) {
      const k = n === 38 ? 'fg' : 'bg';
      if (a[i + 1] === 2) { st[k] = `rgb(${a.slice(i + 2, i + 5)})`; i += 4; } else if (a[i + 1] === 5) { st[k] = c256(a[i + 2]); i += 2; }
    }
  }
  return st;
}

/* Locate bytes by text columns before adding markup. Offsets are byte
 * addresses, including reversed digit order in little endian word dumps. */
function byteRow (t, cmd) {
  const hex = /^\s*px[wqr]?\b/.test(cmd);
  const word = /^\s*px[wqr]\b/.test(cmd);
  if (!hex && !/^\s*pd\b/.test(cmd)) return null;
  const row = (hex ? /^(\s*)(0x[0-9a-f]+)\s+/i : /^([^\w;]*)(0x[0-9a-f]+)\s+/i).exec(t);
  if (!row) return null;
  const start = row[0].length;
  const data = (word ? /^(0x[0-9a-f?]+(?: {1,2}0x[0-9a-f?]+)*)/i : hex ? /^([0-9a-f?]+(?: [0-9a-f?]+)*)/i : /^([0-9a-f?]+)(?=\s{2,})/i).exec(t.slice(start));
  if (!data) return null;
  const tokens = [...data[1].matchAll(word ? /0x([0-9a-f?]+)/gi : /([0-9a-f?]+)/gi)];
  if (tokens.some((m) => m[1].length % 2)) return null;
  return { hex, word, start, end: start + data[1].length, addr: BigInt(row[2]), tokens };
}

function byteRegions (row, t, ascii, bigEndian) {
  if (!row) return [];
  const regions = [];
  const bytes = [];
  for (const token of row.tokens) {
    const pairs = token[1].match(/../g);
    const base = bytes.length;
    for (let i = 0; i < pairs.length; i++) {
      const n = row.word && !bigEndian ? pairs.length - 1 - i : i;
      const a = '0x' + (row.addr + BigInt(base + n)).toString(16);
      const v = pairs[i].toLowerCase();
      const start = row.start + token.index + (row.word ? 2 : 0) + i * 2;
      regions.push({ start, end: start + 2, a, v });
      bytes[base + n] = { a, v };
    }
  }
  if (row.hex && ascii >= row.end) {
    bytes.forEach((b, i) => { if (ascii + i < t.length) regions.push({ ...b, start: ascii + i, end: ascii + i + 1 }); });
  }
  return regions;
}

function byteHTML (s, pos, regions) {
  const plain = (v) => esc(v).replace(/\b0x[0-9a-f]{3,}\b|\b(?:sym|fcn|str|obj|reloc|section|loc|sub)\.[\w.$:]+|\bentry\d+\b/gi,
    (m) => /^0x/i.test(m) ? `<a data-a="${norm(m)}">${m}</a>` : `<a data-symbol="${m}">${m}</a>`);
  let h = '';
  let i = 0;
  for (const r of regions) {
    const start = Math.max(0, r.start - pos);
    const end = Math.min(s.length, r.end - pos);
    if (end <= start) continue;
    h += plain(s.slice(i, start)) + `<span data-byte="${r.a}" data-hex="${r.v}">${esc(s.slice(start, end))}</span>`;
    i = end;
  }
  return h + plain(s.slice(i));
}

function ansi (txt, cmd = '', bigEndian = false) {
  let st = {};
  const lines = txt.replace(/\n$/, '').split('\n');
  const rows = lines.map((l) => byteRow(strip(l), cmd));
  const ascii = Math.max(0, ...rows.filter((r) => r && r.hex).map((r) => r.end)) + (/^\s*px[qr]\b/.test(cmd) ? 3 : 2);
  return lines.map((line, index) => {
    let h = '';
    let pos = 0;
    const regions = byteRegions(rows[index], strip(line), ascii, bigEndian);
    line.split(/\x1b\[([\d;]*)m/).forEach((s, i) => {
      if (i & 1) { st = sgr(st, s); return; }
      if (!(s = strip(s))) return;
      const html = byteHTML(s, pos, regions);
      pos += s.length;
      const fg = st.inv ? st.bg || 'var(--pane)' : st.fg;
      const bg = st.inv ? st.fg || 'var(--fg)' : st.bg;
      const css = (fg ? 'color:' + fg + ';' : '') + (bg ? 'background:' + bg + ';' : '') + (st.b ? 'font-weight:bold' : '');
      h += css ? `<span style="${css}">${html}</span>` : html;
    });
    return { h, t: strip(line), bytes: regions };
  });
}

function selectionRange (p) {
  if (!p.selection) return null;
  const a = BigInt(p.selection.anchor);
  const b = BigInt(p.selection.head);
  return a < b ? [a, b] : [b, a];
}

function paintSelection (p) {
  const range = selectionRange(p);
  p.pre.querySelectorAll('[data-byte]').forEach((cell) => {
    const a = BigInt(cell.dataset.byte);
    cell.classList.toggle('selected', !!range && a >= range[0] && a <= range[1]);
  });
  paneTitle(p);
}

function selectionText (p) {
  const range = selectionRange(p);
  if (!range || !p.byteValues) return '';
  const bytes = [...p.byteValues].filter(([a]) => BigInt(a) >= range[0] && BigInt(a) <= range[1]).sort(([a], [b]) => BigInt(a) < BigInt(b) ? -1 : 1);
  return BigInt(bytes.length) === range[1] - range[0] + 1n ? bytes.map(([, v]) => v).join(' ') : '';
}

let byteDrag = null;
function selectBytes (p, e) {
  const cell = e.target.closest('[data-byte]');
  if (e.button !== 0 || !cell) return;
  e.preventDefault();
  setFocus(p);
  window.getSelection().removeAllRanges();
  p.selection = { anchor: e.shiftKey && p.selection ? p.selection.anchor : cell.dataset.byte, head: cell.dataset.byte };
  byteDrag = { p, pointer: e.pointerId, x: e.clientX, y: e.clientY, timer: null };
  p.pre.setPointerCapture(e.pointerId);
  paintSelection(p);
}

function updateByteDrag () {
  if (!byteDrag) return;
  const p = byteDrag.p;
  const r = p.pre.getBoundingClientRect();
  const x = clamp(byteDrag.x, r.left + 2, r.right - 8);
  const y = clamp(byteDrag.y, r.top + rowHeight(p) / 2, r.bottom - rowHeight(p) / 2);
  const target = document.elementFromPoint(x, y);
  let cell = target && target.closest('[data-byte]');
  if (!cell) {
    const row = target && target.closest('pre > div');
    if (row && p.pre.contains(row)) {
      cell = [...row.querySelectorAll('[data-byte]')].reduce((near, c) => {
        const distance = (el) => { const r = el.getBoundingClientRect(); return Math.abs(x - (r.left + r.right) / 2); };
        return !near || distance(c) < distance(near) ? c : near;
      }, null);
    }
  }
  if (cell && p.pre.contains(cell) && p.selection.head !== cell.dataset.byte) {
    p.selection.head = cell.dataset.byte;
    paintSelection(p);
  }
}

function scrollByteDrag () {
  if (!byteDrag) return;
  byteDrag.timer = null;
  const p = byteDrag.p;
  const r = p.pre.getBoundingClientRect();
  const d = byteDrag.y < r.top ? -1 : byteDrag.y > r.bottom ? 1 : 0;
  if (!d) return;
  if (stepOf(p.cmd) && !p.filter) seekRows(p, d);
  else p.pre.scrollTop += d * rowHeight(p);
  updateByteDrag();
  byteDrag.timer = setTimeout(scrollByteDrag, 80);
}

function extendBytes (e) {
  if (!byteDrag || e.pointerId !== byteDrag.pointer) return;
  byteDrag.x = e.clientX;
  byteDrag.y = e.clientY;
  updateByteDrag();
  if (!byteDrag.timer) scrollByteDrag();
}

document.addEventListener('pointermove', extendBytes);
const endByteDrag = (e) => {
  if (byteDrag && e.pointerId === byteDrag.pointer) {
    const p = byteDrag.p;
    clearTimeout(byteDrag.timer);
    byteDrag = null;
    if (p.pre.hasPointerCapture(e.pointerId)) p.pre.releasePointerCapture(e.pointerId);
  }
};
document.addEventListener('pointerup', endByteDrag);
document.addEventListener('pointercancel', endByteDrag);
document.addEventListener('copy', (e) => {
  if (!cur || !$('menu').hidden || !$('help').hidden || !$('manager').hidden || !$('notes').hidden || !window.getSelection().isCollapsed || (e.target && e.target.closest('input, textarea, [contenteditable="true"]'))) return;
  const text = selectionText(cur);
  if (text) { e.clipboardData.setData('text/plain', text); e.preventDefault(); }
});

/* panes */
let paneId = 0;
function newPane (cmd, focus = true, addr = (cur && cur.addr) || seek, weight = 1, id = 0, axis = 'x', decompiler = 'pdc', tied = false) {
  addr = address(addr) || seek;
  id = id > 0 ? id : paneId + 1;
  paneId = Math.max(paneId, id);
  const p = { id, cmd, addr, weight, decompiler, tied, history: [addr], historyIndex: 0, navigation: 0, tag: S.tag, cur: 0, filter: '', lines: [], out: '' };
  p.el = document.createElement('div');
  p.el.id = 'pane' + id;
  p.el.className = 'pane';
  p.el.innerHTML = '<header><span></span><button type="button" title="Next print mode (shift-click for previous)" aria-label="Cycle frame contents">↻</button></header><pre></pre>';
  p.label = p.el.firstChild.firstChild;
  p.el.firstChild.lastChild.onclick = (e) => { e.stopPropagation(); cyclePrint(p, e.shiftKey ? -1 : 1); };
  p.tieButton = document.createElement('button');
  p.tieButton.type = 'button';
  p.tieButton.textContent = '⇄';
  p.tieButton.onclick = (e) => { e.stopPropagation(); toggleTie(p); };
  p.el.firstChild.appendChild(p.tieButton);
  p.pre = p.el.lastChild;
  p.decompilerBar = document.createElement('div');
  p.decompilerBar.className = 'decompiler';
  p.decompilerBar.hidden = !uiTools.isDecompiler(p);
  p.decompilerSelect = document.createElement('select');
  p.decompilerSelect.setAttribute('aria-label', 'Decompiler');
  p.decompilerOptions = document.createElement('select');
  p.decompilerOptions.setAttribute('aria-label', 'Decompiler option');
  p.decompilerBar.appendChild(p.decompilerSelect);
  p.decompilerBar.appendChild(p.decompilerOptions);
  p.el.insertBefore(p.decompilerBar, p.pre);
  p.decompilerSelect.onchange = () => { p.decompiler = p.decompilerSelect.value; setFocus(p); save(); refresh(p); };
  p.decompilerOptions.onchange = () => uiTools.editDecompilerOption(p);
  p.pre.addEventListener('wheel', (e) => wheel(p, e), { passive: false });
  p.pre.addEventListener('pointerdown', (e) => selectBytes(p, e));
  p.pre.addEventListener('lostpointercapture', endByteDrag);
  p.el.onmousedown = (e) => {
    setFocus(p);
    if (p.selection && !e.target.closest('[data-byte]')) { p.selection = null; paintSelection(p); }
  };
  $('wm').appendChild(p.el);
  const i = panes.indexOf(cur);
  panes.splice(i < 0 ? panes.length : i + 1, 0, p);
  if (S.lay === 'split' && !initializing) {
    const tree = S.splits[S.tag];
    const leaf = { id };
    S.splits[S.tag] = tree && cur && cur.tag === S.tag ? replaceLeaf(tree, cur.id, { axis, ratio: 0.5, a: { id: cur.id }, b: leaf }) : tree ? { axis, ratio: 0.5, a: tree, b: leaf } : leaf;
  }
  if (focus) setFocus(p);
  arrange();
  if (focus) refresh(p);
  return p;
}

function setAddress (p, addr, broadcast = true) {
  if (!addr) return false;
  const changed = addr !== p.addr;
  if (changed) {
    p.addr = addr;
    p.history.splice(++p.historyIndex);
    p.history.push(addr);
  }
  if (broadcast) {
    lastSeek = addr;
    panes.filter((q) => q !== p && q.tied && q.addr !== addr).forEach((q) => {
      ++q.navigation;
      setAddress(q, addr, false);
      refresh(q).catch(() => {});
    });
  }
  paneTitle(p);
  bar();
  save();
  return changed;
}

function toggleTie (p) {
  setFocus(p);
  p.tied = !p.tied;
  if (p.tied && setAddress(p, lastSeek || p.addr)) refresh(p);
  paneTitle(p);
  save();
}

async function seekPane (p, expr) {
  if (!p) return;
  const id = ++p.navigation;
  const addr = address(await r2At(p, '?v ' + expr));
  if (id === p.navigation && panes.includes(p) && setAddress(p, addr)) await refresh(p);
}

function undoSeek (p, d) {
  if (!p) return;
  ++p.navigation;
  p.historyIndex = Math.max(0, Math.min(p.history.length - 1, p.historyIndex + d));
  p.addr = p.history[p.historyIndex];
  setAddress(p, p.addr);
  paneTitle(p);
  bar();
  save();
  return refresh(p);
}

function paneTitle (p) {
  const range = selectionRange(p);
  (p.label || p.el.firstChild).textContent = `${vis().indexOf(p) + 1}  ${p.cmd || 'console'}  ${p.addr}${p.filter ? '  /' + p.filter : ''}` +
    (range ? `  [0x${range[0].toString(16)}..0x${range[1].toString(16)} · ${range[1] - range[0] + 1n} B]` : '');
  if (p.tieButton) {
    p.tieButton.title = p.tied ? 'Unlink seek: keep this frame independent' : 'Link seek: follow seeks from other frames';
    p.tieButton.setAttribute('aria-label', p.tieButton.title);
    p.tieButton.setAttribute('aria-pressed', String(p.tied));
    p.tieButton.classList.toggle('tied', p.tied);
  }
}

function closePane (p = cur) {
  if (!p) return;
  if (byteDrag && byteDrag.p === p) endByteDrag({ pointerId: byteDrag.pointer });
  const v = vis();
  const next = v[v.indexOf(p) + 1] || v[v.indexOf(p) - 1];
  p.el.remove();
  panes.splice(panes.indexOf(p), 1);
  setFocus(next);
  arrange();
}

function setFocus (p) {
  if (cur) cur.el.classList.remove('f');
  cur = p || null;
  if (cur) cur.el.classList.add('f');
  bar();
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function replaceLeaf (tree, id, replacement) {
  if ('id' in tree) return tree.id === id ? replacement : tree;
  tree.a = replaceLeaf(tree.a, id, replacement);
  tree.b = replaceLeaf(tree.b, id, replacement);
  return tree;
}

function pruneTree (tree, ids) {
  if (!tree) return null;
  if ('id' in tree) return ids.has(tree.id) ? tree : null;
  tree.a = pruneTree(tree.a, ids);
  tree.b = pruneTree(tree.b, ids);
  return !tree.a ? tree.b : !tree.b ? tree.a : tree;
}

/* Convert the current tile/grid rectangles to a tree without moving other
 * frames. Subsequent splits replace only the focused leaf. */
function treeForPanes (frames) {
  if (!frames.length) return null;
  if (frames.length === 1) return { id: frames[0].id };
  if (frames.every((p) => p.rect)) {
    for (const [axis, index] of [['x', 0], ['y', 1]]) {
      const lo = Math.min(...frames.map((p) => p.rect[index]));
      const hi = Math.max(...frames.map((p) => p.rect[index] + p.rect[index + 2]));
      for (const cut of [...new Set(frames.map((p) => p.rect[index]))].sort((a, b) => a - b)) {
        if (cut <= lo || cut >= hi || frames.some((p) => p.rect[index] < cut && p.rect[index] + p.rect[index + 2] > cut + 0.01)) continue;
        const a = frames.filter((p) => p.rect[index] < cut);
        const b = frames.filter((p) => p.rect[index] >= cut);
        if (a.length && b.length) return { axis, ratio: (cut - lo) / (hi - lo), a: treeForPanes(a), b: treeForPanes(b) };
      }
    }
  }
  return { axis: 'x', ratio: 1 / frames.length, a: { id: frames[0].id }, b: treeForPanes(frames.slice(1)) };
}

function splitFrame (axis) {
  if (!cur) { newPane('pd $R'); return; }
  if (S.lay !== 'split') S.splits[S.tag] = treeForPanes(vis());
  S.lay = 'split';
  newPane(cur.cmd, true, cur.addr, 1, 0, axis, cur.decompiler, cur.tied);
  refreshAll();
}

function cyclePrint (p, d = 1) {
  if (!p) return;
  const i = PRINT.indexOf(p.cmd);
  p.cmd = PRINT[i < 0 ? d > 0 ? 0 : PRINT.length - 1 : (i + d + PRINT.length) % PRINT.length];
  ++p.navigation;
  p.filter = '';
  p.selection = null;
  setFocus(p);
  arrange();
  return refresh(p);
}
function axisSizes (weights, count, total) {
  const values = Array.from({ length: count }, (_, i) => weights.length === count && weights[i] > 0 ? weights[i] : 1);
  const sum = values.reduce((a, b) => a + b, 0);
  return values.map((w) => w * total / sum);
}

function resizePair (sizes, index, delta, minimum) {
  const next = sizes.slice();
  const total = sizes[index] + sizes[index + 1];
  const min = Math.min(minimum, total / 3);
  next[index] = clamp(sizes[index] + delta, min, total - min);
  next[index + 1] = total - next[index];
  return next;
}

let resizeDrag = null;
function splitter (axis, at, from, length, change) {
  const el = document.createElement('div');
  el.className = 'splitter ' + axis;
  el.setAttribute('role', 'separator');
  el.setAttribute('aria-orientation', axis === 'x' ? 'vertical' : 'horizontal');
  el.title = axis === 'x' ? 'Drag to resize columns' : 'Drag to resize rows';
  Object.assign(el.style, axis === 'x'
    ? { left: at - 4 + 'px', top: from + 'px', height: length + 'px' }
    : { top: at - 4 + 'px', left: from + 'px', width: length + 'px' });
  el.onpointerdown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const wm = $('wm');
    resizeDrag = { pointer: e.pointerId, start: axis === 'x' ? e.clientX : e.clientY, axis, change };
    wm.classList.add('resizing', 'resize-' + axis);
    wm.setPointerCapture(e.pointerId);
  };
  $('wm').appendChild(el);
}

document.addEventListener('pointermove', (e) => {
  if (!resizeDrag || e.pointerId !== resizeDrag.pointer) return;
  resizeDrag.change((resizeDrag.axis === 'x' ? e.clientX : e.clientY) - resizeDrag.start);
  arrange();
});
function endResize (e) {
  if (!resizeDrag || e.pointerId !== resizeDrag.pointer) return;
  const wm = $('wm');
  if (wm.hasPointerCapture(e.pointerId)) wm.releasePointerCapture(e.pointerId);
  wm.classList.remove('resizing', 'resize-x', 'resize-y');
  resizeDrag = null;
  refreshAll();
}
document.addEventListener('pointerup', endResize);
document.addEventListener('pointercancel', endResize);

function arrange () {
  const wm = $('wm');
  const W = wm.clientWidth;
  const H = wm.clientHeight;
  const v = vis();
  const n = v.length;
  const m = Math.min(S.nmaster, n);
  const mw = n > m && m ? W * S.mfact : m ? W : 0;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const widths = axisSizes(S.gcols, cols, W);
  const heights = axisSizes(S.grows, rows, H);
  const master = v.slice(0, m);
  const stack = v.slice(m);
  const mh = axisSizes(master.map((p) => p.weight), m, H);
  const sh = axisSizes(stack.map((p) => p.weight), n - m, H);
  const sum = (a, i) => a.slice(0, i).reduce((a, b) => a + b, 0);
  wm.querySelectorAll('.splitter').forEach((el) => el.remove());
  const rects = new Map();
  if (S.lay === 'split') {
    let tree = initializing ? treeForPanes(v) : pruneTree(S.splits[S.tag], new Set(v.map((p) => p.id)));
    const found = new Set();
    const collect = (node) => { if (node) { if ('id' in node) found.add(node.id); else { collect(node.a); collect(node.b); } } };
    collect(tree);
    v.filter((p) => !found.has(p.id)).forEach((p) => { tree = tree ? { axis: 'x', ratio: 0.5, a: tree, b: { id: p.id } } : { id: p.id }; });
    if (!initializing) S.splits[S.tag] = tree;
    const place = (node, x, y, w, h) => {
      if (!node) return;
      if ('id' in node) { rects.set(node.id, [x, y, w, h]); return; }
      const vertical = node.axis === 'x';
      const size = vertical ? w : h;
      const ratio = node.ratio;
      const first = size * ratio;
      splitter(node.axis, (vertical ? x : y) + first, vertical ? y : x, vertical ? h : w, (d) => {
        const min = Math.min(0.4, (vertical ? 80 : 40) / size);
        node.ratio = clamp(ratio + d / size, min, 1 - min);
      });
      if (vertical) { place(node.a, x, y, first, h); place(node.b, x + first, y, w - first, h); } else { place(node.a, x, y, w, first); place(node.b, x, y + first, w, h - first); }
    };
    place(tree, 0, 0, W, H);
  }
  panes.forEach((p) => { p.el.style.display = p.tag === S.tag && (S.lay !== 'monocle' || p === cur) ? '' : 'none'; });
  v.forEach((p, i) => {
    let r;
    if (S.lay === 'monocle') r = [0, 0, W, H];
    else if (S.lay === 'split') r = rects.get(p.id);
    else if (S.lay === 'grid') {
      const row = i / cols | 0;
      const col = i % cols;
      const c = i === n - 1 ? cols - (i % cols) : 1;
      r = [sum(widths, col), sum(heights, row), sum(widths, col + c) - sum(widths, col), heights[row]];
    } else r = i < m ? [0, sum(mh, i), mw, mh[i]] : [mw, sum(sh, i - m), W - mw, sh[i - m]];
    p.rect = r;
    Object.assign(p.el.style, { left: r[0] + 2 + 'px', top: r[1] + 2 + 'px', width: r[2] - 4 + 'px', height: r[3] - 4 + 'px' });
    paneTitle(p);
  });
  if (S.lay === 'tile') {
    const factor = S.mfact;
    if (m && n > m) splitter('x', mw, 0, H, (d) => { S.mfact = clamp(factor + d / W, 0.1, 0.9); });
    const splitRows = (group, sizes, x, width) => {
      for (let i = 0; i < group.length - 1; i++) {
        splitter('y', sum(sizes, i + 1), x, width, (d) => {
          resizePair(sizes, i, d, 40).forEach((h, j) => { group[j].weight = h * group.length / H; });
        });
      }
    };
    splitRows(master, mh, 0, mw);
    splitRows(stack, sh, mw, W - mw);
  } else if (S.lay === 'grid') {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols - 1 && row * cols + col + 1 < n; col++) {
        splitter('x', sum(widths, col + 1), sum(heights, row), heights[row], (d) => { S.gcols = resizePair(widths, col, d, 80); });
      }
    }
    for (let row = 0; row < rows - 1; row++) {
      splitter('y', sum(heights, row + 1), 0, W, (d) => { S.grows = resizePair(heights, row, d, 40); });
    }
  }
  bar();
  save();
}

async function refresh (p) {
  const id = p.request = (p.request || 0) + 1;
  const command = p.cmd;
  const addr = p.addr;
  if (p.cmd && p.cmd !== 'console') {
    p.el.classList.add('busy');
    try {
      await uiTools.updateDecompilerControls(p);
      if (id !== p.request || command !== p.cmd || !panes.includes(p)) return;
      const showBytes = /^\s*pd\b/.test(command) && !/[;|]/.test(command) && !/asm\.bytes\s*=/.test(command);
      const print = uiTools.isDecompiler(p) ? uiTools.decompilerCommand(p) : command;
      let out = await r2At(p, COLOR + print.replace(/\$R\b/g, Math.max(8, pageRows(p))) + (showBytes ? ' @e:asm.bytes=true' : '') + (/^\s*px[wqr]\b/.test(command) ? ';?e __r2t_endian__;e cfg.bigendian' : ''));
      if (id !== p.request || command !== p.cmd || addr !== p.addr || !panes.includes(p)) return;
      const marker = out.lastIndexOf('__r2t_endian__\n');
      if (marker >= 0) {
        p.bigEndian = out.slice(marker + '__r2t_endian__\n'.length).trim() === 'true';
        out = out.slice(0, marker);
      }
      p.out = out;
    } catch (e) {
      if (id === p.request) { p.out = 'ERROR: ' + e.message; toast(e.message); }
    } finally {
      if (id === p.request) p.el.classList.remove('busy');
    }
  }
  const top = p.pre.scrollTop;
  const left = p.pre.scrollLeft;
  const reveal = stepOf(p.cmd) && !p.filter;
  const tail = p.cmd === 'console' && top + p.pre.clientHeight >= p.pre.scrollHeight - 1;
  p.lines = ansi(p.out, p.cmd, p.bigEndian);
  const range = selectionRange(p);
  p.byteValues = new Map(range && p.byteValues ? [...p.byteValues].filter(([a]) => BigInt(a) >= range[0] && BigInt(a) <= range[1]) : []);
  p.lines.forEach((l) => l.bytes.forEach((b) => p.byteValues.set(b.a, b.v)));
  if (stepOf(p.cmd)) p.cur = Math.max(0, p.lines.findIndex((l) => l.h.includes(`data-a="${p.addr}"`)));
  else if (p.cmd === 'console') p.cur = p.lines.length - 1;
  render(p, !!reveal || tail);
  if (!reveal && !tail) p.pre.scrollTop = top;
  p.pre.scrollLeft = left;
}

function render (p, reveal = true) {
  const f = p.filter.toLowerCase();
  p.view = p.lines.filter((l) => !f || l.t.toLowerCase().includes(f));
  p.cur = Math.max(0, Math.min(p.cur, p.view.length - 1));
  p.pre.innerHTML = p.view.map((l, i) => `<div${i === p.cur ? ' class="c"' : ''}>${l.h}</div>`).join('');
  paintSelection(p);
  if (byteDrag && byteDrag.p === p) updateByteDrag();
  const c = p.pre.children[p.cur];
  if (c && reveal) c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

let reloading;
let again = false;
function refreshAll () {
  again = true;
  if (!reloading) {
    reloading = (async () => {
      try {
        do { again = false; await reload(); } while (again);
      } finally {
        reloading = null;
      }
    })();
  }
  return reloading;
}

async function reload () {
  await Promise.all(vis().map(refresh));
}

async function cmd (c, all = true) {
  await r2At(cur, c);
  if (all) await refreshAll();
}

function bar () {
  const used = new Set(panes.map((p) => p.tag));
  $('tags').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((t) => t <= 4 || used.has(t) || t === S.tag)
    .map((t) => `<b data-t="${t}" class="${used.has(t) ? 'o' : ''} ${t === S.tag ? 'on' : ''}">${t}</b>`).join('');
  $('lay').textContent = S.lay === 'monocle' ? `[${vis().length}]` : LAYOUTS[S.lay];
  $('title').textContent = [file, cur && cur.cmd].filter(Boolean).join(' · ');
  $('seek').textContent = cur ? cur.addr : seek;
  hl();
}

let hover = '';
function hl () {
  $('hl').textContent = panes.map((p) => `#${p.el.id} a[data-a="${p.addr}"]{background:#e5a50a33;color:#fff}`).join('') +
    (hover ? `a[data-a="${hover}"]{outline:1px solid var(--acc);background:#e5a50a55}` : '');
}

function save () {
  S.file = file;
  S.seek = lastSeek;
  S.panes = panes.map((p) => ({ id: p.id, cmd: p.cmd, tag: p.tag, addr: p.addr, weight: p.weight, decompiler: p.decompiler, tied: p.tied }));
  try { window.localStorage.r2t = JSON.stringify(S); } catch (e) {}
}

let toastTimer;
function toast (msg) {
  $('toast').textContent = msg;
  $('toast').classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('on'), 2000);
}

function showHelp (show = true) {
  if (show) {
    $('menu').hidden = true;
    $('manager').hidden = true;
    if (!$('notes').hidden) uiTools.rememberNotes();
    $('notes').hidden = true;
    uiTools.cancelMark();
  }
  $('help').hidden = !show;
  if (show) $('help').focus();
  else $('hint').focus();
}

function openPane () {
  $('manager').hidden = true;
  if (!$('notes').hidden) uiTools.rememberNotes();
  $('notes').hidden = true;
  uiTools.cancelMark();
  if (!$('help').hidden) showHelp(false);
  menu('New frame: type any r2 command', PANE_ACTIONS, (command) => {
    command = command.trim();
    if (command === 'projects') uiTools.openProjects();
    else if (command === 'open-file') uiTools.openFileDialog();
    else if (command === 'notes') uiTools.openNotes();
    else if (command === 'r2pm') uiTools.openPackages();
    else if (command) newPane(command);
  }, { raw: true, preferDescription: true, hint: 'Enter opens your typed command · ↑↓ choose a preset · Esc cancels. Examples: pd $R, px 256 @ main, aflj' });
}

function bindControls () {
  $('helptext').textContent = HELP;
  $('hint').onclick = () => showHelp();
  $('helpclose').onclick = () => showHelp(false);
  $('newpane').onclick = openPane;
  $('projectsbutton').onclick = uiTools.openProjects;
  $('openfilebutton').onclick = uiTools.openFileDialog;
  $('notesbutton').onclick = uiTools.openNotes;
  $('packagesbutton').onclick = uiTools.openPackages;
  $('managerclose').onclick = () => { $('manager').hidden = true; };
  $('notesclose').onclick = () => { uiTools.rememberNotes(); $('notes').hidden = true; };
  $('notestext').oninput = uiTools.rememberNotes;
  $('notessave').onclick = uiTools.saveNotes;
  $('wm').onclick = (e) => {
    if (e.target.closest('[data-byte]') || !window.getSelection().isCollapsed) return;
    const a = e.target.closest('a[data-a], a[data-symbol]');
    if (a) return seekPane(cur, a.dataset.a || a.dataset.symbol);
    const row = e.target.closest('pre > div');
    if (row && cur && !stepOf(cur.cmd)) { cur.cur = [...row.parentNode.children].indexOf(row); render(cur); }
  };
  $('lay').onclick = () => wmKey('Space');
  $('lay').onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); wmKey('Space'); }
  };
}

/* dmenu-like fuzzy picker. raw: enter takes the typed text unless an item was selected */
let menuId = 0;
function menu (ph, items, pick, o = {}) {
  const id = ++menuId;
  const M = $('menu');
  const mi = $('mi');
  const ml = $('ml');
  let list = [];
  let sel = o.raw ? -1 : 0;
  const done = (v) => { M.hidden = true; mi.blur(); if (v !== undefined) pick(v); else if (o.cancel) o.cancel(); };
  const draw = () => {
    const q = mi.value.toLowerCase().split(/\s+/).filter(Boolean);
    list = (Array.isArray(items) ? items : []).filter((s) => q.every((w) => (typeof s === 'string' ? s : (s.label || s.value) + ' ' + (s.detail || '')).toLowerCase().includes(w))).slice(0, 500);
    sel = Math.min(sel, list.length - 1);
    if (o.preferDescription && sel < 0 && q.length && list.length && !list.some((s) => q.every((w) => menuValue(s).toLowerCase().includes(w)))) sel = 0;
    ml.innerHTML = list.map((s, i) => `<div${i === sel ? ' class="c"' : ''}>${typeof s === 'string' ? esc(s) : `<span>${esc(s.label || s.value)}</span><span class="detail">${esc(s.detail || '')}</span>`}</div>`).join('');
    if (ml.children[sel]) ml.children[sel].scrollIntoView({ block: 'nearest' });
  };
  M.hidden = false;
  $('menuhint').textContent = o.hint || '';
  $('menuhint').hidden = !o.hint;
  mi.placeholder = ph;
  mi.value = o.value || '';
  mi.focus();
  if (o.selectFrom !== undefined) mi.setSelectionRange(o.selectFrom, mi.value.length);
  mi.oninput = () => { sel = o.raw ? -1 : 0; draw(); if (o.live) o.live(mi.value); };
  mi.onkeydown = (e) => {
    const k = (e.ctrlKey ? '^' : '') + e.key;
    if (k === 'Escape' || k === '^g' || k === 'Enter') {
      e.preventDefault();
      done(k === 'Enter' ? sel >= 0 && list[sel] !== undefined ? menuValue(list[sel]) : mi.value : undefined);
      return;
    }
    if (k === 'ArrowDown' || k === '^n' || (k === 'Tab' && !e.shiftKey)) sel = Math.min(sel + 1, list.length - 1);
    else if (k === 'ArrowUp' || k === '^p' || k === 'Tab') sel = Math.max(sel - 1, o.raw ? -1 : 0);
    else return;
    e.preventDefault();
    draw();
  };
  ml.onmousedown = (e) => { e.preventDefault(); const row = e.target.closest('#ml > div'); const i = [...ml.children].indexOf(row); if (i >= 0) done(menuValue(list[i])); };
  mi.onblur = () => { if (!M.hidden) done(); };
  if (items.then) items.then((r) => { items = r; if (id === menuId) draw(); }); else draw();
}

const menuValue = (item) => typeof item === 'string' ? item : item.value;

const firstAddr = (h) => (h.match(/data-a="(0x[0-9a-f]+)"/) || [])[1];
const quote = (s) => '"' + s.replace(/"/g, '') + '"';
const jsonList = async (c, fn) => { try { return JSON.parse(await r2At(cur, c)).map(fn); } catch (e) { return []; } };

async function evalMenu (query = '', values) {
  try {
    values = values || JSON.parse(await r2('ej'));
    const items = Object.keys(values).sort().map((key) => `${key} = ${JSON.stringify(values[key])}`);
    menu('Eval variables: filter keys or values', items, (item) => {
      const filter = $('mi').value;
      const key = item.split(' = ')[0];
      if (!Object.hasOwn(values, key)) { toast('Choose an existing eval variable'); return; }
      menu('Edit eval variable: key=value', [], (assignment) => saveEval(assignment, values, filter), {
        raw: true,
        value: key + '=' + String(values[key]),
        selectFrom: key.length + 1,
        hint: 'Edit the value, or choose another existing key. Enter saves · Esc returns to the variable list.',
        cancel: () => evalMenu(filter)
      });
    }, { value: query, hint: 'Filter by key or value · ↑↓ select · Enter edits · Esc closes' });
  } catch (e) {
    toast('Cannot load eval variables: ' + e.message);
  }
}

async function saveEval (assignment, previous, query) {
  const equals = assignment.indexOf('=');
  const key = assignment.slice(0, equals).trim();
  const value = assignment.slice(equals + 1);
  if (equals < 1 || !Object.hasOwn(previous, key) || !/^[\w.-]+$/.test(key) || /[\r\n\0]/.test(value)) {
    toast('Use an existing key=value on one line');
    return evalMenu(query, previous);
  }
  try {
    // A raw r2 command preserves quotes and semicolons in string values.
    // Read back inside the same queue transaction to detect rejected edits.
    const values = await r2("'e " + key + '=' + value, async () => JSON.parse(await request('ej')));
    const unchanged = values[key] === previous[key] && value !== String(previous[key]);
    toast(unchanged ? `r2 kept ${key}=${values[key]} (read-only or rejected value)` : `${key}=${values[key]}`);
    await refreshAll();
    return evalMenu(query, values);
  } catch (e) {
    toast('Cannot change ' + key + ': ' + e.message);
  }
}

function fileIdentity (info) {
  return JSON.stringify([info.core && info.core.fd, info.core && info.core.file, info.bin && info.bin.baddr]);
}

function resetFile (addr, info) {
  if (uiTools.sessionChanged) uiTools.sessionChanged();
  seek = addr;
  lastSeek = addr;
  file = (info.core && info.core.file) || '';
  motions.length = 0;
  clearTimeout(motionTimer);
  motionTimer = null;
  if (byteDrag) endByteDrag({ pointerId: byteDrag.pointer });
  panes.forEach((p) => {
    ++p.navigation;
    p.request = (p.request || 0) + 1;
    p.addr = addr;
    p.history = [addr];
    p.historyIndex = 0;
    p.cur = 0;
    p.filter = '';
    p.selection = null;
    p.byteValues = new Map();
    p.lines = [];
    if (p.cmd !== 'console') p.out = '';
    p.pre.scrollTop = p.pre.scrollLeft = 0;
    p.el.classList.remove('busy');
    paneTitle(p);
  });
  save();
  bar();
}

/* Commit file changes before the HTTP queue advances. Snapshot the real file
 * descriptor, not the command spelling: o, ob, reopen and scripts can all
 * change the session. Restore the backend seek only after updating its base. */
function runConsole (origin, c, navigation) {
  let logging = ['false', 'false'];
  let from;
  return r2(() => {
    from = origin ? origin.addr : seek;
    return `ss ${from};?e __r2t_before__;ij;?e __r2t_logging__;e log.cons;e log.quiet;?e __r2t_output__;e log.cons=true;${COLOR}${c}\n?e __r2t_after__;?v $$;ij`;
  }, async (text) => {
    try {
      const start = text.indexOf('__r2t_before__\n');
      const log = text.indexOf('__r2t_logging__\n', start);
      const output = text.indexOf('__r2t_output__\n', start);
      const after = text.lastIndexOf('__r2t_after__\n');
      if (start < 0 || log < start || output < log || after < output) throw new Error('r2 did not return command state');
      const before = JSON.parse(text.slice(start + '__r2t_before__\n'.length, log));
      logging = text.slice(log + '__r2t_logging__\n'.length, output).trim().split('\n').map((v) => v.trim() === 'true' ? 'true' : 'false');
      const state = text.slice(after + '__r2t_after__\n'.length).trim();
      const nl = state.indexOf('\n');
      const addr = address(state.slice(0, nl));
      const info = JSON.parse(state.slice(nl + 1));
      if (!addr) throw new Error('r2 returned an invalid address');
      const fileChanged = fileIdentity(before) !== fileIdentity(info);
      if (fileChanged) resetFile(addr, info);
      else {
        file = (info.core && info.core.file) || '';
        if (addr !== from && origin && panes.includes(origin) && origin.navigation === navigation) setAddress(origin, addr);
        bar();
      }
      const out = text.slice(output + '__r2t_output__\n'.length, after);
      const error = (strip(out).match(/^(?:ERROR|FATAL):[^\n]*/m) || [])[0] || '';
      return { out, error, addr, info, fileChanged };
    } finally {
      // Stay inside this queue transaction so pending pane requests cannot
      // restore an address belonging to the previous file.
      await request(`e log.cons=${logging[0]};e log.quiet=${logging[1]};ss ${seek}`);
    }
  });
}

async function console_ (c) {
  c = c.trim().replace(/^:\s*/, '');
  if (!c) return;
  S.hist = [c, ...S.hist.filter((h) => h !== c)].slice(0, 200);
  const origin = cur;
  const navigation = origin && ++origin.navigation;
  let p = vis().find((p) => p.cmd === 'console');
  try {
    const result = await runConsole(origin, c, navigation);
    if (result.fileChanged || /^prj\s+open\s/.test(c)) await uiTools.restoreSessionProject();
    let { out } = result;
    const { error } = result;
    if (error && /^o\+?\s/.test(c) && (await r2('e http.sandbox')).trim() === 'true') out += '\nHTTP sandbox is enabled. Opening local files outside the projects directory requires a trusted local server started with -e http.sandbox=false.\n';
    p = p && panes.includes(p) ? p : newPane('console', false, origin ? origin.addr : seek);
    p.out = (p.out + `\x1b[33m> ${c}\x1b[0m\n` + out).slice(-500000);
    if (error) { toast(error); setFocus(p); arrange(); }
  } catch (e) {
    toast(e.message);
  }
  await refreshAll();
}

function goto () {
  const p = cur;
  const items = jsonList('fj', (f) => `${f.name}  ${norm(String(f.addr ?? f.offset))}`);
  menu('goto', items, (v) => seekPane(p, v.split('  ')[1] || v));
}

function view (t) {
  if (t === S.tag) return;
  S.tag = t;
  setFocus(vis()[0]);
  arrange();
  refreshAll();
}

function move (d) {
  const p = cur;
  if (!p || !p.view) return;
  if (stepOf(p.cmd)) return seekRows(p, d);
  p.cur += d;
  render(p);
}

function wmKey (c, sh) {
  const v = vis();
  const i = v.indexOf(cur);
  const k = (sh ? '+' : '') + c;
  const nth = (d) => v[(i + d + v.length) % v.length];
  const swap = (o) => {
    const a = panes.indexOf(cur);
    const b = panes.indexOf(o);
    [panes[a], panes[b]] = [panes[b], panes[a]];
  };
  switch (k) {
    case 'KeyJ': case 'KeyK': setFocus(nth(k === 'KeyJ' ? 1 : -1)); break;
    case '+KeyJ': case '+KeyK': if (cur) swap(nth(k === '+KeyJ' ? 1 : -1)); break;
    case 'KeyH': case 'KeyL': S.mfact = Math.min(0.9, Math.max(0.1, S.mfact + (k === 'KeyL' ? 0.05 : -0.05))); break;
    case 'KeyI': case 'KeyD': S.nmaster = Math.max(0, S.nmaster + (k === 'KeyI' ? 1 : -1)); break;
    case 'KeyT': case 'KeyM': case 'KeyG': S.lay = { KeyT: 'tile', KeyM: 'monocle', KeyG: 'grid' }[k]; break;
    case 'Space': { const l = ['tile', 'monocle', 'grid']; S.lay = l[(l.indexOf(S.lay) + 1) % l.length]; break; }
    case 'Enter':
      if (cur && v.length > 1) {
        const z = cur === v[0] ? v[1] : cur;
        panes.splice(panes.indexOf(z), 1);
        panes.splice(panes.indexOf(v[0]), 0, z);
        setFocus(z);
      }
      break;
    case '+Enter': newPane('console'); return true;
    case 'KeyP': openPane(); return true;
    case '+KeyC': closePane(); return true;
    case 'KeyR': refreshAll(); return true;
    case '+Slash': case 'Slash': showHelp(); return true;
    default: {
      const t = /^\+?Digit([1-9])$/.exec(k);
      if (!t) return false;
      if (!sh) return view(+t[1]) || true;
      if (cur) { cur.tag = +t[1]; setFocus(vis()[0]); }
    }
  }
  arrange();
  refreshAll();
  return true;
}

function paneKey (k) {
  const p = cur;
  const page = p ? pageRows(p) : 16;
  switch (k) {
    case 'j': case 'ArrowDown': move(1); break;
    case 'k': case 'ArrowUp': move(-1); break;
    case 'J': case 'PageDown': move(page); break;
    case 'K': case 'PageUp': move(-page); break;
    case '^d': move(Math.max(1, page >> 1)); break;
    case '^u': move(-Math.max(1, page >> 1)); break;
    case 'Home': if (p) { p.cur = 0; render(p); } break;
    case 'End': if (p) { p.cur = 1e9; render(p); } break;
    case 'Enter':
      if (p && stepOf(p.cmd)) r2At(p, '?v $j').then((j) => +j && seekPane(p, j.trim()));
      else if (p && p.view[p.cur] && firstAddr(p.view[p.cur].h)) seekPane(p, firstAddr(p.view[p.cur].h));
      break;
    case 'u': case 'Backspace': undoSeek(p, -1); break;
    case 'Escape': if (p) { p.selection = null; paintSelection(p); } break;
    case 'U': undoSeek(p, 1); break;
    case 'g': goto(); break;
    case ':': menu(':', S.hist, console_, { raw: true }); break;
    case 'e': evalMenu(); break;
    case '|': splitFrame('x'); break;
    case '-': splitFrame('y'); break;
    case 'c': if (p) menu('command', PANE_ACTIONS.slice(0, PRESETS.length), (x) => { p.cmd = x; p.filter = ''; arrange(); refresh(p); }, { raw: true, value: p.cmd }); break;
    case 'N': uiTools.openNotes(); break;
    case 'O': uiTools.openFileDialog(); break;
    case 'y': uiTools.yankBytes(p); break;
    case 'Y': uiTools.pasteBytes(p); break;
    case 'm': uiTools.beginMark(p, 'set'); break;
    case "'": uiTools.beginMark(p, 'jump'); break;
    case 'p': case 'P':
      cyclePrint(p, k === 'p' ? 1 : -1);
      break;
    case '/':
      if (p) {
        const old = p.filter;
        const live = (v) => { p.filter = v; render(p); arrange(); };
        menu('filter', [], live, { raw: true, value: old, live, cancel: () => live(old) });
      }
      break;
    case 'x':
      menu('xrefs to ' + (p ? p.addr : seek), jsonList('axtj', (x) => `${norm(String(x.from))}  ${x.type}  ${x.fcn_name || ''}  ${x.opcode || ''}`),
        (v) => seekPane(p, v.split(' ')[0]));
      break;
    case ';': menu('comment at ' + (p ? p.addr : seek), [], (v) => cmd(quote('CC ' + v)), { raw: true }); break;
    case 'n': menu('rename function', [], (v) => cmd('afn ' + v.replace(/[^\w.]/g, '_')), { raw: true }); break;
    case 'o': wmKey('KeyP'); break;
    case 'q': closePane(); break;
    case 'r': case 'R': refreshAll(); break;
    case '?': showHelp(); break;
    default: return false;
  }
  return true;
}

document.addEventListener('keydown', (e) => {
  if (!$('menu').hidden) return;
  if (!$('manager').hidden || !$('notes').hidden) {
    if (e.key === 'Escape') {
      if (!$('manager').hidden) $('manager').hidden = true;
      else { uiTools.rememberNotes(); $('notes').hidden = true; }
      e.preventDefault();
    }
    return;
  }
  const help = !e.ctrlKey && !e.metaKey && (e.key === 'F1' || e.key === '?' || (e.altKey && (e.code === 'Slash' || e.key === '¿')));
  if (!$('help').hidden) {
    if (e.key === 'Escape' || help) { showHelp(false); e.preventDefault(); }
    return;
  }
  if (uiTools.markMode && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    uiTools.finishMark(e.key);
    return;
  }
  if (help) { showHelp(); e.preventDefault(); return; }
  if (e.target && (e.target.closest('input, textarea, select, [contenteditable="true"]') || (e.target.closest('button') && (e.key === 'Enter' || e.key === ' ')))) return;
  const handled = e.altKey && !e.ctrlKey && !e.metaKey
    ? wmKey(e.code, e.shiftKey)
    : !e.metaKey && !e.altKey && paneKey((e.ctrlKey ? '^' : '') + e.key);
  if (handled) e.preventDefault();
});

window.onload = async () => {
  try { Object.assign(S, JSON.parse(window.localStorage.r2t)); } catch (e) {}
  bindControls();
  $('wm').onmouseover = (e) => {
    const a = e.target.closest('a[data-a]');
    if ((a ? a.dataset.a : '') !== hover) { hover = a ? a.dataset.a : ''; hl(); }
  };
  $('tags').onclick = (e) => e.target.dataset.t && view(+e.target.dataset.t);
  let rt;
  window.onresize = () => { arrange(); clearTimeout(rt); rt = setTimeout(refreshAll, 200); };
  await r2('e scr.html=false;e scr.utf8=true');
  const state = (await r2('?v $$;ij')).trim();
  const nl = state.indexOf('\n');
  seek = address(state.slice(0, nl)) || '0x0';
  lastSeek = seek;
  try { file = JSON.parse(state.slice(nl + 1)).core.file || ''; } catch (e) {}
  const saved = S.panes.length ? S.panes : [{ cmd: 'pd $R', tag: 1 }, { cmd: 'px $R*16', tag: 1 }, { cmd: 'afl', tag: 1 }];
  const sameFile = S.file === file;
  if (sameFile) lastSeek = address(S.seek || '') || seek;
  const tag = S.tag;
  for (const s of saved) { S.tag = s.tag; newPane(s.cmd === 'pdc' ? 'pdco' : s.cmd, false, (sameFile && s.addr) || seek, s.weight || 1, s.id || 0, 'x', s.decompiler || 'pdc', !!s.tied); }
  S.tag = tag;
  initializing = false;
  setFocus(vis()[0]);
  arrange();
  await uiTools.restoreSessionProject();
  refreshAll();
};
