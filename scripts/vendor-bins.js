// Fills vendor/bin for electron-builder (extraResources → resources/bin): yt-dlp + an LGPL FFmpeg build.
// yt-dlp: YTDLP_EXE, else the one on PATH.
// FFmpeg: FFMPEG_DIR (folder with ffmpeg.exe), else the FFmpeg-Builds LGPL shared build below, downloaded once into vendor/cache.
// Either way the build is rejected if it was configured with --enable-gpl or --enable-nonfree.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Stable 8.1 branch; the "latest" release asset only moves on 8.1.x patch builds.
const FFMPEG_URL = 'https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.1-latest-win64-lgpl-shared-8.1.zip';

const root = path.join(__dirname, '..', 'vendor');
const cache = path.join(root, 'cache');
const out = path.join(root, 'bin');

function which(name) {
  try { return fs.realpathSync(execFileSync('where', [name], { encoding: 'utf8' }).split(/\r?\n/)[0].trim()); } catch { return null; }
}

async function downloadFfmpeg() {
  const zip = path.join(cache, path.basename(FFMPEG_URL));
  const dir = path.join(cache, 'ffmpeg');
  if (!fs.existsSync(zip)) {
    fs.mkdirSync(cache, { recursive: true });
    console.log(`downloading ${FFMPEG_URL}`);
    const res = await fetch(FFMPEG_URL);
    if (!res.ok) throw new Error(`FFmpeg download failed: HTTP ${res.status}`);
    fs.writeFileSync(`${zip}.part`, Buffer.from(await res.arrayBuffer()));
    fs.renameSync(`${zip}.part`, zip); // only a complete download gets the real name
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) { // empty = an earlier extraction failed
    fs.mkdirSync(dir, { recursive: true });
    // Windows' own bsdtar reads zip; Git Bash's GNU tar (often first on PATH) reads "C:" as a remote host.
    execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xf', zip, '-C', dir]);
  }
  const top = fs.readdirSync(dir).map((d) => path.join(dir, d)).find((d) => fs.existsSync(path.join(d, 'bin', 'ffmpeg.exe')));
  if (!top) throw new Error(`no bin/ffmpeg.exe inside ${zip}`);
  return path.join(top, 'bin');
}

(async () => {
  const ytdlp = process.env.YTDLP_EXE || which('yt-dlp');
  if (!ytdlp || !fs.existsSync(ytdlp)) throw new Error('yt-dlp.exe not found: install it or set YTDLP_EXE');
  const ffDir = process.env.FFMPEG_DIR || await downloadFfmpeg();

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(ytdlp, path.join(out, 'yt-dlp.exe'));
  // ffplay is not used by yt-dlp; shared FFmpeg builds need their DLLs next to the exes.
  for (const f of fs.readdirSync(ffDir)) if (/^(ffmpeg|ffprobe)\.exe$|\.dll$/i.test(f)) fs.copyFileSync(path.join(ffDir, f), path.join(out, f));
  if (!fs.existsSync(path.join(out, 'ffprobe.exe'))) throw new Error(`ffprobe.exe missing in ${ffDir}`);

  // Licence guard: shipping a GPL/nonfree build would put the whole installer under those terms.
  const version = execFileSync(path.join(out, 'ffmpeg.exe'), ['-hide_banner', '-version'], { encoding: 'utf8' });
  if (/--enable-(gpl|nonfree)\b/.test(version)) {
    fs.rmSync(out, { recursive: true, force: true });
    throw new Error(`${ffDir} is a GPL/nonfree FFmpeg build; use an LGPL build`);
  }
  const lic = [path.join(ffDir, '..', 'LICENSE.txt'), path.join(ffDir, 'LICENSE.txt')].find((p) => fs.existsSync(p));
  if (!lic) throw new Error(`no LICENSE.txt next to ${ffDir}; LGPL requires shipping it`);
  fs.copyFileSync(lic, path.join(out, 'FFMPEG-LICENSE.txt'));
  const first = version.split(/\r?\n/)[0];
  fs.writeFileSync(path.join(out, 'FFMPEG-SOURCE.txt'), [
    'This app ships FFmpeg, licensed under the GNU LGPL v2.1 or later (see FFMPEG-LICENSE.txt).',
    'FFmpeg is called as a separate program; it is not linked into Fetch.',
    first,
    'FFmpeg source code: https://github.com/FFmpeg/FFmpeg (the commit is the hash after "-g" in the version above)',
    'Build scripts used for this binary: https://github.com/FFmpeg-Builds/FFmpeg-Builds',
    '',
  ].join('\r\n'));

  const mb = fs.readdirSync(out).reduce((a, f) => a + fs.statSync(path.join(out, f)).size, 0) / 1048576;
  console.log(`vendor/bin: yt-dlp from ${ytdlp}; ${first} (LGPL) from ${ffDir}; ${mb.toFixed(0)} MB`);
})().catch((e) => { console.error(e.message); process.exit(1); });
