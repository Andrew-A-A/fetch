/* global api */
// Views render to HTML strings; one delegated listener per event type dispatches data-act / data-set.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bg = (url) => (url ? `background-image:url('${esc(url).replace(/'/g, '%27')}');` : '');

const I = {
  home: '<path d="M2.5 7 8 2.5 13.5 7v6.5h-4v-4h-3v4h-4z"/>',
  queue: '<path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11"/>',
  library: '<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/>',
  subs: '<path d="M3 3a10 10 0 0 1 10 10M3 7a6 6 0 0 1 6 6"/><circle cx="3.5" cy="12.5" r="1" fill="currentColor"/>',
  settings: '<circle cx="8" cy="8" r="2"/><path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M3.6 12.4l1.2-1.2M11.2 4.8l1.2-1.2"/>',
  link: '<path d="M6.5 9.5 9.5 6.5M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1"/>',
  doc: '<path d="M4 2.5h6l2.5 2.5v8.5H4z"/><path d="M6 8h4.5M6 10.5h4.5"/>',
  folder: '<path d="M1.5 4.5a1 1 0 0 1 1-1h3.5l1.5 1.5h6a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  play: '<path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="4" y="3" width="2.6" height="10" rx="1" fill="currentColor" stroke="none"/><rect x="9.4" y="3" width="2.6" height="10" rx="1" fill="currentColor" stroke="none"/>',
  x: '<path d="m4 4 8 8M12 4l-8 8"/>',
  trash: '<path d="M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5l.6 9h5.8l.6-9"/>',
  retry: '<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.5h-2.5"/>',
  up: '<path d="M8 13V3M4 7l4-4 4 4"/>',
  note: '<path d="M6 12V3.5l7-1.5V10.5"/><circle cx="4.5" cy="12" r="1.5"/><circle cx="11.5" cy="10.5" r="1.5"/>',
  lines: '<path d="M4 3.5h8M4 8h8M4 12.5h5"/>',
  list: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>',
  chev: '<path d="m4 6 4 4 4-4"/>',
  warn: '<circle cx="8" cy="8" r="7" fill="currentColor" stroke="none"/><path d="M8 4.5v4.2" stroke="#fff" stroke-width="1.6"/><circle cx="8" cy="11.3" r=".9" fill="#fff" stroke="none"/>',
};
const ic = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

// ---------- formatting ----------
function bytes(b) {
  if (!b) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(i > 1 ? 1 : 0)} ${u[i]}`;
}
function dur(s) {
  if (s == null) return '';
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
}
function ago(t) {
  const m = Math.round((Date.now() - t) / 60e3);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m > 1 ? 's' : ''} ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} hour${h > 1 ? 's' : ''} ago` : `${Math.round(h / 24)} days ago`;
}
const ymd = (d) => (d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : '');
const codec = (c) => { c = (c || '').split('.')[0]; return { avc1: 'H.264', avc3: 'H.264', vp09: 'VP9', vp9: 'VP9', av01: 'AV1', hev1: 'H.265', hvc1: 'H.265', mp4a: 'AAC', opus: 'Opus', mp3: 'MP3', vorbis: 'Vorbis' }[c] || c || '—'; };
const isYT = (u) => /youtu\.?be/.test(u || '');

// ---------- state ----------
const S = {
  view: 'home', search: '', tools: null,
  home: { query: '', info: null, loading: false, error: '', preset: '1080', format: null, merge: null, opts: null, dir: null, noDeno: false, note: '' },
  pl: null,
  fmt: null,
  q: { tab: 'all', details: {} },
  lib: { f: 'all', sort: 'added', list: false, sel: null, menu: null },
  sub: { sel: 0, adding: false, busy: false, error: '' },
  set: { names: true, sb: true, msg: {} },
};

const call = (...a) => api.call(...a);
const setSetting = async (k, v) => { S.settings = await call('settings:set', { [k]: v }); };
const defaultOpts = () => ({ subs: S.settings.subs, thumb: S.settings.thumb, chap: S.settings.chap, meta: S.settings.meta, sb: S.settings.sbMode !== 'off' });

// ---------- shell ----------
const NAV = [['home', 'Home'], ['queue', 'Queue'], ['library', 'Library'], ['subs', 'Subscriptions']];
function renderNav() {
  const n = S.jobs.filter((j) => j.status !== 'done').length;
  const item = ([id, label]) => `<button class="nav${S.view === id ? ' on' : ''}" data-act="go" data-arg="${id}" ${S.view === id ? 'aria-current="page"' : ''}>${ic(id)}<span class="lbl-t">${label}</span>${id === 'queue' && n ? `<span class="badge">${n}</span>` : ''}</button>`;
  $('#nav').innerHTML = NAV.map(item).join('') + '<div style="flex:1"></div>' + item(['settings', 'Settings']);
}
function render() {
  renderNav();
  document.body.classList.toggle('mica', !!S.settings.mica);
  $('#view').innerHTML = VIEWS[S.view]();
  $('#overlay').innerHTML = S.fmt ? formatsDialog() : '';
}
function patch(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

// ---------- Home ----------
function pickFormat(info, preset) {
  const F = info.formats || [];
  const V = F.filter((f) => f.vcodec && f.vcodec !== 'none' && f.height);
  const A = F.filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));
  const lim = { '1080': 1080, '720': 720 }[preset];
  const score = (f) => (f.height || 0) * 1e4 + (f.tbr || 0) + (lim && /^avc/.test(f.vcodec) ? 1e8 : 0);
  let v = null;
  if (preset === 'small') v = V.slice().sort((a, b) => a.height - b.height)[0];
  else if (preset !== 'audio') v = V.filter((f) => !lim || f.height <= lim).sort((a, b) => score(b) - score(a))[0];
  const aPool = preset === 'audio' || lim ? A.filter((f) => f.ext === 'm4a').concat(A) : A;
  const a = v && v.acodec && v.acodec !== 'none' ? null : aPool.slice().sort((x, y) => (preset === 'small' ? x.abr - y.abr : (y.abr || 0) - (x.abr || 0)))[0];
  return { v, a };
}
function estimate(info, preset) {
  if (S.home.format) return `Custom · -f ${S.home.format}${S.home.merge ? ` → ${S.home.merge}` : ''}`;
  if (!info.formats) return 'Size is shown when the download starts';
  const { v, a } = pickFormat(info, preset);
  const size = (f) => (f ? f.filesize || f.filesize_approx || 0 : 0);
  const total = size(v) + size(a);
  const ext = { best: 'MKV', audio: 'M4A' }[preset] || 'MP4';
  const parts = [v && `${codec(v.vcodec)} ${v.height}p${v.dynamic_range && v.dynamic_range !== 'SDR' ? ' ' + v.dynamic_range : ''}`, a && `${codec(a.acodec)}${a.abr ? ' ' + Math.round(a.abr) + ' kbps' : ''}`].filter(Boolean);
  return `${total ? `About ${bytes(total)} · ` : ''}${ext} · ${parts.join(' + ')}`;
}

function homeView() {
  const h = S.home, info = h.info;
  const deno = S.tools && !S.tools.deno && !h.noDeno && isYT(h.query);
  return `<h1>Home</h1>
  <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px">
    <form class="row-c" data-act="fetch" style="gap:8px">
      <label style="flex:1 1 320px;position:relative;display:block"><span class="sr-only">Link or search</span>
        <span style="position:absolute;left:12px;top:12px;color:var(--sec)">${ic('link')}</span>
        <input id="q" class="in" value="${esc(h.query)}" placeholder="Paste a link or type to search" style="width:100%;height:40px;padding-left:38px" autofocus></label>
      <button type="button" class="btn" style="min-height:40px" data-act="batch">${ic('doc')}Batch import</button>
      <button class="btn acc" style="min-height:40px;padding:0 20px" ${h.loading ? 'disabled' : ''}>Fetch</button>
    </form>
    <div class="cap sec">Paste a video, playlist, channel or live link — or type words to search YouTube. Works with 1,800+ sites. <a href="#" data-act="ext" data-arg="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md">See supported sites</a></div>
  </div>
  ${deno ? `<div class="info warn"><span style="color:var(--warn)">${ic('warn')}</span><span class="strong">Some YouTube formats are hidden</span><span style="flex:1 1 260px">A JavaScript runtime (Deno) is needed to unlock every quality level.</span><button class="btn" data-act="ext" data-arg="https://docs.deno.com/runtime/getting_started/installation/">Install Deno</button><button class="btn sub" aria-label="Dismiss" data-act="noDeno">${ic('x', 12)}</button></div>` : ''}
  ${h.error ? `<div class="info err"><span class="strong">Couldn’t fetch that</span><span style="flex:1 1 260px">${esc(h.error)}</span></div>` : ''}
  ${h.note ? `<div class="info note"><span style="flex:1">${esc(h.note)}</span><button class="btn" data-act="go" data-arg="queue">Open queue</button></div>` : ''}
  <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
    ${h.loading ? `<section class="card" style="flex:999 1 520px;padding:20px;display:flex;flex-direction:column;gap:12px"><span class="sec">Reading link…</span><div class="pb ind"><i></i></div></section>` : info ? previewCard(info) : ''}
    <aside id="rail" style="flex:1 1 260px;display:flex;flex-direction:column;gap:12px">${railView()}</aside>
  </div>`;
}

function previewCard(info) {
  const h = S.home, o = h.opts;
  const heights = (info.formats || []).map((f) => f.height || 0);
  const maxH = Math.max(0, ...heights);
  const hdr = (info.formats || []).some((f) => f.dynamic_range && f.dynamic_range !== 'SDR');
  const subN = Object.keys(info.subtitles || {}).filter((k) => k !== 'live_chat').length;
  const chapN = (info.chapters || []).length;
  const chips = [maxH && `Up to ${maxH}p${hdr ? ' HDR' : ''}`, subN && `Subtitles · ${subN} languages`, chapN && `${chapN} chapters`, info.is_live && 'Live now'].filter(Boolean);
  const P = [['best', 'Best'], ['1080', '1080p'], ['720', '720p'], ['small', 'Smallest'], ['audio', 'Audio only']];
  const T = [
    ['subs', 'Subtitles', `${S.settings.subLangs === 'all' ? 'All languages' : S.settings.subLangs} · embedded in the file`],
    ['thumb', 'Cover art', 'Embed the thumbnail'],
    ['chap', 'Chapters and tags', chapN ? `Keep ${chapN} chapter markers` : 'Title, channel, date and chapter markers'],
    ['meta', 'Info file', 'Save title, description and metadata as JSON'],
    ['sb', 'Skip sponsors', S.settings.sbMode === 'mark' ? 'Mark sponsor segments as chapters (SponsorBlock)' : 'Remove sponsor segments (SponsorBlock)'],
  ];
  const date = info.upload_date ? new Date(ymd(info.upload_date)).toLocaleDateString() : '';
  const views = info.view_count ? `${Intl.NumberFormat(undefined, { notation: 'compact' }).format(info.view_count)} views` : '';
  return `<section class="card" aria-label="Preview" style="flex:999 1 520px;min-width:0;padding:20px;display:flex;flex-direction:column;gap:20px">
    <div style="display:flex;gap:20px;flex-wrap:wrap">
      <div class="thumb" style="${bg(info.thumbnail)}flex:0 1 288px;aspect-ratio:16/9;min-width:200px">${info.duration ? `<span class="dur">${dur(info.duration)}</span>` : ''}</div>
      <div style="flex:1 1 260px;display:flex;flex-direction:column;gap:8px;min-width:0">
        <h2>${esc(info.title)}</h2>
        <div class="sec">${esc([info.uploader || info.channel, date, views].filter(Boolean).join(' · '))}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div class="strong">Quality</div>
      <div class="segs" role="group" aria-label="Quality">
        ${P.map(([id, l]) => `<button class="seg${!h.format && h.preset === id ? ' on' : ''}" aria-pressed="${!h.format && h.preset === id}" data-act="preset" data-arg="${id}">${l}</button>`).join('')}
        <button class="seg${h.format ? ' on' : ''}" data-act="openFmt" ${info.formats ? '' : 'disabled'}>Custom…</button>
      </div>
      <div class="cap sec">${esc(estimate(info, h.preset))}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px">
      <div class="strong" style="margin-bottom:4px">Save also</div>
      ${T.map(([id, l, d]) => `<div class="tline"><div class="grow"><div>${l}</div><div class="cap sec">${esc(d)}</div></div>
        <span class="cap sec" style="width:24px;text-align:right">${o[id] ? 'On' : 'Off'}</span>
        <button class="tg${o[id] ? ' on' : ''}" aria-pressed="${!!o[id]}" aria-label="${l}" data-act="opt" data-arg="${id}"><span></span></button></div>`).join('')}
    </div>
    <div class="row-c" style="padding-top:12px;border-top:1px solid var(--stroke)">
      <span class="sec">${ic('folder')}</span><span class="sec">Save to</span>
      <span class="strong ell" style="flex:1 1 160px">${esc(h.dir || S.settings.dir)}</span>
      <button class="btn" data-act="homeDir">Change</button>
      <button class="btn" data-act="download" data-arg="queue">Add to queue</button>
      <button class="btn acc" data-act="download" data-arg="now">${ic('queue')}Download now</button>
    </div>
  </section>`;
}

function railView() {
  const act = S.jobs.filter((j) => ['running', 'pp'].includes(j.status));
  const wait = S.jobs.filter((j) => j.status === 'waiting').length;
  const quick = [['mp3', 'Audio · MP3 320k'], ['1080', 'Video · MP4 1080p'], ['archive', 'Archive · MKV best + subs']];
  return `<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center"><span class="strong" style="flex:1">In progress</span><a class="cap" href="#" data-act="go" data-arg="queue">Open queue</a></div>
      ${act.slice(0, 3).map((j) => `<div style="display:flex;flex-direction:column;gap:6px">
        <div class="cap" style="display:flex;gap:8px"><span class="ell" style="flex:1">${esc(j.title)}</span><span class="sec">${j.status === 'pp' ? esc(ppName(j.pp)) : j.live ? 'REC' : Math.round(j.pct || 0) + '%'}</span></div>
        <div class="pb${j.live || j.status === 'pp' ? ' ind' : ''}"><i style="width:${j.status === 'pp' ? 30 : j.pct || 0}%"></i></div></div>`).join('') || '<div class="cap sec">Nothing downloading</div>'}
      ${act.length > 3 || wait ? `<div class="cap sec">${act.length > 3 ? act.length - 3 + ' more active · ' : ''}${wait} waiting</div>` : ''}
    </div>
    <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px">
      <span class="strong">Quick presets</span>
      ${quick.map(([id, l]) => `<button class="btn" style="justify-content:flex-start" data-act="quick" data-arg="${id}" ${S.home.info ? '' : 'disabled'}>${l}</button>`).join('')}
    </div>`;
}

async function fetchInfo(query) {
  const h = S.home;
  Object.assign(h, { query, loading: true, error: '', info: null, format: null, merge: null, note: '' });
  render();
  try {
    const info = await call('probe', query);
    if (info._type === 'playlist') {
      S.pl = { info, off: {}, order: 'in', preset: '1080', items: '', r: { dateMode: 'any', date: '', min: '', max: '', title: '', skipHave: true, skipLive: true, stop: '', adv: '' } };
      h.loading = false;
      S.view = 'playlist';
    } else {
      Object.assign(h, { info, loading: false, opts: defaultOpts() });
    }
  } catch (e) {
    Object.assign(h, { loading: false, error: String(e.message || e).replace(/^Error invoking remote method 'probe': (Error: )?/, '') });
  }
  render();
}

function homeJob(preset) {
  const h = S.home, i = h.info;
  return { url: i.webpage_url || h.query, title: i.title, thumb: i.thumbnail, live: !!i.is_live, preset: preset || h.preset, format: preset ? null : h.format, merge: preset ? null : h.merge, opts: h.opts, dir: h.dir };
}

// ---------- Playlist ----------
const entryUrl = (e) => e.url || e.webpage_url || (e.ie_key === 'Youtube' ? `https://www.youtube.com/watch?v=${e.id}` : e.id);
function parseRanges(s) {
  const set = new Set();
  for (const part of s.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (m) for (let i = +m[1]; i <= +(m[2] || m[1]); i++) set.add(i);
  }
  return set;
}
function plRows() {
  const p = S.pl, r = p.r, have = new Set(S.library.map((x) => x.vid));
  const terms = r.title.toLowerCase().split(/[\s,]+/).filter(Boolean);
  return (p.info.entries || []).map((e, i) => {
    const n = i + 1, t = (e.title || '').toLowerCase();
    const live = ['is_live', 'is_upcoming'].includes(e.live_status);
    const members = ['subscriber_only', 'premium_only', 'needs_auth'].includes(e.availability);
    const ruled = (r.skipHave && have.has(e.id)) || (r.skipLive && live)
      || (r.min && e.duration != null && e.duration < r.min * 60) || (r.max && e.duration != null && e.duration > r.max * 60)
      || terms.some((w) => (w.startsWith('-') ? w.length > 1 && t.includes(w.slice(1)) : !t.includes(w)));
    const tag = have.has(e.id) ? ['Downloaded', 'ok'] : members ? ['Members only', 'bad'] : live ? ['Live', ''] : null;
    return { e, n, locked: !!ruled, checked: !ruled && !p.off[n], tag };
  });
}
function plSelected() {
  const p = S.pl;
  let sel = plRows().filter((r) => r.checked);
  if (p.order === 'rev') sel.reverse();
  if (p.order === 'shuf') sel = sel.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  return p.r.stop ? sel.slice(0, +p.r.stop) : sel;
}
function playlistView() {
  const p = S.pl, info = p.info, r = p.r, rows = plRows();
  const total = rows.length, sel = plSelected().length;
  const totalDur = rows.reduce((a, x) => a + (x.e.duration || 0), 0);
  const avail = rows.filter((x) => !x.locked);
  const thumb = (e) => (e.thumbnails && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1].url : e.thumbnail);
  const SHOW = 300;
  const tg = (k, l, d) => `<div class="row-c" style="gap:12px"><div class="grow"><div>${l}</div>${d ? `<div class="cap sec">${d}</div>` : ''}</div><button class="tg${r[k] ? ' on' : ''}" aria-pressed="${!!r[k]}" aria-label="${l}" data-act="plTg" data-arg="${k}"><span></span></button></div>`;
  return `<nav aria-label="Breadcrumb" class="row-c" style="gap:8px"><a href="#" data-act="go" data-arg="home">Home</a><span class="sec">›</span><span aria-current="page">${info.extractor_key === 'YoutubeSearch' ? 'Search' : 'Playlist'}</span></nav>
  <div class="card row-c" style="padding:16px 20px;gap:20px">
    <div class="thumb" style="${bg(thumb(info) || (info.entries && info.entries[0] && thumb(info.entries[0])))}width:128px;aspect-ratio:16/9"></div>
    <div class="grow"><h2>${esc(info.title)}</h2>
      <div class="sec">${esc([info.uploader || info.channel, `${total} videos`, totalDur && dur(totalDur)].filter(Boolean).join(' · '))}</div></div>
    <div class="segs" role="group" aria-label="Order">${[['in', 'In order'], ['rev', 'Reverse'], ['shuf', 'Shuffle']].map(([k, l]) => `<button class="seg${p.order === k ? ' on' : ''}" aria-pressed="${p.order === k}" data-act="plOrder" data-arg="${k}">${l}</button>`).join('')}</div>
  </div>
  <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
    <section class="card" aria-label="Videos" style="flex:999 1 520px;min-width:0;padding:8px">
      <div class="row-c" style="padding:8px 12px">
        <label class="row-c" style="gap:14px"><input class="ck" type="checkbox" ${sel && sel === avail.length ? 'checked' : ''} data-act="plAll"><span class="strong">${sel} of ${total} selected</span></label>
        <div style="flex:1"></div>
        <label class="row-c" style="gap:8px"><span class="cap sec">Items</span><input class="in" value="${esc(p.items)}" placeholder="e.g. 1-8,10" data-change="plItems" style="width:120px"></label>
      </div>
      ${rows.slice(0, SHOW).map((x) => `<label class="prow">
        <input class="ck" type="checkbox" ${x.checked ? 'checked' : ''} ${x.locked ? 'disabled' : ''} data-act="plRow" data-arg="${x.n}">
        <span class="cap sec" style="width:28px;text-align:right">${x.n}</span>
        <span class="th" style="${bg(thumb(x.e))}">${x.e.duration ? `<span class="dur">${dur(x.e.duration)}</span>` : ''}</span>
        <span class="grow" style="display:flex;flex-direction:column"><span class="ell">${esc(x.e.title || x.e.id)}</span><span class="cap sec">${esc([x.e.channel || x.e.uploader, x.e.upload_date && ymd(x.e.upload_date)].filter(Boolean).join(' · '))}</span></span>
        ${x.tag ? `<span class="chip ${x.tag[1]}">${x.tag[0]}</span>` : ''}
      </label>`).join('')}
      ${total > SHOW ? `<div class="cap sec" style="padding:8px 12px">Showing ${SHOW} of ${total} · use Items to pick beyond these</div>` : ''}
    </section>
    <aside class="card" aria-label="Rules" style="flex:1 1 280px;padding:16px;display:flex;flex-direction:column;gap:14px">
      <div class="row-c"><span class="strong grow">Rules</span><button class="btn sub cap" data-act="plReset">Reset</button></div>
      <label class="lbl"><span class="cap">Uploaded</span><span class="row-c" style="gap:8px">
        <select class="in" data-change="plR" data-arg="dateMode">${[['any', 'Any time'], ['after', 'After'], ['before', 'Before'], ['on', 'On']].map(([k, l]) => `<option value="${k}" ${r.dateMode === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input class="in grow" type="date" value="${esc(r.date)}" data-change="plR" data-arg="date" ${r.dateMode === 'any' ? 'disabled' : ''}></span></label>
      <div class="lbl"><span class="cap">Length (minutes)</span><span class="row-c" style="gap:8px">
        <input class="in" style="width:80px" type="number" min="0" aria-label="Minimum length" placeholder="0" value="${esc(r.min)}" data-change="plR" data-arg="min"><span class="sec">to</span>
        <input class="in" style="width:100px" type="number" min="0" aria-label="Maximum length" placeholder="No limit" value="${esc(r.max)}" data-change="plR" data-arg="max"></span></div>
      <label class="lbl"><span class="cap">Title contains</span><input class="in" placeholder="e.g. tutorial, -shorts" value="${esc(r.title)}" data-change="plR" data-arg="title"></label>
      ${tg('skipHave', 'Skip what I already have', 'Uses your library')}
      ${tg('skipLive', 'Skip live and upcoming')}
      <label class="row-c" style="gap:8px"><span class="grow">Stop after</span><input class="in" type="number" min="1" style="width:80px" placeholder="All" value="${esc(r.stop)}" data-change="plR" data-arg="stop"><span class="sec">videos</span></label>
      <details ${r.adv ? 'open' : ''}><summary>Advanced filter</summary><input class="in mono" style="width:100%;margin-top:8px" placeholder="like_count>?100 & !is_live" value="${esc(r.adv)}" data-change="plR" data-arg="adv"></details>
      ${r.dateMode !== 'any' ? '<div class="cap sec">Dates are checked as each video downloads.</div>' : ''}
    </aside>
  </div>
  <div class="row-c">
    <label class="row-c" style="gap:8px"><span class="sec">Quality</span><select class="in" data-change="plPreset">${Object.entries(S.presets).map(([k, l]) => `<option value="${k}" ${p.preset === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div style="flex:1"></div>
    <button class="btn" data-act="go" data-arg="home">Cancel</button>
    <button class="btn acc" data-act="plAdd" ${sel ? '' : 'disabled'}>Add ${sel} to queue</button>
  </div>`;
}

// ---------- Formats dialog ----------
function fmtLists() {
  const F = S.home.info.formats || [];
  const V = F.filter((f) => f.vcodec && f.vcodec !== 'none').sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0));
  const A = F.filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none')).sort((a, b) => (b.abr || 0) - (a.abr || 0));
  return { V, A };
}
function formatsDialog() {
  const f = S.fmt, { V, A } = fmtLists();
  const size = (x) => bytes(x.filesize || x.filesize_approx) || '—';
  const cv = V.find((x) => x.format_id === f.v), ca = A.find((x) => x.format_id === f.a);
  const fstr = f.tab === 'str' ? f.str : [cv && cv.format_id, ca && ca.format_id].filter(Boolean).join('+');
  const summary = f.tab === 'str' ? 'Custom format string' : [cv && `${cv.height || '?'}p ${codec(cv.vcodec)}`, ca && `${codec(ca.acodec)} ${ca.abr ? Math.round(ca.abr) + ' kbps' : ''}`].filter(Boolean).join(' + ') + ` → ${f.merge}${cv || ca ? ` · about ${bytes((cv ? cv.filesize || cv.filesize_approx || 0 : 0) + (ca ? ca.filesize || ca.filesize_approx || 0 : 0)) || '?'}` : ''}`;
  const rad = (on) => `<span class="rad${on ? ' on' : ''}"></span>`;
  return `<div class="dlg w" role="dialog" aria-modal="true" aria-labelledby="dlg-t">
    <div class="dlg-b">
      <h2 id="dlg-t">Choose formats</h2>
      <div class="sec">Pick one video and one audio stream. They are merged into a single file after download.</div>
      <div role="tablist">${[['streams', 'Streams'], ['str', 'Format string']].map(([k, l]) => `<button class="pv${f.tab === k ? ' on' : ''}" role="tab" aria-selected="${f.tab === k}" data-act="fmtTab" data-arg="${k}">${l}</button>`).join('')}</div>
      ${f.tab === 'str' ? `<label class="lbl"><span class="cap">yt-dlp format selector</span><input class="in mono" value="${esc(f.str)}" data-change="fmtStr" placeholder="bv*[height<=1440]+ba/b"></label>
        <div class="cap sec">See <a href="#" data-act="ext" data-arg="https://github.com/yt-dlp/yt-dlp#format-selection">format selection</a> for the syntax.</div>` : `
      <span class="strong">Video</span>
      <div class="tscroll"><table class="tbl"><thead><tr><th><span class="sr-only">Selected</span></th><th>Resolution</th><th>FPS</th><th>Codec</th><th>HDR</th><th>Bitrate</th><th>Size</th><th>Container</th><th>ID</th></tr></thead><tbody>
        ${V.map((x) => `<tr class="${x.format_id === f.v ? 'sel' : ''}" data-act="fmtV" data-arg="${esc(x.format_id)}"><td>${rad(x.format_id === f.v)}</td><td class="strong">${x.width && x.height ? `${x.width}×${x.height}` : esc(x.resolution || '')}</td><td>${x.fps || '—'}</td><td>${codec(x.vcodec)}</td><td>${x.dynamic_range && x.dynamic_range !== 'SDR' ? esc(x.dynamic_range) : '—'}</td><td>${x.tbr ? (x.tbr / 1000).toFixed(1) + ' Mbps' : '—'}</td><td>${size(x)}</td><td>${esc((x.ext || '').toUpperCase())}</td><td class="sec mono">${esc(x.format_id)}</td></tr>`).join('')}
      </tbody></table></div>
      <span class="strong">Audio</span>
      <div class="tscroll"><table class="tbl"><thead><tr><th><span class="sr-only">Selected</span></th><th>Codec</th><th>Bitrate</th><th>Channels</th><th>Language</th><th>Size</th><th>Container</th><th>ID</th></tr></thead><tbody>
        <tr class="${!f.a ? 'sel' : ''}" data-act="fmtA" data-arg=""><td>${rad(!f.a)}</td><td colspan="7" class="sec">No separate audio</td></tr>
        ${A.map((x) => `<tr class="${x.format_id === f.a ? 'sel' : ''}" data-act="fmtA" data-arg="${esc(x.format_id)}"><td>${rad(x.format_id === f.a)}</td><td class="strong">${codec(x.acodec)}</td><td>${x.abr ? Math.round(x.abr) + ' kbps' : '—'}</td><td>${x.audio_channels === 2 ? 'Stereo' : x.audio_channels || '—'}</td><td>${esc(x.language || '—')}${x.format_note && /original|dubbed/i.test(x.format_note) ? ` (${esc(x.format_note.match(/original|dubbed/i)[0])})` : ''}</td><td>${size(x)}</td><td>${esc((x.ext || '').toUpperCase())}</td><td class="sec mono">${esc(x.format_id)}</td></tr>`).join('')}
      </tbody></table></div>`}
      <div class="row-c" style="padding-top:8px">
        <div class="grow"><div class="cap sec">Result</div><div class="strong">${esc(summary)}</div><div class="cap sec mono">-f ${esc(fstr)}</div></div>
        <label class="row-c" style="gap:8px"><span class="cap">Merge as</span><select class="in" data-change="fmtMerge">${['MP4', 'MKV', 'WebM', 'MOV'].map((m) => `<option ${f.merge === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      </div>
    </div>
    <div class="dlg-f"><button class="btn acc" data-act="fmtUse" ${fstr ? '' : 'disabled'}>Use these formats</button><button class="btn" data-act="fmtClose">Cancel</button></div>
  </div>`;
}

// ---------- Queue ----------
const Q_TABS = [['all', 'All', () => true], ['active', 'Active', (j) => ['running', 'pp', 'paused'].includes(j.status)], ['wait', 'Waiting', (j) => j.status === 'waiting'], ['done', 'Finished', (j) => j.status === 'done'], ['err', 'Needs attention', (j) => j.status === 'error']];
const matches = (t) => !S.search || (t || '').toLowerCase().includes(S.search.toLowerCase());
const PP = { Merger: 'Merging', FFmpegMerger: 'Merging', EmbedSubtitle: 'Embedding subtitles', FFmpegEmbedSubtitle: 'Embedding subtitles', EmbedThumbnail: 'Embedding cover art', Metadata: 'Writing tags', FFmpegMetadata: 'Writing tags', SponsorBlock: 'Skip sponsors', ModifyChapters: 'Cutting segments', ExtractAudio: 'Extracting audio', FFmpegExtractAudio: 'Extracting audio', FFmpegVideoConvertor: 'Converting', FFmpegFixupM3u8: 'Fixing up', FFmpegSplitByChapters: 'Splitting by chapters' };
const ppName = (n) => PP[n] || n || 'Processing';

function queueView() {
  const speed = S.jobs.filter((j) => j.status === 'running' && j.speed).reduce((a, j) => a + j.speed, 0);
  const opt = (k, vals, cur) => vals.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`).join('');
  return `<div class="row-c"><h1 class="grow">Queue</h1><span class="sec" id="qspeed">${speed ? 'Total ' + bytes(speed) + '/s' : ''}</span></div>
  <div role="toolbar" aria-label="Queue actions" class="row-c" style="gap:4px">
    <button class="btn acc" data-act="go" data-arg="home">${ic('plus', 14)}Add</button>
    <button class="btn sub" data-act="all" data-arg="resume">${ic('play', 14)}Resume all</button>
    <button class="btn sub" data-act="all" data-arg="pause">${ic('pause', 14)}Pause all</button>
    <button class="btn sub" data-act="all" data-arg="clear">${ic('trash', 14)}Clear finished</button>
    <div style="width:1px;height:24px;background:var(--div);margin:0 8px"></div>
    <label class="row-c" style="gap:8px"><span class="cap">At once</span><select class="in" data-set="concurrent">${opt('c', [1, 2, 3, 4, 6].map((n) => [n, n]), S.settings.concurrent)}</select></label>
    <label class="row-c" style="gap:8px"><span class="cap">Speed limit</span><select class="in" data-set="limit">${opt('l', [['', 'No limit'], ['10M', '10 MB/s'], ['5M', '5 MB/s'], ['1M', '1 MB/s']], S.settings.limit)}</select></label>
  </div>
  <div role="tablist" aria-label="Filter" id="qtabs">${qTabs()}</div>
  <div class="card" id="qlist">${qList()}</div>`;
}
function qTabs() {
  return Q_TABS.map(([k, l, f]) => `<button class="pv${S.q.tab === k ? ' on' : ''}" role="tab" aria-selected="${S.q.tab === k}" data-act="qtab" data-arg="${k}">${l} (${S.jobs.filter(f).length})</button>`).join('');
}
function qList() {
  const f = Q_TABS.find((t) => t[0] === S.q.tab)[2];
  const list = S.jobs.filter((j) => f(j) && matches(j.title));
  return list.map(jobItem).join('') || `<div class="it sec">${S.jobs.length ? 'Nothing here' : 'The queue is empty. Paste a link on Home to start.'}</div>`;
}
function jobItem(j) {
  const th = `<div class="th" style="${bg(j.thumb)}">${j.live ? '<span class="live">LIVE</span>' : ''}</div>`;
  const btn = (act, label, icon, extra = '') => `<button class="btn sub ib" aria-label="${label}" title="${label}" data-act="job" data-arg="${act}" data-id="${j.id}" ${extra}>${ic(icon)}</button>`;
  const head = (meta) => `<div class="row-c" style="gap:8px"><span class="strong ell grow">${esc(j.title)}</span><span class="cap sec">${esc(meta || '')}</span></div>`;
  const label = j.format ? `-f ${j.format}` : S.presets[j.preset] || '';
  let body = '', side = '';
  if (j.status === 'running' && j.live) {
    body = `${head('Recording from start')}<div class="pb ind"><i></i></div><div class="cap sec">Recording · ${bytes(j.done)} so far${j.speed ? ' · ' + bytes(j.speed) + '/s' : ''}</div>`;
    side = `<button class="btn" data-act="job" data-arg="stop" data-id="${j.id}">Stop</button>`;
  } else if (j.status === 'running' || j.status === 'paused') {
    const p = j.status === 'paused';
    const line = p ? `Paused · ${bytes(j.done) || '0 B'}${j.total ? ' of ' + bytes(j.total) : ''} · resumes where it left off`
      : [j.total ? `${bytes(j.done)} of ${bytes(j.total)}` : 'Starting…', j.speed && `${bytes(j.speed)}/s`, j.eta != null && `${dur(j.eta)} left`, j.frags && `fragment ${j.frag} of ${j.frags}`].filter(Boolean).join(' · ');
    body = `${head(label)}<div class="pb${p ? ' paused' : ''}"><i style="width:${j.pct || 0}%"></i></div><div class="cap sec">${esc(line)}</div>`;
    side = btn(p ? 'resume' : 'pause', p ? 'Resume' : 'Pause', p ? 'play' : 'pause') + btn('cancel', 'Cancel', 'x');
  } else if (j.status === 'pp') {
    const done = j.ppDone || [];
    body = `${head(label)}<div class="row-c" style="gap:16px">${done.filter((n) => n !== j.pp).map((n) => `<span class="step"><span class="dot ok"></span>${esc(ppName(n))}</span>`).join('')}<span class="step"><span class="dot"></span>${esc(ppName(j.pp))}</span></div><div class="pb ind"><i></i></div>`;
    side = btn('cancel', 'Cancel', 'x');
  } else if (j.status === 'error') {
    const auth = /sign in|members|login|cookies|private|age/i.test(j.error || '');
    const open = S.q.details[j.id];
    body = `${head(j.sub ? 'Subscription' : label)}<div class="info err" style="margin-top:6px"><span class="strong">${auth ? 'Sign-in needed' : 'Download failed'}</span><span style="flex:1 1 260px">${esc(j.error)}</span>
      ${auth ? `<button class="btn acc" data-act="useCookies" data-id="${j.id}">Use ${esc(cookieName())} sign-in</button>` : ''}<button class="btn" data-act="details" data-id="${j.id}">${open ? 'Hide details' : 'Details'}</button>
      ${open ? `<pre class="log mono">${esc(j.log)}</pre>` : ''}</div>`;
    side = btn('retry', 'Retry', 'retry') + btn('remove', 'Remove', 'trash');
  } else if (j.status === 'waiting') {
    body = `<div class="strong ell">${esc(j.title)}</div><div class="cap sec">Waiting · starts when a slot is free · ${esc(label)}</div>`;
    side = btn('up', 'Move up', 'up') + btn('start', 'Start now', 'play') + btn('remove', 'Remove', 'trash');
  } else if (j.status === 'done') {
    const f = j.files[0];
    const n = j.files.length;
    body = `<div class="strong ell">${esc(j.title)}</div><div class="cap row-c" style="gap:6px"><span class="dot ok"></span>${n ? `Saved · ${n > 1 ? n + ' files' : [bytes(f.size), (f.ext || '').toUpperCase()].filter(Boolean).join(' · ')}` : 'Nothing new'} · ${ago(j.finished)}</div>`;
    side = n ? `<button class="btn" data-act="open" data-arg="${esc(f.filepath)}">Play</button><button class="btn sub" data-act="reveal" data-arg="${esc(f.filepath)}">Show in folder</button>` : btn('remove', 'Remove', 'trash');
  }
  return `<div class="it">${th}<div class="grow" style="display:flex;flex-direction:column;gap:6px">${body}</div><div class="row-c" style="gap:4px;flex-wrap:nowrap">${side}</div></div>`;
}
const cookieName = () => ({ edge: 'Edge', chrome: 'Chrome', firefox: 'Firefox', brave: 'Brave' }[S.settings.cookies || 'edge']);

// ---------- Library ----------
function libItems() {
  const l = S.lib;
  const items = S.library.filter((x) => (l.f === 'all' || x.kind === l.f) && matches(x.title));
  const by = { added: (a, b) => b.added - a.added, title: (a, b) => a.title.localeCompare(b.title), size: (a, b) => b.size - a.size, channel: (a, b) => (a.uploader || '').localeCompare(b.uploader || '') }[l.sort];
  return items.sort(by);
}
function libraryView() {
  const l = S.lib, items = libItems();
  const total = S.library.reduce((a, x) => a + (x.size || 0), 0);
  const meta = (x) => [x.kind === 'audio' ? (x.ext || '').toUpperCase() : [(x.ext || '').toUpperCase(), x.height && x.height + 'p'].filter(Boolean).join(' · '), bytes(x.size)].filter(Boolean).join(' · ');
  return `<div class="row-c"><h1 class="grow">Library</h1><span class="sec">${S.library.length} item${S.library.length === 1 ? '' : 's'} ·${bytes(total) || '0 B'}</span><button class="btn" data-act="openDir">${ic('folder')}Open folder</button></div>
  <div class="row-c" style="gap:8px">
    <div role="group" aria-label="Type" class="row-c" style="gap:6px">${[['all', 'All'], ['video', 'Video'], ['audio', 'Audio'], ['clip', 'Clips']].map(([k, t]) => `<button class="fc${l.f === k ? ' on' : ''}" aria-pressed="${l.f === k}" data-act="libF" data-arg="${k}">${t}</button>`).join('')}</div>
    <div style="flex:1"></div>
    <label class="row-c" style="gap:8px"><span class="cap">Sort</span><select class="in" data-change="libSort">${[['added', 'Date added'], ['title', 'Title'], ['size', 'Size'], ['channel', 'Channel']].map(([k, t]) => `<option value="${k}" ${l.sort === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <div class="segs" role="group" aria-label="View">
      <button class="seg${l.list ? '' : ' on'}" aria-pressed="${!l.list}" aria-label="Grid view" style="padding:5px 10px" data-act="libList" data-arg="">${ic('library', 14)}</button>
      <button class="seg${l.list ? ' on' : ''}" aria-pressed="${l.list}" aria-label="List view" style="padding:5px 10px" data-act="libList" data-arg="1">${ic('list', 14)}</button>
    </div>
  </div>
  ${items.length ? `<div class="grid${l.list ? ' list' : ''}">${items.map((x) => `<button class="gi${l.sel === x.id ? ' sel' : ''}" data-act="libSel" data-id="${esc(x.id)}" data-dbl="libPlay">
      <span class="thumb" style="${bg(x.thumb)}">${x.kind === 'audio' && !x.thumb ? ic('note', 28) : ''}${x.duration ? `<span class="dur">${dur(x.duration)}</span>` : ''}</span>
      <span style="display:flex;flex-direction:column;gap:2px;padding:0 2px;min-width:0"><span class="ell">${esc(x.title)}</span><span class="cap sec">${esc(meta(x))}</span></span>
    </button>`).join('')}</div>` : `<div class="sec">${S.library.length ? 'No matches.' : 'Finished downloads show up here.'}</div>`}
  ${l.menu ? libMenu() : ''}`;
}
function libMenu() {
  const m = S.lib.menu;
  const mi = (act, icon, label, kb = '', cls = '') => `<button class="mi ${cls}" role="menuitem" data-act="${act}">${ic(icon)}${label}${kb ? `<span class="kb">${kb}</span>` : ''}</button>`;
  return `<div class="menu" role="menu" aria-label="Item actions" style="left:${Math.min(m.x, innerWidth - 312)}px;top:${Math.min(m.y, innerHeight - 290)}px">
    ${mi('libPlay', 'play', 'Play', 'Enter')}${mi('libReveal', 'folder', 'Show in folder')}${mi('libCopy', 'link', 'Copy source link', 'Ctrl+C')}
    <div class="msep"></div>
    ${mi('libAgain', 'retry', 'Download again in another quality')}${mi('libMp3', 'note', 'Save audio as MP3')}${mi('libSplit', 'lines', 'Split by chapters')}
    <div class="msep"></div>
    ${mi('libDelete', 'trash', 'Delete file', 'Del', 'danger')}
  </div>`;
}
const libCur = () => S.library.find((x) => x.id === S.lib.sel);

// ---------- Subscriptions ----------
function subsView() {
  const s = S.sub, subs = S.subs.filter((x) => matches(x.name));
  const cur = S.subs[s.sel];
  const next = S.subs.filter((x) => x.on).map((x) => (x.lastCheck || 0) + x.every * 3600e3 - Date.now());
  const mins = next.length ? Math.max(0, Math.round(Math.min(...next) / 60e3)) : 0;
  const nextTxt = next.length ? `Next check in ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}.` : 'No active subscriptions.';
  return `<div class="row-c"><h1 class="grow">Subscriptions</h1><button class="btn" data-act="subCheckAll">Check all now</button><button class="btn acc" data-act="subAdding">${ic('plus', 14)}Add channel or playlist</button></div>
  ${s.adding ? `<form class="card row-c" style="padding:12px 16px" data-act="subAdd"><input id="subUrl" class="in grow" placeholder="Channel or playlist link" autofocus><button class="btn acc" ${s.busy ? 'disabled' : ''}>${s.busy ? 'Reading…' : 'Subscribe'}</button><button type="button" class="btn" data-act="subAdding">Cancel</button></form>` : ''}
  ${s.error ? `<div class="info err">${esc(s.error)}</div>` : ''}
  <div class="info note"><span style="flex:1 1 300px">New videos download automatically while Fetch is running. Anything already downloaded is skipped. ${nextTxt}</span>
    <label class="row-c" style="gap:8px"><span class="cap">Run in background</span><button class="tg${S.settings.bg ? ' on' : ''}" aria-pressed="${S.settings.bg}" aria-label="Run in background" data-act="tgSet" data-arg="bg"><span></span></button></label></div>
  ${S.subs.length ? `<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start">
    <section class="card" aria-label="Subscriptions" style="flex:999 1 420px;padding:6px;display:flex;flex-direction:column;gap:2px">
      ${subs.map((x) => { const i = S.subs.indexOf(x); return `<button class="sr${i === s.sel ? ' sel' : ''}" aria-pressed="${i === s.sel}" data-act="subSel" data-arg="${i}">
        <span class="av" style="${bg(x.thumb)}">${x.thumb ? '' : esc(x.name.slice(0, 2).toUpperCase())}</span>
        <span class="grow" style="display:flex;flex-direction:column"><span><span class="strong">${esc(x.name)}</span>${x.on && x.newCount ? `<span class="nb">${x.newCount} new</span>` : ''}</span>
        <span class="cap sec">${esc(x.kind)} · ${x.on ? (x.lastCheck ? 'checked ' + ago(x.lastCheck) : 'not checked yet') : 'paused'}</span></span>
        <span class="cap sec">${esc(S.presets[x.preset])}</span></button>`; }).join('')}
    </section>
    ${cur ? subDetails(cur) : ''}
  </div>` : ''}`;
}
function subDetails(c) {
  const tg = (k, l) => `<div class="row-c"><span class="grow">${l}</span><button class="tg${c[k] ? ' on' : ''}" aria-pressed="${!!c[k]}" aria-label="${l}" data-act="subTg" data-arg="${k}"><span></span></button></div>`;
  return `<aside class="card" aria-label="Subscription details" style="flex:1 1 300px;padding:16px;display:flex;flex-direction:column;gap:14px">
    <div class="row-c"><span class="av" style="${bg(c.thumb)}">${c.thumb ? '' : esc(c.name.slice(0, 2).toUpperCase())}</span><div class="grow"><div class="strong">${esc(c.name)}</div><div class="cap sec">${esc(c.kind)}</div></div>${tg('on', 'Subscription on').replace('<span class="grow">Subscription on</span>', '')}</div>
    <label class="lbl"><span class="cap">Check every</span><select class="in" data-change="subField" data-arg="every">${[[1, '1 hour'], [6, '6 hours'], [12, '12 hours'], [24, 'Day'], [168, 'Week']].map(([v, l]) => `<option value="${v}" ${+c.every === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="lbl"><span class="cap">Download as</span><select class="in" data-change="subField" data-arg="preset">${Object.entries(S.presets).map(([k, l]) => `<option value="${k}" ${c.preset === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="lbl"><span class="cap">Only videos uploaded after</span><input class="in" type="date" value="${esc(c.after)}" data-change="subField" data-arg="after"></label>
    ${tg('skipShorts', 'Skip Shorts (under 1 min)')}${tg('sb', 'Remove sponsor segments')}${tg('notify', 'Notify me when done')}
    <div class="cap sec">Saves to ${esc(S.settings.dir)}\\${esc(c.name)}</div>
    <div class="row-c" style="gap:8px"><button class="btn" data-act="subCheck">Check now</button><button class="btn" data-act="subRemove">Unsubscribe</button></div>
  </aside>`;
}

// ---------- Settings ----------
const TPL = '%(uploader)s/%(title)s [%(id)s].%(ext)s';
function settingsView() {
  const st = S.settings, t = S.tools || {}, m = S.set.msg;
  const tg = (k, label) => `<button class="tg${st[k] ? ' on' : ''}" aria-pressed="${!!st[k]}" aria-label="${label}" data-act="tgSet" data-arg="${k}"><span></span></button>`;
  const sel = (k, opts, label) => `<select class="in" data-set="${k}" aria-label="${label}">${opts.map(([v, l]) => `<option value="${v}" ${String(st[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const sc = (title, desc, ctrl) => `<div class="sc"><div class="sct"><span>${title}</span>${desc ? `<span class="cap sec">${desc}</span>` : ''}</div>${ctrl}</div>`;
  const ex = (key, title, desc, inner) => `<div class="ex"><button class="exb" aria-expanded="${S.set[key]}" data-act="setEx" data-arg="${key}"><span class="sct"><span>${title}</span><span class="cap sec">${desc}</span></span>${ic('chev')}</button>${S.set[key] ? `<div class="exc">${inner}</div>` : ''}</div>`;
  const status = (ok, yes, no) => (t.ytdlp === undefined ? '<span class="cap sec">Checking…</span>' : ok ? `<span class="ok">${yes}</span>` : `<span class="bad">${no}</span>`);
  const V = { uploader: 'Workshop Channel', 'upload_date>%Y': '2026', upload_date: '20261101', title: 'Building a Mechanical Keyboard', id: 'dQw4w9WgXcQ', ext: 'mkv', height: '2160', playlist_index: '07', playlist: 'Synth DIY', channel: 'Workshop Channel' };
  const preview = `${st.dir}\\${st.tpl.replace(/%\(([^)]+)\)s/g, (_, k) => V[k] ?? 'NA').split('/').join('\\')}`;
  const F = [['Title', 'title'], ['Channel', 'uploader'], ['Year', 'upload_date>%Y'], ['Date', 'upload_date'], ['Video ID', 'id'], ['Resolution', 'height'], ['Playlist', 'playlist'], ['Playlist number', 'playlist_index']];
  const cats = [['sponsor', 'Sponsor'], ['selfpromo', 'Self-promotion'], ['interaction', 'Interaction reminder'], ['intro', 'Intro'], ['outro', 'Outro'], ['filler', 'Filler']];
  return `<h1>Settings</h1>
  <div class="cols"><div>
    <div class="gh">Appearance</div><div class="grp">
      ${sc('Theme', 'Follows your Windows setting by default', `<div class="segs" role="group" aria-label="Theme">${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button class="seg${st.theme === k ? ' on' : ''}" aria-pressed="${st.theme === k}" data-act="theme" data-arg="${k}">${l}</button>`).join('')}</div>`)}
      ${sc('Transparency effects', 'Mica window background', tg('mica', 'Transparency effects'))}
    </div>
    <div class="gh">Downloads</div><div class="grp">
      ${sc('Save downloads to', esc(st.dir), '<button class="btn" data-act="pickDir">Browse</button>')}
      ${sc('Downloads at the same time', 'Parts of one video also download in parallel', sel('concurrent', [1, 2, 3, 4, 6].map((n) => [n, n]), 'Downloads at the same time'))}
      ${sc('Speed limit', '', sel('limit', [['', 'No limit'], ['10M', '10 MB/s'], ['5M', '5 MB/s'], ['1M', '1 MB/s']], 'Speed limit'))}
      ${sc('If the file already exists', '', sel('exists', [['skip', 'Skip it'], ['replace', 'Replace it']], 'If the file already exists'))}
    </div>
    <div class="gh">File names</div><div class="grp">
      ${ex('names', 'Name template', 'How files and folders are named', `
        <div role="group" aria-label="Insert field" class="row-c" style="gap:6px">${F.map(([l, k]) => `<button class="fchip" data-act="tplAdd" data-arg="${esc(k)}">+ ${l}</button>`).join('')}</div>
        <label class="lbl"><span class="cap">Template</span><input class="in mono" value="${esc(st.tpl)}" data-set="tpl"></label>
        <div><div class="cap sec">Preview</div><div class="mono" style="word-break:break-all">${esc(preview)}</div></div>
        <div class="row-c"><button class="btn" data-act="tplReset">Reset</button><span class="grow"></span><label class="ck2"><input class="ck" type="checkbox" ${st.winSafe ? 'checked' : ''} data-act="tgSet" data-arg="winSafe">Windows-safe names</label></div>`)}
    </div>
    <div class="gh">Network</div><div class="grp">
      ${sc('Proxy', 'HTTP, HTTPS or SOCKS', `<input class="in" placeholder="socks5://127.0.0.1:1080" aria-label="Proxy address" value="${esc(st.proxy)}" data-set="proxy">`)}
      ${sc('Look like a regular browser', 'Helps on sites with bot checks (needs curl_cffi in yt-dlp)', tg('impersonate', 'Look like a regular browser'))}
      ${sc('Work around region locks', 'Sends a fake forwarded-for address', tg('geo', 'Work around region locks'))}
    </div>
  </div><div>
    <div class="gh">Components and updates</div><div class="grp">
      ${sc('yt-dlp engine', status(t.ytdlp, `Version ${esc(t.ytdlp)}`, 'Not found — install yt-dlp and add it to PATH') + (m.update ? `<span class="cap sec">${esc(m.update)}</span>` : ''), `${sel('channel', [['stable', 'Stable'], ['nightly', 'Nightly'], ['master', 'Master']], 'Update channel')}<button class="btn" data-act="update">Check for updates</button>`)}
      ${sc('FFmpeg', 'Needed to merge, convert and embed', status(t.ffmpeg, 'Found', 'Not found') + (t.ffmpeg === false ? '<button class="btn acc" data-act="ext" data-arg="https://ffmpeg.org/download.html">Get FFmpeg</button>' : ''))}
      ${sc('Deno (JavaScript runtime)', 'Unlocks every YouTube quality', status(t.deno, 'Found', 'Not found') + (t.deno === false ? '<button class="btn acc" data-act="ext" data-arg="https://docs.deno.com/runtime/getting_started/installation/">Install</button>' : ''))}
      ${sc('aria2 (optional)', 'Faster downloads on some sites', t.aria2 ? tg('aria2', 'Use aria2') : '<button class="btn" data-act="ext" data-arg="https://aria2.github.io/">Get aria2</button>')}
    </div>
    <div class="gh">After download</div><div class="grp">
      ${sc('Subtitles', 'Embed into the file', sel('subLangs', [['en.*', 'English'], ['en.*,ar.*', 'English, Arabic'], ['all', 'All available']], 'Subtitle languages') + tg('subs', 'Subtitles'))}
      ${sc('Cover art', 'Embed the thumbnail', tg('thumb', 'Cover art'))}
      ${sc('Tags and chapters', 'Title, channel, date and chapter markers', tg('chap', 'Tags and chapters'))}
      ${ex('sb', 'SponsorBlock', 'Community-marked segments on YouTube', `
        <div class="segs" role="group" aria-label="SponsorBlock mode">${[['off', 'Off'], ['mark', 'Mark as chapters'], ['remove', 'Cut out']].map(([k, l]) => `<button class="seg${st.sbMode === k ? ' on' : ''}" aria-pressed="${st.sbMode === k}" data-act="sbMode" data-arg="${k}">${l}</button>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${cats.map(([k, l]) => `<label class="ck2"><input class="ck" type="checkbox" ${st.sbCats.includes(k) ? 'checked' : ''} data-act="sbCat" data-arg="${k}">${l}</label>`).join('')}</div>`)}
    </div>
    <div class="gh">Accounts and sign-in</div><div class="grp">
      ${sc('Use sign-in from my browser', 'For private, members-only and age-restricted videos', sel('cookies', [['', 'Off'], ['edge', 'Microsoft Edge'], ['chrome', 'Chrome'], ['firefox', 'Firefox'], ['brave', 'Brave']], 'Browser'))}
    </div>
    <div class="gh">Advanced</div><div class="grp">
      ${sc('Extra yt-dlp options', 'Added to every download', `<input class="in mono" value="${esc(st.extra)}" placeholder="--embed-metadata" aria-label="Extra options" data-set="extra">`)}
      ${sc('Clear cache', m.cache ? esc(m.cache) : 'Fixes some YouTube errors', '<button class="btn" data-act="clearCache">Clear</button>')}
      ${sc('Watch clipboard for links', 'Offers to download links you copy', tg('watchClip', 'Watch clipboard for links'))}
    </div>
  </div></div>`;
}

const VIEWS = { home: homeView, playlist: playlistView, queue: queueView, library: libraryView, subs: subsView, settings: settingsView };

// ---------- actions ----------
const A = {
  go: (v) => { S.view = v; S.lib.menu = null; if (v === 'settings') loadTools(); render(); },
  ext: (u) => call('external', u),
  open: (p) => call('open', p),
  reveal: (p) => call('reveal', p),
  fetch: () => { const q = $('#q').value.trim(); if (q) fetchInfo(q); },
  batch: async () => {
    const urls = await call('readBatch');
    if (!urls.length) return;
    await call('enqueue', urls.map((url) => ({ url, preset: S.home.preset, opts: defaultOpts() })));
    S.home.note = `Added ${urls.length} links to the queue.`; render();
  },
  noDeno: () => { S.home.noDeno = true; render(); },
  preset: (p) => { Object.assign(S.home, { preset: p, format: null, merge: null }); render(); },
  opt: (k) => { S.home.opts[k] = !S.home.opts[k]; render(); },
  homeDir: async () => { const d = await call('pickDir'); if (d) { S.home.dir = d; render(); } },
  download: async (mode) => {
    await call('enqueue', [homeJob()]);
    if (mode === 'now') A.go('queue'); else { S.home.note = `Added “${S.home.info.title}” to the queue.`; render(); }
  },
  quick: async (p) => { await call('enqueue', [homeJob(p)]); A.go('queue'); },
  openFmt: () => {
    const { v, a } = pickFormat(S.home.info, 'best');
    S.fmt = { tab: 'streams', v: v && v.format_id, a: a && a.format_id, str: S.home.format || 'bv*+ba/b', merge: S.home.merge || 'MKV' };
    render();
  },
  fmtTab: (t) => { S.fmt.tab = t; render(); },
  fmtV: (id) => { S.fmt.v = id; render(); },
  fmtA: (id) => { S.fmt.a = id || null; render(); },
  fmtClose: () => { S.fmt = null; render(); },
  fmtUse: () => {
    const f = S.fmt;
    S.home.format = f.tab === 'str' ? f.str : [f.v, f.a].filter(Boolean).join('+');
    S.home.merge = f.merge; S.fmt = null; render();
  },
  plOrder: (o) => { S.pl.order = o; render(); },
  plRow: (n) => { S.pl.off[n] = !S.pl.off[n]; S.pl.items = ''; render(); },
  plAll: () => {
    const rows = plRows().filter((r) => !r.locked), all = rows.every((r) => r.checked);
    S.pl.off = {}; if (all) rows.forEach((r) => { S.pl.off[r.n] = true; });
    S.pl.items = ''; render();
  },
  plTg: (k) => { S.pl.r[k] = !S.pl.r[k]; render(); },
  plReset: () => { S.pl.r = { dateMode: 'any', date: '', min: '', max: '', title: '', skipHave: true, skipLive: true, stop: '', adv: '' }; S.pl.off = {}; S.pl.items = ''; render(); },
  plAdd: async () => {
    const p = S.pl, r = p.r, d = r.date.replace(/-/g, '');
    const thumb = (e) => (e.thumbnails && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1].url : e.thumbnail);
    await call('enqueue', plSelected().map(({ e }) => ({
      url: entryUrl(e), title: e.title || e.id, thumb: thumb(e), preset: p.preset, opts: defaultOpts(),
      dateafter: d && ['after', 'on'].includes(r.dateMode) ? d : '', datebefore: d && ['before', 'on'].includes(r.dateMode) ? d : '', matchFilter: r.adv,
    })));
    A.go('queue');
  },
  qtab: (t) => { S.q.tab = t; render(); },
  all: (a) => call('jobs:all', a),
  job: (a, el) => call('job', el.dataset.id, a),
  details: (_, el) => { S.q.details[el.dataset.id] = !S.q.details[el.dataset.id]; patch('qlist', qList()); },
  useCookies: async (_, el) => { if (!S.settings.cookies) await setSetting('cookies', 'edge'); call('job', el.dataset.id, 'retry'); },
  openDir: () => call('openDir', S.settings.dir),
  libF: (f) => { S.lib.f = f; render(); },
  libList: (v) => { S.lib.list = !!v; render(); },
  libSel: (_, el) => { S.lib.sel = el.dataset.id; S.lib.menu = null; render(); },
  libPlay: () => { const x = libCur(); S.lib.menu = null; if (x) call('open', x.filepath); render(); },
  libReveal: () => { const x = libCur(); S.lib.menu = null; if (x) call('reveal', x.filepath); render(); },
  libCopy: () => { const x = libCur(); S.lib.menu = null; if (x) call('copy', x.url); render(); },
  libAgain: () => { const x = libCur(); S.lib.menu = null; if (x) { S.view = 'home'; fetchInfo(x.url); } },
  libMp3: async () => { const x = libCur(); S.lib.menu = null; if (x) { await call('enqueue', [{ url: x.url, title: x.title, thumb: x.thumb, preset: 'mp3', opts: { thumb: true, chap: true } }]); A.go('queue'); } },
  libSplit: async () => { const x = libCur(); S.lib.menu = null; if (x) { await call('enqueue', [{ url: x.url, title: `${x.title} (chapters)`, thumb: x.thumb, preset: x.kind === 'audio' ? 'audio' : 'best', opts: {}, extraArgs: ['--split-chapters', '-o', 'chapter:%(title)s/%(section_number)02d %(section_title)s.%(ext)s'] }]); A.go('queue'); } },
  libDelete: async () => { const x = libCur(); S.lib.menu = null; if (x) S.library = await call('library:remove', x.id, true); render(); },
  subAdding: () => { S.sub.adding = !S.sub.adding; S.sub.error = ''; render(); },
  subAdd: async () => {
    const url = $('#subUrl').value.trim();
    if (!url) return;
    S.sub.busy = true; S.sub.error = ''; render();
    try {
      const info = await call('probe', url, ['--playlist-end', '1']);
      const thumbs = (info.thumbnails || []).filter((t) => t.url);
      const sub = {
        id: String(Date.now()), url, name: (info.channel || info.uploader || info.title || url).replace(/ - (Videos|Shorts|Live)$/, ''),
        kind: /\/(playlist|watch)\?/.test(url) ? `Playlist${info.playlist_count ? ' · ' + info.playlist_count + ' videos' : ''}` : 'Channel',
        thumb: thumbs.length ? (thumbs.find((t) => t.id === 'avatar_uncropped') || thumbs[thumbs.length - 1]).url : '',
        on: true, every: 6, preset: '1080', after: new Date().toISOString().slice(0, 10), skipShorts: true, sb: S.settings.sbMode !== 'off', notify: false, lastCheck: 0, newCount: 0,
      };
      S.subs = await call('subs:save', sub);
      Object.assign(S.sub, { adding: false, busy: false, sel: S.subs.length - 1 });
    } catch (e) {
      Object.assign(S.sub, { busy: false, error: String(e.message || e).replace(/^Error invoking remote method 'probe': (Error: )?/, '') });
    }
    render();
  },
  subSel: (i) => { S.sub.sel = +i; render(); },
  subTg: async (k) => { const c = { ...S.subs[S.sub.sel] }; c[k] = !c[k]; S.subs = await call('subs:save', c); render(); },
  subCheck: async () => { S.subs = await call('subs:check', S.subs[S.sub.sel].id); render(); },
  subCheckAll: async () => { S.subs = await call('subs:check'); render(); },
  subRemove: async () => { S.subs = await call('subs:remove', S.subs[S.sub.sel].id); S.sub.sel = 0; render(); },
  tgSet: async (k) => { await setSetting(k, !S.settings[k]); render(); },
  theme: async (t) => { await setSetting('theme', t); render(); },
  pickDir: async () => { const d = await call('pickDir'); if (d) { await setSetting('dir', d); render(); } },
  setEx: (k) => { S.set[k] = !S.set[k]; render(); },
  tplAdd: async (k) => { await setSetting('tpl', `${S.settings.tpl.replace(/\.%\(ext\)s$/, '')} - %(${k})s.%(ext)s`); render(); },
  tplReset: async () => { await setSetting('tpl', TPL); render(); },
  sbMode: async (m) => { await setSetting('sbMode', m); render(); },
  sbCat: async (c) => { const s = new Set(S.settings.sbCats); s.has(c) ? s.delete(c) : s.add(c); await setSetting('sbCats', [...s]); render(); },
  update: async () => { S.set.msg.update = 'Checking…'; render(); S.set.msg.update = await call('update'); S.tools = null; loadTools(); },
  clearCache: async () => { S.set.msg.cache = await call('clearCache') || 'Cache cleared'; render(); },
};

// Input handlers (fire on "change").
const C = {
  plItems: (v) => { S.pl.items = v; const keep = parseRanges(v); S.pl.off = {}; if (keep.size) (S.pl.info.entries || []).forEach((_, i) => { if (!keep.has(i + 1)) S.pl.off[i + 1] = true; }); render(); },
  plR: (v, k) => { S.pl.r[k] = v; render(); },
  plPreset: (v) => { S.pl.preset = v; },
  fmtStr: (v) => { S.fmt.str = v; render(); },
  fmtMerge: (v) => { S.fmt.merge = v; render(); },
  libSort: (v) => { S.lib.sort = v; render(); },
  subField: async (v, k) => { const c = { ...S.subs[S.sub.sel], [k]: k === 'every' ? +v : v }; S.subs = await call('subs:save', c); render(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (S.lib.menu && !e.target.closest('.menu')) { S.lib.menu = null; if (!el) render(); }
  if (!el || el.tagName === 'FORM') return;
  if (el.tagName === 'A') e.preventDefault();
  if (el.tagName === 'INPUT' && el.type === 'checkbox') e.preventDefault(); // re-rendered from state
  if (e.target.closest('#overlay') && !e.target.closest('.dlg')) return;
  A[el.dataset.act](el.dataset.arg, el, e);
});
document.addEventListener('submit', (e) => { e.preventDefault(); A[e.target.dataset.act](); });
document.addEventListener('dblclick', (e) => { const el = e.target.closest('[data-dbl]'); if (el) A[el.dataset.dbl](); });
document.addEventListener('contextmenu', (e) => {
  const el = e.target.closest('.gi');
  if (!el) return;
  e.preventDefault();
  S.lib.sel = el.dataset.id; S.lib.menu = { x: e.clientX, y: e.clientY }; render();
});
document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.set) {
    const v = el.dataset.set === 'concurrent' ? +el.value : el.value;
    await setSetting(el.dataset.set, v);
    if (S.view === 'settings') render();
  } else if (el.dataset.change) C[el.dataset.change](el.value, el.dataset.arg);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (S.fmt) A.fmtClose(); else if (S.lib.menu) { S.lib.menu = null; render(); } }
  if (S.view === 'library' && S.lib.sel && !/INPUT|SELECT/.test(document.activeElement.tagName)) {
    if (e.key === 'Enter') A.libPlay();
    if (e.key === 'Delete') A.libDelete();
    if (e.key === 'c' && e.ctrlKey) A.libCopy();
  }
});
$('#search').addEventListener('input', (e) => {
  S.search = e.target.value;
  if (!['library', 'queue', 'subs'].includes(S.view)) S.view = 'library';
  render();
  $('#search').focus();
});

// ---------- live updates ----------
api.on('jobs', (jobs) => {
  S.jobs = jobs;
  renderNav();
  if (S.view === 'queue') { patch('qlist', qList()); patch('qtabs', qTabs()); const sp = jobs.filter((j) => j.status === 'running' && j.speed).reduce((a, j) => a + j.speed, 0); patch('qspeed', sp ? 'Total ' + bytes(sp) + '/s' : ''); }
  if (S.view === 'home') patch('rail', railView());
});
api.on('library', (l) => { S.library = l; if (S.view === 'library') render(); });
api.on('subs', (s) => { S.subs = s; if (S.view === 'subs') render(); });
api.on('settings', (s) => { S.settings = s; });
api.on('nav', (v) => A.go(v));

async function loadTools() {
  if (S.tools) return;
  S.tools = await call('tools');
  if (['settings', 'home'].includes(S.view)) render();
}

call('state').then((st) => {
  Object.assign(S, st);
  render();
  loadTools();
});
