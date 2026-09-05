
function setupSwipe() {
if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
let startX = 0, startY = 0, tracking = false, currentPageId = null, isClick = false;
document.addEventListener('touchstart', (e) => {
if (e.target.closest('.modal') || e.target.closest('[contenteditable="true"]') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
startX = e.touches[0].clientX;
startY = e.touches[0].clientY;
tracking = true;
isClick = true;
currentPageId = document.querySelector('.page.active')?.id || null;
}, { passive: true });
document.addEventListener('touchmove', (e) => {
if (!tracking) return;
if (Math.abs(startX - e.touches[0].clientX) > 10 || Math.abs(startY - e.touches[0].clientY) > 10) isClick = false;
}, { passive: true });
document.addEventListener('touchend', (e) => {
if (!tracking) return;
tracking = false;
if (isClick) return;
const diffX = startX - e.changedTouches[0].clientX;
const diffY = startY - e.changedTouches[0].clientY;
if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
if (currentPageId === 'page-home') {
if (diffX > 0) setCarouselIndex(carouselActiveIndex + 1);
else setCarouselIndex(carouselActiveIndex - 1);
} else if (currentPageId === 'page-song-view') {
if (currentSlId) {
const sl = setlists.find(x => x.id === currentSlId); if (!sl) return;
const idx = sl.songs.findIndex(x => x.id === currentSongId);
if (diffX > 0) { if (idx === sl.songs.length - 1) goBackFromSong(); else nextSong(); }
else { if (idx === 0) goBackFromSong(); else prevSong(); }
} else if (homeFilteredSongs.length > 0 && homeSongIndex >= 0) {
if (diffX > 0) {
if (homeSongIndex === homeFilteredSongs.length - 1) goBackFromSong();
else { homeSongIndex++; openSongView(homeFilteredSongs[homeSongIndex].id, null); }
} else {
goBackFromSong();
}
} else {
if (diffX < 0) goBackFromSong();
}
}
else if (currentPageId === 'page-setlist-detail' && diffX < 0) goBackFromSetlistDetail();
else if (currentPageId === 'page-song-edit' && diffX < 0) goBackFromSongEdit();
else if (currentPageId === 'page-profile' && diffX < 0) goBackFromProfile();
else if (currentPageId === 'page-team-chat' && diffX < 0) closeTeamChat();
else if (currentPageId === 'page-instruction' && diffX > 0) showInstruction(false);
}
}, { passive: true });
}
function setupVlButton() { const vlBtn = document.querySelector('.vl-worship-btn'); if (!vlBtn) return; let timer = null, pressed = false; const start = () => { pressed = false; timer = setTimeout(() => { pressed = true; toggleColorTheme(); if (navigator.vibrate) navigator.vibrate(30); }, 800); }; const cancel = () => clearTimeout(timer); const end = (e) => { clearTimeout(timer); if (pressed) { e.preventDefault(); e.stopPropagation(); pressed = false; } }; vlBtn.addEventListener('touchstart', start, { passive: true }); vlBtn.addEventListener('touchend', end); vlBtn.addEventListener('touchcancel', cancel); vlBtn.addEventListener('mousedown', start); vlBtn.addEventListener('mouseup', end); vlBtn.addEventListener('mouseleave', cancel); }
function openExpressAdd() { document.getElementById('express-text').value = ''; document.getElementById('express-key-row').style.display = 'none'; document.getElementById('express-info').style.display = 'none'; document.getElementById('express-key-suggestions').innerHTML = ''; document.getElementById('express-save-btn').innerText = '⚡ Добавить'; document.getElementById('express-save-btn').dataset.detected = ''; document.getElementById('modal-express-add').classList.add('show');
const keySelect = document.getElementById('express-key-select');
if (!keySelect.dataset.bound) {
keySelect.addEventListener('change', function() {
updateKeySuggestionButtons(this.value);
});
keySelect.dataset.bound = 'true';
}
}
function extractChordRoot(chord) { const normalized = convertBtoH(chord); const m = normalized.match(/^([A-H][#b]?)/); return m ? m[1] : null; }
function isMinorChord(chord) { const normalized = convertBtoH(chord); const rootPart = normalized.split('/')[0]; if (/maj/i.test(rootPart)) return false; if (rootPart.length > 1 && /^m/i.test(rootPart.substring(1))) return true; return false; }
function detectKeyFromChords(text) {
const chordRegex = /\b[A-H][#b]?(?:m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*(?:\/[A-H][#b]?(?:m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*)?(?=\s|$|[^A-Ha-h#b0-9])/gi;
const matches = text.match(chordRegex) || []; if (matches.length === 0) return { best: null, suggestions: [] };
const chords = []; const seen = new Set();
matches.forEach(m => { const normalized = convertBtoH(m); const root = extractChordRoot(normalized); if (!root) return; const minor = isMinorChord(normalized); const key = root + (minor ? 'm' : ''); if (!seen.has(key)) { seen.add(key); chords.push({ root, minor }); } });
if (chords.length === 0) return { best: null, suggestions: [] };
const scores = [];
for (const [key, diatonicChords] of Object.entries(DIATONIC_CHORDS)) {
let fullMatch = 0, rootMatch = 0, nonDiatonic = 0;
chords.forEach(chord => { const entry = diatonicChords.find(d => d.r === chord.root); if (!entry) nonDiatonic++; else if (entry.m === chord.minor) fullMatch++; else rootMatch++; });
let score = fullMatch * 10 + rootMatch * (-3) + nonDiatonic * (-10);
const tonic = diatonicChords[0], dominant = diatonicChords[4], subdominant = diatonicChords[3];
if (chords.some(c => c.root === tonic.r && !c.minor)) score += 5;
if (chords.some(c => c.root === dominant.r && !c.minor)) score += 3;
if (chords.some(c => c.root === subdominant.r && !c.minor)) score += 2;
if (chords[0].root === tonic.r && chords[0].minor === tonic.m) score += 4;
scores.push({ key, score });
}
scores.sort((a, b) => b.score - a.score);
if (scores[0].score <= 0) return { best: null, suggestions: [] };
const threshold = scores[0].score * 0.8;
return { best: scores[0].key, suggestions: scores.filter(s => s.score >= threshold && s.score > 0).slice(0, 3).map(s => s.key) };
}
function saveExpressAdd() {
const rawText = document.getElementById('express-text').value.trim();
if (!rawText) { alert('Введите текст песни!'); return; }
const rawLines = rawText.split('\n');
let title = '', bpm = '', author = '', explicitKey = '', category = '';
let contentLines = [];
let titleFound = false, bpmFound = false;
for (let i = 0; i < rawLines.length; i++) {
const line = rawLines[i];
const trimmed = line.trim();
if (!trimmed) {
if (titleFound) contentLines.push(line);
continue;
}
if (!titleFound) {
title = trimmed;
titleFound = true;
const bpmInTitle = title.match(/(\d{2,3})\s*$/);
if (bpmInTitle) {
const num = parseInt(bpmInTitle[1]);
if (num >= 42 && num <= 500) {
bpm = num;
title = title.replace(/\d{2,3}\s*$/, '').replace(/\s+/g, ' ').trim();
bpmFound = true;
}
}
continue;
}
const authorMatch = trimmed.match(/^(?:Автор|Author)\s*[:\-]\s*(.+)$/i);
if (authorMatch) {
author = authorMatch[1].trim();
continue;
}
const keyMatch = trimmed.match(/^(?:Тональность|Key|Тон)\s*[:\-]\s*([A-H][#b]?)\s*$/i);
if (keyMatch) {
explicitKey = convertBtoH(keyMatch[1].trim());
continue;
}
const categoryMatch = trimmed.match(/^(?:Категория|Category)\s*[:\-]\s*(.+)$/i);
if (categoryMatch) {
const catValue = categoryMatch[1].trim().toLowerCase();
if (catValue.includes('быстр') || catValue.includes('fast')) category = 'fast';
else if (catValue.includes('средн') || catValue.includes('medium')) category = 'medium';
else if (catValue.includes('медл') || catValue.includes('slow')) category = 'slow';
continue;
}
const bpmMetaMatch = trimmed.match(/^(?:BPM|Темп)\s*[:\-]?\s*(\d{2,3})\s*$/i);
if (bpmMetaMatch) {
const num = parseInt(bpmMetaMatch[1]);
if (num >= 42 && num <= 500) {
bpm = num; bpmFound = true;
continue;
}
}
contentLines.push(line);
}
if (!bpmFound && contentLines.length > 0) {
const firstContent = contentLines[0].trim();
const numMatch = firstContent.match(/^(\d{2,3})$/);
if (numMatch) {
const num = parseInt(numMatch[1]);
if (num >= 42 && num <= 500) {
bpm = num; bpmFound = true;
contentLines.shift();
}
}
}
if (!title) { alert('Не найдено название песни!'); return; }
const chordpro = contentLines.join('\n').trim();
if (!chordpro) { alert('Добавьте текст песни!'); return; }
if (songs.find(s => !s.fromTeam && s.title.toLowerCase() === title.toLowerCase())) {
alert(`️ Песня "${title}" уже существует!`);
return;
}
const infoDiv = document.getElementById('express-info');
const keyRow = document.getElementById('express-key-row');
const keySuggestions = document.getElementById('express-key-suggestions');
const saveBtn = document.getElementById('express-save-btn');
if (saveBtn.dataset.detected === 'manual') {
const selectedKey = document.getElementById('express-key-select').value;
if (!selectedKey) { alert('Выберите тональность!'); return; }
finalizeExpressAdd(title, chordpro, selectedKey, bpm, author, category);
return;
}
if (explicitKey) {
finalizeExpressAdd(title, chordpro, explicitKey, bpm, author, category);
return;
}
const detection = detectKeyFromChords(chordpro);
if (detection.suggestions && detection.suggestions.length > 0) {
keyRow.style.display = 'block';
infoDiv.style.display = 'block';
infoDiv.innerHTML = `🎵 BPM: <b>${bpm || '—'}</b> | Автор: <b>${author || '—'}</b> | Категория: <b>${category ? CATEGORY_LABELS[category] : '—'}</b> | Название: <b>${title}</b><br>⚠️ Найдено ${detection.suggestions.length} подходящ${detection.suggestions.length === 1 ? 'ая тональность' : 'их тональностей'}. Выберите:`;
keySuggestions.innerHTML = '<div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">' +
detection.suggestions.map(k => `<button class="key-suggestion-btn" data-key="${k}" onclick="selectKeySuggestion('${k}')" style="padding: 8px 14px; background: rgba(144, 202, 249, 0.2); border: 1px solid rgba(144, 202, 249, 0.6); color: #90caf9; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s;">${k}</button>`).join('') +
'</div>';
saveBtn.innerText = '💾 Сохранить с выбранной тональностью';
saveBtn.dataset.detected = 'manual';
} else {
keyRow.style.display = 'block';
infoDiv.style.display = 'block';
infoDiv.innerHTML = `🎵 BPM: <b>${bpm || '—'}</b> | Автор: <b>${author || '—'}</b> | Категория: <b>${category ? CATEGORY_LABELS[category] : '—'}</b> | Название: <b>${title}</b><br>⚠️ Тональность не определена. Выберите вручную:`;
keySuggestions.innerHTML = '';
saveBtn.innerText = '💾 Сохранить';
saveBtn.dataset.detected = 'manual';
}
}
function selectKeySuggestion(key) {
const select = document.getElementById('express-key-select');
select.value = key;
updateKeySuggestionButtons(key);
}
function updateKeySuggestionButtons(selectedKey) {
document.querySelectorAll('.key-suggestion-btn').forEach(btn => {
const btnKey = btn.dataset.key;
if (btnKey === selectedKey) {
btn.style.background = 'rgba(144, 202, 249, 0.5)';
btn.style.border = '2px solid #90caf9';
btn.style.transform = 'scale(1.08)';
btn.style.boxShadow = '0 0 8px rgba(144, 202, 249, 0.6)';
} else {
btn.style.background = 'rgba(144, 202, 249, 0.2)';
btn.style.border = '1px solid rgba(144, 202, 249, 0.6)';
btn.style.transform = 'scale(1)';
btn.style.boxShadow = 'none';
}
});
}
function finalizeExpressAdd(title, chordpro, key, bpm, author = '', category = '') {
  songs.push({ id: getNextId(songs), title, chordpro, key, author: author || '', bpm, category, cloudId: generateCloudId(), createdAt: Date.now(), columns: currentColumns, fontSize }); saveToStorage(); closeModal('modal-express-add'); renderSongs(); alert(`✅ Песня "${title}" добавлена!\nАвтор: ${author || '—'}\nТональность: ${key}\nBPM: ${bpm || '—'}\nКатегория: ${category ? CATEGORY_LABELS[category] : '—'}`); }