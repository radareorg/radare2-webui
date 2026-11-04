import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = process.env.R2T_BUNDLE ? readFileSync(process.env.R2T_BUNDLE, 'utf8') : ['t.js', 'tools.js'].map((name) => readFileSync(new URL('../js/' + name, import.meta.url), 'utf8')).join('\n');

function harness (transport = () => undefined) {
  const commands = [];
  const requests = [];
  const timers = new Map();
  const listeners = new Map();
  const storage = new Map();
  const nativeSelection = { isCollapsed: true, removeAllRanges () { this.isCollapsed = true; } };
  let hit = null;
  let timer = 0;
  const node = () => {
    const classes = new Set();
    const captures = new Set();
    return {
      classList: {
        add: (...names) => names.forEach((n) => classes.add(n)),
        remove: (...names) => names.forEach((n) => classes.delete(n)),
        toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
        contains: (name) => classes.has(name)
      },
      clientWidth: 1000,
      clientHeight: 200,
      scrollHeight: 600,
      scrollTop: 0,
      scrollLeft: 0,
      children: [],
      style: {},
      getBoundingClientRect: () => ({ left: 0, right: 1000, top: 0, bottom: 200 }),
      firstChild: {},
      hidden: true,
      value: '',
      focus () { this.focused = true; },
      blur () { this.focused = false; if (this.onblur) this.onblur(); },
      setAttribute () {},
      addEventListener () {},
      setSelectionRange (start, end) { this.selectionStart = start; this.selectionEnd = end; },
      set innerHTML (value) {
        this.html = value;
        if (value.startsWith('<header>')) {
          this.firstChild = node();
          this.firstChild.firstChild = node();
          this.firstChild.lastChild = node();
          this.lastChild = node();
        }
      },
      get innerHTML () { return this.html || ''; },
      querySelectorAll (selector) { return this.children.filter((el) => selector === '.splitter' && el.className.startsWith('splitter')); },
      appendChild (el) { this.children.push(el); el.parentNode = this; },
      insertBefore (el) { this.appendChild(el); },
      remove () { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); },
      contains (el) { return this.children.includes(el); },
      setPointerCapture: (id) => captures.add(id),
      hasPointerCapture: (id) => captures.has(id),
      releasePointerCapture: (id) => captures.delete(id)
    };
  };
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById (id) {
        if (!elements.has(id)) elements.set(id, node());
        return elements.get(id);
      },
      createElement: node,
      elementFromPoint: () => hit,
      addEventListener (name, fn) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(fn);
      }
    },
    window: { location: { pathname: '/t/index.html' }, localStorage: { setItem (k, v) { storage.set(k, v); }, getItem (k) { return storage.get(k) ?? null; } }, getComputedStyle: () => ({ lineHeight: '20px' }), getSelection: () => nativeSelection },
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    setTimeout: (fn) => { timers.set(++timer, fn); return timer; },
    clearTimeout: (id) => timers.delete(id),
    fetch: async (url, { body }) => {
      requests.push(body);
      let addr = BigInt((/^ss (0x[0-9a-f]+);/.exec(body) || [])[1] || '0x1000');
      const motion = /;(sso -?\d+|ss[+-]\d+);/.exec(body);
      if (motion) {
        const c = motion[1];
        commands.push(c.replace(/^sso /, 'so ').replace(/^ss/, 's'));
        addr += /^sso /.test(c) ? BigInt(c.slice(4)) * 4n : BigInt(c.slice(2));
        if (addr < 0n) addr = 0n;
      }
      const expr = /;\?v (0x[0-9a-f]+);/.exec(body);
      if (expr) addr = BigInt(expr[1]);
      const out = /;\?v /.test(body) ? '0x' + addr.toString(16) + '\n' : '0x' + addr.toString(16) + '  data\n';
      return { ok: true, status: 200, text: async () => (await transport(body, out)) ?? out };
    }
  });
  vm.runInContext(source + `
    seek = '0x1000';
    initializing = false;
    globalThis.api = {
      wheel, move, rowBytes, refresh, refreshAll, panes, seekPane, undoSeek, save, S,
      ansi, selectionText, selectBytes, paintSelection, axisSizes, resizePair, arrange, wmKey, paneKey,
      bindControls,
      runConsole, console_, r2At, evalMenu, saveEval, splitFrame, newPane, closePane, cyclePrint,
      decompilerCommand, updateDecompilerControls, updateDecompilerOptions, saveBinaryProject, loadBinaryProject,
      openProjects, openNotes, metadataCommand, readProjectMetadata, drawPackages, packageAction,
      replaceFile, openFileDialog, restoreSessionProject,
      setFile: (s) => { file = s; },
      toggleTie, setAddress, beginMark, finishMark, yankBytes, pasteBytes, listBinaryProjects, restoreWorkspace,
      setNotes: (s) => { notesText = s; },
      getNotes: () => notesText,
      state: () => ({ seek, file }),
      makeId: () => ++paneId,
      setNewPane: (fn) => { newPane = fn; },
      setReload: (fn) => { reload = fn; },
      focus: (p) => { cur = p; },
      current: () => cur,
      flush: () => { clearTimeout(motionTimer); return flushMotions(); }
    };
  `, context);
  const api = context.api;
  // Navigation tests exercise the real command queue without rendering every pane.
  api.setReload(async () => {});
  const pane = (cmd, rows = [], addr = '0x1000') => {
    const p = { id: api.makeId(), cmd, addr, weight: 1, history: [addr], historyIndex: 0, navigation: 0, tag: 1, filter: '', cur: 0, out: '', lines: rows.map((t) => ({ t, h: t })), pre: node(), el: node() };
    api.panes.push(p);
    return p;
  };
  const wheel = (p, options = {}) => {
    const e = { deltaX: 0, deltaY: 20, deltaMode: 0, prevented: false, preventDefault () { this.prevented = true; }, ...options };
    api.wheel(p, e);
    return e;
  };
  const event = (name, e) => (listeners.get(name) || []).forEach((fn) => fn(e));
  return { api, pane, wheel, commands, requests, timers, event, elements, node, nativeSelection, storage, el: (id) => context.document.getElementById(id), hit: (el) => { hit = el; } };
}

test('pixel deltas accumulate and bursts become one instruction seek', async () => {
  const h = harness();
  const p = h.pane('pd $R');
  for (let i = 0; i < 10; i++) assert.equal(h.wheel(p, { deltaY: 5 }).prevented, true);
  assert.equal(h.api.current(), p);
  assert.equal(h.timers.size, 1);
  await h.api.flush();
  assert.deepEqual(h.commands, ['so 2']);
  h.wheel(p, { deltaY: 10 });
  await h.api.flush();
  assert.deepEqual(h.commands, ['so 2', 'so 1']);
});

test('line and page wheel modes use rows and viewport height', async () => {
  const h = harness();
  const p = h.pane('pi $R');
  h.wheel(p, { deltaY: 3, deltaMode: 1 });
  h.wheel(p, { deltaY: 1, deltaMode: 2 });
  await h.api.flush();
  assert.deepEqual(h.commands, ['so 13']);
  h.wheel(p, { deltaY: -1, deltaMode: 2 });
  await h.api.flush();
  assert.equal(h.commands.at(-1), 'so -10');
});

test('hex movement uses actual row widths and precise large addresses', async () => {
  const h = harness();
  const p = h.pane('pxr $R*8', ['0x20000000000001 0x12345678', '0x20000000000009 0x87654321']);
  assert.equal(h.api.rowBytes(p), 8);
  h.wheel(p, { deltaY: 3, deltaMode: 1 });
  await h.api.flush();
  assert.equal(h.commands.at(-1), 's+24');
  p.cmd = 'px $R*32';
  p.lines = [{ t: '- offset -' }, { t: '0x1000  aabb' }, { t: '0x1020  ccdd' }];
  h.wheel(p, { deltaY: -2, deltaMode: 1 });
  await h.api.flush();
  assert.equal(h.commands.at(-1), 's-64');
});

test('ordinary panes, filters, explicit addresses, horizontal and zoom gestures stay native', () => {
  const h = harness();
  for (const cmd of ['afl', 'console', 'pdc', 'pd 100 @ entry0', 'px 256 @ 0x1000']) {
    assert.equal(h.wheel(h.pane(cmd)).prevented, false);
  }
  const p = h.pane('pd $R');
  p.filter = 'call';
  assert.equal(h.wheel(p).prevented, false);
  p.filter = '';
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { deltaX: 40 }, { deltaY: 0 }]) {
    assert.equal(h.wheel(p, options).prevented, false);
  }
  assert.equal(h.timers.size, 0);
});

test('direction changes do not inherit fractional movement', async () => {
  const h = harness();
  const p = h.pane('pd $R');
  h.wheel(p, { deltaY: 15 });
  h.wheel(p, { deltaY: -20 });
  await h.api.flush();
  assert.deepEqual(h.commands, ['so -1']);
});

test('input during a slow request is batched after its pane refresh', async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  let first = true;
  const h = harness(() => { if (first) { first = false; return pending; } });
  const p = h.pane('pd $R');
  h.wheel(p);
  const flushing = h.api.flush();
  await new Promise(setImmediate);
  for (let i = 0; i < 25; i++) h.wheel(p);
  assert.deepEqual(h.commands, ['so 1']);
  release('0x1004\n');
  await flushing;
  assert.deepEqual(h.commands, ['so 1', 'so 25']);
  assert.equal(h.requests.filter((r) => r.includes('pd 10')).length, 2);
});

test('queued movement is discarded for closed or changed panes', async () => {
  const h = harness();
  const p = h.pane('pd $R');
  h.wheel(p);
  p.cmd = 'afl';
  await h.api.flush();
  p.cmd = 'pd $R';
  h.wheel(p);
  h.api.panes.splice(0, 1);
  await h.api.flush();
  assert.deepEqual(h.commands, []);
});

test('keyboard navigation and wheel navigation share row sizes and ordering', async () => {
  const h = harness();
  const p = h.pane('pxr $R*8', ['0x1000 0x1234', '0x1004 0x5678']);
  p.view = [];
  h.api.focus(p);
  h.api.move(2);
  h.wheel(p, { deltaY: 1, deltaMode: 1 });
  await h.api.flush();
  assert.deepEqual(h.commands, ['s+12']);
});

test('scrolling refreshes only the target pane at its own offset', async () => {
  const h = harness();
  const disasm = h.pane('pd $R', [], '0x2000');
  const hex = h.pane('px $R*16', ['0x8000  aabb', '0x8010  ccdd'], '0x8000');
  hex.out = 'untouched hex dump';
  hex.pre.scrollTop = 72;
  h.wheel(disasm, { deltaY: 2, deltaMode: 1 });
  await h.api.flush();
  assert.equal(disasm.addr, '0x2008');
  assert.equal(hex.addr, '0x8000');
  assert.equal(hex.out, 'untouched hex dump');
  assert.equal(hex.pre.scrollTop, 72);
  assert.deepEqual(h.requests, [
    'ss 0x2000;sso 2;?v $$;ss 0x1000',
    'ss 0x2008;e scr.color=3;pd 10 @e:asm.bytes=true;ss 0x1000'
  ]);
  h.wheel(hex, { deltaY: 3, deltaMode: 1 });
  await h.api.flush();
  assert.equal(hex.addr, '0x8030');
  assert.equal(disasm.addr, '0x2008');
  assert.equal(h.requests.at(-1), 'ss 0x8030;e scr.color=3;px 10*16;ss 0x1000');
});

test('goto, undo and redo affect only the target pane and cancel old wheel input', async () => {
  const h = harness();
  const a = h.pane('pd $R');
  const b = h.pane('px $R*16', [], '0x4000');
  h.wheel(a);
  await h.api.seekPane(a, '0x2000');
  await h.api.flush();
  assert.equal(a.addr, '0x2000');
  assert.deepEqual(h.commands, []);
  await h.api.seekPane(a, '0x3000');
  await h.api.undoSeek(a, -1);
  assert.equal(a.addr, '0x2000');
  assert.equal(b.addr, '0x4000');
  await h.api.undoSeek(a, 1);
  assert.equal(a.addr, '0x3000');
  await h.api.undoSeek(a, -1);
  await h.api.seekPane(a, '0x2500');
  await h.api.undoSeek(a, 1);
  assert.equal(a.addr, '0x2500');
  assert.equal(b.history.length, 1);
});

test('manual refresh and saved layouts retain independent pane addresses', async () => {
  const h = harness();
  const a = h.pane('pd 4;px 16', [], '0x2000');
  const b = h.pane('pxr $R*8', [], '0x5000');
  await Promise.all([h.api.refresh(a), h.api.refresh(b)]);
  assert.equal(h.requests[0], 'ss 0x2000;e scr.color=3;pd 4;px 16;ss 0x1000');
  assert.equal(h.requests[1], 'ss 0x5000;e scr.color=3;pxr 10*8;?e __r2t_endian__;e cfg.bigendian;ss 0x1000');
  h.api.save();
  assert.deepEqual(Array.from(h.api.S.panes, (p) => p.addr), ['0x2000', '0x5000']);
});

test('concurrent refresh callers wait until the final reload completes', async () => {
  const h = harness();
  const releases = [];
  h.api.setReload(() => new Promise((resolve) => releases.push(resolve)));
  const a = h.api.refreshAll();
  const b = h.api.refreshAll();
  assert.equal(a, b);
  let finished = false;
  b.then(() => { finished = true; });
  releases.shift()();
  await new Promise(setImmediate);
  assert.equal(finished, false);
  releases.shift()();
  await Promise.all([a, b]);
  assert.equal(finished, true);
});

test('list refresh preserves scrolling performed while HTTP is busy', async () => {
  let release;
  const h = harness(() => new Promise((resolve) => { release = resolve; }));
  const p = h.pane('afl');
  const refreshing = h.api.refresh(p);
  await new Promise(setImmediate);
  p.pre.scrollTop = 180;
  p.pre.scrollLeft = 40;
  release('function list\n');
  await refreshing;
  assert.equal(p.pre.scrollTop, 180);
  assert.equal(p.pre.scrollLeft, 40);
});

test('stale HTTP output cannot overwrite a changed pane command', async () => {
  let release;
  const h = harness(() => new Promise((resolve) => { release = resolve; }));
  const p = h.pane('pd $R');
  const refreshing = h.api.refresh(p);
  await new Promise(setImmediate);
  p.cmd = 'px $R*16';
  p.out = 'new output';
  release('stale disassembly');
  await refreshing;
  assert.equal(p.out, 'new output');
});

test('hex selection maps grouped bytes and ASCII to identical addresses', () => {
  const h = harness();
  const lines = h.api.ansi('0x20000000000001  2041 423c  &AB<\n0x20000000000005  4344       CD\n', 'px 6');
  const a = lines[0].bytes;
  assert.deepEqual(Array.from(a.slice(0, 4), (b) => b.a), ['0x20000000000001', '0x20000000000002', '0x20000000000003', '0x20000000000004']);
  assert.deepEqual(Array.from(a.slice(4), (b) => b.a), Array.from(a.slice(0, 4), (b) => b.a));
  assert.equal(lines[1].bytes.length, 4);
  assert.match(lines[0].h, /data-byte="0x20000000000004" data-hex="3c">&#60;<\/span>/);
  assert.match(lines[0].h, /data-byte="0x20000000000001" data-hex="20">&#38;<\/span>/);
});

test('instruction selection excludes gutters, comments, addresses and operands', () => {
  const h = harness();
  const lines = h.api.ansi('  ; 0x1000 comment\n╎   0x1000      \x1b[31m488b\x1b[0m01       mov rax, qword [rcx]\n╎   0x1003      c3             ret\n', 'pd 2');
  assert.equal(lines[0].bytes.length, 0);
  assert.deepEqual(Array.from(lines[1].bytes, (b) => [b.a, b.v]), [['0x1000', '48'], ['0x1001', '8b'], ['0x1002', '01']]);
  assert.deepEqual(Array.from(lines[2].bytes, (b) => [b.a, b.v]), [['0x1003', 'c3']]);
  assert.match(lines[1].h, /data-a="0x1000"/);
  assert.match(lines[1].h, /color:#c33/);
  assert.match(lines[1].h, /data-byte="0x1000" data-hex="48"/);
});

test('word dumps select and copy memory bytes in the correct endian order', () => {
  const h = harness();
  const text = '0x1000  0x44434241 0x48474645  ABCDEFGH\n';
  const little = h.api.ansi(text, 'pxw 8')[0];
  const big = h.api.ansi(text, 'pxw 8', true)[0];
  assert.deepEqual(Array.from(little.bytes.slice(0, 4), (b) => b.a), ['0x1003', '0x1002', '0x1001', '0x1000']);
  assert.deepEqual(Array.from(big.bytes.slice(0, 4), (b) => b.a), ['0x1000', '0x1001', '0x1002', '0x1003']);
  const p = h.pane('pxw 8');
  p.selection = { anchor: '0x1000', head: '0x1007' };
  p.byteValues = new Map(little.bytes.map((b) => [b.a, b.v]));
  assert.equal(h.api.selectionText(p), '41 42 43 44 45 46 47 48');
});

test('pointer dragging, shift extension, copy and escape preserve pane offsets', () => {
  const h = harness();
  const p = h.pane('px 4');
  const other = h.pane('pd 4');
  const cells = Array.from({ length: 4 }, (_, i) => {
    const el = h.node();
    el.dataset = { byte: '0x' + (0x1000 + i).toString(16), hex: String(41 + i) };
    el.closest = () => el;
    return el;
  });
  p.pre.children = cells;
  p.pre.querySelectorAll = () => cells;
  p.byteValues = new Map(cells.map((el) => [el.dataset.byte, el.dataset.hex]));
  const down = (cell, shiftKey = false) => ({ target: cell, button: 0, pointerId: 1, shiftKey, preventDefault () {} });
  h.api.selectBytes(p, down(cells[2]));
  h.hit(cells[0]);
  h.event('pointermove', { pointerId: 1, clientX: 0, clientY: 100 });
  h.event('pointerup', { pointerId: 1 });
  assert.equal(h.api.selectionText(p), '41 42 43');
  assert.equal(cells[0].classList.contains('selected'), true);
  assert.equal(cells[3].classList.contains('selected'), false);
  h.api.selectBytes(p, down(cells[3], true));
  h.event('pointerup', { pointerId: 1 });
  assert.equal(h.api.selectionText(p), '43 44');
  let copied = '';
  h.event('copy', { clipboardData: { setData (type, text) { copied = text; } }, preventDefault () {} });
  assert.equal(copied, '43 44');
  assert.equal(p.addr, '0x1000');
  assert.equal(other.selection, undefined);
  assert.equal(h.commands.length, 0);
  h.api.paneKey('Escape');
  assert.equal(h.api.selectionText(p), '');
});

test('layout cycling and splitters resize columns and adjacent rows', () => {
  const h = harness();
  const panes = [h.pane('pd $R'), h.pane('px $R*16'), h.pane('afl')];
  h.api.arrange();
  const wm = h.elements.get('wm');
  let handles = wm.querySelectorAll('.splitter');
  const column = handles.find((el) => el.className === 'splitter x');
  column.onpointerdown({ button: 0, pointerId: 1, clientX: 550, preventDefault () {} });
  h.event('pointermove', { pointerId: 1, clientX: 700 });
  h.event('pointerup', { pointerId: 1 });
  assert.ok(Math.abs(h.api.S.mfact - 0.7) < 0.0001);
  assert.ok(Math.abs(parseFloat(panes[0].el.style.width) - 696) < 0.0001);
  handles = wm.querySelectorAll('.splitter');
  const row = handles.find((el) => el.className === 'splitter y');
  row.onpointerdown({ button: 0, pointerId: 2, clientY: 100, preventDefault () {} });
  h.event('pointermove', { pointerId: 2, clientY: 125 });
  h.event('pointerup', { pointerId: 2 });
  assert.equal(panes[1].el.style.height, '121px');
  assert.equal(panes[2].el.style.height, '71px');
  assert.equal(h.api.S.panes[1].weight, 1.25);
  assert.equal(panes[0].addr, '0x1000');
  h.api.wmKey('Space');
  assert.equal(h.api.S.lay, 'monocle');
  assert.equal(wm.querySelectorAll('.splitter').length, 0);
  h.api.wmKey('Space');
  assert.equal(h.api.S.lay, 'grid');
  assert.ok(wm.querySelectorAll('.splitter').some((el) => el.className === 'splitter x'));
  h.api.wmKey('Space');
  assert.equal(h.api.S.lay, 'tile');
});

test('resizing keeps adjacent panes visible and leaves other track sizes intact', () => {
  const h = harness();
  assert.deepEqual(Array.from(h.api.resizePair([200, 300, 100], 0, 1000, 80)), [420, 80, 100]);
  assert.deepEqual(Array.from(h.api.resizePair([200, 300, 100], 0, -1000, 80)), [80, 420, 100]);
  assert.deepEqual(Array.from(h.api.axisSizes([2, 1], 2, 300)), [200, 100]);
});

test('grid separators resize tracks while the final spanning pane stays full width', () => {
  const h = harness();
  const panes = [h.pane('pd $R'), h.pane('px $R*16'), h.pane('afl')];
  h.api.S.lay = 'grid';
  h.api.arrange();
  const wm = h.elements.get('wm');
  const x = wm.querySelectorAll('.splitter').find((el) => el.className === 'splitter x');
  x.onpointerdown({ button: 0, pointerId: 1, clientX: 500, preventDefault () {} });
  h.event('pointermove', { pointerId: 1, clientX: 600 });
  h.event('pointerup', { pointerId: 1 });
  assert.deepEqual(Array.from(h.api.S.gcols), [600, 400]);
  assert.equal(panes[0].el.style.width, '596px');
  assert.equal(panes[1].el.style.width, '396px');
  assert.equal(panes[2].el.style.width, '996px');
  const y = wm.querySelectorAll('.splitter').find((el) => el.className === 'splitter y');
  y.onpointerdown({ button: 0, pointerId: 2, clientY: 100, preventDefault () {} });
  h.event('pointermove', { pointerId: 2, clientY: 130 });
  h.event('pointerup', { pointerId: 2 });
  assert.equal(panes[0].el.style.height, '126px');
  assert.equal(panes[1].el.style.height, '126px');
  assert.equal(panes[2].el.style.height, '66px');
});

test('dragging beyond a byte pane scrolls only that pane and stops on release', async () => {
  const h = harness();
  const p = h.pane('px 4');
  const other = h.pane('pd 4');
  const cell = h.node();
  cell.dataset = { byte: '0x1000', hex: '41' };
  cell.closest = () => cell;
  p.pre.children = [cell];
  p.pre.querySelectorAll = () => [cell];
  h.api.selectBytes(p, { target: cell, button: 0, pointerId: 1, clientX: 100, clientY: 100, preventDefault () {} });
  h.hit(cell);
  h.event('pointermove', { pointerId: 1, clientX: 100, clientY: 230 });
  h.event('pointerup', { pointerId: 1 });
  await h.api.flush();
  assert.equal(p.addr, '0x1010');
  assert.equal(other.addr, '0x1000');
  assert.equal(h.timers.size, 0);
});

test('help opens by click, question mark, F1 and Alt+? across keyboard layouts', () => {
  const h = harness();
  h.api.bindControls();
  h.elements.get('hint').onclick();
  const help = h.elements.get('help');
  assert.equal(help.hidden, false);
  h.elements.get('helpclose').onclick();
  const key = (options) => {
    const e = { key: '?', code: 'Slash', target: { closest: () => null }, preventDefault () { this.prevented = true; }, ...options };
    h.event('keydown', e);
    return e;
  };
  for (const options of [
    {},
    { key: 'F1', code: 'F1' },
    { altKey: true, shiftKey: true },
    { altKey: true, shiftKey: true, code: 'Quote' },
    { key: '¿', code: 'Slash', altKey: true, shiftKey: true }
  ]) {
    assert.equal(key(options).prevented, true);
    assert.equal(help.hidden, false);
    assert.equal(help.focused, true);
    key({ key: 'ArrowDown', code: 'ArrowDown' });
    assert.equal(help.hidden, false);
    key({ key: 'Escape', code: 'Escape' });
    assert.equal(help.hidden, true);
  }
  h.elements.get('hint').onclick();
  assert.equal(help.hidden, false);
  assert.match(h.elements.get('helptext').textContent, /Type any r2 command and press Enter/);
  h.elements.get('helpclose').onclick();
  assert.equal(help.hidden, true);
});

test('new frame button opens the exact typed command even when presets match', () => {
  const h = harness();
  const created = [];
  h.api.setNewPane((cmd) => created.push(cmd));
  h.api.bindControls();
  h.elements.get('newpane').onclick();
  const input = h.elements.get('mi');
  const menu = h.elements.get('menu');
  assert.equal(menu.hidden, false);
  assert.equal(input.focused, true);
  assert.match(input.placeholder, /type any r2 command/);
  assert.match(h.elements.get('menuhint').textContent, /Enter opens your typed command/);
  input.value = 'pd';
  input.oninput();
  input.onkeydown({ key: 'Enter', preventDefault () {} });
  assert.deepEqual(created, ['pd']);
  assert.equal(menu.hidden, true);
  h.elements.get('newpane').onclick();
  input.value = ' px 256 @ main ';
  input.oninput();
  input.onkeydown({ key: 'Enter', preventDefault () {} });
  assert.deepEqual(created, ['pd', 'px 256 @ main']);
});

test('frame picker supports presets, rejects empty commands and cancels cleanly', () => {
  const h = harness();
  const created = [];
  h.api.setNewPane((cmd) => created.push(cmd));
  h.api.bindControls();
  h.api.wmKey('KeyP');
  const input = h.elements.get('mi');
  input.onkeydown({ key: 'ArrowDown', preventDefault () {} });
  input.onkeydown({ key: 'Enter', preventDefault () {} });
  assert.deepEqual(created, ['pd $R']);
  h.api.paneKey('o');
  input.onkeydown({ key: 'Enter', preventDefault () {} });
  assert.deepEqual(created, ['pd $R']);
  h.api.paneKey('o');
  input.value = 'axt';
  input.oninput();
  input.onkeydown({ key: 'Escape', preventDefault () {} });
  assert.deepEqual(created, ['pd $R']);
  assert.equal(h.elements.get('menu').hidden, true);
});

test('keyboard shortcuts still work after closing help with a toolbar button focused', () => {
  const h = harness();
  h.api.bindControls();
  h.elements.get('hint').onclick();
  h.elements.get('helpclose').onclick();
  h.event('keydown', {
    key: 'o',
    code: 'KeyO',
    target: { closest: (selector) => selector === 'button' ? {} : null },
    preventDefault () {}
  });
  assert.equal(h.elements.get('menu').hidden, false);
});

const originalFile = { core: { fd: 3, file: '/tmp/original' }, bin: { baddr: 0 } };
function consoleReply (out = '', addr = '0x1000', before = originalFile, after = before) {
  return `__r2t_before__\n${JSON.stringify(before)}\n__r2t_logging__\nfalse\nfalse\n__r2t_output__\n${out}__r2t_after__\n${addr}\n${JSON.stringify(after)}\n`;
}

test('file opens reset every pane and queued requests use the new file address', async () => {
  const next = { core: { fd: 4, file: '/bin/ls' }, bin: { baddr: 4294967296 } };
  const h = harness((body) => body.includes('__r2t_before__') ? consoleReply('', '0x100000960', originalFile, next) : undefined);
  const a = h.pane('pd $R');
  const b = h.pane('px $R*16', [], '0x5000');
  b.filter = 'old file';
  b.selection = { anchor: '0x5000', head: '0x5001' };
  const opening = h.api.runConsole(a, 'o /bin/ls', a.navigation);
  const queued = h.api.r2At(b, 'px 16');
  await Promise.all([opening, queued]);
  assert.equal(a.addr, '0x100000960');
  assert.equal(b.addr, '0x100000960');
  assert.equal(b.filter, '');
  assert.equal(b.selection, null);
  assert.equal(a.history.length, 1);
  assert.equal(h.api.state().file, '/bin/ls');
  assert.equal(h.api.state().seek, '0x100000960');
  assert.equal(h.requests.at(-1), 'ss 0x100000960;px 16;ss 0x100000960');
  assert.ok(h.requests.some((c) => c === 'e log.cons=false;e log.quiet=false;ss 0x100000960'));
});

test('failed file opens expose backend errors and preserve independent offsets', async () => {
  const h = harness((body) => body.includes('__r2t_before__') ? consoleReply('ERROR: [cmd_open] This command is disabled in sandbox mode\n') : undefined);
  const a = h.pane('pd $R');
  const b = h.pane('px 32', [], '0x5000');
  const result = await h.api.runConsole(a, 'o /bin/ls', a.navigation);
  assert.match(result.error, /disabled in sandbox/);
  assert.equal(a.addr, '0x1000');
  assert.equal(b.addr, '0x5000');
});

test('colon commands accept a leading colon and show errors in the console', async () => {
  const h = harness((body) => body.includes('__r2t_before__') ? consoleReply('ERROR: Cannot open file /missing\n') : undefined);
  const p = h.pane('pd $R');
  h.api.focus(p);
  await h.api.console_(':o /missing');
  const consolePane = h.api.panes.find((p) => p.cmd === 'console');
  assert.match(consolePane.out, /> o \/missing/);
  assert.match(consolePane.out, /Cannot open file/);
  assert.equal(h.api.current(), consolePane);
  assert.ok(h.requests.some((c) => c.includes(';o /missing\n')));
  assert.ok(!h.requests.some((c) => c.includes(';:o /missing')));
});

test('eval editor filters keys and values and selects only the value for editing', async () => {
  const values = { 'asm.bits': 64, 'asm.arch': 'arm', 'scr.color': 3 };
  const h = harness((body) => body === 'ej' ? JSON.stringify(values) : undefined);
  await h.api.evalMenu();
  const input = h.el('mi');
  input.value = 'arm';
  input.oninput();
  assert.match(h.el('ml').innerHTML, /asm.arch/);
  assert.doesNotMatch(h.el('ml').innerHTML, /asm.bits/);
  input.onkeydown({ key: 'Enter', preventDefault () {} });
  assert.equal(input.value, 'asm.arch=arm');
  assert.equal(input.selectionStart, 'asm.arch='.length);
  assert.equal(input.selectionEnd, input.value.length);
  assert.equal(h.el('ml').innerHTML, '');
});

test('eval writes keep command delimiters in the value and read back the result', async () => {
  const values = { 'cfg.user': 'old', 'asm.bits': 64 };
  const h = harness((body) => {
    if (body.startsWith("'e cfg.user=")) values['cfg.user'] = body.slice("'e cfg.user=".length);
    if (body === 'ej') return JSON.stringify(values);
  });
  await h.api.saveEval('cfg.user=a;b=c', { ...values }, 'cfg');
  assert.equal(values['cfg.user'], 'a;b=c');
  assert.equal(h.requests[0], "'e cfg.user=a;b=c");
  assert.equal(h.requests[1], 'ej');
  assert.match(h.el('toast').textContent, /cfg.user=a;b=c/);
  await h.api.saveEval('unknown=value', values, '');
  assert.ok(!h.requests.some((c) => c.includes('unknown=value')));
});

test('frame menu searches grey descriptions and selects the described action', () => {
  const h = harness();
  const created = [];
  h.api.setNewPane((c) => created.push(c));
  h.api.bindControls();
  h.el('newpane').onclick();
  const input = h.el('mi');
  input.value = 'decompiler offsets';
  input.oninput();
  assert.match(h.el('ml').innerHTML, /class="detail"/);
  assert.match(h.el('ml').innerHTML, /Decompiler with offsets/);
  input.onkeydown({ key: 'Enter', preventDefault () {} });
  assert.deepEqual(created, ['pdco']);
});

test('frame splits replace only the focused rectangle and support nested splits', async () => {
  const h = harness();
  const a = h.pane('pd $R');
  const b = h.pane('px $R*16', [], '0x5000');
  const c = h.pane('afl');
  h.api.focus(b);
  h.api.arrange();
  const beforeA = Array.from(a.rect);
  const beforeB = Array.from(b.rect);
  const beforeC = Array.from(c.rect);
  h.api.paneKey('|');
  const clone = h.api.current();
  assert.equal(clone.cmd, b.cmd);
  assert.equal(clone.addr, b.addr);
  assert.deepEqual(Array.from(a.rect), beforeA);
  assert.deepEqual(Array.from(c.rect), beforeC);
  assert.equal(b.rect[2], beforeB[2] / 2);
  assert.equal(clone.rect[2], b.rect[2]);
  const cloneBefore = Array.from(clone.rect);
  h.api.paneKey('-');
  const nested = h.api.current();
  assert.equal(nested.rect[3], cloneBefore[3] / 2);
  assert.equal(clone.rect[3], nested.rect[3]);
  assert.deepEqual(Array.from(a.rect), beforeA);
  assert.deepEqual(Array.from(c.rect), beforeC);
  await new Promise(setImmediate);
});

test('closing a split restores the other half and persisted ids remain unique', async () => {
  const h = harness();
  const p = h.api.newPane('px 16', false);
  h.api.focus(p);
  const original = Array.from(p.rect);
  h.api.splitFrame('x');
  const clone = h.api.current();
  assert.notEqual(p.id, clone.id);
  assert.equal(new Set(h.api.S.panes.map((p) => p.id)).size, 2);
  h.api.closePane(clone);
  assert.deepEqual(Array.from(p.rect), original);
  await new Promise(setImmediate);
});

test('cycle icon shares p/P behavior and includes pdco without moving the frame', async () => {
  const h = harness();
  const p = h.pane('pxr $R*8', [], '0x5000');
  await h.api.cyclePrint(p, 1);
  assert.equal(p.cmd, 'pdco');
  assert.equal(p.addr, '0x5000');
  assert.ok(h.requests.some((c) => c.includes('pdco @e:cmd.pdc=pdc')));
  await h.api.cyclePrint(p, -1);
  assert.equal(p.cmd, 'pxr $R*8');
});

test('symbols and addresses are linked without linking instruction byte cells', () => {
  const h = harness();
  const line = h.api.ansi('  0x1000      e800000000    call sym.func.1000042ec ; 0x2000\n', 'pd 1')[0];
  assert.match(line.h, /<a data-symbol="sym.func.1000042ec">sym.func.1000042ec<\/a>/);
  assert.match(line.h, /data-a="0x2000"/);
  assert.match(line.h, /data-byte="0x1000" data-hex="e8"/);
});

test('clicking a symbol resolves it and seeks only that frame', async () => {
  const h = harness((body) => body.includes('?v sym.func.1000042ec') ? '0x1000042ec\n' : undefined);
  const a = h.pane('pd $R');
  const b = h.pane('px 16', [], '0x5000');
  h.api.focus(a);
  h.api.bindControls();
  const link = { dataset: { symbol: 'sym.func.1000042ec' } };
  await h.el('wm').onclick({ target: { closest: (s) => s.includes('a[data-a]') ? link : null } });
  assert.equal(a.addr, '0x1000042ec');
  assert.equal(b.addr, '0x5000');
});

test('linked frames follow any source while independent frames keep their offsets', async () => {
  const h = harness();
  const a = h.pane('pd $R');
  const b = h.pane('px 16', [], '0x5000');
  const c = h.pane('afl', [], '0x7000');
  h.api.toggleTie(b);
  h.api.setAddress(a, '0x2000');
  await new Promise(setImmediate);
  assert.equal(a.addr, '0x2000');
  assert.equal(b.addr, '0x2000');
  assert.equal(c.addr, '0x7000');
  h.api.toggleTie(b);
  h.api.setAddress(a, '0x3000');
  assert.equal(b.addr, '0x2000');
  assert.equal(h.api.S.panes.find((p) => p.id === b.id).tied, false);
});

test('yank uses the selected range, and paste uses the visual cursor and r2 buffer', async () => {
  const h = harness((body) => {
    if (body === 'yj') return '{"addr":4096,"bytes":"010203"}';
    if (body.includes('__r2t_before__')) return consoleReply();
  });
  const p = h.pane('px 16');
  p.selection = { anchor: '0x1003', head: '0x1001' };
  await h.api.yankBytes(p);
  assert.ok(h.requests.some((c) => c.includes(';y 3 0x1001\n')));
  await h.api.pasteBytes(p);
  assert.ok(h.requests.some((c) => c.includes(';yy 0x1001\n')));
  assert.equal(p.addr, '0x1000');
});

test('visual marks use native fv commands and jumps stay in the chosen frame', async () => {
  const h = harness((body) => body === 'fv 97' ? '0x2000\n' : undefined);
  const a = h.pane('pd $R');
  const b = h.pane('px 16', [], '0x5000');
  h.api.beginMark(a, 'set');
  await h.api.finishMark('a');
  assert.ok(h.requests.some((c) => c.includes('fv 97 0x1000')));
  h.api.beginMark(a, 'jump');
  await h.api.finishMark('a');
  assert.equal(a.addr, '0x2000');
  assert.equal(b.addr, '0x5000');
});

test('decompiler backends expose options by the iaito prefix and preserve offsets', async () => {
  const values = { 'r2ghidra.casts': true, 'r2dec.blocks': false, 'asm.bits': 64 };
  const h = harness((body) => body === 'e cmd.pdc=?' ? 'pdc\npdg\npdd\n' : body === 'ej' ? JSON.stringify(values) : undefined);
  const p = h.api.newPane('pdco', false, '0x5000');
  p.decompiler = 'pdg';
  await h.api.updateDecompilerControls(p);
  assert.match(p.decompilerSelect.innerHTML, /value="pdg"/);
  assert.match(p.decompilerOptions.innerHTML, /r2ghidra.casts=true/);
  assert.doesNotMatch(p.decompilerOptions.innerHTML, /r2dec.blocks/);
  assert.equal(h.api.decompilerCommand(p), 'pdgo');
  assert.equal(p.addr, '0x5000');
});

test('binary project metadata includes Unicode notes and the complete frame layout', () => {
  const h = harness();
  const p = h.pane('pdco', [], '0x5000');
  p.decompiler = 'pdg';
  p.tied = true;
  h.api.setNotes('Findings: café 🐈\nTODO: xrefs');
  const command = h.api.metadataCommand('/tmp/session.r2prj');
  const encoded = /base64:([\w+/=]+)/.exec(command)[1];
  const data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  assert.equal(data.notes, 'Findings: café 🐈\nTODO: xrefs');
  assert.equal(data.path, '/tmp/session.r2prj');
  assert.equal(data.layout.panes[0].addr, '0x5000');
  assert.equal(data.layout.panes[0].decompiler, 'pdg');
  assert.equal(data.layout.panes[0].tied, true);
  assert.doesNotMatch(command, /Pn|Ps /);
});

test('project dialog lists binary projects and excludes legacy scripts', async () => {
  const h = harness((body) => {
    if (body === 'e dir.projects') return '/tmp/projects\n';
    if (body.includes(';ls -j /tmp/projects/legacy\n')) return consoleReply('[{"name":"rc.r2","isdir":false}]\n');
    if (body.includes(';ls -j /tmp/projects\n')) return consoleReply(JSON.stringify([{ name: 'good.r2prj', isdir: false }, { name: 'old.r2prj', isdir: false }, { name: 'legacy', isdir: true }]) + '\n');
    if (body === 'prj info "/tmp/projects/good.r2prj"') return 'Project {\n Header { magic = 0x4a525052 OK }\n}\n';
    if (body === 'prj info "/tmp/projects/old.r2prj"') return '';
  });
  await h.api.openProjects();
  assert.equal(h.el('manager').hidden, false);
  assert.match(h.el('projectlist').innerHTML, /good.r2prj/);
  assert.doesNotMatch(h.el('projectlist').innerHTML, /old.r2prj|rc.r2|legacy/);
});

test('r2pm actions validate package names and show backend output', async () => {
  const h = harness((body) => {
    if (body === 'e log.cons;e log.quiet') return 'false\nfalse\n';
    if (body.startsWith('!r2pm -i r2ghidra ')) return 'Installed\n__r2pm_exit__\n0x0\n';
    if (body.startsWith('!r2pm -sj')) return '[{"name":"r2ghidra","desc":"Decompiler"}]\n__r2pm_exit__\n0x0\n';
    if (body.startsWith('!r2pm -lj')) return '["r2ghidra"]\n__r2pm_exit__\n0x0\n';
  });
  h.el('packagefilter').value = '';
  await h.api.packageAction('i', 'r2ghidra');
  assert.match(h.el('packageoutput').textContent, /Installed/);
  assert.match(h.el('packagelist').innerHTML, /Uninstall/);
  const count = h.requests.length;
  await h.api.packageAction('i', 'r2ghidra;rm -rf /');
  assert.equal(h.requests.length, count);
});

test('decai options capture console output as iaito does, including equals in values', async () => {
  const h = harness((body) => {
    if (!body.startsWith('js base64:')) return;
    const script = Buffer.from(body.slice(10), 'base64').toString('utf8');
    const messages = [];
    const fakeConsole = { log () {} };
    const original = fakeConsole.log;
    vm.runInNewContext(script, {
      console: fakeConsole,
      r2: {
        cmd () { fakeConsole.log('decai -e model=test model'); fakeConsole.log('decai -e headers=X-Test=a=b'); return ''; },
        log: (s) => messages.push(s)
      }
    });
    assert.equal(fakeConsole.log, original);
    return messages.join('\n');
  });
  const p = h.api.newPane('pdco', false);
  p.decompiler = 'decai';
  await h.api.updateDecompilerOptions(p);
  assert.equal(p.decompilerValues.model, 'test model');
  assert.equal(p.decompilerValues.headers, 'X-Test=a=b');
  assert.equal(p.decompilerOptions.disabled, false);
});

test('project restoration requires review for custom executable commands', () => {
  const h = harness();
  h.api.restoreWorkspace({
    tag: 1,
    lay: 'tile',
    panes: [
      { cmd: '!curl https://example.invalid', tag: 1, addr: '0x1000', id: 1 },
      { cmd: 'pdco', decompiler: 'decai', tag: 1, addr: '0x2000', id: 2 }
    ]
  });
  assert.equal(h.api.panes[0].cmd, 'console');
  assert.match(h.api.panes[0].out, /Press c to review/);
  assert.equal(h.api.panes[1].cmd, 'pdco');
  assert.equal(h.api.panes[1].decompiler, 'pdc');
  assert.equal(h.requests.length, 0);
});

test('notes and input controls retain their native copy behavior', () => {
  const h = harness();
  const p = h.pane('px 16');
  p.selection = { anchor: '0x1000', head: '0x1000' };
  p.byteValues = new Map([['0x1000', '41']]);
  h.api.focus(p);
  let copied = false;
  h.api.openNotes();
  h.event('copy', { clipboardData: { setData () { copied = true; } }, preventDefault () {} });
  assert.equal(copied, false);
});

test('Open file uses oj and prefers the binary path over an internal IO descriptor', async () => {
  const h = harness((body) => body === 'oj' ? JSON.stringify([{ fd: 3, uri: '/bin/ls', size: 100, writable: false }, { fd: 4, uri: 'null://128', size: 128, raised: true }]) : undefined);
  h.api.setFile('/bin/ls');
  await h.api.openFileDialog();
  assert.ok(h.requests.includes('oj'));
  assert.equal(h.el('filepath').value, '/bin/ls');
  assert.match(h.el('openedfiles').innerHTML, /fd 3/);
  assert.match(h.el('openedfiles').innerHTML, /null:\/\/128/);
});

test('file replacement checks oj, tolerates unrelated loader logs and resets only after validation', async () => {
  let stage = 0;
  const selected = { core: { fd: 4, file: '/new' }, bin: { baddr: 0 } };
  const reset = { core: { fd: 3, file: '/new' }, bin: { baddr: 0 } };
  const h = harness((body) => {
    if (body === 'oj') return JSON.stringify(stage === 0 ? [{ fd: 3, uri: '/tmp/original' }] : stage === 1 ? [{ fd: 3, uri: '/tmp/original' }, { fd: 4, uri: '/new' }] : [{ fd: 3, uri: '/new' }]);
    if (body.includes(';o--;o "/new"\n')) { stage = 2; return consoleReply('ERROR: [fs] Invalid mount point\n', '0x2000', selected, reset); }
    if (body.includes(';o "/new"\n')) { stage = 1; return consoleReply('ERROR: [fs] Invalid mount point\n', '0x2000', originalFile, selected); }
  });
  assert.equal(await h.api.replaceFile('/new'), true);
  assert.equal(stage, 2);
  assert.equal(h.api.state().file, '/new');
});

test('failed replacement leaves existing files and analysis intact', async () => {
  const h = harness((body) => {
    if (body === 'oj') return '[{"fd":3,"uri":"/tmp/original"}]';
    if (body.includes(';o "/missing"\n')) return consoleReply('ERROR: Cannot open file /missing\n');
  });
  assert.equal(await h.api.replaceFile('/missing'), false);
  assert.ok(!h.requests.some((c) => c.includes('o--')));
  assert.match(h.el('managerstatus').textContent, /Cannot open/);
});

test('project notes and saved frame offsets return after reloading the page', async () => {
  const data = { path: '/tmp/session.r2prj', notes: 'Persistent notes 🐈', layout: { file: '/bin/ls', seek: '0x3000', tag: 1, lay: 'tile', panes: [{ id: 1, cmd: 'px 32', addr: '0x3000', tag: 1 }] } };
  const h = harness((body) => body === 'fs+ r2webui;fC r2webui.project;fs-' ? JSON.stringify(data) : undefined);
  h.api.setFile('/bin/ls');
  await h.api.restoreSessionProject();
  assert.equal(h.api.getNotes(), 'Persistent notes 🐈');
  assert.equal(h.api.panes[0].addr, '0x3000');
  assert.equal(h.api.panes[0].cmd, 'px 32');
});
