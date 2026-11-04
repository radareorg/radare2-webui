import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');
const source = ['t.js', 'tools.js'].map((n) => readFileSync(root + '/www/t/js/' + n, 'utf8')).join('\n');
const directory = mkdtempSync(join(tmpdir(), 'r2t-http-projects-'));
const children = new Set();
process.on('exit', () => { for (const child of children) child.kill('SIGTERM'); });

// r2 emits LF in Content-Type; match the browser's tolerant header parser.
function webFetch (url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, { method: options.method || 'GET', headers: { ...options.headers, ...(options.body ? { 'Content-Length': Buffer.byteLength(options.body) } : {}) }, insecureHTTPParser: true }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, status: response.statusCode, text: async () => body }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}

async function start (grain) {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn('r2', ['-N', '-q', '-e', 'http.bind=127.0.0.1', '-e', 'http.port=' + port, '-e', 'http.maxport=' + port, '-e', grain === 'trusted' ? 'http.sandbox=false' : 'http.sandbox.grain=' + grain, '-e', 'dir.projects=' + directory, '-e', 'http.root=' + root + '/dist', '-e', 'http.ui=t', '-c', '=h', 'malloc://128'], { stdio: ['ignore', 'ignore', 'pipe'] });
  children.add(child);
  child.on('exit', () => children.delete(child));
  let logs = '';
  child.stderr.on('data', (b) => { logs = (logs + b.toString()).slice(-4000); });
  const base = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(logs);
    try {
      const response = await webFetch(base + '/cmd', { method: 'POST', body: '?v $$' });
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  const nodes = new Map();
  const node = () => ({ hidden: true, value: '', textContent: '', innerHTML: '', children: [], style: {}, classList: { add () {}, remove () {}, toggle () {} }, setAttribute () {}, querySelectorAll () { return []; } });
  const context = vm.createContext({
    window: { location: { pathname: '/t/index.html' }, localStorage: { getItem () { return null; }, setItem () {} } },
    document: { addEventListener () {}, getElementById (id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); } },
    fetch: (url, options) => webFetch(base + url, { ...options, headers: { Referer: base + '/' } }),
    setTimeout,
    clearTimeout,
    TextEncoder,
    TextDecoder,
    btoa,
    atob
  });
  vm.runInContext(source + `
    seek = '0x0';
    lastSeek = seek;
    initializing = false;
    globalThis.api = { r2, runConsole, saveBinaryProject, loadBinaryProject, openProjects, readProjectMetadata, runShell, replaceFile, openFileDialog,
      setNotes: (s) => { notesText = s; }, getNotes: () => notesText,
      state: () => ({ seek, file }) };
  `, context);
  return { child, api: context.api, nodes, base, logs: () => logs };
}

const blocked = await start('none');
try {
  const result = await blocked.api.runConsole(null, 'o /bin/ls', null);
  assert.match(result.error, /sandbox|disabled|Cannot open/i);
  console.log('Default HTTP sandbox: file-open denial is returned to the UI.');
} finally { blocked.child.kill('SIGTERM'); }

const allowed = await start('trusted');
try {
  const result = await allowed.api.runConsole(null, 'o /bin/ls', null);
  assert.equal(result.error, '', result.out);
  assert.equal(allowed.api.state().file, '/bin/ls');
  assert.equal((await allowed.api.r2('?v $$')).trim(), allowed.api.state().seek);
  console.log('File open over HTTP: new file and restored backend seek verified.');
  await allowed.api.openProjects();
  allowed.api.setNotes('Project notes: café 🐈\nTODO: inspect sym.func.1000042ec');
  const path = directory + '/session.r2prj';
  const logging = await allowed.api.r2('e log.cons;e log.quiet');
  await allowed.api.saveBinaryProject(path);
  assert.match(allowed.nodes.get('notesstatus')?.textContent || '', /Saved /);
  assert.equal(readFileSync(path).subarray(0, 4).toString(), 'RPRJ', allowed.nodes.get('managerstatus')?.textContent);
  await allowed.api.r2('fs+ r2webui;f- r2webui.project;fs-');
  await allowed.api.loadBinaryProject(path);
  assert.equal(allowed.api.getNotes(), 'Project notes: café 🐈\nTODO: inspect sym.func.1000042ec', allowed.nodes.get('managerstatus')?.textContent);
  // Loading outside runConsole exposes settings actually serialized in the file.
  await allowed.api.r2('prj open "' + path + '"');
  assert.equal(await allowed.api.r2('e log.cons;e log.quiet'), logging);
  console.log('Binary project save/open over HTTP: Unicode notes survived in the native binary file.');
  const listing = await allowed.api.runShell('r2pm -lj');
  assert.equal(listing.error, '', listing.out);
  const cleaned = listing.out.replace(/^(?:WARN|INFO|ERROR|HINT|DEBUG):[^\n]*\n?/gm, '').trim();
  assert.ok(Array.isArray(JSON.parse(cleaned)));
  console.log('r2pm installed-package JSON is captured through the real HTTP command route.');
  await allowed.api.r2('f old_only 1 @ 0x100000960;af+ 0x100000960 old_function');
  const beforeFiles = await allowed.api.r2('oj');
  await allowed.api.replaceFile('/tmp/no-such-r2t-file');
  assert.equal(await allowed.api.r2('oj'), beforeFiles);
  assert.match(await allowed.api.r2('fj'), /old_only/);
  await allowed.api.replaceFile('/bin/cat');
  assert.equal(allowed.api.state().file, '/bin/cat', allowed.nodes.get('managerstatus')?.textContent);
  assert.doesNotMatch(await allowed.api.r2('oj'), /malloc:\/\/128|\/bin\/ls/);
  assert.doesNotMatch(await allowed.api.r2('fj'), /old_only/);
  assert.doesNotMatch(await allowed.api.r2('aflj'), /old_function/);
  console.log('Open-file replacement verified: failed paths preserve files; successful opens remove old files, flags and analysis.');
  if (process.argv.includes('--serve')) {
    console.log('LIVE_UI=' + allowed.base + '/t/index.html');
    process.on('SIGINT', () => { allowed.child.kill('SIGTERM'); process.exit(0); });
    await new Promise(() => {});
  }
} finally { allowed.child.kill('SIGTERM'); }
