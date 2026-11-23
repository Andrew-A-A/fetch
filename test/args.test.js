const assert = require('assert');
const y = require('../ytdlp');

const st = { dir: 'C:\\out', tpl: '%(title)s.%(ext)s', subLangs: 'en.*', sbMode: 'remove', sbCats: ['sponsor'], winSafe: true, limit: '5M', cookies: 'edge', extra: '--embed-metadata  -v' };

assert.strictEqual(y.isUrl('https://x.y/z'), true);
assert.strictEqual(y.isUrl('lofi beats'), false);
assert.deepStrictEqual(y.probeArgs('lofi beats', {}).slice(-1), ['ytsearch20:lofi beats']);

const a = y.downloadArgs({ url: 'https://v', preset: '720', opts: { subs: true, thumb: true, sb: true } }, st);
const after = (f) => a[a.indexOf(f) + 1];
assert.strictEqual(after('-P'), 'C:\\out');
assert.strictEqual(after('-r'), '5M');
assert.strictEqual(after('--sponsorblock-remove'), 'sponsor');
assert.strictEqual(after('--cookies-from-browser'), 'edge');
assert.ok(a.includes('--embed-subs') && a.includes('--windows-filenames') && a.includes('-v'));
assert.deepStrictEqual(a.slice(-2), ['--', 'https://v']); // url last, after "--" so it can't be read as an option

const c = y.downloadArgs({ url: 'u', format: '401+251', merge: 'MKV', opts: {} }, {});
assert.strictEqual(c[c.indexOf('-f') + 1], '401+251');
assert.strictEqual(c[c.indexOf('--merge-output-format') + 1], 'mkv');
assert.ok(!c.includes('--embed-subs'));

const S = y.SEP;
assert.deepStrictEqual(y.parseLine(`P${S}downloading${S}100${S}NA${S}400${S}50.5${S}6${S}NA${S}NA`),
  { type: 'progress', status: 'downloading', done: 100, total: 400, speed: 50.5, eta: 6, frag: null, frags: null });
assert.deepStrictEqual(y.parseLine(`X${S}started${S}Merger`), { type: 'pp', status: 'started', name: 'Merger' });
assert.strictEqual(y.parseLine(`D${S}{"title":"a|b","filepath":"C:\\\\x.mp4"}`).info.filepath, 'C:\\x.mp4');
assert.strictEqual(y.parseLine('[download] whatever'), null);
console.log('ok');
