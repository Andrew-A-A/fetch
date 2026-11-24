// Fills vendor/bin for electron-builder (extraResources → resources/bin) for the platform it runs on.
// yt-dlp: YTDLP_EXE, else (Windows) the one on PATH, else the official standalone build, downloaded into vendor/cache.
// FFmpeg (Windows, Linux): FFMPEG_DIR (folder with ffmpeg + ffprobe), else the FFmpeg-Builds LGPL build below.
// macOS: no LGPL FFmpeg build is published, so none is bundled; the app finds Homebrew's ffmpeg on PATH.
// Any bundled FFmpeg is rejected if it was configured with --enable-gpl or --enable-nonfree.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WIN = process.platform === 'win32';
const EXE = WIN ? '.exe' : '';
// Stable 8.1 branch; the "latest" release asset only moves on 8.1.x patch builds. Windows: shared (DLLs), Linux: static.
const FFMPEG_URL = {
  win32: 'https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.1-latest-win64-lgpl-shared-8.1.zip',
  linux: 'https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.1-latest-linux64-lgpl-8.1.tar.xz',
}[process.platform];
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/' +
  { win32: 'yt-dlp.exe', darwin: 'yt-dlp_macos', linux: 'yt-dlp_linux' }[process.platform];

const root = path.join(__dirname, '..', 'vendor');
const cache = path.join(root, 'cache');
const out = path.join(root, 'bin');

function which(name) {
  try { return fs.realpathSync(execFileSync('where', [name], { encoding: 'utf8' }).split(/\r?\n/)[0].trim()); } catch { return null; }
}

async function download(url, file) {
  if (fs.existsSync(file)) return file;
  fs.mkdirSync(cache, { recursive: true });
  console.log(`downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status} for ${url}`);
  fs.writeFileSync(`${file}.part`, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(`${file}.part`, file); // only a complete download gets the real name
  return file;
}

async function downloadFfmpeg() {
  const archive = path.join(cache, path.basename(FFMPEG_URL));
  const dir = path.join(cache, 'ffmpeg');
  if (!fs.existsSync(archive)) { await download(FFMPEG_URL, archive); fs.rmSync(dir, { recursive: true, force: true }); }
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) { // empty = an earlier extraction failed
    fs.mkdirSync(dir, { recursive: true });
    // Windows' own bsdtar reads zip; Git Bash's GNU tar (often first on PATH) reads "C:" as a remote host.
    const tar = WIN ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
    execFileSync(tar, ['-xf', archive, '-C', dir]);
  }
  const top = fs.readdirSync(dir).map((d) => path.join(dir, d)).find((d) => fs.existsSync(path.join(d, 'bin', `ffmpeg${EXE}`)));
  if (!top) throw new Error(`no bin/ffmpeg${EXE} inside ${archive}`);
  return path.join(top, 'bin');
}

(async () => {
  const ytdlp = process.env.YTDLP_EXE || (WIN && which('yt-dlp')) || await download(YTDLP_URL, path.join(cache, path.basename(YTDLP_URL)));
  if (!fs.existsSync(ytdlp)) throw new Error(`yt-dlp not found at ${ytdlp}`);

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(ytdlp, path.join(out, `yt-dlp${EXE}`));
  fs.chmodSync(path.join(out, `yt-dlp${EXE}`), 0o755);

  if (!FFMPEG_URL) { console.log(`vendor/bin: yt-dlp from ${ytdlp}; FFmpeg not bundled on ${process.platform}`); return; }
  const ffDir = process.env.FFMPEG_DIR || await downloadFfmpeg();
  // ffplay is not used by yt-dlp; shared FFmpeg builds need their DLLs next to the exes.
  for (const f of fs.readdirSync(ffDir)) if (/^(ffmpeg|ffprobe)(\.exe)?$|\.dll$/i.test(f)) fs.copyFileSync(path.join(ffDir, f), path.join(out, f));
  if (!fs.existsSync(path.join(out, `ffprobe${EXE}`))) throw new Error(`ffprobe${EXE} missing in ${ffDir}`);

  // Licence guard: shipping a GPL/nonfree build would put the whole installer under those terms.
  const version = execFileSync(path.join(out, `ffmpeg${EXE}`), ['-hide_banner', '-version'], { encoding: 'utf8' });
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
