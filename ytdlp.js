// Pure yt-dlp helpers: argument building and output parsing. No Electron here so it can be tested with plain node.
const BIN = process.env.YTDLP_PATH || 'yt-dlp';

const PRESETS = {
  best: { label: 'Best', args: ['-f', 'bv*+ba/b', '--merge-output-format', 'mkv'] },
  '1080': { label: '1080p', args: ['-f', 'bv*[height<=1080][vcodec^=avc]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]', '--merge-output-format', 'mp4'] },
  '720': { label: '720p', args: ['-f', 'bv*[height<=720][vcodec^=avc]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720]', '--merge-output-format', 'mp4'] },
  small: { label: 'Smallest', args: ['-f', 'b[height<=360]/wv*+wa/w', '--merge-output-format', 'mp4'] },
  audio: { label: 'Audio only', args: ['-f', 'ba[ext=m4a]/ba', '-x', '--audio-format', 'm4a'] },
  mp3: { label: 'Audio · MP3 320k', args: ['-f', 'ba', '-x', '--audio-format', 'mp3', '--audio-quality', '320K'] },
  archive: { label: 'Archive · MKV best + subs', args: ['-f', 'bv*+ba/b', '--merge-output-format', 'mkv', '--sub-langs', 'all'] },
};

const SEP = '␟'; // unit-separator glyph: never appears in titles/paths, unlike "|"
const PROG = ['status', 'downloaded_bytes', 'total_bytes', 'total_bytes_estimate', 'speed', 'eta', 'fragment_index', 'fragment_count']
  .map((k) => `%(progress.${k})s`).join(SEP);
const INFO_FIELDS = 'id,title,thumbnail,duration,is_live,webpage_url,uploader,height,ext,vcodec,acodec,section_start';

function isUrl(s) { return /^[a-z][a-z0-9+.-]*:\/\//i.test(s.trim()); }

function splitArgs(s) {
  // shortcut: whitespace split, no quoting support; upgrade if users need quoted extra options
  return (s || '').trim().split(/\s+/).filter(Boolean);
}

// Options shared by probing and downloading (network / auth).
function commonArgs(st) {
  const a = [];
  if (st.proxy) a.push('--proxy', st.proxy);
  if (st.impersonate) a.push('--impersonate', 'chrome');
  if (st.geo) a.push('--xff', 'default');
  if (st.cookies) a.push('--cookies-from-browser', st.cookies);
  return a;
}

function probeArgs(query, st) {
  const target = isUrl(query) ? query.trim() : `ytsearch20:${query.trim()}`;
  return ['--ignore-config', '-J', '--flat-playlist', '--no-warnings', ...commonArgs(st), target];
}

// job: {url, preset, format, merge, opts:{subs,thumb,chap,meta,sb}, dir, live, matchFilter, dateafter, datebefore, archive, breakFilter, extraArgs}
function downloadArgs(job, st) {
  // The user's own yt-dlp config (%APPDATA%\yt-dlp\config.txt) would silently change paths and formats;
  // Settings > Extra yt-dlp options is where app-wide extras belong.
  const a = ['--ignore-config'];
  if (job.format) {
    a.push('-f', job.format);
    if (job.merge) a.push('--merge-output-format', job.merge.toLowerCase());
  } else {
    a.push(...(PRESETS[job.preset] || PRESETS.best).args);
  }
  const o = job.opts || {};
  if (o.subs && !a.includes('--sub-langs')) a.push('--sub-langs', st.subLangs || 'en.*');
  if (o.subs) a.push('--write-subs', '--embed-subs');
  if (o.thumb) a.push('--embed-thumbnail');
  if (o.chap) a.push('--embed-metadata', '--embed-chapters');
  if (o.meta) a.push('--write-info-json');
  if (o.sb && st.sbMode !== 'off' && st.sbCats && st.sbCats.length) {
    a.push(st.sbMode === 'mark' ? '--sponsorblock-mark' : '--sponsorblock-remove', st.sbCats.join(','));
  }
  a.push('-P', job.dir || st.dir, '-o', st.tpl);
  if (st.winSafe) a.push('--windows-filenames');
  if (st.limit) a.push('-r', st.limit);
  if (st.exists === 'replace') a.push('--force-overwrites');
  if (st.aria2) a.push('--downloader', 'aria2c');
  a.push('-N', '4');
  if (job.live) a.push('--live-from-start');
  if (job.matchFilter) a.push('--match-filter', job.matchFilter);
  if (job.breakFilter) a.push('--break-match-filters', job.breakFilter);
  if (job.dateafter) a.push('--dateafter', job.dateafter);
  if (job.datebefore) a.push('--datebefore', job.datebefore);
  if (job.archive) a.push('--download-archive', job.archive, '--break-on-existing');
  a.push(...commonArgs(st));
  a.push(
    '--newline', '--quiet', '--progress', '--no-simulate', '--no-colors',
    '--progress-template', `download:P${SEP}${PROG}`,
    '--progress-template', `postprocess:X${SEP}%(progress.status)s${SEP}%(progress.postprocessor)s`,
    '--print', `video:I${SEP}%(.{${INFO_FIELDS}})j`,
    '--print', `after_move:D${SEP}%(.{${INFO_FIELDS},filepath})j`,
  );
  a.push(...(job.extraArgs || []), ...splitArgs(st.extra));
  a.push('--', job.url);
  return a;
}

const num = (s) => (s === 'NA' || s === 'None' || s === '' ? null : Number(s));

function parseLine(line) {
  const parts = line.split(SEP);
  switch (parts[0]) {
    case 'P': {
      const [, status, done, total, est, speed, eta, fi, fc] = parts;
      return { type: 'progress', status, done: num(done), total: num(total) || num(est), speed: num(speed), eta: num(eta), frag: num(fi), frags: num(fc) };
    }
    case 'X': return { type: 'pp', status: parts[1], name: parts[2] };
    case 'I': return { type: 'info', info: JSON.parse(parts[1]) };
    case 'D': return { type: 'done', info: JSON.parse(parts[1]) };
    default: return null;
  }
}

module.exports = { BIN, PRESETS, isUrl, probeArgs, downloadArgs, parseLine, splitArgs, SEP };
