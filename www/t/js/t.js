'use strict';
/* r2 tiles: a keyboard driven tiling frontend for radare2 (dwm style) */
/* eslint-disable no-control-regex */

const $ = (id) => document.getElementById(id);
const ROOT = window.location.pathname.split('/').slice(0, -2).join('/');
const COLOR = 'e scr.color=3;'; /* r2 http resets scr.color on every request */
const LAYOUTS = { tile: '[]=', monocle: '[M]', grid: '[+]' };
const PRESETS = ['pd $R', 'px $R*16', 'pxr $R*8', 'pdc', 'pds', 'agf', 'afl', 'iz', 'ii', 'is', 'iS', 'ie', 'i', 'f', 'axt', 'afi', 'dr=', 'dbt', 'dm', 'console'];
const PRINT = ['pd $R', 'px $R*16', 'pxr $R*8', 'pdc', 'pds', 'agf'];
const HELP = `r2 tiles — dwm for radare2

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
 Commands without @ follow the current seek. Click addresses to seek.`;

const S = { tag: 1, lay: 'tile', mfact: 0.55, nmaster: 1, hist: [], panes: [] };
const panes = [];
let cur = null;
let seek = '';
let queue = Promise.resolve();

function r2 (c) {
  const p = queue.then(() => fetch(ROOT + '/cmd', { method: 'POST', body: c })).then((r) => r.text());
  queue = p.catch(() => toast('r2 is not responding'));
  return p;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => '&#' + c.charCodeAt(0) + ';');
const strip = (s) => s.replace(/\x1b\[[\d;?]*[A-Za-z]/g, '');
const norm = (a) => { try { return '0x' + BigInt(a).toString(16); } catch (e) { return a; } };
const vis = () => panes.filter((p) => p.tag === S.tag);
const stepOf = (c) => /@/.test(c) ? 0 : /^p[di]\b/.test(c) ? 'i' : /^px[wqr]?\b/.test(c) ? 16 : 0;

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
function ansi (txt) {
  let st = {};
  return txt.replace(/\n$/, '').split('\n').map((line) => {
    let h = '';
    line.split(/\x1b\[([\d;]*)m/).forEach((s, i) => {
      if (i & 1) { st = sgr(st, s); return; }
      if (!(s = strip(s))) return;
      s = esc(s).replace(/\b0x[0-9a-f]{3,}\b/gi, (m) => `<a data-a="${norm(m)}">${m}</a>`);
      const fg = st.inv ? st.bg || 'var(--pane)' : st.fg;
      const bg = st.inv ? st.fg || 'var(--fg)' : st.bg;
      const css = (fg ? 'color:' + fg + ';' : '') + (bg ? 'background:' + bg + ';' : '') + (st.b ? 'font-weight:bold' : '');
      h += css ? `<span style="${css}">${s}</span>` : s;
    });
    return { h, t: strip(line) };
  });
}

/* panes */
function newPane (cmd, focus = true) {
  const p = { cmd, tag: S.tag, cur: 0, filter: '', lines: [], out: '' };
  p.el = document.createElement('div');
  p.el.className = 'pane';
  p.el.innerHTML = '<header></header><pre></pre>';
  p.pre = p.el.lastChild;
  p.el.onmousedown = () => setFocus(p);
  $('wm').appendChild(p.el);
  const i = panes.indexOf(cur);
  panes.splice(i < 0 ? panes.length : i + 1, 0, p);
  if (focus) setFocus(p);
  arrange();
  if (focus) refresh(p);
  return p;
}

function closePane (p = cur) {
  if (!p) return;
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

function arrange () {
  const wm = $('wm');
  const W = wm.clientWidth;
  const H = wm.clientHeight;
  const v = vis();
  const n = v.length;
  const m = Math.min(S.nmaster, n);
  const mw = n > m && m ? W * S.mfact : m ? W : 0;
  const cols = Math.ceil(Math.sqrt(n));
  panes.forEach((p) => { p.el.style.display = p.tag === S.tag && (S.lay !== 'monocle' || p === cur) ? '' : 'none'; });
  v.forEach((p, i) => {
    let r;
    if (S.lay === 'monocle') r = [0, 0, W, H];
    else if (S.lay === 'grid') {
      const rows = Math.ceil(n / cols);
      const c = i === n - 1 ? cols - (i % cols) : 1;
      r = [(i % cols) * W / cols, (i / cols | 0) * H / rows, c * W / cols, H / rows];
    } else r = i < m ? [0, i * H / m, mw, H / m] : [mw, (i - m) * H / (n - m), W - mw, H / (n - m)];
    Object.assign(p.el.style, { left: r[0] + 2 + 'px', top: r[1] + 2 + 'px', width: r[2] - 4 + 'px', height: r[3] - 4 + 'px' });
    p.el.firstChild.textContent = `${i + 1}  ${p.cmd || 'console'}${p.filter ? '  /' + p.filter : ''}`;
  });
  bar();
  save();
}

async function refresh (p) {
  if (p.cmd && p.cmd !== 'console') {
    const rows = Math.max(8, p.pre.clientHeight / 16.2 | 0);
    p.el.classList.add('busy');
    p.out = await r2(COLOR + p.cmd.replace(/\$R\b/g, rows));
    p.el.classList.remove('busy');
  }
  p.lines = ansi(p.out);
  if (stepOf(p.cmd)) p.cur = Math.max(0, p.lines.findIndex((l) => l.h.includes(`data-a="${seek}"`)));
  else if (p.cmd === 'console') p.cur = p.lines.length - 1;
  render(p);
}

function render (p) {
  const f = p.filter.toLowerCase();
  p.view = p.lines.filter((l) => !f || l.t.toLowerCase().includes(f));
  p.cur = Math.max(0, Math.min(p.cur, p.view.length - 1));
  p.pre.innerHTML = p.view.map((l, i) => `<div${i === p.cur ? ' class="c"' : ''}>${l.h}</div>`).join('');
  const c = p.pre.children[p.cur];
  if (c) c.scrollIntoView({ block: 'nearest' });
}

let running = false;
let again = false;
async function refreshAll () {
  if (running) { again = true; return; }
  running = true;
  do { again = false; await reload(); } while (again);
  running = false;
}

async function reload () {
  const [s, fd] = (await r2('?v $$;fd')).split('\n');
  seek = /^0x[0-9a-f]+$/.test(norm(s.trim())) ? norm(s.trim()) : '';
  $('seek').textContent = seek + '  ' + (fd || '').trim();
  hl();
  await Promise.all(vis().map(refresh));
}

async function cmd (c, all = true) {
  await r2(c);
  if (all) await refreshAll();
}

function bar () {
  const used = new Set(panes.map((p) => p.tag));
  $('tags').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((t) => t <= 4 || used.has(t) || t === S.tag)
    .map((t) => `<b data-t="${t}" class="${used.has(t) ? 'o' : ''} ${t === S.tag ? 'on' : ''}">${t}</b>`).join('');
  $('lay').textContent = S.lay === 'monocle' ? `[${vis().length}]` : LAYOUTS[S.lay];
  $('title').textContent = cur ? cur.cmd : '';
}

let hover = '';
function hl () {
  $('hl').textContent = `a[data-a="${seek}"]{background:#e5a50a33;color:#fff}` +
    (hover ? `a[data-a="${hover}"]{outline:1px solid var(--acc);background:#e5a50a55}` : '');
}

function save () {
  S.panes = panes.map((p) => ({ cmd: p.cmd, tag: p.tag }));
  try { window.localStorage.r2t = JSON.stringify(S); } catch (e) {}
}

let toastTimer;
function toast (msg) {
  $('toast').textContent = msg;
  $('toast').classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('on'), 2000);
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
    list = (Array.isArray(items) ? items : []).filter((s) => q.every((w) => s.toLowerCase().includes(w))).slice(0, 500);
    sel = Math.min(sel, list.length - 1);
    ml.innerHTML = list.map((s, i) => `<div${i === sel ? ' class="c"' : ''}>${esc(s)}</div>`).join('');
    if (ml.children[sel]) ml.children[sel].scrollIntoView({ block: 'nearest' });
  };
  M.hidden = false;
  mi.placeholder = ph;
  mi.value = o.value || '';
  mi.focus();
  mi.oninput = () => { sel = o.raw ? -1 : 0; draw(); if (o.live) o.live(mi.value); };
  mi.onkeydown = (e) => {
    const k = (e.ctrlKey ? '^' : '') + e.key;
    if (k === 'Escape' || k === '^g') done();
    else if (k === 'Enter') done(sel >= 0 && list[sel] !== undefined ? list[sel] : mi.value);
    else if (k === 'ArrowDown' || k === '^n' || (k === 'Tab' && !e.shiftKey)) sel = Math.min(sel + 1, list.length - 1);
    else if (k === 'ArrowUp' || k === '^p' || k === 'Tab') sel = Math.max(sel - 1, o.raw ? -1 : 0);
    else return;
    e.preventDefault();
    draw();
  };
  ml.onmousedown = (e) => { e.preventDefault(); const i = [...ml.children].indexOf(e.target); if (i >= 0) done(list[i]); };
  mi.onblur = () => { if (!M.hidden) done(); };
  if (items.then) items.then((r) => { items = r; if (id === menuId) draw(); }); else draw();
}

const firstAddr = (h) => (h.match(/data-a="(0x[0-9a-f]+)"/) || [])[1];
const quote = (s) => '"' + s.replace(/"/g, '') + '"';
const jsonList = async (c, fn) => { try { return JSON.parse(await r2(c)).map(fn); } catch (e) { return []; } };

function console_ (c) {
  if (!c.trim()) return;
  S.hist = [c, ...S.hist.filter((h) => h !== c)].slice(0, 200);
  let p = vis().find((p) => p.cmd === 'console');
  r2(COLOR + c).then((out) => {
    p = p || newPane('console', false);
    p.out = (p.out + `\x1b[33m> ${c}\x1b[0m\n` + out).slice(-500000);
    refreshAll();
  });
}

function goto () {
  const items = jsonList('fj', (f) => `${f.name}  ${norm(String(f.addr ?? f.offset))}`);
  menu('goto', items, (v) => cmd('s ' + (v.split('  ')[1] || v)));
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
  const step = stepOf(p.cmd);
  if (step) return cmd(step === 'i' ? `so ${d}` : `s${d < 0 ? '-' : '+'}${Math.abs(d) * step}`);
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
    case 'Space': { const l = Object.keys(LAYOUTS); S.lay = l[(l.indexOf(S.lay) + 1) % l.length]; break; }
    case 'Enter':
      if (cur && v.length > 1) {
        const z = cur === v[0] ? v[1] : cur;
        panes.splice(panes.indexOf(z), 1);
        panes.splice(panes.indexOf(v[0]), 0, z);
        setFocus(z);
      }
      break;
    case '+Enter': newPane('console'); return true;
    case 'KeyP': menu('new pane', PRESETS, (x) => newPane(x)); return true;
    case '+KeyC': closePane(); return true;
    case 'KeyR': refreshAll(); return true;
    case '+Slash': case 'Slash': $('help').hidden = false; return true;
    default: {
      const t = /^\+?Digit([1-9])$/.exec(k);
      if (!t) return false;
      if (!sh) return view(+t[1]) || true;
      if (cur) { cur.tag = +t[1]; setFocus(vis()[0]); }
    }
  }
  arrange();
  return true;
}

function paneKey (k) {
  const p = cur;
  const page = p ? Math.max(1, p.pre.clientHeight / 16.2 | 0) : 16;
  switch (k) {
    case 'j': case 'ArrowDown': move(1); break;
    case 'k': case 'ArrowUp': move(-1); break;
    case 'J': case 'PageDown': move(page); break;
    case 'K': case 'PageUp': move(-page); break;
    case '^d': move(page >> 1); break;
    case '^u': move(-(page >> 1)); break;
    case 'Home': if (p) { p.cur = 0; render(p); } break;
    case 'End': if (p) { p.cur = 1e9; render(p); } break;
    case 'Enter':
      if (p && stepOf(p.cmd)) r2('?v $j').then((j) => +j && cmd('s $j'));
      else if (p && p.view[p.cur] && firstAddr(p.view[p.cur].h)) cmd('s ' + firstAddr(p.view[p.cur].h));
      break;
    case 'u': case 'Backspace': cmd('s-'); break;
    case 'U': cmd('s+'); break;
    case 'g': goto(); break;
    case ':': menu(':', S.hist, console_, { raw: true }); break;
    case 'c': if (p) menu('command', PRESETS, (x) => { p.cmd = x; p.filter = ''; arrange(); refresh(p); }, { raw: true, value: p.cmd }); break;
    case 'p': case 'P':
      if (p) { p.cmd = PRINT[(PRINT.indexOf(p.cmd) + (k === 'p' ? 1 : PRINT.length - 1)) % PRINT.length]; arrange(); refresh(p); }
      break;
    case '/':
      if (p) {
        const old = p.filter;
        const live = (v) => { p.filter = v; render(p); arrange(); };
        menu('filter', [], live, { raw: true, value: old, live, cancel: () => live(old) });
      }
      break;
    case 'x':
      menu('xrefs to ' + seek, jsonList('axtj', (x) => `${norm(String(x.from))}  ${x.type}  ${x.fcn_name || ''}  ${x.opcode || ''}`),
        (v) => cmd('s ' + v.split(' ')[0]));
      break;
    case ';': menu('comment at ' + seek, [], (v) => cmd(quote('CC ' + v)), { raw: true }); break;
    case 'n': menu('rename function', [], (v) => cmd('afn ' + v.replace(/[^\w.]/g, '_')), { raw: true }); break;
    case 'o': wmKey('KeyP'); break;
    case 'q': closePane(); break;
    case 'r': case 'R': refreshAll(); break;
    case '?': $('help').hidden = false; break;
    default: return false;
  }
  return true;
}

document.addEventListener('keydown', (e) => {
  if (!$('menu').hidden) return;
  if (!$('help').hidden) { $('help').hidden = true; e.preventDefault(); return; }
  const handled = e.altKey && !e.ctrlKey && !e.metaKey
    ? wmKey(e.code, e.shiftKey)
    : !e.metaKey && !e.altKey && paneKey((e.ctrlKey ? '^' : '') + e.key);
  if (handled) e.preventDefault();
});

window.onload = async () => {
  try { Object.assign(S, JSON.parse(window.localStorage.r2t)); } catch (e) {}
  $('help').textContent = HELP;
  $('wm').onclick = (e) => {
    const a = e.target.closest('a[data-a]');
    if (a) return cmd('s ' + a.dataset.a);
    const row = e.target.closest('pre > div');
    if (row && cur && !stepOf(cur.cmd)) { cur.cur = [...row.parentNode.children].indexOf(row); render(cur); }
  };
  $('wm').onmouseover = (e) => {
    const a = e.target.closest('a[data-a]');
    if ((a ? a.dataset.a : '') !== hover) { hover = a ? a.dataset.a : ''; hl(); }
  };
  $('tags').onclick = (e) => e.target.dataset.t && view(+e.target.dataset.t);
  $('help').onclick = () => { $('help').hidden = true; };
  let rt;
  window.onresize = () => { arrange(); clearTimeout(rt); rt = setTimeout(refreshAll, 200); };
  await r2('e scr.html=false;e scr.utf8=true');
  const saved = S.panes.length ? S.panes : [{ cmd: 'pd $R', tag: 1 }, { cmd: 'px $R*16', tag: 1 }, { cmd: 'afl', tag: 1 }];
  const tag = S.tag;
  for (const s of saved) { S.tag = s.tag; newPane(s.cmd, false); }
  S.tag = tag;
  setFocus(vis()[0]);
  arrange();
  refreshAll();
};
