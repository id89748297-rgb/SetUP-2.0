function convertBtoH(chord) { if (chord.includes('/')) { const parts = chord.split('/'); return convertBtoH(parts[0]) + '/' + convertBtoH(parts[1]); } if (chord.startsWith('B') && !chord.startsWith('Bb')) return 'H' + chord.substring(1); return chord; }
function cleanWordForChordCheck(word) { return word.replace(/^[.,;:!?|()\-—–·\s]+|[.,;:!?|()\-—–·\s]+$/g, ''); }
function convertAccidentals(chord, mode) {
if (chord.includes('/')) { const parts = chord.split('/'); return convertAccidentals(parts[0], mode) + '/' + convertAccidentals(parts[1], mode); }
const m = chord.match(/^([A-H][#b]?)(.*)$/); if (!m) return chord;
const root = m[1], suffix = m[2];
if (mode === 'flat' && SHARP_TO_FLAT[root]) return SHARP_TO_FLAT[root] + suffix;
if (mode === 'sharp' && FLAT_TO_SHARP[root]) return FLAT_TO_SHARP[root] + suffix;
return chord;
}
function convertLineAccidentals(line, mode) {
const pairs = []; const pairRegex = new RegExp(`\\b(${PAIR_RE_STR})\\b`, 'g');
const lineWithPlaceholders = line.replace(pairRegex, (match) => { pairs.push(match); return `\x00PAIR${pairs.length - 1}\x00`; });
const labels = []; const labelRegex = /<span class="chord-label">\([^)]+\)<\/span>/g;
const lineWithLabels = lineWithPlaceholders.replace(labelRegex, (match) => { labels.push(match); return `\x00LABEL${labels.length - 1}\x00`; });
const chordRegex = /\b[A-H][#b]?(m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*(?:\/[A-H][#b]?(m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*)?(?![A-Za-zА-Яа-яЁё])/gi;
let result = lineWithLabels.replace(chordRegex, m => convertAccidentals(m, mode));
result = result.replace(/\x00LABEL(\d+)\x00/g, (match, idx) => labels[parseInt(idx)]);
result = result.replace(/\x00PAIR(\d+)\x00/g, (match, idx) => { const pair = pairs[parseInt(idx)]; return pair.split('-').map(p => convertAccidentals(p, mode)).join('-'); });
return result;
}
function processAccentWords(text) { return text.replace(/(^|\s)=([^\s=]+)/g, '$1<span class="accent-word">$2</span>'); }
function processChordLabels(chords) {
return chords.replace(/\(([^)]+)\)/g, (match, content) => {
const trimmed = content.trim();
const isChord = CHORD_RE.test(convertBtoH(cleanWordForChordCheck(trimmed)));
return isChord ? match : `<span class="chord-label">(${trimmed})</span>`;
});
}
function parseMixedLine(line) {
let rightNote = '', inlineComment = '';
const doubleStarMatch = line.match(/\s*\*\*\s*$/);
if (doubleStarMatch) { inlineComment = '**'; line = line.substring(0, line.length - doubleStarMatch[0].length); }
const starMatch = line.match(/\s+\*(.+)$/);
if (starMatch) { rightNote = starMatch[1].trim(); line = line.substring(0, line.length - starMatch[0].length); }
const parens = [];
const protectedLine = line.replace(/\([^)]+\)/g, (match) => { parens.push(match); return `\x01P${parens.length - 1}\x01`; });
function restoreParens(str) { return str.replace(/\x01P(\d+)\x01/g, (m, idx) => parens[parseInt(idx)]); }
const tokens = protectedLine.trim().split(/\s+/);
const allChords = tokens.length > 0 && tokens.every(t => {
if (t === '|' || /^\/{1,8}$/.test(t) || REPEAT_RE.test(t)) return true;
if (PAIR_RE.test(t)) return true;
if (/^\x01P\d+\x01$/.test(t)) return true;
return CHORD_RE.test(convertBtoH(cleanWordForChordCheck(t)));
});
if (allChords) return { chords: restoreParens(protectedLine.trim()), text: '', rightNote, inlineComment };
const chordPartRe = new RegExp(`^((?:\\s*(?:${PAIR_RE_STR}|[A-H][#b]?(?:m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*(?:\\/[A-H][#b]?(?:m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*)?|x\\d+|\\d+[рpx]|\\||\\/{1,8}|\\x01P\\d+\\x01))+)`, 'i');
const chordPartMatch = protectedLine.match(chordPartRe);
if (chordPartMatch) {
const chords = restoreParens(chordPartMatch[1]);
const text = restoreParens(protectedLine.substring(chordPartMatch[1].length)).trim();
return { chords, text, rightNote, inlineComment };
}
return { chords: '', text: restoreParens(line), rightNote, inlineComment };
}
function transposeChord(chord, fromKey, toKey) {
chord = convertBtoH(chord);
if (chord.includes('/')) { const parts = chord.split('/'); return transposeChord(parts[0], fromKey, toKey) + '/' + transposeChord(parts[1], fromKey, toKey); }
const m = chord.match(/^([A-H][#b]?)(.*)$/); if (!m) return chord;
const root = m[1], suffix = m[2];
const fromIdx = NOTES_SHARP.indexOf(fromKey), toIdx = NOTES_SHARP.indexOf(toKey);
if (fromIdx === -1 || toIdx === -1) return chord;
const interval = toIdx - fromIdx;
const scale = root.includes('b') ? NOTES_FLAT : NOTES_SHARP;
try { const newIdx = ((scale.indexOf(root) + interval) % 12 + 12) % 12; return scale[newIdx] + suffix; } catch { return chord; }
}
function transposeLine(line, fromKey, toKey) {
const pairs = []; const pairRegex = new RegExp(`\\b(${PAIR_RE_STR})\\b`, 'g');
const lineWithPlaceholders = line.replace(pairRegex, (match) => { pairs.push(match); return `\x00PAIR${pairs.length - 1}\x00`; });
const chordRegex = /\b[A-H][#b]?(?:m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*(?:\/[A-H][#b]?(?:m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*)?(?=\s|$|[^A-Ha-h#b0-9])/gi;
const transposed = lineWithPlaceholders.replace(chordRegex, m => { const n = convertBtoH(m); return CHORD_RE.test(n) ? transposeChord(n, fromKey, toKey) : m; });
return transposed.replace(/\x00PAIR(\d+)\x00/g, (match, idx) => pairs[parseInt(idx)]);
}
function transposeChordproText(text, fromKey, toKey) {
const chordRegex = /\b[A-H][#b]?(m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*(?:\/[A-H][#b]?(m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*)?(?=\s|$|[^A-Ha-h#b0-9])/gi;
const pairRegex = new RegExp(`\\b(${PAIR_RE_STR})\\b`, 'g');
return text.split('\n').map(line => {
const pairs = []; const lineWithPlaceholders = line.replace(pairRegex, (match) => { pairs.push(match); return `\x00PAIR${pairs.length - 1}\x00`; });
const transposed = lineWithPlaceholders.replace(chordRegex, match => { const normalized = convertBtoH(match); if (CHORD_RE.test(normalized)) return transposeChord(normalized, fromKey, toKey); return match; });
return transposed.replace(/\x00PAIR(\d+)\x00/g, (match, idx) => pairs[parseInt(idx)]);
}).join('\n');
}
function extractUrlsFromChordpro(text) {
const urls = [];
text.split('\n').forEach(line => {
const trimmed = line.trim();
if (!trimmed) return;
const withoutPrefix = trimmed.replace(LINK_PREFIX_REGEX, '').trim();
const urlMatches = withoutPrefix.match(URL_REGEX);
if (urlMatches) { urlMatches.forEach(url => { if (!urls.includes(url)) urls.push(url); }); }
});
return urls;
}
function shouldSkipLineForRender(line, isFirstNonEmpty) {
const trimmed = line.trim();
if (!trimmed) return false;
if (SEPARATOR_REGEX.test(trimmed)) return true;
const withoutPrefix = trimmed.replace(LINK_PREFIX_REGEX, '').trim();
if (URL_REGEX.test(withoutPrefix) && withoutPrefix.replace(URL_REGEX, '').trim() === '') return true;
if (isFirstNonEmpty && isArtistTitleLine(trimmed)) return true;
return false;
}
function isArtistTitleLine(line) {
const trimmed = line.trim();
if (!trimmed) return false;
if (!/[-—–]/.test(trimmed)) return false;
if (SECTION_RE.test(trimmed)) return false;
const parsed = parseMixedLine(trimmed);
if (parsed.chords && !parsed.text) return false;
const chordMatches = trimmed.match(/\b[A-H][#b]?(?:m|M|maj|min|dim|aug|sus|add|7)?\b/g);
if (chordMatches && chordMatches.length > 2) return false;
return true;
}