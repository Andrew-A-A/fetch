const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, Tray, Menu, nativeImage, Notification, clipboard } = require('electron');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
// Installed builds ship yt-dlp + FFmpeg in resources/bin; put them first so the bundled copies win over PATH.
// Must run before ./ytdlp is required (it reads YTDLP_PATH once).
if (app.isPackaged) {
  const bin = path.join(process.resourcesPath, 'bin');
  process.env.PATH = bin + path.delimiter + process.env.PATH;
  process.env.YTDLP_PATH = path.join(bin, 'yt-dlp.exe');
}
const y = require('./ytdlp');
const { rasterize } = require('./icon');

if (!app.requestSingleInstanceLock()) { app.exit(0); }
app.setAppUserModelId('app.fetch.desktop'); // must match build.appId so toasts show the installed app's name and icon

const ENV = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };
const STORE = path.join(app.getPath('userData'), 'store.json');
const ARCHIVE = path.join(app.getPath('userData'), 'archive.txt');

const DEFAULTS = {
  theme: 'system', mica: true, dir: path.join(app.getPath('videos'), 'Fetch'), concurrent: 3, limit: '', exists: 'skip',
  tpl: '%(uploader)s/%(title)s [%(id)s].%(ext)s', winSafe: true, proxy: '', impersonate: false, geo: false,
  channel: 'stable', aria2: false, subLangs: 'en.*', subs: true, thumb: true, chap: true, meta: false,
  sbMode: 'remove', sbCats: ['sponsor', 'selfpromo', 'interaction'], cookies: '', extra: '', bg: true, watchClip: false,
};

let store = { settings: {}, library: [], subs: [] };
try { store = { ...store, ...JSON.parse(fs.readFileSync(STORE, 'utf8')) }; } catch { /* first run */ }
store.settings = { ...DEFAULTS, ...store.settings };
const S = () => store.settings;
function save() { fs.writeFileSync(STORE, JSON.stringify(store, null, 1)); }

let win, tray, quitting = false;
const jobs = [];
const procs = new Map();
let nextId = Date.now();

// ---------- window / tray ----------
function overlay() {
  const dark = nativeTheme.shouldUseDarkColors;
  return { color: '#00000000', symbolColor: dark ? '#ffffff' : '#1b1b1b', height: 48 };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 720, minHeight: 520,
    titleBarStyle: 'hidden', titleBarOverlay: overlay(),
    backgroundMaterial: S().mica ? 'mica' : 'none',
    backgroundColor: '#00000000',
    icon: appIcon(),
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('close', (e) => { if (!quitting && S().bg) { e.preventDefault(); win.hide(); } });
}

function appIcon() {
  return nativeImage.createFromBitmap(rasterize(64), { width: 64, height: 64 });
}

function trayMenu() {
  const active = jobs.filter((j) => j.status === 'running').length;
  tray.setToolTip(`Fetch · ${active} active`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `Fetch · ${active} active`, enabled: false },
    { label: 'Open Fetch', click: () => { win.show(); win.focus(); } },
    { label: 'Watch clipboard for links', type: 'checkbox', checked: S().watchClip, click: (m) => setSettings({ watchClip: m.checked }) },
    { label: 'Pause all downloads', click: pauseAll },
    { label: 'Settings', click: () => { win.show(); send('nav', 'settings'); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } },
  ]));
}

function send(ch, data) { if (win && !win.isDestroyed()) win.webContents.send(ch, data); }

function setSettings(patch) {
  Object.assign(store.settings, patch);
  save();
  if ('theme' in patch) nativeTheme.themeSource = S().theme;
  if ('mica' in patch) win.setBackgroundMaterial(S().mica ? 'mica' : 'none');
  if ('concurrent' in patch) pump();
  trayMenu();
  send('settings', S());
  return S();
}

// ---------- queue ----------
let pushTimer;
function pushJobs() { // throttled: progress lines arrive many times a second
  if (pushTimer) return;
  pushTimer = setTimeout(() => { pushTimer = null; send('jobs', jobs); trayMenu(); }, 150);
}

function enqueue(spec) {
  const job = { id: String(nextId++), status: 'waiting', added: Date.now(), title: spec.url, ...spec, files: [] };
  jobs.push(job);
  pump();
  pushJobs();
  return job.id;
}

function pump() {
  const active = () => jobs.filter((j) => j.status === 'running' || j.status === 'pp');
  for (const j of jobs) {
    if (active().length >= Number(S().concurrent)) break;
    // Same URL twice (e.g. MP4 + MP3) shares temp/thumbnail file names, so those run one after another.
    if (j.status === 'waiting' && !active().some((r) => r.url === j.url)) start(j);
  }
}

function start(j) {
  Object.assign(j, { status: 'running', error: null, log: '', pct: 0, pp: null, dlStarted: false, stage: null, note: null });
  const p = spawn(y.BIN, y.downloadArgs(j, S()), { env: ENV, windowsHide: true });
  procs.set(j.id, p);
  const onData = (stream) => {
    let buf = '';
    p[stream].on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) handleLine(j, line);
    });
  };
  onData('stdout'); onData('stderr');
  p.on('error', (e) => { j.log += e.message; });
  p.on('close', (code) => {
    procs.delete(j.id);
    if (j.status === 'paused' || j.status === 'cancelled') { /* user action */ }
    // --break-on-existing exits 101 when it reaches already-downloaded items: that's success for subscriptions.
    else if (code === 0 || (j.archive && code === 101)) finish(j);
    else { j.status = 'error'; j.error = lastError(j.log) || `yt-dlp exited with code ${code}`; }
    if (j.status === 'cancelled') jobs.splice(jobs.indexOf(j), 1);
    pump();
    pushJobs();
  });
  pushJobs();
}

function lastError(log) {
  const errs = log.split('\n').filter((l) => l.startsWith('ERROR:'));
  return (errs.pop() || '').replace(/^ERROR:\s*/, '');
}

function handleLine(j, line) {
  // After Pause/Cancel kills the process, its buffered output still arrives; it must not flip the job back to running.
  if (j.status === 'paused' || j.status === 'cancelled') return;
  let m = null;
  try { m = y.parseLine(line); } catch { /* malformed json: treat as log */ }
  if (!m) {
    if (!line.trim()) return;
    j.log = (j.log + line + '\n').slice(-8000);
    // yt-dlp only logs network retries; surface them so a stalled download doesn't look frozen.
    const r = line.match(/Got error: .*Retrying(?: fragment \d+)? \((\d+)\/(\d+)\)/);
    if (r) { j.note = `Connection problem, retrying (${r[1]}/${r[2]})`; pushJobs(); }
    return;
  }
  if (m.type === 'progress') {
    Object.assign(j, { status: 'running', dlStarted: true, stage: null, note: null, done: m.done, total: m.total, speed: m.speed, eta: m.eta, frag: m.frag, frags: m.frags });
    j.pct = m.total ? Math.min(100, (m.done / m.total) * 100) : 0;
  } else if (m.type === 'pp' && !j.dlStarted) {
    // Some post-processors (SponsorBlock) run before the download starts: show them as a stage, not as post-processing.
    j.stage = m.status === 'started' ? m.name : null;
  } else if (m.type === 'pp') {
    if (m.name !== 'MoveFiles') { j.status = 'pp'; j.pp = m.name; j.ppDone = j.ppDone || []; if (m.status === 'finished' && !j.ppDone.includes(m.name)) j.ppDone.push(m.name); }
  } else if (m.type === 'info') {
    const i = m.info;
    Object.assign(j, { title: i.title || j.title, thumb: i.thumbnail || j.thumb, vid: i.id, live: j.live || !!i.is_live });
  } else if (m.type === 'done') {
    addToLibrary(j, m.info);
  }
  pushJobs();
}

// Entries stay in the store when their file disappears (a moved file or unplugged drive can come back);
// the UI and "skip what I already have" only see files that exist right now.
function presentLibrary() { return store.library.filter((x) => fs.existsSync(x.filepath)); }

function addToLibrary(j, i) {
  let size = 0;
  try { size = fs.statSync(i.filepath).size; } catch { /* moved or split */ }
  const audioOnly = !i.vcodec || i.vcodec === 'none';
  const item = {
    id: `${i.id}:${i.filepath}`, vid: i.id, title: i.title, filepath: i.filepath, ext: i.ext, height: i.height, duration: i.duration,
    url: i.webpage_url, thumb: i.thumbnail, uploader: i.uploader, size, added: Date.now(),
    kind: i.section_start != null ? 'clip' : audioOnly ? 'audio' : 'video',
  };
  store.library = store.library.filter((x) => x.id !== item.id);
  store.library.unshift(item);
  save();
  j.files.push(item);
  send('library', presentLibrary());
}

function finish(j) {
  j.status = 'done';
  j.finished = Date.now();
  const sub = j.sub && store.subs.find((s) => s.id === j.sub);
  if (sub) { sub.newCount = (sub.newCount || 0) + j.files.length; save(); send('subs', store.subs); }
  if (j.files.length && (!sub || sub.notify) && Notification.isSupported()) {
    const f = j.files[0];
    const n = new Notification({ title: 'Download finished', body: `${f.title}\n${[f.height && f.height + 'p', f.ext && f.ext.toUpperCase(), fmtBytes(f.size)].filter(Boolean).join(' · ')}`, icon: appIcon() });
    n.on('click', () => shell.showItemInFolder(f.filepath));
    n.show();
  }
}

function fmtBytes(b) {
  if (!b) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(i > 1 ? 1 : 0)} ${u[i]}`;
}

// Kills the whole tree: yt-dlp spawns ffmpeg, which a plain kill() would orphan on Windows.
function killTree(p) {
  if (!p) return;
  if (process.platform === 'win32') execFile('taskkill', ['/pid', String(p.pid), '/T', '/F'], () => {});
  else p.kill('SIGINT');
}

function jobAction(id, action) {
  const j = jobs.find((x) => x.id === id);
  if (!j) return;
  if (action === 'pause' && ['running', 'pp', 'waiting'].includes(j.status)) {
    const p = procs.get(id); j.status = 'paused'; killTree(p);
  } else if (action === 'resume' || action === 'retry') {
    if (j.status === 'paused' || j.status === 'error') j.status = 'waiting'; pump();
  } else if (action === 'start' && j.status === 'waiting') {
    start(j);
  } else if (action === 'cancel' || action === 'remove') {
    const p = procs.get(id);
    if (p) { j.status = 'cancelled'; killTree(p); } else jobs.splice(jobs.indexOf(j), 1);
  } else if (action === 'stop') {
    // shortcut: force-kills a live recording; the .part/fragments stay on disk but are not finalized. Upgrade by sending Ctrl+C to the console group.
    const p = procs.get(id); j.status = 'cancelled'; killTree(p);
  } else if (action === 'up') {
    const i = jobs.indexOf(j), k = jobs.slice(0, i).map((x) => x.status).lastIndexOf('waiting');
    if (k >= 0) { jobs.splice(i, 1); jobs.splice(k, 0, j); }
  }
  pushJobs();
}

function pauseAll() { jobs.filter((j) => ['running', 'pp', 'waiting'].includes(j.status)).forEach((j) => jobAction(j.id, 'pause')); }

// ---------- subscriptions ----------
function checkSub(sub) {
  sub.lastCheck = Date.now();
  save();
  const after = sub.after ? sub.after.replace(/-/g, '') : '';
  enqueue({
    url: sub.url, title: sub.name, thumb: sub.thumb, sub: sub.id, preset: sub.preset,
    opts: { subs: S().subs, thumb: S().thumb, chap: S().chap, sb: sub.sb },
    dir: path.join(S().dir, sub.name.replace(/[\\/:*?"<>|]/g, '_')),
    archive: ARCHIVE,
    matchFilter: sub.skipShorts ? '!is_live & duration>60' : '!is_live',
    breakFilter: after ? `upload_date>=${after}` : '',
  });
}

setInterval(() => {
  for (const s of store.subs) if (s.on && Date.now() - (s.lastCheck || 0) > s.every * 3600e3) checkSub(s);
}, 60e3);

// ---------- clipboard watch ----------
// readText() returns a Promise in this Electron version (a string in older ones); await handles both.
let lastClip = null;
setInterval(async () => {
  const t = String((await clipboard.readText()) ?? '');
  if (lastClip === null || t === lastClip) { lastClip = t; return; } // first read: remember, don't offer
  lastClip = t;
  if (!S().watchClip || !y.isUrl(t) || !Notification.isSupported()) return;
  const n = new Notification({ title: 'Link copied', body: `${t.slice(0, 80)}\nClick to download with your default quality`, icon: appIcon() });
  n.on('click', () => enqueue({ url: t.trim(), preset: '1080', opts: { subs: S().subs, thumb: S().thumb, chap: S().chap } }));
  n.show();
}, 1500);

// ---------- process helpers ----------
function run(bin, args, { timeout = 0 } = {}) {
  return new Promise((resolve) => {
    let out = '', err = '';
    const p = spawn(bin, args, { env: ENV, windowsHide: true });
    const t = timeout && setTimeout(() => killTree(p), timeout);
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => resolve({ code: -1, out, err: e.message }));
    p.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); });
  });
}

// ---------- IPC ----------
const handlers = {
  'state': () => ({ settings: S(), library: presentLibrary(), subs: store.subs, jobs, presets: Object.fromEntries(Object.entries(y.PRESETS).map(([k, v]) => [k, v.label])) }),
  'settings:set': (patch) => setSettings(patch),
  'library': () => presentLibrary(),
  'probe': async (query, extra = []) => {
    const a = y.probeArgs(query, S());
    a.splice(-1, 0, ...extra);
    const r = await run(y.BIN, a);
    if (r.code !== 0) throw new Error(lastError(r.err) || r.err.trim().split('\n').pop() || 'yt-dlp failed');
    return JSON.parse(r.out);
  },
  'enqueue': (specs) => specs.map(enqueue),
  'job': (id, action) => jobAction(id, action),
  'jobs:all': (action) => {
    if (action === 'pause') pauseAll();
    if (action === 'resume') { jobs.filter((j) => j.status === 'paused').forEach((j) => { j.status = 'waiting'; }); pump(); }
    if (action === 'clear') for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].status === 'done') jobs.splice(i, 1);
    pushJobs();
  },
  'library:remove': async (id, trash) => {
    const it = store.library.find((x) => x.id === id);
    if (!it) return presentLibrary();
    if (trash) {
      const { response } = await dialog.showMessageBox(win, { type: 'warning', message: `Move “${it.title}” to the Recycle Bin?`, buttons: ['Move to Recycle Bin', 'Cancel'], defaultId: 1, cancelId: 1 });
      if (response !== 0) return presentLibrary();
      await shell.trashItem(it.filepath).catch(() => {});
    }
    store.library = store.library.filter((x) => x.id !== id);
    save();
    return presentLibrary();
  },
  'subs:save': (sub) => {
    const i = store.subs.findIndex((s) => s.id === sub.id);
    if (i >= 0) store.subs[i] = sub; else store.subs.push(sub);
    save();
    return store.subs;
  },
  'subs:remove': (id) => { store.subs = store.subs.filter((s) => s.id !== id); save(); return store.subs; },
  'subs:check': (id) => { for (const s of store.subs) if ((id ? s.id === id : s.on)) { s.newCount = 0; checkSub(s); } return store.subs; },
  'pickDir': async () => (await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], defaultPath: S().dir })).filePaths[0],
  'readBatch': async () => {
    const f = (await dialog.showOpenDialog(win, { filters: [{ name: 'Text', extensions: ['txt'] }] })).filePaths[0];
    return f ? fs.readFileSync(f, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => y.isUrl(l)) : [];
  },
  'open': (p) => shell.openPath(p),
  'reveal': (p) => shell.showItemInFolder(p),
  'openDir': (p) => { fs.mkdirSync(p, { recursive: true }); return shell.openPath(p); },
  'external': (url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); },
  'copy': (t) => clipboard.writeText(t),
  'tools': async () => {
    const [yd, ff, de, ar] = await Promise.all([run(y.BIN, ['--version']), run('ffmpeg', ['-version']), run('deno', ['--version']), run('aria2c', ['--version'])]);
    return { ytdlp: yd.code === 0 ? yd.out.trim() : null, ffmpeg: ff.code === 0, deno: de.code === 0, aria2: ar.code === 0 };
  },
  'update': async () => {
    const r = await run(y.BIN, ['-U', '--update-to', S().channel], { timeout: 120e3 });
    return (r.out + r.err).trim().split('\n').pop();
  },
  'clearCache': async () => (await run(y.BIN, ['--rm-cache-dir'])).out.trim(),
};

for (const [ch, fn] of Object.entries(handlers)) ipcMain.handle(ch, (_e, ...args) => fn(...args));

app.whenReady().then(() => {
  nativeTheme.themeSource = S().theme;
  nativeTheme.on('updated', () => win && win.setTitleBarOverlay(overlay()));
  createWindow();
  tray = new Tray(appIcon());
  tray.on('click', () => { win.show(); win.focus(); });
  trayMenu();
});
app.on('second-instance', () => { win.show(); win.focus(); });
app.on('before-quit', () => { quitting = true; for (const p of procs.values()) killTree(p); });
app.on('window-all-closed', () => app.quit());
