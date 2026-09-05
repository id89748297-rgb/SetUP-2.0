function loadFromStorage() {
try { songs = JSON.parse(localStorage.getItem('clc_songs') || '[]'); setlists = JSON.parse(localStorage.getItem('clc_setlists') || '[]'); sectionNotes = JSON.parse(localStorage.getItem('clc_section_notes') || '{}'); inlineComments = JSON.parse(localStorage.getItem('clc_inline_comments') || '{}'); teams = JSON.parse(localStorage.getItem('clc_teams') || '[]'); personalViewSettings = JSON.parse(localStorage.getItem('clc_personal_view_settings') || '{}'); } catch { songs = []; setlists = []; sectionNotes = {}; inlineComments = {}; teams = []; personalViewSettings = {}; }
try {
const teamCache = JSON.parse(localStorage.getItem('clc_team_cache') || '{}');
if (teamCache.songs) songs = songs.concat(teamCache.songs);
if (teamCache.setlists) setlists = setlists.concat(teamCache.setlists);
} catch {}
try { teamRolesCache = JSON.parse(localStorage.getItem('clc_team_roles_cache') || '{}'); } catch {}
try { setlistStatusCache = JSON.parse(localStorage.getItem('clc_setlist_status_cache') || '{}'); } catch {}
try { chatReadsCache = JSON.parse(localStorage.getItem('clc_chat_reads_cache') || '{}'); } catch {}
try { pinnedTeams = JSON.parse(localStorage.getItem('clc_pinned_teams') || '[]'); } catch {}
const savedTheme = localStorage.getItem('clc_theme');
if (savedTheme === 'light') {
document.body.classList.remove('dark');
document.body.classList.remove('dark-white');
document.body.classList.add('light');
updateThemeButtons('☀️');
} else if (savedTheme === 'dark-white') {
document.body.classList.remove('dark');
document.body.classList.remove('light');
document.body.classList.add('dark-white');
updateThemeButtons('🌑');
} else {
document.body.classList.add('dark');
document.body.classList.remove('light');
document.body.classList.remove('dark-white');
updateThemeButtons('🌙');
}
const savedColor = localStorage.getItem('clc_color');
if (savedColor === 'violet') document.body.classList.add('violet'); else document.body.classList.remove('violet');
currentHideArrows = localStorage.getItem('clc_hide_arrows') === 'true';
currentHideComments = localStorage.getItem('clc_hide_comments') === 'true';
const savedState = JSON.parse(localStorage.getItem('clc_state') || '{}');
if (savedState.page === 'page-song-view' && savedState.songId) { currentSongId = savedState.songId; currentSlId = savedState.slId || null; if (savedState.slId) { openSetlistDetail(savedState.slId); } showPage('page-song-view'); openSongView(savedState.songId, savedState.slId); }
else if (savedState.page === 'page-setlist-detail' && savedState.slId) { currentSlId = savedState.slId; showPage('page-setlist-detail'); openSetlistDetail(savedState.slId); }
const savedDefaults = JSON.parse(localStorage.getItem('clc_defaults') || '{}');
if (savedDefaults.fontSize) fontSize = savedDefaults.fontSize;
if (savedDefaults.columns) currentColumns = savedDefaults.columns;
const savedSort = localStorage.getItem('clc_songs_sort');
if (savedSort) { const sel = document.getElementById('songs-sort'); if (sel) sel.value = savedSort; }
const savedCategoryFilter = localStorage.getItem('clc_category_filter');
if (savedCategoryFilter) { const sel = document.getElementById('category-filter'); if (sel) sel.value = savedCategoryFilter; }
}
function saveToStorage() { localStorage.setItem('clc_songs', JSON.stringify(songs.filter(s => !s.fromTeam))); localStorage.setItem('clc_setlists', JSON.stringify(setlists.filter(sl => !sl.fromTeamSync))); localStorage.setItem('clc_section_notes', JSON.stringify(sectionNotes)); localStorage.setItem('clc_inline_comments', JSON.stringify(inlineComments)); localStorage.setItem('clc_teams', JSON.stringify(teams)); localStorage.setItem('clc_personal_view_settings', JSON.stringify(personalViewSettings)); localStorage.setItem('clc_team_cache', JSON.stringify({ songs: songs.filter(s => s.fromTeam), setlists: setlists.filter(sl => sl.fromTeamSync) })); }
function updateThemeButtons(icon) {
document.querySelectorAll('.theme-toggle').forEach(b => b.innerText = icon);
}
function saveAppState() {
const activePage = document.querySelector('.page.active');
const membersModal = document.getElementById('modal-team-members');
const membersModalTeamId = (membersModal && membersModal.classList.contains('show')) ? currentMembersTeamId : null;
localStorage.setItem('clc_state', JSON.stringify({ page: activePage ? activePage.id : 'page-home', songId: currentSongId, slId: currentSlId, homeView: currentHomeView, tab: currentTab, carouselIdx: carouselActiveIndex, membersModalTeamId }));
}
function saveDefaultSettings() { localStorage.setItem('clc_defaults', JSON.stringify({ fontSize, columns: currentColumns })); }
function toggleColorTheme() { if (document.body.classList.contains('violet')) { document.body.classList.remove('violet'); localStorage.setItem('clc_color', 'blue'); } else { document.body.classList.add('violet'); localStorage.setItem('clc_color', 'violet'); } }
function showPage(id) {
    // ✅ СКРЫВАЕМ ВСЕ СТРАНИЦЫ ПЕРЕД ПОКАЗОМ НОВОЙ
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(id);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    if(id === 'page-home') {
        activateCarouselItem(carouselActiveIndex);
    }
    window.scrollTo(0, 0);
    saveAppState();
}
function showInstruction(show) { if (show) { showPage('page-instruction'); } else { setCarouselIndex(0, true); showPage('page-home'); } }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function fillKeySelect(selectId, selectedValue, showOriginal) {
const select = document.getElementById(selectId); select.innerHTML = '';
NOTES_SHARP.forEach(key => { const option = document.createElement('option'); option.value = key; option.textContent = (showOriginal && key === originalKey) ? key + ' (Original)' : key; option.selected = (key === selectedValue); select.appendChild(option); });
}
function showDeleteConfirm(type, id, name, callback) { document.getElementById('delete-item-name').innerText = name; document.getElementById('btn-confirm-delete').onclick = () => { callback(); closeModal('modal-delete-confirm'); }; document.getElementById('modal-delete-confirm').classList.add('show'); }
function getUniqueAuthors() { const authors = new Set(); songs.forEach(s => { if (s.author && s.author.trim()) authors.add(s.author.trim()); }); return Array.from(authors).sort(); }
function showAuthorSuggestions() { const input = document.getElementById('edit-author'); const value = input.value.toLowerCase().trim(); const container = document.getElementById('author-suggestions'); if (!value) { container.style.display = 'none'; return; } const authors = getUniqueAuthors().filter(a => a.toLowerCase().includes(value)); if (authors.length === 0) { container.style.display = 'none'; return; } container.innerHTML = ''; authors.forEach(author => { const div = document.createElement('div'); div.className = 'author-suggestion-item'; div.innerText = author; div.onmousedown = (e) => { e.preventDefault(); input.value = author; container.style.display = 'none'; }; container.appendChild(div); }); container.style.display = 'block'; }
function hideAuthorSuggestions() { document.getElementById('author-suggestions').style.display = 'none'; }
function clearSearchAndOpenSong(songId) {
const searchBox = document.getElementById('songs-search');
if (searchBox) searchBox.value = '';
homeSongIndex = homeFilteredSongs.findIndex(s => s.id === songId);
openSongView(songId, null);
}
function sortSongs(list, sortType) {
const sorted = [...list];
switch (sortType) {
case 'az': sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru')); break;
case 'za': sorted.sort((a, b) => b.title.localeCompare(a.title, 'ru')); break;
case 'new': sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); break;
case 'old': sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); break;
case 'author': sorted.sort((a, b) => (a.author || '').localeCompare(b.author || '', 'ru') || a.title.localeCompare(b.title, 'ru')); break;
case 'key': sorted.sort((a, b) => (a.key || '').localeCompare(b.key || '', 'ru') || a.title.localeCompare(b.title, 'ru')); break;
case 'bpm-asc': sorted.sort((a, b) => (parseInt(a.bpm) || 9999) - (parseInt(b.bpm) || 9999)); break;
case 'bpm-desc': sorted.sort((a, b) => (parseInt(b.bpm) || 0) - (parseInt(a.bpm) || 0)); break;
default: sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
}
return sorted;
}
function renderSongs() {
const q = (document.getElementById('songs-search')?.value || '').toLowerCase();
const sortType = document.getElementById('songs-sort')?.value || 'az';
const categoryFilter = document.getElementById('category-filter')?.value || '';
localStorage.setItem('clc_songs_sort', sortType);
localStorage.setItem('clc_category_filter', categoryFilter);
const list = document.getElementById('songs-list'); list.innerHTML = '';
let filtered = songs.filter(s => !s.fromTeam).filter(s => s.title.toLowerCase().includes(q) || (s.chordpro && s.chordpro.toLowerCase().includes(q)) || (s.author && s.author.toLowerCase().includes(q)));
if (categoryFilter === 'none') {
filtered = filtered.filter(s => !s.category || s.category === '');
} else if (categoryFilter) {
filtered = filtered.filter(s => s.category === categoryFilter);
}
const sorted = sortSongs(filtered, sortType);
homeFilteredSongs = sorted;
const countLabel = document.getElementById('songs-count-label');
const countText = categoryFilter === 'fast' ? '🔥 Быстрые' : categoryFilter === 'medium' ? '🎵 Средние' : categoryFilter === 'slow' ? '🧎 Медленные' : categoryFilter === 'none' ? 'Без категории' : 'Все песни';
if (countLabel) countLabel.innerText = countText;
document.getElementById('songs-count').innerText = sorted.length;
sorted.forEach(s => { const keyLabel = s.key ? ` <span style="color:#90caf9; font-size:12px;">[${s.key}]</span>` : ''; const authorText = s.author ? `<div style="color:#888; font-size:8px;">${escapeHtml(s.author)}</div>` : ''; const categoryIcon = s.category && CATEGORY_ICONS[s.category] ? `<div style="display: flex; flex-direction: column; align-items: center; margin-left: 8px;"><div style="font-size: 18px;">${CATEGORY_ICONS[s.category]}</div>${s.bpm ? `<div style="color:#888; font-size:8px;">${s.bpm} BPM</div>` : ''}</div>` : (s.bpm ? `<div style="display: flex; flex-direction: column; align-items: center; margin-left: 8px;"><div style="color:#888; font-size:8px;">${s.bpm} BPM</div></div>` : ''); const div = document.createElement('div'); div.className = 'list-item'; div.style.cursor = 'default'; div.innerHTML = `<div class="item-left" style="min-width: 0; flex: 1; display: flex; align-items: center;"><div style="min-width: 0; flex: 1;"><div class="item-title" style="max-height: 2.6em; line-height: 1.3;">${escapeHtml(s.title)}${keyLabel}</div>${authorText}</div>${categoryIcon}</div><div class="item-actions" style="display: flex; gap: 4px;"><button class="btn-icon" onclick="event.stopPropagation(); openMainSongEditor(${s.id})">✏️</button><button class="btn-icon" onclick="event.stopPropagation(); confirmDeleteSong(${s.id}, '${s.title.replace(/'/g, "\\'")}')">🗑️</button></div>`; div.onclick = () => clearSearchAndOpenSong(s.id); list.appendChild(div); const titleEl = div.querySelector('.item-title'); if (titleEl && titleEl.scrollHeight > titleEl.clientHeight) { titleEl.style.fontSize = '12px'; } });
updateCarouselBadges();
}
function confirmDeleteSong(id, name) { showDeleteConfirm('song', id, `Песню "${name}"`, () => { songs = songs.filter(s => s.id !== id); setlists.forEach(sl => sl.songs = sl.songs.filter(x => x.id !== id)); if (sectionNotes[id]) delete sectionNotes[id]; if (inlineComments[id]) delete inlineComments[id]; saveToStorage(); renderSongs(); }); }
function openMainSongEditor(id = null) { currentSongId = id; openSongEditor(id, false); }
function openSongEditor(id = null, isFromSetlist = false) {
currentSongId = id; isLocalEdit = isFromSetlist;
let title = '', chordpro = '', key = '', author = '', bpm = '', category = '';
if (id === null && !isFromSetlist) { isLocalEdit = false; document.getElementById('song-edit-title').innerText = '➕ Новая песня'; document.getElementById('edit-title').value = ''; document.getElementById('edit-author').value = ''; document.getElementById('edit-bpm').value = ''; document.getElementById('edit-category').value = ''; document.getElementById('edit-text').value = ''; document.getElementById('edit-key').value = ''; showPage('page-song-edit'); return; }
if (isFromSetlist && currentSlId && id) { const s = songs.find(x => x.id === id); const sl = setlists.find(x => x.id === currentSlId); const item = sl.songs.find(x => x.id === id); title = s.title; key = s.key || ''; author = s.author || ''; bpm = s.bpm || ''; category = s.category || ''; if (item && item.chordpro) { chordpro = item.chordpro; document.getElementById('song-edit-title').innerText = '✏️ Локальное редактирование'; } else { chordpro = s.chordpro; document.getElementById('song-edit-title').innerText = '✏️ Создать локальную версию'; } }
else if (id) { const s = songs.find(x => x.id === id); if (s) { title = s.title; chordpro = s.chordpro; key = s.key || ''; author = s.author || ''; bpm = s.bpm || ''; category = s.category || ''; } isLocalEdit = false; document.getElementById('song-edit-title').innerText = '✏️ Глобальное редактирование'; }
document.getElementById('edit-title').value = title; document.getElementById('edit-author').value = author; document.getElementById('edit-bpm').value = bpm; document.getElementById('edit-category').value = category; document.getElementById('edit-text').value = chordpro; document.getElementById('edit-key').value = key; showPage('page-song-edit');
}
function goBackFromSongEdit() {
if (isLocalEdit && currentSlId) {
showPage('page-setlist-detail');
} else {
showPage('page-home');
if (currentHomeView !== 'songs') { const idx = carouselItems.findIndex(i => i.type === 'songs'); if (idx !== -1) setCarouselIndex(idx, true); }
}
}
function saveSong() {
const title = document.getElementById('edit-title').value.trim(); const author = document.getElementById('edit-author').value.trim(); const bpm = document.getElementById('edit-bpm').value.trim(); const category = document.getElementById('edit-category').value; const chordpro = document.getElementById('edit-text').value; const key = document.getElementById('edit-key').value;
if (!title) { alert('Введите название!'); return; } if (!key) { alert('Выберите тональность!'); return; } if (!chordpro.trim()) { alert('Введите текст!'); return; }
const existingSong = songs.find(s => !s.fromTeam && s.title.toLowerCase() === title.toLowerCase() && s.id !== currentSongId);
if (existingSong) { alert(`⚠️ Песня "${title}" уже существует!`); return; }
if (isLocalEdit && currentSlId) { const sl = setlists.find(x => x.id === currentSlId); const item = sl.songs.find(x => x.id === currentSongId); if (item) item.chordpro = chordpro; saveToStorage(); alert('✅ Сохранено локально!'); }
else { let song = songs.find(x => x.id === currentSongId);if (song) {
song.title = title;
song.chordpro = chordpro;
song.key = key;
song.author = author;
song.bpm = bpm;
song.category = category;
song.updatedAt = Date.now();
} else { songs.push({id: getNextId(songs), title, chordpro, key, author, bpm, category, cloudId: generateCloudId(), createdAt: Date.now(), columns: currentColumns, fontSize}); } saveToStorage(); alert('✅ Песня сохранена!'); }
goBackFromSongEdit(); currentSongId = null; const searchBox = document.getElementById('songs-search'); if (searchBox) searchBox.value = ''; renderSongs();
}
function switchTab(tab, el) { currentTab = tab; document.querySelectorAll('#home-view-setlists .tab-style').forEach(t => t.classList.remove('active')); el.classList.add('active'); renderSetlists(); saveAppState(); }
function clearSetlistSearchAndOpen(slId) {
const searchBox = document.getElementById('setlists-search');
if (searchBox) searchBox.value = '';
openSetlistDetail(slId);
}
function isSetlistExpired(sl) {
if (!sl.date) return false;
const slDateTime = new Date(sl.date + 'T' + (sl.time || '23:59')).getTime();
const now = Date.now();
const diffMs = now - slDateTime;
const twentyFourHoursMs = 24 * 60 * 60 * 1000;
return diffMs > twentyFourHoursMs;
}
function renderSetlists() {
const q = (document.getElementById('setlists-search')?.value || '').toLowerCase(); const list = document.getElementById('setlists-list'); list.innerHTML = '';
const isLight = document.body.classList.contains('light'); const dateColor = isLight ? '#7e57c2' : '#9575cd';
const filtered = setlists.filter(sl => (currentTab === 'archive' ? sl.isArchived : !sl.isArchived) && !sl.teamId).filter(sl => sl.name.toLowerCase().includes(q));
filtered.sort((a, b) => {
const dateA = new Date(a.date + 'T' + (a.time || '00:00')).getTime();
const dateB = new Date(b.date + 'T' + (b.time || '00:00')).getTime();
if (currentTab === 'archive') { return dateB - dateA; }
const aExpired = isSetlistExpired(a);
const bExpired = isSetlistExpired(b);
if (aExpired && !bExpired) return 1;
if (!aExpired && bExpired) return -1;
if (aExpired && bExpired) return dateB - dateA;
return dateA - dateB;
});
filtered.forEach(sl => { const div = document.createElement('div'); div.className = 'list-item'; div.style.cursor = 'default';
const isExpired = !sl.isArchived && isSetlistExpired(sl);
const expiredClass = isExpired ? 'setlist-expired' : '';
const sharedBadge = '';
let actions = sl.isArchived ? `<button class="btn-icon" onclick="event.stopPropagation(); restoreSetlist(${sl.id})">↻</button><button class="btn-icon" onclick="event.stopPropagation(); showSetlistDeleteChoice(${sl.id}, '${sl.name.replace(/'/g, "\\'")}', false)">️</button>` : `<button class="btn-icon" onclick="event.stopPropagation(); openEditSetlistModal(${sl.id})">✏️</button><button class="btn-icon" onclick="event.stopPropagation(); showSetlistDeleteChoice(${sl.id}, '${sl.name.replace(/'/g, "\\'")}', false)">️🗑️</button>`;
div.innerHTML = `<div class="item-left ${expiredClass}" style="min-width: 0; flex: 1;"><div class="item-title">${escapeHtml(sl.name)}${sharedBadge}</div><div style="font-size: 10px; color: ${isExpired ? '#ef5350' : '#888'}; margin-top: 2px;">${formatSetlistDate(sl.date, sl.time)} · ${sl.songs.length} песен</div></div><div class="item-actions" style="display: flex; gap: 4px;">${actions}</div>`;
div.onclick = () => clearSetlistSearchAndOpen(sl.id); list.appendChild(div); });
updateCarouselBadges();
}
function openSetlistModal() { document.getElementById('sl-date').value = getCurrentDate(); document.getElementById('sl-time').value = getCurrentTime(); document.getElementById('sl-name').value = ''; document.getElementById('modal-setlist').classList.add('show'); }
async function saveSetlist() {
    const date = document.getElementById('sl-date').value;
    const time = document.getElementById('sl-time').value;
    let name = document.getElementById('sl-name').value.trim();
    if (!name) name = 'Служение';
    if (!date) return;
    const teamId = document.getElementById('modal-setlist').dataset.teamId || null;
    const duplicate = setlists.find(sl => (sl.teamId || null) === teamId && sl.date === date && (sl.time || '') === (time || '') && sl.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) {
        if (!confirm(`Сет-лист «${name}» на эту дату и время уже существует. Заменить его новым?`)) return;
        setlists = setlists.filter(sl => sl.id !== duplicate.id);
        if (duplicate.teamId) {
            try { await removeSetlistFromTeamData(duplicate.id, duplicate.teamId); } catch (err) { console.error('Не удалось удалить старый сет-лист из команды:', err); }
        }
        saveToStorage();
    }
    const newId = getNextId(setlists);
    const newSl = {id: newId, date, time: time || '', name, isArchived: false, teamId: teamId, songs: []};
    setlists.push(newSl);
    saveToStorage();
    closeModal('modal-setlist');
    delete document.getElementById('modal-setlist').dataset.teamId;
   if (teamId) {
        try {
            await publishSetlistToTeamData(newSl, teamId);
            saveToStorage();
            showToast('✅ Сет-лист опубликован в команде', 'success');
        } catch (err) {
            console.error('Не удалось опубликовать сет-лист в команде:', err);
            showToast('⚠️ Не удалось опубликовать сет-лист в команде: ' + err.code, 'error');
        }
        showTeamDetailView(teamId);
    } else {
        renderSetlists();
    }
}
function openEditSetlistModal(id) { const sl = setlists.find(x => x.id === id); document.getElementById('edit-sl-date').value = sl.date; document.getElementById('edit-sl-time').value = sl.time || ''; document.getElementById('edit-sl-name').value = sl.name; currentSlId = id; document.getElementById('modal-edit-setlist').classList.add('show'); }
function saveEditSetlist() {
const date = document.getElementById('edit-sl-date').value;
const time = document.getElementById('edit-sl-time').value;
const name = document.getElementById('edit-sl-name').value;
if (!name || !date) return;
const sl = setlists.find(x => x.id === currentSlId);
if (sl) {
if (sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
sl.date = date;
sl.time = time || '';
sl.name = name;
saveToStorage();
syncSetlistIfTeam(sl);
}
closeModal('modal-edit-setlist');
renderSetlists();
if (document.getElementById('page-setlist-detail').classList.contains('active')) {
document.getElementById('sl-detail-title').innerHTML = `<div style="font-size: 14px; font-weight: bold;">${escapeHtml(sl.name)}</div><div style="font-size: 12px; color: #888; font-weight: normal;">${formatSetlistDate(sl.date, sl.time)}</div>`;
renderSlSongs();
}
}
function showSetlistDeleteChoice(id, name, isVl) {
const sl = setlists.find(x => x.id === id);
if (sl && sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
pendingSetlistAction = { id, name, isVl };
document.getElementById('delete-setlist-name').innerText = `"${name}"`;
document.getElementById('modal-delete-setlist-choice').classList.add('show');
}
function archiveSetlistChoice() {
if (!pendingSetlistAction) return;
const sl = setlists.find(x => x.id === pendingSetlistAction.id);
if (sl) {
sl.isArchived = true;
if (sl.teamId && teamDataCache[sl.teamId]) { const cached = (teamDataCache[sl.teamId].setlists || []).find(c => c.id === sl.id); if (cached) cached.isArchived = true; }
saveToStorage();
syncSetlistIfTeam(sl);
if (!document.getElementById('page-setlist-detail').classList.contains('active')) {
renderSetlists();
if (sl.teamId) showTeamDetailView(sl.teamId);
}
}
closeModal('modal-delete-setlist-choice');
pendingSetlistAction = null;
}
function deleteSetlistChoice() {
if (!pendingSetlistAction) return;
const sl = setlists.find(x => x.id === pendingSetlistAction.id);
const teamId = sl ? sl.teamId : null;
const wasOnDetailPage = document.getElementById('page-setlist-detail').classList.contains('active');
setlists = setlists.filter(x => x.id !== pendingSetlistAction.id);
if (teamId && teamDataCache[teamId]) { teamDataCache[teamId].setlists = (teamDataCache[teamId].setlists || []).filter(s => s.id !== pendingSetlistAction.id); }
saveToStorage();
if (teamId) removeSetlistFromTeamData(pendingSetlistAction.id, teamId);
 
if (wasOnDetailPage) {
if (teamId) {
showPage('page-home');
const teamIdx = carouselItems.findIndex(i => i.type === 'team' && i.teamId === teamId);
if (teamIdx !== -1) {
setCarouselIndex(teamIdx, true);
} else {
setCarouselIndex(1, true);
}
} else {
showPage('page-home');
setCarouselIndex(1, true);
}
} else {
renderSetlists();
if (teamId) showTeamDetailView(teamId);
}
closeModal('modal-delete-setlist-choice');
pendingSetlistAction = null;
}
function restoreSetlist(slId) {
const sl = setlists.find(x => x.id === slId);
if (sl && sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
pendingSetlistAction = { id: slId };
document.getElementById('archive-setlist-name').innerText = `"${sl.name}"`;
document.getElementById('modal-archive-setlist').classList.add('show');
}
function restoreSetlistChoice() {
if (!pendingSetlistAction) return;
const sl = setlists.find(x => x.id === pendingSetlistAction.id);
if (sl) {
sl.isArchived = false;
if (sl.teamId && teamDataCache[sl.teamId]) { const cached = (teamDataCache[sl.teamId].setlists || []).find(c => c.id === sl.id); if (cached) cached.isArchived = false; }
saveToStorage();
syncSetlistIfTeam(sl);
renderSetlists();
if (sl.teamId) showTeamDetailView(sl.teamId);
}
closeModal('modal-archive-setlist');
pendingSetlistAction = null;
}
function archiveCurrentSetlist() {
const sl = setlists.find(x => x.id === currentSlId);
if (!sl) return;
if (sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
if (confirm(`Отправить "${sl.name}" в архив?`)) {
sl.isArchived = true;
if (sl.teamId && teamDataCache[sl.teamId]) { const cached = (teamDataCache[sl.teamId].setlists || []).find(c => c.id === sl.id); if (cached) cached.isArchived = true; }
saveToStorage();
syncSetlistIfTeam(sl);
goBackFromSetlistDetail();
}
}
function openSetlistDetail(id) { currentSlId = id; const sl = setlists.find(x => x.id === id);
document.getElementById('sl-detail-title').innerHTML = `<div style="font-size: 14px; font-weight: bold;">${escapeHtml(sl.name)}</div><div style="font-size: 12px; color: #888; font-weight: normal;">${formatSetlistDate(sl.date, sl.time)}</div>`;
document.getElementById('sl-subtitle').innerText = 'Сет-лист'; renderSlSongs(); showPage('page-setlist-detail'); }
function goBackFromSetlistDetail() {
const sl = setlists.find(x => x.id === currentSlId);
if (sl && sl.teamId) {
const teamIdx = carouselItems.findIndex(i => i.type === 'team' && i.teamId === sl.teamId);
if (teamIdx !== -1) {
showPage('page-home');
setCarouselIndex(teamIdx, true);
return;
}
}
showPage('page-home');
setCarouselIndex(1, true);
}
function updateSongOrder(songId, newOrderStr) {
const sl = setlists.find(x => x.id === currentSlId);
if (!sl) return;
if (sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); renderSlSongs(); return; }
const newOrder = parseInt(newOrderStr);
if (isNaN(newOrder) || newOrder < 1) { renderSlSongs(); return; }
const ci = sl.songs.findIndex(x => x.id === songId);
if (ci === -1) return;
const ti = Math.min(Math.max(0, newOrder - 1), sl.songs.length - 1);
if (ci !== ti) {
const [moved] = sl.songs.splice(ci, 1);
sl.songs.splice(ti, 0, moved);
saveToStorage();
syncSetlistIfTeam(sl);
renderSlSongs();
}
}
function handleOrderInputFocus(input, originalValue) { input.dataset.originalValue = originalValue; input.value = ''; }
function handleOrderInputBlur(input, songId) {
const newValue = input.value.trim();
const originalValue = input.dataset.originalValue;
if (newValue === '' || isNaN(parseInt(newValue))) { input.value = originalValue; } else { updateSongOrder(songId, newValue); }
}
function renderSlSongs() {
const sl = setlists.find(x => x.id === currentSlId); const list = document.getElementById('sl-songs-list'); list.innerHTML = '';
sl.songs.forEach((item, idx) => { const s = songs.find(x => x.id === item.id); if (!s) return; const div = document.createElement('div'); div.className = 'list-item'; div.draggable = true; div.dataset.index = idx;
const originalKeyLabel = s.key ? ` [${s.key}]` : ''; const currentSlKey = item.key || s.key; const localBadge = item.chordpro ? ' <span style="font-size:11px;">(лок.)</span>' : '';
const authorText = s.author ? `<div style="color:#888; font-size:8px; margin-top: 2px;">${escapeHtml(s.author)}</div>` : '';
const bpmText = s.bpm ? `<div style="color:#888; font-size:10px; white-space: nowrap; text-align: right;">${s.bpm} BPM</div>` : '';
const rightInfo = (bpmText || authorText) ? `<div style="display: flex; flex-direction: column; align-items: flex-end; margin-right: 8px; flex-shrink: 0;">${bpmText}${authorText}</div>` : '';
let keySelectHtml = `<select class="key-select-inline" onchange="changeSongKeyInSetlist(${item.id}, this.value)">`; NOTES_SHARP.forEach(key => { keySelectHtml += `<option value="${key}" ${(key === currentSlKey) ? 'selected' : ''}>${key}</option>`; }); keySelectHtml += '</select>';
const orderValue = idx + 1;
div.innerHTML = `<div class="item-left"><input type="number" class="order-input" value="${orderValue}" min="1" max="${sl.songs.length}" data-original="${orderValue}" onclick="event.stopPropagation()" onfocus="handleOrderInputFocus(this, ${orderValue})" onblur="handleOrderInputBlur(this, ${item.id})"><div style="min-width: 0; flex: 1;"><div class="item-title">${escapeHtml(s.title)}<span style="color:#90caf9; font-size:12px;">${originalKeyLabel}</span>${localBadge}</div></div>${rightInfo}</div><div class="item-right">${keySelectHtml}<button class="btn-icon" onclick="event.stopPropagation(); confirmRemoveFromSl(${item.id}, '${s.title.replace(/'/g, "\\'")}')" style="color: #ef5350;">🗑️</button></div>`;
div.addEventListener('dragstart', (e) => { if (e.target.closest('button, select, input')) { e.preventDefault(); return; } div.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', idx); });
div.addEventListener('dragover', (e) => { e.preventDefault(); const t = e.target.closest('.list-item'); if (t && t !== div) t.classList.add('drag-over'); });
div.addEventListener('dragleave', () => { div.classList.remove('drag-over'); });
div.addEventListener('drop', (e) => {
e.preventDefault();
const t = e.target.closest('.list-item');
if (!t || t === div) return;
t.classList.remove('drag-over');
if (sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
const fi = parseInt(e.dataTransfer.getData('text/plain'));
const ti = parseInt(t.dataset.index);
if (!isNaN(fi) && !isNaN(ti) && fi !== ti) {
const [moved] = sl.songs.splice(fi, 1);
sl.songs.splice(ti, 0, moved);
saveToStorage();
syncSetlistIfTeam(sl);
renderSlSongs();
}
});
div.addEventListener('dragend', () => { div.classList.remove('dragging'); document.querySelectorAll('.list-item').forEach(i => i.classList.remove('drag-over')); });
div.onclick = (e) => { if(e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT' && !e.target.closest('button') && !e.target.closest('select') && !e.target.closest('input')) { homeSongIndex = idx; openSongView(item.id, currentSlId); } };
list.appendChild(div); });
}
function confirmRemoveFromSl(songId, songName) {
const sl = setlists.find(x => x.id === currentSlId);
if (sl && sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
showDeleteConfirm('remove', songId, `Песню "${songName}" из сет-листа`, () => {
sl.songs = sl.songs.filter(x => x.id !== songId);
saveToStorage();
syncSetlistIfTeam(sl);
renderSlSongs();
});
}
function changeSongKeyInSetlist(songId, newKey) {
const sl = setlists.find(x => x.id === currentSlId);
const item = sl.songs.find(x => x.id === songId);
if (!item) return;
if (sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); renderSlSongs(); return; }
item.key = newKey;
saveToStorage();
syncSetlistIfTeam(sl);
if (sl.teamId) { showToast('✅ Тональность изменена для всех участников', 'success'); }
}
function openAddSongToSlModal() {
const sl = setlists.find(x => x.id === currentSlId);
if (sl && sl.teamId && getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
document.getElementById('add-song-search').value = '';
renderAddSongList();
document.getElementById('modal-add-song').classList.add('show');
}
function renderAddSongList() {
const q = document.getElementById('add-song-search').value.toLowerCase(); const sl = setlists.find(x => x.id === currentSlId); const list = document.getElementById('add-song-list'); list.innerHTML = '';
const filtered = songs.filter(s => !s.fromTeam && !sl.songs.find(x => x.id === s.id) && (s.title.toLowerCase().includes(q) || (s.chordpro && s.chordpro.toLowerCase().includes(q)) || (s.author && s.author.toLowerCase().includes(q))));
if (filtered.length === 0) { list.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">Нет доступных песен</p>'; return; }
filtered.forEach(s => { const div = document.createElement('div'); div.className = 'add-song-item'; div.innerHTML = `<span>${escapeHtml(s.title)}${s.key ? ` [${s.key}]` : ''}</span><span style="color: #90caf9; font-size: 20px;">+</span>`;
div.onclick = () => {
sl.songs.push({id: s.id, capo: 0, key: null, chordpro: null, columns: currentColumns, fontSize});
saveToStorage();
syncSetlistIfTeam(sl);
document.getElementById('add-song-search').value = '';
renderAddSongList();
renderSlSongs();
};
list.appendChild(div); });
}