'use strict';
/* global $, S, PRESETS, motions, byteDrag, endByteDrag, panes, cur:writable, initializing:writable, lastSeek:writable, newPane, seek, setFocus, vis, arrange, r2, runConsole, resetFile, refreshAll, toast, save, strip, file, esc, request, refresh, selectionRange, r2At, address, seekPane, menu, uiTools */

/* Project metadata travels inside the binary project's flag/comment records. */
let activeProject = '';
let projectDirectory = '';
let notesText = '';
let projectEntries = [];
let selectedProject = '';
let packages = [];
let installedPackages = new Set();
let markMode = null;
let projectMarks = [];

const encodeText = (s) => btoa(Array.from(new TextEncoder().encode(s), (n) => String.fromCharCode(n)).join(''));
const r2Arg = (s) => {
  if (/[\r\n\0;|`<>]/.test(s)) throw new Error('Unsupported characters in path');
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
};
const utilityPath = (s) => {
  s = s.replace(/\\/g, '/');
  if (/[\r\n\0;|`<>"#]/.test(s)) throw new Error('Unsupported characters in directory path');
  return s;
};
const cleanOutput = (s) => strip(s).replace(/^(?:WARN|INFO|ERROR|HINT|DEBUG):[^\n]*\n?/gm, '').trim();
const notesKey = () => 'r2t.notes:' + (activeProject || file || 'session');

async function openFileDialog () {
  showManager('files', 'Open file', '<form id="fileopen"><label>Path <input id="filepath" placeholder="/bin/ls" spellcheck="false" autocomplete="off" required></label><button type="submit">Open and replace session</button></form><p>The current files, flags and analysis are replaced after the new path is checked.</p><h3>Opened files</h3><div id="openedfiles" class="managerlist"></div>');
  $('managerstatus').textContent = 'Loading opened files…';
  $('fileopen').onsubmit = (e) => { e.preventDefault(); replaceFile($('filepath').value); };
  $('openedfiles').onclick = (e) => { const b = e.target.closest('[data-file]'); if (b) $('filepath').value = b.dataset.file; };
  try {
    const files = JSON.parse(await r2('oj'));
    $('openedfiles').innerHTML = files.map((f) => `<button type="button" data-file="${esc(f.uri || '')}"><strong>${esc(f.uri || '')}${f.raised ? ' · active' : ''}</strong><span class="detail">fd ${f.fd} · ${f.size} bytes · ${f.writable ? 'read/write' : 'read only'}</span></button>`).join('');
    $('filepath').value = (files.find((f) => f.uri === file) || files.find((f) => f.raised) || {}).uri || '';
    const sandbox = (await r2('e http.sandbox')).trim() === 'true';
    $('managerstatus').textContent = sandbox ? 'r2 HTTP sandbox is enabled and may block opening new files. Server permissions are fixed at startup.' : 'Enter a local path, or click an opened file to use its path.';
    $('filepath').focus();
  } catch (e) { $('managerstatus').textContent = e.message; }
}

async function replaceFile (path) {
  try {
    path = path.trim();
    if (!path) throw new Error('Enter a file path');
    const argument = r2Arg(path);
    const previous = JSON.parse(await r2('oj'));
    $('managerstatus').textContent = 'Checking ' + path + '…';
    const checked = await runConsole(cur, 'o ' + argument, cur && ++cur.navigation);
    const checkedFiles = JSON.parse(await r2('oj'));
    if (!openedTarget(checked, checkedFiles, path, previous)) throw new Error(checked.error || 'r2 did not open the requested file');
    $('managerstatus').textContent = 'Opening a fresh session…';
    const opened = await runConsole(null, 'o--;o ' + argument, null);
    const openedFiles = JSON.parse(await r2('oj'));
    if (!openedTarget(opened, openedFiles, path, [])) throw new Error(opened.error || 'r2 did not reopen the requested file');
    resetFile(opened.addr, opened.info);
    await r2('fv-*');
    await restoreSessionProject();
    await refreshAll();
    $('manager').hidden = true;
    toast('Opened ' + path);
    return true;
  } catch (e) {
    $('managerstatus').textContent = e.message;
    return false;
  }
}

function openedTarget (result, files, path, previous) {
  const core = result.info && result.info.core;
  const descriptor = core && files.find((f) => f.fd === core.fd);
  const fresh = descriptor && !previous.some((f) => f.fd === descriptor.fd && f.uri === descriptor.uri);
  return !!descriptor && (descriptor.uri === path || core.file === path) && (fresh || !result.error);
}

/* A shell command must be the request's first command for r2's HTTP stdout
 * capture to include child-process output. Keep logging and exit-status reads
 * in one queue transaction without adding a seek/color prefix. */
function runShell (command) {
  return r2('e log.cons;e log.quiet', async (state) => {
    const logging = state.trim().split('\n').map((v) => v === 'true' ? 'true' : 'false');
    try {
      await request('e log.cons=true');
      const raw = await request('!' + command + ' 2>&1\n?e __r2pm_exit__;?v $?');
      const marker = raw.lastIndexOf('__r2pm_exit__\n');
      const out = marker < 0 ? raw : raw.slice(0, marker);
      const code = marker < 0 ? 1n : BigInt(raw.slice(marker + '__r2pm_exit__\n'.length).trim());
      const error = (strip(out).match(/^(?:ERROR|FATAL):[^\n]*/m) || [])[0] || (code ? `Command failed (exit ${code}); see output` : '');
      return { out, error };
    } finally {
      await request(`e log.cons=${logging[0]};e log.quiet=${logging[1]}`);
    }
  });
}

function showManager (mode, title, html) {
  markMode = null;
  if (!$('notes').hidden) rememberNotes();
  $('notes').hidden = true;
  $('manager').setAttribute('data-mode', mode);
  $('menu').hidden = true;
  $('help').hidden = true;
  $('managertitle').textContent = title;
  $('managerbody').innerHTML = html;
  $('manager').hidden = false;
}

function rememberNotes () {
  notesText = $('notestext').value;
  try { window.localStorage.setItem(notesKey(), notesText); } catch (e) {}
  $('notesstatus').textContent = 'Draft saved locally. Save the project to keep it in the binary project file.';
}

function openNotes () {
  markMode = null;
  $('manager').hidden = true;
  $('menu').hidden = true;
  $('help').hidden = true;
  try { notesText = window.localStorage.getItem(notesKey()) ?? notesText; } catch (e) {}
  $('notestext').value = notesText;
  $('noteslabel').textContent = activeProject || file || 'Current session';
  $('notesstatus').textContent = activeProject ? 'Notes are included when you save this binary project.' : 'Save a binary project to persist these notes.';
  $('notes').hidden = false;
  $('notestext').focus();
}

function metadataCommand (path) {
  save();
  const data = encodeText(JSON.stringify({ version: 1, path, notes: notesText, layout: S, marks: projectMarks }));
  return `fs+ r2webui;f r2webui.project 0 @ 0;fC r2webui.project base64:${data};fs-`;
}

async function readProjectMetadata () {
  const text = await r2('fs+ r2webui;fC r2webui.project;fs-');
  try { return JSON.parse(text); } catch (e) { return null; }
}

async function restoreSessionProject () {
  const data = await readProjectMetadata();
  if (!data || !data.path || !data.layout || data.layout.file !== file) return;
  activeProject = data.path;
  notesText = typeof data.notes === 'string' ? data.notes : '';
  try { notesText = window.localStorage.getItem(notesKey()) ?? notesText; } catch (e) {}
  restoreWorkspace(data.layout);
}

function restoreWorkspace (layout) {
  if (!layout || !Array.isArray(layout.panes) || !layout.panes.length) return;
  const saved = layout.panes.slice();
  motions.length = 0;
  if (byteDrag) endByteDrag({ pointerId: byteDrag.pointer });
  panes.splice(0).forEach((p) => p.el.remove());
  cur = null;
  const wasInitializing = initializing;
  lastSeek = address(layout.seek || '') || lastSeek;
  initializing = true;
  for (const key of ['tag', 'lay', 'mfact', 'nmaster', 'gcols', 'grows', 'splits', 'hist']) {
    if (Object.hasOwn(layout, key)) S[key] = layout[key];
  }
  const tag = S.tag;
  for (const p of saved) {
    if (!p || typeof p.cmd !== 'string') continue;
    S.tag = Number.isInteger(p.tag) && p.tag > 0 && p.tag < 10 ? p.tag : tag;
    const safe = safeProjectCommand(p.cmd);
    const backend = ['pdc', 'pdd', 'pdg', 'pdz', 'r2jadx', 'pd:j'].includes(p.decompiler) ? p.decompiler : 'pdc';
    const pane = newPane(safe ? p.cmd === 'pdc' ? 'pdco' : p.cmd : 'console', false, typeof p.addr === 'string' ? p.addr : seek, p.weight || 1, p.id || 0, 'x', backend, !!p.tied);
    if (!safe) pane.out = 'Saved custom command: ' + p.cmd + '\nPress c to review and run a command.';
  }
  S.tag = tag;
  initializing = wasInitializing;
  setFocus(vis()[0]);
  arrange();
}

function safeProjectCommand (command) {
  const match = /^([\w=]+)(?:\s+[\w.$*()+/-]+)?(?:\s*@\s*[\w.]+)?$/.exec(command.trim());
  return !!match && new Set(PRESETS.map((c) => c.split(' ')[0]).concat(['pdc', 'pdf', 'pdi', 'pi'])).has(match[1]);
}

async function loadBinaryProject (path) {
  $('managerstatus').textContent = 'Opening ' + path + '…';
  try {
    const result = await runConsole(cur, 'prj open ' + r2Arg(path), cur && ++cur.navigation);
    if (result.error) throw new Error(result.error);
    resetFile(result.addr, result.info);
    activeProject = path;
    const data = await readProjectMetadata();
    notesText = data && typeof data.notes === 'string' ? data.notes : '';
    if (data && Array.isArray(data.marks)) {
      const commands = data.marks.filter((m) => Number.isInteger(m.key) && m.key >= 0 && m.key < 256 && /^0x[0-9a-f]+$/i.test(m.addr)).map((m) => `fv ${m.key} ${m.addr}`);
      await r2('fv-*' + (commands.length ? ';' + commands.join(';') : ''));
    }
    try { notesText = window.localStorage.getItem(notesKey()) ?? notesText; } catch (e) {}
    if (data) restoreWorkspace(data.layout);
    await refreshAll();
    $('manager').hidden = true;
    toast('Opened ' + path);
  } catch (e) {
    $('managerstatus').textContent = e.message;
  }
}

async function saveBinaryProject (path) {
  try {
    if (!$('notes').hidden) rememberNotes();
    path = path.trim();
    if (!path) throw new Error('Enter a project filename');
    if (!/[\\/]/.test(path)) path = projectDirectory.replace(/\/$/, '') + '/' + path;
    if (!/\.(?:r2prj|rprj|prj|bin)$/i.test(path)) path += '.r2prj';
    $('managerstatus').textContent = 'Saving ' + path + '…';
    projectMarks = (await r2('fv*')).split('\n').map((line) => /^fv (0x[\da-f]+) (0x[\da-f]+)$/i.exec(line)).filter(Boolean).map((m) => ({ key: Number(m[1]), addr: m[2] }));
    const parent = path.slice(0, path.lastIndexOf('/'));
    // Serialize the session's logging settings, rather than runConsole's
    // temporary error capture. Native @e restores capture after saving.
    const logging = (await r2('e log.cons;e log.quiet')).trim().split('\n').map((v) => v.trim() === 'true' ? 'true' : 'false');
    const result = await runConsole(cur, (parent ? 'mkdir -p ' + utilityPath(parent) + ';' : '') + metadataCommand(path) + ';prj save ' + r2Arg(path) + ` @e:log.cons=${logging[0]},log.quiet=${logging[1]}`, cur && ++cur.navigation);
    if (result.error) throw new Error(result.error);
    const info = cleanOutput(await r2('prj info ' + r2Arg(path)));
    if (!info) throw new Error('r2 did not create a binary project. Check the server filesystem permissions.');
    activeProject = path;
    try { window.localStorage.setItem(notesKey(), notesText); } catch (e) {}
    $('notesstatus').textContent = 'Saved notes and layout in ' + path;
    $('managerstatus').textContent = 'Saved ' + path;
    toast('Project saved');
    await listBinaryProjects();
  } catch (e) {
    $('managerstatus').textContent = e.message;
    $('notesstatus').textContent = e.message;
  }
}

async function listBinaryProjects () {
  try {
    projectDirectory = $('projectdir').value.trim() || projectDirectory;
    const entries = await readDirectory(projectDirectory);
    projectEntries = [];
    for (const entry of entries) {
      const name = entry.name;
      if (!name || name === '.' || name === '..') continue;
      const path = projectDirectory.replace(/\/$/, '') + '/' + name;
      if (entry.isdir || entry.type === 'd') {
        const children = await readDirectory(path);
        if (children.some((e) => e.name === 'prj.bin') && cleanOutput(await r2('prj info ' + r2Arg(path + '/prj.bin'))).startsWith('Project {')) projectEntries.push({ name, path: path + '/prj.bin' });
      } else if ((/\.(?:r2prj|rprj|prj)$/i.test(name) || name === 'prj.bin') && cleanOutput(await r2('prj info ' + r2Arg(path))).startsWith('Project {')) projectEntries.push({ name, path });
    }
    projectEntries.sort((a, b) => a.name.localeCompare(b.name));
    drawProjects();
    $('managerstatus').textContent = projectEntries.length ? `${projectEntries.length} binary project${projectEntries.length === 1 ? '' : 's'}` : 'No binary projects here. Enter a filename below to save the current session.';
  } catch (e) {
    $('managerstatus').textContent = 'Cannot list projects: ' + e.message;
  }
}

async function readDirectory (path) {
  const result = await runConsole(cur, 'ls -j ' + utilityPath(path), cur && ++cur.navigation);
  if (result.error) throw new Error(result.error);
  const text = cleanOutput(result.out);
  if (!text) throw new Error('r2 returned no directory listing; check HTTP filesystem permissions');
  return JSON.parse(text);
}

function drawProjects () {
  const query = $('projectfilter').value.toLowerCase();
  $('projectlist').innerHTML = projectEntries.filter((p) => (p.name + ' ' + p.path).toLowerCase().includes(query))
    .map((p) => `<button type="button" class="${p.path === selectedProject ? 'selected' : ''}" data-project="${esc(p.path)}"><strong>${esc(p.name)}</strong><span class="detail">${esc(p.path)}</span></button>`).join('');
}

async function openProjects () {
  selectedProject = '';
  showManager('projects', 'Binary projects', '<label>Directory <input id="projectdir" spellcheck="false"></label><button id="projectreload" type="button">Refresh</button><input id="projectfilter" placeholder="Filter projects" aria-label="Filter projects"><div id="projectlist" class="managerlist"></div><button id="projectopen" type="button" disabled>Open selected project</button><form id="projectsave"><label>Save as <input id="projectname" placeholder="name.r2prj or an absolute path" required spellcheck="false"></label><button type="submit">Save binary project</button></form>');
  $('managerstatus').textContent = 'Loading binary projects…';
  if (!projectDirectory) projectDirectory = (await r2('e dir.projects')).trim();
  $('projectdir').value = projectDirectory;
  $('projectname').value = activeProject;
  $('projectreload').onclick = listBinaryProjects;
  $('projectfilter').oninput = drawProjects;
  $('projectlist').onclick = (e) => {
    const button = e.target.closest('[data-project]');
    if (button) { selectedProject = button.dataset.project; $('projectopen').disabled = false; drawProjects(); }
  };
  $('projectopen').onclick = () => selectedProject && loadBinaryProject(selectedProject);
  $('projectlist').ondblclick = (e) => { const b = e.target.closest('[data-project]'); if (b) loadBinaryProject(b.dataset.project); };
  $('projectsave').onsubmit = (e) => { e.preventDefault(); saveBinaryProject($('projectname').value); };
  await listBinaryProjects();
}

async function saveNotes () {
  rememberNotes();
  if (!activeProject) return openProjects();
  return saveBinaryProject(activeProject);
}

function drawPackages () {
  const words = $('packagefilter').value.toLowerCase().split(/\s+/).filter(Boolean);
  const installedOnly = $('installedonly').checked;
  $('packagelist').innerHTML = packages.filter((p) => (!installedOnly || installedPackages.has(p.name)) && words.every((w) => (p.name + ' ' + p.desc).toLowerCase().includes(w)))
    .map((p) => `<div><span><strong>${esc(p.name)}</strong><span class="detail">${esc(p.desc)}</span></span><button type="button" data-package="${esc(p.name)}" data-action="${installedPackages.has(p.name) ? 'u' : 'i'}">${installedPackages.has(p.name) ? 'Uninstall' : 'Install'}</button></div>`).join('');
}

async function refreshPackages () {
  $('managerstatus').textContent = 'Loading package database…';
  try {
    const available = await runShell('r2pm -sj');
    const installed = await runShell('r2pm -lj');
    if (available.error || installed.error) throw new Error(available.error || installed.error);
    packages = JSON.parse(cleanOutput(available.out));
    installedPackages = new Set(JSON.parse(cleanOutput(installed.out)));
    drawPackages();
    $('managerstatus').textContent = `${packages.length} packages · ${installedPackages.size} installed`;
  } catch (e) {
    $('managerstatus').textContent = 'Cannot load r2pm: ' + e.message;
  }
}

async function packageAction (action, name = '') {
  if (!['i', 'u', 'U'].includes(action) || (action !== 'U' && !/^[\w.+-]+$/.test(name))) return;
  $('managerstatus').textContent = (action === 'i' ? 'Installing ' : action === 'u' ? 'Uninstalling ' : 'Updating database') + name + '…';
  $('packageoutput').textContent = 'Running r2pm…';
  $('managerbody').querySelectorAll('button').forEach((b) => { b.disabled = true; });
  try {
    const result = await runShell(`r2pm -${action}${name ? ' ' + name : ''}`);
    $('packageoutput').textContent = strip(result.out).slice(-1000000);
    if (result.error) throw new Error(result.error);
    await refreshPackages();
    decompilerNames = null;
    $('managerstatus').textContent = action === 'i' ? 'Installed. Restart r2 to load newly installed native plugins.' : 'r2pm operation completed';
  } catch (e) {
    $('managerstatus').textContent = e.message;
  } finally {
    $('managerbody').querySelectorAll('button').forEach((b) => { b.disabled = false; });
  }
}

function openPackages () {
  showManager('packages', 'r2pm packages', '<div class="toolrow"><input id="packagefilter" placeholder="Filter packages by name or description" aria-label="Filter packages"><label><input id="installedonly" type="checkbox"> Installed only</label><button id="packageupdate" type="button">Update database</button><button id="packagereload" type="button">Refresh</button></div><div id="packagelist" class="managerlist"></div><pre id="packageoutput"></pre>');
  $('packagefilter').oninput = drawPackages;
  $('installedonly').onchange = drawPackages;
  $('packagereload').onclick = refreshPackages;
  $('packageupdate').onclick = () => packageAction('U');
  $('packagelist').onclick = (e) => {
    const b = e.target.closest('[data-package]');
    if (b) packageAction(b.dataset.action, b.dataset.package);
  };
  return refreshPackages();
}

const DECOMPILERS = { pdc: 'pdc', pdd: 'r2dec', pdg: 'r2ghidra', pdz: 'retdec', r2ai: 'r2ai', decai: 'decai', r2jadx: 'r2jadx', 'pd:j': 'r2jadx' };
let decompilerNames = null;
const isDecompiler = (p) => /^pdc(?:o)?(?:\s|$)/.test(p.cmd.trim());

function decompilerCommand (p) {
  const backend = p.decompiler || 'pdc';
  const command = backend === 'pdc' ? 'pdco @e:cmd.pdc=pdc' : backend === 'decai' ? 'decai -d' : backend === 'r2ai' ? 'r2ai -d' : backend === 'r2jadx' || backend === 'pd:j' ? 'pd:j' : /^pd[gd]$/.test(backend) ? backend + 'o' : backend;
  return command + p.cmd.trim().replace(/^pdco?/, '');
}

async function updateDecompilerControls (p) {
  if (!p.decompilerBar) return;
  p.decompilerBar.hidden = !isDecompiler(p);
  if (!isDecompiler(p)) return;
  if (!decompilerNames) decompilerNames = r2('e cmd.pdc=?').then((s) => [...new Set(['pdc', ...strip(s).trim().split(/\s+/).filter((n) => /^[\w:.-]+$/.test(n))])]).catch((e) => { decompilerNames = null; throw e; });
  const names = await decompilerNames;
  if (!panes.includes(p) || !isDecompiler(p)) return;
  const backend = names.includes(p.decompiler) ? p.decompiler : 'pdc';
  p.decompiler = backend;
  p.decompilerSelect.innerHTML = names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  p.decompilerSelect.value = backend;
  await updateDecompilerOptions(p);
}

async function updateDecompilerOptions (p) {
  const backend = p.decompiler || 'pdc';
  let values;
  if (backend === 'decai') {
    const script = '(function(){var old=console.log,lines=[];console.log=function(){lines.push(Array.prototype.join.call(arguments,\' \'));};try{var out=r2.cmd(\'decai -e\');if(out)lines.push(out);}finally{console.log=old;}r2.log(lines.join(String.fromCharCode(10)));})()';
    const output = await r2('js base64:' + encodeText(script));
    values = Object.fromEntries(output.split('\n').filter((l) => l.startsWith('decai -e ') && l.includes('=')).map((l) => { const at = l.indexOf('='); return [l.slice(9, at), l.slice(at + 1)]; }));
  } else {
    const all = JSON.parse(await r2('ej'));
    const prefix = (DECOMPILERS[backend] || backend) + '.';
    values = Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith(prefix)));
  }
  if (p.decompiler !== backend || !panes.includes(p)) return;
  p.decompilerValues = values;
  const keys = Object.keys(values).sort();
  p.decompilerOptions.innerHTML = '<option value="">Options…</option>' + keys.map((k) => `<option value="${esc(k)}">${esc(k)}=${esc(String(values[k]))}</option>`).join('');
  p.decompilerOptions.disabled = !keys.length;
  p.decompilerOptions.title = keys.length ? 'Select an option to edit its value' : 'No options for this decompiler';
}

const byteCursor = (p) => p.selection ? p.selection.head : p.addr;

async function yankBytes (p) {
  if (!p) return;
  const range = selectionRange(p);
  const from = range ? '0x' + range[0].toString(16) : p.addr;
  const length = range ? range[1] - range[0] + 1n : 1n;
  try {
    const result = await runConsole(p, `y ${length} ${from}`, ++p.navigation);
    if (result.error) throw new Error(result.error);
    toast(`Yanked ${length} byte${length === 1n ? '' : 's'} from ${from}`);
  } catch (e) { toast(e.message); }
}

async function pasteBytes (p) {
  if (!p) return;
  try {
    const buffer = JSON.parse(await r2('yj'));
    if (!buffer.bytes) throw new Error('Yank buffer is empty');
    const at = byteCursor(p);
    const result = await runConsole(p, 'yy ' + at, ++p.navigation);
    if (result.error) throw new Error(result.error);
    toast('Pasted ' + buffer.bytes.length / 2 + ' bytes at ' + at);
    await refreshAll();
  } catch (e) { toast(e.message); }
}

function beginMark (p, mode) {
  if (!p) return;
  markMode = { p, mode };
  toast(mode === 'set' ? 'Set visual mark: press a key (Esc cancels)' : 'Jump to visual mark: press its key (Esc cancels)');
}

async function finishMark (key) {
  const pending = markMode;
  markMode = null;
  if (!pending || key === 'Escape' || key.length !== 1 || key.charCodeAt(0) > 255 || !panes.includes(pending.p)) return;
  const { p, mode } = pending;
  const code = key.charCodeAt(0);
  try {
    if (mode === 'set') {
      await r2At(p, `fv ${code} ${byteCursor(p)}`);
      toast(`Mark ${key} set at ${byteCursor(p)}`);
    } else {
      const addr = address(await r2('fv ' + code));
      if (!addr) throw new Error('No visual mark for ' + key);
      await seekPane(p, addr);
    }
  } catch (e) { toast(e.message); }
}

function editDecompilerOption (p) {
  const key = p.decompilerOptions.value;
  p.decompilerOptions.value = '';
  if (!key) return;
  const previous = p.decompilerValues[key];
  menu(key, [], async (value) => {
    try {
      if (/[\r\n\0]/.test(value)) throw new Error('Use a single-line value');
      if (p.decompiler === 'decai') await r2("'decai -e " + key + '=' + value);
      else await r2("'e " + key + '=' + value);
      await updateDecompilerOptions(p);
      toast(`${key}=${p.decompilerValues[key]}`);
      await refresh(p);
    } catch (e) { toast(e.message); }
  }, { raw: true, value: String(previous), selectFrom: 0, hint: 'Enter saves the decompiler option · Esc cancels' });
}

Object.assign(uiTools, {
  openFileDialog,
  openProjects,
  openNotes,
  openPackages,
  rememberNotes,
  saveNotes,
  isDecompiler,
  decompilerCommand,
  updateDecompilerControls,
  editDecompilerOption,
  yankBytes,
  pasteBytes,
  beginMark,
  finishMark,
  restoreSessionProject,
  cancelMark: () => { markMode = null; }
});
uiTools.sessionChanged = () => {
  markMode = null;
  if (!$('notes').hidden) rememberNotes();
  $('notes').hidden = true;
  activeProject = '';
  notesText = '';
};
Object.defineProperty(uiTools, 'markMode', { get: () => markMode });
