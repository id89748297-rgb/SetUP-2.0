function syncColumnsSelects(value) { const sel2 = document.getElementById('columns-select-mobile'); if (sel2) sel2.value = value; const selD = document.getElementById('columns-select-desktop'); if (selD) selD.value = value; }
function updateToggleButtonsUI() {
const chordsIcon = currentHideChords ? '🚫' : '👁️';
const lyricsIcon = currentHideLyrics ? '🚫' : '👁️';
const arrowsIcon = currentHideArrows ? '🚫' : '👁️';
const commentsIcon = currentHideComments ? '🚫' : '👁️';
const ci = document.getElementById('chords-icon');
const li = document.getElementById('lyrics-icon');
const ai = document.getElementById('arrows-icon');
const cmi = document.getElementById('comments-icon');
if (ci) ci.innerText = chordsIcon;
if (li) li.innerText = lyricsIcon;
if (ai) ai.innerText = arrowsIcon;
if (cmi) cmi.innerText = commentsIcon;
}
function applyBodyClasses() {
document.body.classList.toggle('hide-chords', currentHideChords);
document.body.classList.toggle('hide-lyrics', currentHideLyrics);
document.body.classList.toggle('hide-arrows', currentHideArrows);
document.body.classList.toggle('hide-comments', currentHideComments);
}
function toggleAccidental() { currentAccidental = currentAccidental === 'sharp' ? 'flat' : 'sharp'; document.getElementById('btn-accidental').innerText = currentAccidental === 'sharp' ? '♯' : '♭'; updateSongView(); }
function toggleChordsVisibility() { currentHideChords = !currentHideChords; applyBodyClasses(); updateToggleButtonsUI(); updateSongView(); }
function toggleLyricsVisibility() {
currentHideLyrics = !currentHideLyrics;
applyBodyClasses();
updateToggleButtonsUI();
updateSongView();
}
function toggleArrowsVisibility() { currentHideArrows = !currentHideArrows; localStorage.setItem('clc_hide_arrows', currentHideArrows ? 'true' : 'false'); applyBodyClasses(); updateToggleButtonsUI(); }
function toggleCommentsVisibility() { currentHideComments = !currentHideComments; localStorage.setItem('clc_hide_comments', currentHideComments ? 'true' : 'false'); applyBodyClasses(); updateToggleButtonsUI(); }
function toggleToolbarExpand() {
toolbarExpanded = !toolbarExpanded;
const row3 = document.getElementById('toolbar-row-3');
const row4 = document.getElementById('toolbar-row-4');
const icon = document.getElementById('expand-icon');
if (row3) row3.style.display = toolbarExpanded ? 'grid' : 'none';
if (row4) row4.style.display = toolbarExpanded ? 'grid' : 'none';
if (icon) icon.innerText = toolbarExpanded ? '️⬆️' : '⬇️';
}
function toggleTheme() {
const body = document.body;
if (body.classList.contains('dark')) {
body.classList.remove('dark');
body.classList.add('dark-white');
updateThemeButtons('🌑');
localStorage.setItem('clc_theme', 'dark-white');
} else if (body.classList.contains('dark-white')) {
body.classList.remove('dark-white');
body.classList.add('light');
updateThemeButtons('️☀️');
localStorage.setItem('clc_theme', 'light');
} else {
body.classList.remove('light');
body.classList.add('dark');
updateThemeButtons('🌙');
localStorage.setItem('clc_theme', 'dark');
}
}
function renderSongLinks(urls) {
const container = document.getElementById('song-view-links');
if (!container) return;
if (urls.length > 0) {
container.innerHTML = urls.map(url => {
const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
const shortUrl = displayUrl.length > 60 ? displayUrl.substring(0, 57) + '...' : displayUrl;
const safeUrl = url.replace(/"/g, '&quot;');
return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="song-link" onclick="event.stopPropagation()">🔗 ${shortUrl}</a>`;
}).join('');
container.style.display = 'flex';
} else { container.innerHTML = ''; container.style.display = 'none'; }
}
function scrollToSongContent() {
const content = document.getElementById('song-view-content');
if (content) {
const rect = content.getBoundingClientRect();
const offset = window.scrollY + rect.top - 10;
window.scrollTo({ top: Math.max(0, offset), behavior: 'instant' });
}
}
function scrollToSwipeHint() {
const hint = document.getElementById('swipe-hint');
if (hint && hint.style.display !== 'none') {
const rect = hint.getBoundingClientRect();
const offset = window.scrollY + rect.top - 10;
window.scrollTo({ top: Math.max(0, offset), behavior: 'instant' });
} else {
scrollToSongContent();
}
}
function adjustSongHeaderAlignment() {
requestAnimationFrame(() => {
const titleRow = document.getElementById('song-view-title-row');
const titleEl = document.getElementById('song-view-title');
if (titleRow && titleEl) {
titleRow.classList.remove('long');
if (titleEl.scrollWidth > titleRow.clientWidth) titleRow.classList.add('long');
}
const setlistEl = document.getElementById('song-view-setlist-name');
if (setlistEl && setlistEl.style.display !== 'none') {
setlistEl.classList.remove('long');
if (setlistEl.scrollWidth > setlistEl.clientWidth) setlistEl.classList.add('long');
}
});
}
function openSongView(id, slId, fromSwipe = false) {
currentSongId = id; currentSlId = slId; isInlineEditing = false;
document.getElementById('inline-edit-container').style.display = 'none'; document.getElementById('song-view-content').style.display = 'block'; document.querySelector('.song-toolbar').style.display = 'block';
const s = songs.find(x => x.id === id); if (!s) return;
const songUrls = extractUrlsFromChordpro(s.chordpro);
document.getElementById('song-view-title').innerText = s.title;
document.getElementById('song-view-bpm').innerText = s.bpm ? (s.bpm + ' BPM') : '';
document.getElementById('song-view-links').innerHTML = songUrls.map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener" class="song-link">Ссылка</a>`).join('');
document.getElementById('song-view-links').style.display = songUrls.length ? 'block' : 'none';
const setlistNameEl = document.getElementById('song-view-setlist-name');
if (slId) { const sl = setlists.find(x => x.id === slId); setlistNameEl.innerText = sl.name; setlistNameEl.style.display = 'block'; } else { setlistNameEl.style.display = 'none'; }
adjustSongHeaderAlignment();
originalKey = s.key || 'C'; currentCapo = 0;
const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches;
currentColumns = isDesktop ? 2 : (s.columns || 1);
fontSize = s.fontSize || fontSize; currentAccidental = s.accidental || 'sharp'; currentHideChords = s.hideChords || false;
currentHideLyrics = s.hideLyrics || false;
if (slId) { const sl = setlists.find(x => x.id === slId); const item = sl.songs.find(x => x.id === id); if (item) { currentCapo = item.capo || 0; const savedKey = item.key || null; if (!isDesktop) currentColumns = item.columns || s.columns || 1; fontSize = item.fontSize || fontSize; currentKey = savedKey || originalKey; currentAccidental = item.accidental || s.accidental || 'sharp'; currentHideChords = item.hideChords !== undefined ? item.hideChords : (s.hideChords || false); if (item.hideLyrics !== undefined) currentHideLyrics = item.hideLyrics; } else { currentKey = originalKey; } }
else { currentKey = originalKey; }
if (slId) { const sl = setlists.find(x => x.id === slId); if (sl && sl.fromTeamSync) { const pv = personalViewSettings[slId + '_' + id]; if (pv) { if (pv.capo !== undefined) currentCapo = pv.capo; if (pv.fontSize !== undefined) fontSize = pv.fontSize; if (pv.accidental !== undefined) currentAccidental = pv.accidental; if (pv.hideChords !== undefined) currentHideChords = pv.hideChords; if (pv.hideLyrics !== undefined) currentHideLyrics = pv.hideLyrics; if (pv.columns !== undefined && !isDesktop) currentColumns = pv.columns; } } }
fillKeySelect('key-select', currentKey, true); document.getElementById('capo-select').value = currentCapo; syncColumnsSelects(currentColumns);
document.getElementById('btn-accidental').innerText = currentAccidental === 'sharp' ? '♯' : '♭'; document.getElementById('btn-save-all').style.display = 'block';
const sidePrev = document.getElementById('side-prev'); const sideNext = document.getElementById('side-next'); const swipeHint = document.getElementById('swipe-hint');
if (slId) { const sl = setlists.find(x => x.id === slId); const idx = sl.songs.findIndex(x => x.id === id); sidePrev.classList.add('visible'); sideNext.classList.add('visible'); sidePrev.disabled = idx <= 0; sideNext.disabled = idx >= sl.songs.length - 1; swipeHint.style.display = (!isDesktop && sl.songs.length > 1) ? 'block' : 'none'; } else {
const showHomeNav = !isDesktop && homeFilteredSongs.length > 1 && homeSongIndex >= 0;
sidePrev.classList.toggle('visible', showHomeNav);
sideNext.classList.toggle('visible', showHomeNav);
sidePrev.disabled = homeSongIndex <= 0;
sideNext.disabled = homeSongIndex >= homeFilteredSongs.length - 1;
swipeHint.style.display = showHomeNav ? 'block' : 'none';
}
applyBodyClasses(); updateToggleButtonsUI(); toolbarExpanded = false; const row3 = document.getElementById('toolbar-row-3'); const row4 = document.getElementById('toolbar-row-4'); const icon = document.getElementById('expand-icon'); if (row3) row3.style.display = 'none'; if (row4) row4.style.display = 'none'; if (icon) icon.innerText = '⬇️';
const sl = slId ? setlists.find(x => x.id === slId) : null; const item = sl ? sl.songs.find(x => x.id === id) : null;
let effectiveChordpro = (item && item.chordpro) || s.chordpro;
if (sl && sl.teamId && getMyRole(sl.teamId) === 'member') {
const pv = personalViewSettings[sl.id + '_' + id];
if (pv && pv.chordpro !== undefined) effectiveChordpro = pv.chordpro;
}
renderSongContent(effectiveChordpro, originalKey, currentKey, currentCapo);
showPage('page-song-view'); updatePdfOrCopyButton();
requestAnimationFrame(() => {
setTimeout(() => {
if (fromSwipe && slId) {
scrollToSwipeHint();
} else {
window.scrollTo({ top: 0, behavior: 'instant' });
}
}, 50);
});
}
function updatePdfOrCopyButton() { const btn = document.getElementById('btn-pdf-or-copy'); if (window.innerWidth <= 768) btn.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; line-height: 1.1;"><span style="font-size: 20px;">📋</span><span style="font-size: 8px; margin-top: 2px;">копировать</span></div>'; else btn.innerHTML = '📄 PDF'; }
function handlePdfOrCopy() { if (window.innerWidth <= 768) copySongText(); else downloadPdf(); }
function copySongText() { const s = songs.find(x => x.id === currentSongId); if (!s) return; let chordpro = s.chordpro; if (currentSlId) { const sl = setlists.find(x => x.id === currentSlId); const item = sl.songs.find(x => x.id === currentSongId); if (item && item.chordpro) chordpro = item.chordpro; } let result = `${s.title}\n`; if (s.author) result += `Автор: ${s.author}\n`; result += `Тональность: ${currentKey}\n`; chordpro.split('\n').forEach(line => { const t = line.trim(); if (t === '') { result += '\n'; return; } const p = parseMixedLine(t); if (p.chords && p.text) result += `${p.chords}\n${p.text}\n`; else if (p.chords) result += `${p.chords}\n`; else if (p.text) result += `${p.text}\n`; }); if (navigator.clipboard?.writeText) navigator.clipboard.writeText(result).then(() => alert('✅ Скопировано!')).catch(() => fallbackCopyText(result)); else fallbackCopyText(result); }
function fallbackCopyText(text) { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); alert('✅ Скопировано!'); } catch { alert('❌ Не удалось'); } document.body.removeChild(ta); }
function toggleInlineEdit() {
if (isInlineEditing) { cancelInlineEdit(); return; }
const s = songs.find(x => x.id === currentSongId);
if (!s) return;
let text = s.chordpro;
if (currentSlId) {
const sl = setlists.find(x => x.id === currentSlId);
const item = sl.songs.find(x => x.id === currentSongId);
if (item && item.chordpro) text = item.chordpro;
if (sl.teamId && getMyRole(sl.teamId) === 'member') {
const pv = personalViewSettings[sl.id + '_' + currentSongId];
if (pv && pv.chordpro !== undefined) text = pv.chordpro;
}
}
const ta = document.getElementById('inline-edit-textarea');
ta.value = text;
ta.style.fontSize = fontSize + 'px';
ta.style.lineHeight = '1.4';
document.getElementById('inline-edit-container').style.display = 'block';
document.getElementById('song-view-content').style.display = 'none';
isInlineEditing = true;
}
function cancelInlineEdit() { document.getElementById('inline-edit-container').style.display = 'none'; document.getElementById('song-view-content').style.display = 'block'; isInlineEditing = false; }
function resizeInlineEdit(delta) { fontSize = Math.max(8, Math.min(32, fontSize + delta)); document.getElementById('inline-edit-textarea').style.fontSize = fontSize + 'px'; }
function saveInlineEdit() {
const newChordpro = document.getElementById('inline-edit-textarea').value;
if (currentSlId) {
const sl = setlists.find(x => x.id === currentSlId);
const item = sl.songs.find(x => x.id === currentSongId);
if (item) {
if (sl.teamId && getMyRole(sl.teamId) === 'member') {
const key = sl.id + '_' + currentSongId;
personalViewSettings[key] = { ...(personalViewSettings[key] || {}), chordpro: newChordpro };
saveToStorage();
alert('✅ Сохранено только у вас — эта правка не будет видна другим участникам команды');
} else {
item.chordpro = newChordpro;
saveToStorage();
if (sl.teamId) {
syncSetlistIfTeam(sl);
alert('✅ Сохранено и отправлено в команду!');
} else {
alert('✅ Сохранено локально!');
}
}
}
} else {
const song = songs.find(x => x.id === currentSongId);
if (song) { song.chordpro = newChordpro; saveToStorage(); alert('✅ Песня сохранена!'); }
}
cancelInlineEdit();
openSongView(currentSongId, currentSlId);
}
function saveAllSettings() {
if (!currentSongId) { alert("❌ Ошибка"); return; }
if (currentSlId) {
const sl = setlists.find(x => x.id === currentSlId);
if (sl) {
const item = sl.songs.find(x => x.id === currentSongId);
if (item) {
item.key = currentKey;
item.capo = currentCapo;
item.fontSize = fontSize;
item.accidental = currentAccidental;
item.hideChords = currentHideChords;
item.hideLyrics = currentHideLyrics;
sl.songs.forEach(it => { it.columns = currentColumns; });
if (sl.fromTeamSync) {
personalViewSettings[sl.id + '_' + currentSongId] = { capo: currentCapo, fontSize, accidental: currentAccidental, hideChords: currentHideChords, hideLyrics: currentHideLyrics, columns: currentColumns };
}
saveToStorage();
syncSetlistIfTeam(sl);
saveDefaultSettings();
alert(`✅ Сохранено ЛОКАЛЬНО (в этом сет-листе):\nТональность: ${currentKey}\nCapo: ${currentCapo}\nКолонки: ${currentColumns}\nРазмер: ${fontSize}\nТекст: ${currentHideLyrics ? 'скрыт' : 'виден'}`);
return;
}
}
}
const song = songs.find(x => x.id === currentSongId);
if (song) {
songs.forEach(s => { s.columns = currentColumns; });
song.fontSize = fontSize;
song.accidental = currentAccidental;
song.hideChords = currentHideChords;
song.hideLyrics = currentHideLyrics;
saveToStorage();
saveDefaultSettings();
alert(`✅ Сохранено для ВСЕХ песен:\nКолонки: ${currentColumns}\nРазмер: ${fontSize}\n♯/♭: ${currentAccidental}\nАккорды: ${currentHideChords ? 'скрыты' : 'видны'}\nТекст: ${currentHideLyrics ? 'скрыт' : 'виден'}`);
renderSongs();
}
}
function goBackFromSong() { if (currentSlId) showPage('page-setlist-detail'); else { showPage('page-home'); setCarouselIndex(0, true); } }
function prevSong() {
if (currentSlId) {
const sl = setlists.find(x => x.id === currentSlId);
const idx = sl.songs.findIndex(x => x.id === currentSongId);
if (idx > 0) openSongView(sl.songs[idx - 1].id, currentSlId, true);
} else if (homeFilteredSongs.length > 0 && homeSongIndex > 0) {
homeSongIndex--;
openSongView(homeFilteredSongs[homeSongIndex].id, null);
}
}
function nextSong() {
if (currentSlId) {
const sl = setlists.find(x => x.id === currentSlId);
const idx = sl.songs.findIndex(x => x.id === currentSongId);
if (idx < sl.songs.length - 1) openSongView(sl.songs[idx + 1].id, currentSlId, true);
} else if (homeFilteredSongs.length > 0 && homeSongIndex < homeFilteredSongs.length - 1) {
homeSongIndex++;
openSongView(homeFilteredSongs[homeSongIndex].id, null);
}
}
function changeKey(value) { currentKey = value; updateSongView(); }
function changeCapo(value) { currentCapo = parseInt(value); updateSongView(); }
function changeColumns(value) { currentColumns = parseInt(value); syncColumnsSelects(value); updateSongView(); if (!window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches) { const s = songs.find(x => x.id === currentSongId); if (s) { s.columns = currentColumns; saveToStorage(); } if (currentSlId) { const sl = setlists.find(x => x.id === currentSlId); if (sl) { sl.songs.forEach(it => { it.columns = currentColumns; }); if (sl.fromTeamSync) { const key = sl.id + '_' + currentSongId; personalViewSettings[key] = { ...(personalViewSettings[key] || {}), columns: currentColumns }; } saveToStorage(); syncSetlistIfTeam(sl); } } } }
function updateSongView() { const s = songs.find(x => x.id === currentSongId); if (!s) return; let text = s.chordpro; if (currentSlId) { const sl = setlists.find(x => x.id === currentSlId); const item = sl?.songs.find(x => x.id === currentSongId); if (item?.chordpro) text = item.chordpro; }
renderSongLinks(extractUrlsFromChordpro(text));
renderSongContent(text, originalKey, currentKey, currentCapo);
}
function saveSectionNote(songId, sectionIdx, value) { if (!sectionNotes[songId]) sectionNotes[songId] = {}; if (value.trim() === '') { delete sectionNotes[songId][sectionIdx]; if (!Object.keys(sectionNotes[songId]).length) delete sectionNotes[songId]; } else sectionNotes[songId][sectionIdx] = value.substring(0, 12); saveToStorage(); }
function saveInlineComment(songId, sectionIdx, lineIdx, value) { if (!inlineComments[songId]) inlineComments[songId] = {}; const key = `${sectionIdx}_${lineIdx}`; if (value.trim() === '') { delete inlineComments[songId][key]; if (!Object.keys(inlineComments[songId]).length) delete inlineComments[songId]; } else inlineComments[songId][key] = value.substring(0, 12); saveToStorage(); }
function compactChords(chords) {
if (!currentHideLyrics) return chords;
return chords.replace(/\s+/g, ' ').trim();
}
function renderSongContent(text, fromKey, toKey, capo) {
const lines = text.split('\n'); const columnsClass = currentColumns === 2 ? 'song-columns-2' : 'song-columns-1';
let html = `<div class="${columnsClass}">`; let sectionContent = '', sectionIdx = 0, lineIdx = 0, sectionStartLine = -1; const songId = currentSongId;
let foundFirstNonEmpty = false;
function flushSection() { if (sectionContent) { const noteValue = (sectionNotes[songId] && sectionNotes[songId][sectionIdx]) || ''; html += `<div class="song-section" data-section-idx="${sectionIdx}" data-start-line="${sectionStartLine}"><input type="text" class="section-note-input" maxlength="12" value="${noteValue.replace(/"/g, '&quot;')}" oninput="saveSectionNote(${songId}, ${sectionIdx}, this.value)" placeholder="..." />${sectionContent}</div>`; sectionContent = ''; sectionIdx++; } }
lines.forEach((line, lineNum) => {
const trimmed = line.trim();
const isFirstNonEmpty = !foundFirstNonEmpty && trimmed !== '';
if (isFirstNonEmpty) foundFirstNonEmpty = true;
if (shouldSkipLineForRender(line, isFirstNonEmpty)) return;
if (trimmed.toLowerCase() === 'картинка:' || trimmed.toLowerCase() === 'image:') { flushSection(); const imageKey = `img_${songId}_${lineNum}`; const songForImage = songs.find(x => x.id === songId); const imgEntry = songForImage && songForImage.images && songForImage.images[imageKey]; const savedImage = imgEntry ? imgEntry.data : null; const commentKey = imageKey + '_comment'; const savedComment = imgEntry ? (imgEntry.comment || '') : ''; if (savedImage) html += `<div class="song-image-container"><div class="song-image-comment" contenteditable="true" onfocus="if(this.innerText==='${IMAGE_COMMENT_PLACEHOLDER}')this.innerText=''" onblur="saveImageComment('${commentKey}', this.innerText, this)" oninput="saveImageComment('${commentKey}', this.innerText, this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onclick="event.stopPropagation();">${savedComment || IMAGE_COMMENT_PLACEHOLDER}</div><img src="${escapeHtml(savedImage)}" alt="Изображение" onclick="showImageDeleteModal('${imageKey}')"></div>`; else html += `<div class="song-image-container"><div class="song-image-comment" contenteditable="true" onfocus="if(this.innerText==='${IMAGE_COMMENT_PLACEHOLDER}')this.innerText=''" onblur="saveImageComment('${commentKey}', this.innerText, this)" oninput="saveImageComment('${commentKey}', this.innerText, this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onclick="event.stopPropagation();">${IMAGE_COMMENT_PLACEHOLDER}</div><label class="song-image-upload">📷 Загрузить<input type="file" accept="image/*" onchange="uploadSongImage(this, '${imageKey}')"></label></div>`; sectionIdx++; return; }
const sectionMatch = trimmed.match(SECTION_RE);
if (sectionMatch) { flushSection(); sectionStartLine = lineNum; const colonIndex = trimmed.indexOf(':'); let mainPart, extraPart = ''; if (colonIndex !== -1) { mainPart = trimmed.substring(0, colonIndex + 1).toUpperCase(); extraPart = trimmed.substring(colonIndex + 1).trim(); } else mainPart = trimmed.toUpperCase(); sectionContent += `<div class="section-label" style="font-size: ${fontSize}px;">${mainPart}`; 
if (extraPart) sectionContent += ` <span class="section-extra">${escapeHtml(extraPart)}</span>`; sectionContent += `</div>`; lineIdx = 0; }
else if (trimmed !== '') { if (sectionStartLine === -1) sectionStartLine = lineNum; const parsed = parseMixedLine(line); if (parsed.chords || parsed.text || parsed.rightNote) { const commentKey = `${sectionIdx}_${lineIdx}`; const savedComment = (inlineComments[songId] && inlineComments[songId][commentKey]) || ''; sectionContent += '<div class="section-block"><div class="main-content" style="white-space: pre-wrap;">'; if (parsed.chords && parsed.text) { let dc = fromKey !== toKey ? transposeLine(escapeHtml(parsed.chords), fromKey, toKey) : escapeHtml(parsed.chords); if (capo > 0) dc = transposeLine(dc, toKey, NOTES_SHARP[((NOTES_SHARP.indexOf(toKey) - capo) % 12 + 12) % 12]); dc = processChordLabels(dc); dc = convertLineAccidentals(dc, currentAccidental); dc = compactChords(dc); sectionContent += `<span class="chords-above" style="font-size: ${fontSize}px;"><b>${dc}</b></span> <span class="lyrics-below" style="font-size: ${fontSize}px; display: inline;">${processAccentWords(escapeHtml(parsed.text))}</span>`; } else if (parsed.chords) { let dc = fromKey !== toKey ? transposeLine(escapeHtml(parsed.chords), fromKey, toKey) : escapeHtml(parsed.chords); if (capo > 0) dc = transposeLine(dc, toKey, NOTES_SHARP[((NOTES_SHARP.indexOf(toKey) - capo) % 12 + 12) % 12]); dc = processChordLabels(dc); dc = convertLineAccidentals(dc, currentAccidental); dc = compactChords(dc); sectionContent += `<span class="chords-above" style="font-size: ${fontSize}px;"><b>${dc}</b></span>`; } else if (parsed.text) sectionContent += `<span class="lyrics-below" style="font-size: ${fontSize}px; display: inline;">${processAccentWords(escapeHtml(parsed.text))}</span>`; sectionContent += '</div>'; if (parsed.rightNote) sectionContent += `<div class="right-note" style="font-size: ${fontSize}px;">${escapeHtml(parsed.rightNote)}</div>`; if (parsed.inlineComment) sectionContent += `<input type="text" class="inline-comment-input" maxlength="12" value="${savedComment.replace(/"/g, '&quot;')}" oninput="saveInlineComment(${songId}, ${sectionIdx}, ${lineIdx}, this.value)" placeholder="..." />`; sectionContent += '</div>'; lineIdx++; } }
});
flushSection(); html += '</div>'; document.getElementById('song-view-content').innerHTML = html;
const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches; const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints;
document.querySelectorAll('.song-section').forEach(section => {
const startLine = parseInt(section.dataset.startLine);
if (isTouch && !isDesktop) {
let pt;
section.addEventListener('touchstart', (e) => {
if (e.target.tagName === 'INPUT') return;
section.dataset.lpStartX = e.touches[0].clientX;
section.dataset.lpStartY = e.touches[0].clientY;
section.dataset.lpMoved = 'false';
pt = setTimeout(() => {
if (section.dataset.lpMoved !== 'true') {
openSectionEditorByLine(startLine);
if (navigator.vibrate) navigator.vibrate(20);
}
}, 2000);
}, { passive: true });
section.addEventListener('touchmove', (e) => {
if (!e.touches[0]) return;
const startX = parseFloat(section.dataset.lpStartX);
const startY = parseFloat(section.dataset.lpStartY);
const dx = Math.abs(e.touches[0].clientX - startX);
const dy = Math.abs(e.touches[0].clientY - startY);
if (dx > 10 || dy > 10) {
section.dataset.lpMoved = 'true';
clearTimeout(pt);
}
}, { passive: true });
section.addEventListener('touchend', () => clearTimeout(pt));
section.addEventListener('touchcancel', () => clearTimeout(pt));
}
if (isDesktop) section.addEventListener('dblclick', (e) => {
if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.closest('button, select, input, .song-image-comment')) return;
openSectionEditorByLine(startLine);
});
});
}
function openSectionEditorByLine(startLine) {
savedScrollPosition = window.scrollY;
const s = songs.find(x => x.id === currentSongId); if (!s) return;
let text = s.chordpro;
if (currentSlId) { const sl = setlists.find(x => x.id === currentSlId); const item = sl?.songs.find(x => x.id === currentSongId); if (item?.chordpro) text = item.chordpro; }
const lines = text.split('\n');
let actualStartLine = startLine;
while (actualStartLine < lines.length && !lines[actualStartLine].trim().match(SECTION_RE)) { actualStartLine++; }
if (actualStartLine >= lines.length) return;
let sectionLines = [], endIdx = lines.length;
for (let i = actualStartLine + 1; i < lines.length; i++) { if (lines[i].trim().match(SECTION_RE)) { endIdx = i; break; } sectionLines.push(lines[i]); }
editingSectionStartLine = actualStartLine;
editingSectionEndLine = endIdx;
document.getElementById('section-edit-label').value = lines[actualStartLine].trim();
document.getElementById('section-edit-content').value = sectionLines.join('\n');
document.getElementById('modal-section-edit').classList.add('show');
}
function saveSectionEdit() {
const s = songs.find(x => x.id === currentSongId); if (!s) return;
let text = s.chordpro;
if (currentSlId) { const sl = setlists.find(x => x.id === currentSlId); const item = sl?.songs.find(x => x.id === currentSongId); if (item?.chordpro) text = item.chordpro; }
const lines = text.split('\n');
const newLabel = document.getElementById('section-edit-label').value.trim();
const newContent = document.getElementById('section-edit-content').value;
if (editingSectionStartLine < 0) return;
const newLines = [...lines];
newLines.splice(editingSectionStartLine, editingSectionEndLine - editingSectionStartLine, newLabel, newContent);
const newText = newLines.join('\n');
if (currentSlId) { const sl = setlists.find(x => x.id === currentSlId); const item = sl?.songs.find(x => x.id === currentSongId); if (item) item.chordpro = newText; }
else s.chordpro = newText;
saveToStorage();
closeModal('modal-section-edit');
openSongView(currentSongId, currentSlId);
const scrollPosToRestore = savedScrollPosition;
requestAnimationFrame(() => { setTimeout(() => { window.scrollTo(0, scrollPosToRestore); }, 50); });
}
function uploadSongImage(input, imageKey) {
const file = input.files[0];
if (!file) return;
const song = songs.find(x => x.id === currentSongId);
if (!song) return;
const sl = currentSlId ? setlists.find(x => x.id === currentSlId) : null;
if (sl && sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); input.value = ''; return; }
compressSongImage(file, (dataUrl) => {
if (!song.images) song.images = {};
const existingComment = (song.images[imageKey] && song.images[imageKey].comment) || '';
song.images[imageKey] = { data: dataUrl, comment: existingComment };
saveToStorage();
if (sl && sl.teamId) syncSetlistIfTeam(sl);
openSongView(currentSongId, currentSlId);
});
}
function saveImageComment(commentKey, value) { const imageKey = commentKey.replace(/_comment$/, ''); const song = songs.find(x => x.id === currentSongId); if (!song || !song.images || !song.images[imageKey]) return; song.images[imageKey].comment = (value.trim() === '' || value === IMAGE_COMMENT_PLACEHOLDER) ? '' : value.trim(); saveToStorage(); }
function showImageDeleteModal(imageKey) {
const sl = currentSlId ? setlists.find(x => x.id === currentSlId) : null;
if (sl && sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
currentImageKey = imageKey;
document.getElementById('modal-image-delete').classList.add('show');
document.getElementById('btn-confirm-delete-image').onclick = () => {
if (currentImageKey) {
const song = songs.find(x => x.id === currentSongId);
if (song && song.images) delete song.images[currentImageKey];
saveToStorage();
if (sl && sl.teamId) syncSetlistIfTeam(sl);
openSongView(currentSongId, currentSlId);
closeModal('modal-image-delete');
currentImageKey = null;
}
};
}
function changeFontSize(d) { fontSize = Math.max(8, Math.min(32, fontSize + d)); updateSongView(); }
function downloadPdf() { const s = songs.find(x => x.id === currentSongId); if (!s) return; let chordpro = s.chordpro, key = s.key; if (currentSlId) { const sl = setlists.find(x => x.id === currentSlId); const item = sl?.songs.find(x => x.id === currentSongId); if (item) { if (item.chordpro) chordpro = item.chordpro; if (item.key) key = item.key; if (item.capo > 0 && key) { key = NOTES_SHARP[((NOTES_SHARP.indexOf(key) + item.capo) % 12 + 12) % 12]; chordpro = transposeChordproText(chordpro, s.key, key); } } } let bodyHtml = '<div class="pdf-body">'; chordpro.split('\n').forEach(line => { const t = line.trim(); if (t.match(SECTION_RE)) bodyHtml += `<div class="pdf-section">${t.toUpperCase()}</div>`; else if (t) { const p = parseMixedLine(t); if (p.chords && p.text) bodyHtml += `<div class="pdf-line"><b>${p.chords}</b> ${processAccentWords(p.text)}</div>`; else if (p.chords) bodyHtml += `<div class="pdf-chords">${p.chords}</div>`; else if (p.text) bodyHtml += `<div class="pdf-text">${processAccentWords(p.text)}</div>`; if (p.rightNote) bodyHtml += `<div class="pdf-note">${p.rightNote}</div>`; } }); bodyHtml += '</div>'; const pw = window.open('', '_blank'); if (!pw) { alert('Разрешите всплывающие окна'); return; } pw.document.open(); pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${s.title}</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pdf-header{text-align:center;margin-bottom:8mm}.pdf-header h1{font-size:16px;margin:0 0 3px}.pdf-header .meta{font-size:11px;color:#333}.pdf-body{width:190mm;margin:0 auto;column-count:2;column-gap:8mm;column-fill:balance;font-size:11px;line-height:1.35}.pdf-section{font-size:12px;font-weight:bold;text-transform:uppercase;margin-top:3mm;margin-bottom:1mm;break-after:avoid}.pdf-line,.pdf-chords,.pdf-text{margin-bottom:1.5mm;break-inside:avoid}.pdf-note{display:inline-block;border:1px solid #000;padding:1px 5px;font-weight:bold;font-size:10px;margin-left:3mm}@media print{.pdf-body{width:190mm!important;column-count:2!important;column-fill:balance!important}}</style></head><body><div class="pdf-header"><h1>${s.title}</h1><p class="meta">${s.author ? `Автор: ${s.author}<br>` : ''}Тональность: ${key || '—'}${s.bpm ? ` · BPM: ${s.bpm}` : ''}</p></div>${bodyHtml}<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print()},300)})<\/script></body></html>`); pw.document.close(); }