function downloadJson(data, filename) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
async function shareFile(data, filename) { const defaultName = filename.replace(/\.[^/.]+$/, ""); const userFileName = prompt('Имя файла:', defaultName); if (userFileName === null) return; const cleanName = userFileName.trim() || defaultName; const ext = filename.split('.').pop(); const finalName = cleanName.toLowerCase().endsWith('.' + ext) ? cleanName : cleanName + '.' + ext; const file = new File([JSON.stringify(data, null, 2)], finalName, { type: 'application/json' }); if (navigator.share && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: finalName }); return; } catch (err) { if (err.name !== 'AbortError') downloadJson(data, finalName); } } else downloadJson(data, finalName); }
function exportSongFromSetlist(item, s) {
const chordpro = item.chordpro || s.chordpro;
const key = item.key || s.key;
return { title: s.title, author: s.author || '', key: key, originalKey: s.key, capo: item.capo || 0, bpm: s.bpm || '', category: s.category || '', chordpro: chordpro, sectionNotes: sectionNotes[s.id] || {}, inlineComments: inlineComments[s.id] || {}, images: s.images || {} };
}
function exportAllActiveSetlists() { const active = setlists.filter(sl => !sl.isArchived && !sl.teamId); if (!active.length) { alert('Нет актуальных сет-листов'); return; } shareFile({ version: 2, type: 'setlists-bulk', app: 'Worship SetUP', data: { setlists: active.map(sl => ({ date: sl.date, time: sl.time || '', name: sl.name, songs: sl.songs.map(item => { const s = songs.find(x => x.id === item.id); return s ? exportSongFromSetlist(item, s) : null; }).filter(Boolean) })) } }, `AllSetlists_${getCurrentDate()}.clcsetlist`); }
function handleImportSetlist(event) {
const files = event.target.files;
if (!files?.length) return;
let processed = 0, totalSongs = 0, totalSl = 0;
const total = files.length;
Array.from(files).forEach(file => {
const reader = new FileReader();
reader.onload = (e) => {
try {
const data = JSON.parse(e.target.result);
if (data.type === 'setlists-bulk' && data.data?.setlists) data.data.setlists.forEach(slData => { const r = importSingleSetlist(slData); totalSongs += r.songsAdded; totalSl++; });
else if (data.type === 'setlist' && data.data) { const r = importSingleSetlist(data.data); totalSongs += r.songsAdded; totalSl++; }
else alert(`❌ "${file.name}" — не файл сет-листа`);
} catch (err) {
alert(`❌ Ошибка "${file.name}": ` + err.message);
}
if (++processed === total) {
saveToStorage();
renderSetlists();
alert(`✅ Импортировано!\nСет-листов: ${totalSl}\nПесен: ${totalSongs}`);
}
};
reader.onerror = () => {
alert(`❌ Не удалось прочитать файл "${file.name}"`);
if (++processed === total) {
saveToStorage();
renderSetlists();
alert(`✅ Импортировано!\nСет-листов: ${totalSl}\nПесен: ${totalSongs}`);
}
};
reader.readAsText(file);
});
event.target.value = '';
}
function sanitizeImportedSong(sd) {
if (!sd || typeof sd !== 'object') return null;
const title = typeof sd.title === 'string' ? sd.title.trim().slice(0, 200) : '';
if (!title) return null;
const images = {};
if (sd.images && typeof sd.images === 'object' && !Array.isArray(sd.images)) {
const imgDataRe = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
let count = 0;
for (const k in sd.images) {
if (count >= 30) break;
const v = sd.images[k];
if (v && typeof v.data === 'string' && v.data.length < 2000000 && imgDataRe.test(v.data)) {
images[k] = { data: v.data, comment: typeof v.comment === 'string' ? v.comment.slice(0, 200) : '' };
count++;
}
}
}
return {
title,
author: typeof sd.author === 'string' ? sd.author.slice(0, 200) : '',
key: typeof sd.key === 'string' ? sd.key.slice(0, 10) : '',
originalKey: typeof sd.originalKey === 'string' ? sd.originalKey.slice(0, 10) : '',
bpm: (typeof sd.bpm === 'string' || typeof sd.bpm === 'number') ? String(sd.bpm).slice(0, 10) : '',
category: typeof sd.category === 'string' ? sd.category.slice(0, 50) : '',
chordpro: typeof sd.chordpro === 'string' ? sd.chordpro.slice(0, 50000) : '',
capo: typeof sd.capo === 'number' ? sd.capo : 0,
sectionNotes: (sd.sectionNotes && typeof sd.sectionNotes === 'object' && !Array.isArray(sd.sectionNotes)) ? sd.sectionNotes : {},
inlineComments: (sd.inlineComments && typeof sd.inlineComments === 'object' && !Array.isArray(sd.inlineComments)) ? sd.inlineComments : {},
images
};
}
function importSingleSetlist(slData) {
const newSlId = getNextId(setlists);
const newSongs = [];
let songsAdded = 0;
slData.songs.forEach(sd => {
sd = sanitizeImportedSong(sd); if (!sd) return;
const existing = songs.find(s => s.title.toLowerCase() === sd.title.toLowerCase());
const songOriginalKey = sd.originalKey || sd.key;
if (existing) {
newSongs.push({ id: existing.id, capo: sd.capo || 0, key: sd.key, chordpro: null, columns: currentColumns, fontSize });
if (sd.sectionNotes && Object.keys(sd.sectionNotes).length > 0) { if (!sectionNotes[existing.id]) sectionNotes[existing.id] = {}; Object.assign(sectionNotes[existing.id], sd.sectionNotes); }
if (sd.inlineComments && Object.keys(sd.inlineComments).length > 0) { if (!inlineComments[existing.id]) inlineComments[existing.id] = {}; Object.assign(inlineComments[existing.id], sd.inlineComments); }
} else {
const nid = getNextId(songs);
songs.push({ id: nid, title: sd.title, author: sd.author || '', key: songOriginalKey, bpm: sd.bpm || '', category: sd.category || '', chordpro: sd.chordpro, images: sd.images || {}, cloudId: generateCloudId(), createdAt: Date.now(), columns: currentColumns, fontSize });
newSongs.push({ id: nid, capo: sd.capo || 0, key: sd.key, chordpro: null, columns: currentColumns, fontSize });
if (sd.sectionNotes && Object.keys(sd.sectionNotes).length > 0) sectionNotes[nid] = { ...sd.sectionNotes };
if (sd.inlineComments && Object.keys(sd.inlineComments).length > 0) inlineComments[nid] = { ...sd.inlineComments };
songsAdded++;
}
});
setlists.push({ id: newSlId, date: slData.date, time: slData.time || '', name: slData.name, isArchived: false, songs: newSongs });
return { songsAdded };
}
function exportSong() {
const s = songs.find(x => x.id === currentSongId);
if (!s) return;
let chordpro = s.chordpro, key = s.key, capo = 0;
if (currentSlId) { const sl = setlists.find(x => x.id === currentSlId); const item = sl?.songs.find(x => x.id === currentSongId); if (item) { if (item.chordpro) chordpro = item.chordpro; if (item.key) key = item.key; capo = item.capo || 0; } }
shareFile({ version: 2, type: 'song', app: 'Worship SetUP', data: { title: s.title, author: s.author || '', key: s.key, capo: capo, bpm: s.bpm || '', category: s.category || '', chordpro: chordpro, sectionNotes: sectionNotes[s.id] || {}, inlineComments: inlineComments[s.id] || {}, images: s.images || {} } }, `${s.title}.clcsong`);
}
function handleImportSong(event) {
const file = event.target.files[0]; if (!file) return;
const reader = new FileReader();
reader.onload = (e) => {
try {
const data = JSON.parse(e.target.result);
if (data.type !== 'song' || !data.data) { alert('❌ Это не файл песни'); return; }
let songData = data.data;
songData = sanitizeImportedSong(songData);
if (!songData) { alert('❌ Некорректный файл песни'); return; }
const existing = songs.find(s => s.title.toLowerCase() === songData.title.toLowerCase());
if (existing) {
if (!confirm(`Песня "${songData.title}" уже существует. Заменить её?`)) return;
existing.author = songData.author || existing.author;
existing.key = songData.key;
existing.bpm = songData.bpm || '';
existing.category = songData.category || '';
existing.chordpro = songData.chordpro;
if (songData.sectionNotes) sectionNotes[existing.id] = { ...songData.sectionNotes };
if (songData.inlineComments) inlineComments[existing.id] = { ...songData.inlineComments };
} else {
const newId = getNextId(songs);
songs.push({ id: newId, title: songData.title, author: songData.author || '', key: songData.key, bpm: songData.bpm || '', category: songData.category || '', chordpro: songData.chordpro, images: songData.images || {}, createdAt: Date.now(), columns: currentColumns, fontSize });
if (songData.sectionNotes) sectionNotes[newId] = { ...songData.sectionNotes };
if (songData.inlineComments) inlineComments[newId] = { ...songData.inlineComments };
}
saveToStorage();
renderSongs();
alert(`✅ Песня "${songData.title}" импортирована!`);
} catch (err) { alert('❌ Ошибка при чтении файла: ' + err.message); }
};
reader.onerror = () => { alert(`❌ Не удалось прочитать файл "${file.name}"`); }; // <-- ВСТАВИТЬ ЭТУ СТРОКУ
reader.readAsText(file);
event.target.value = '';
}
function exportDatabase() { const dn = `База_${getCurrentDate()}`; const fn = prompt('Имя файла:', dn); if (fn === null) return; const cn = fn.trim() || dn; const final = cn.toLowerCase().endsWith('.clcdb') ? cn : cn + '.clcdb'; localStorage.setItem('clc_last_backup', Date.now().toString()); shareFile({ version: 1, type: 'database', app: 'Worship SetUP', exportDate: new Date().toISOString(), data: { songs: songs.filter(s => !s.fromTeam), setlists: setlists.filter(sl => !sl.fromTeamSync), sectionNotes, inlineComments, personalViewSettings } }, final); }
function handleImportDatabase(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const data = JSON.parse(e.target.result); if (data.type !== 'database' || !data.data) { alert('❌ Не файл базы данных'); return; } const db = data.data; let added = 0, skipped = 0; if (db.songs) db.songs.forEach(is => { is = sanitizeImportedSong(is); if (!is) { skipped++; return; } if (!songs.find(s => s.title.toLowerCase() === is.title.toLowerCase())) { const nid = getNextId(songs);
songs.push({ id: nid, title: is.title, author: is.author || '', key: is.key || 'C', bpm: is.bpm || '', category: is.category || '', chordpro: is.chordpro || '', images: is.images || {}, columns: is.columns || currentColumns, fontSize: is.fontSize || fontSize, createdAt: is.createdAt || Date.now() }); added++; } else skipped++; }); if (db.sectionNotes) Object.keys(db.sectionNotes).forEach(sid => { if (!sectionNotes[sid]) sectionNotes[sid] = {}; Object.assign(sectionNotes[sid], db.sectionNotes[sid]); }); if (db.inlineComments) Object.keys(db.inlineComments).forEach(sid => { if (!inlineComments[sid]) inlineComments[sid] = {}; Object.assign(inlineComments[sid], db.inlineComments[sid]); }); saveToStorage(); if (currentHomeView === 'songs') renderSongs(); else renderSetlists(); alert(`✅ Импорт!\nДобавлено: ${added}\nПропущено: ${skipped}`); } catch (err) { alert(' Ошибка: ' + err.message); } 
}; 
reader.onerror = () => { alert(`❌ Не удалось прочитать файл "${file.name}"`); }; // <-- ВСТАВИТЬ ЭТУ СТРОКУ
reader.readAsText(file); event.target.value = ''; }

// Override saveToStorage to sync with cloud
const originalSaveToStorage = saveToStorage;
saveToStorage = function() {
  originalSaveToStorage(); // Save locally
  if (currentUser) {
    saveUserDataToCloud(); // Sync to cloud
  }
};