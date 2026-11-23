# Fetch

A Windows 11 desktop app for downloading video and audio, built with Electron on top of [yt-dlp](https://github.com/yt-dlp/yt-dlp).

- **Home:** paste a link, or type words to search YouTube, then pick a quality preset or exact formats.
- **Playlists and channels:** pick the items you want and filter them by length, title, upload date or what you already have.
- **Queue:** live progress, pause and resume, and the number of downloads at once.
- **Library:** everything you've downloaded; right-click to play, re-download, save as MP3 or split by chapters.
- **Subscriptions:** new uploads from channels and playlists download on a schedule.
- Light and dark themes, a Mica background, a tray icon, and clipboard link detection.

## Install

Download `Fetch Setup <version>.exe` from [Releases](../../releases). It includes yt-dlp and an LGPL build of FFmpeg, so nothing else is needed.
The installer is not code-signed yet, so Windows SmartScreen will warn about an unknown publisher.

## Develop

Needs Node.js 22+. When run from source, the app uses `yt-dlp` and `ffmpeg` from your PATH.

```powershell
npm install
npm start
npm test
```

## Build the installer

```powershell
npm run dist
```

This draws `build/icon.ico`, copies yt-dlp into `vendor/bin`, downloads the FFmpeg-Builds LGPL shared build once (into `vendor/cache`), and writes `dist/Fetch Setup <version>.exe`.
Set `YTDLP_EXE` or `FFMPEG_DIR` to use other binaries; GPL and nonfree FFmpeg builds are rejected.

## Third-party software

- [yt-dlp](https://github.com/yt-dlp/yt-dlp): Unlicense.
- [FFmpeg](https://ffmpeg.org): LGPL v2.1 or later. The installer ships its licence and a source notice (`FFMPEG-LICENSE.txt`, `FFMPEG-SOURCE.txt`).
