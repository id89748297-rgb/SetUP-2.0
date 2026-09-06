// === ГЕНЕРАЦИЯ УНИКАЛЬНОГО ID ===
function generateCloudId() {
return 'song_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}
// === ГЕНЕРАЦИЯ УНИКАЛЬНОГО ЧИСЛОВОГО ID ===
function getNextId(arr) {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}
function formatDate(dateString) { const date = new Date(dateString); const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']; return `${date.getDate()} ${months[date.getMonth()]}`; }
function formatSetlistDate(dateString, timeString) { let result = formatDate(dateString); if (timeString) result += `, ${timeString}`; return result; }
function getCurrentDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function getNextSundayDate() { const date = new Date(); const day = date.getDay(); const daysUntilSunday = (7 - day) % 7; date.setDate(date.getDate() + daysUntilSunday); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function getCurrentTime() { const date = new Date(); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
const CATEGORY_LABELS = { fast: '🔥 Б', medium: '🎵 С', slow: '🧎 M' };
const CATEGORY_ICONS = { fast: '🔥', medium: '🎵', slow: '🧎' };
const DIATONIC_CHORDS = {
'C':  [{r:'C',m:false},{r:'D',m:true},{r:'E',m:true},{r:'F',m:false},{r:'G',m:false},{r:'A',m:true},{r:'H',m:true}],
'C#': [{r:'C#',m:false},{r:'D#',m:true},{r:'F',m:true},{r:'F#',m:false},{r:'G#',m:false},{r:'A#',m:true},{r:'C',m:true}],
'D':  [{r:'D',m:false},{r:'E',m:true},{r:'F#',m:true},{r:'G',m:false},{r:'A',m:false},{r:'H',m:true},{r:'C#',m:true}],
'D#': [{r:'D#',m:false},{r:'F',m:true},{r:'G',m:true},{r:'G#',m:false},{r:'A#',m:false},{r:'C',m:true},{r:'D',m:true}],
'E':  [{r:'E',m:false},{r:'F#',m:true},{r:'G#',m:true},{r:'A',m:false},{r:'H',m:false},{r:'C#',m:true},{r:'D#',m:true}],
'F':  [{r:'F',m:false},{r:'G',m:true},{r:'A',m:true},{r:'A#',m:false},{r:'C',m:false},{r:'D',m:true},{r:'E',m:true}],
'F#': [{r:'F#',m:false},{r:'G#',m:true},{r:'A#',m:true},{r:'H',m:false},{r:'C#',m:false},{r:'D#',m:true},{r:'F',m:true}],
'G':  [{r:'G',m:false},{r:'A',m:true},{r:'H',m:true},{r:'C',m:false},{r:'D',m:false},{r:'E',m:true},{r:'F#',m:true}],
'G#': [{r:'G#',m:false},{r:'A#',m:true},{r:'C',m:true},{r:'C#',m:false},{r:'D#',m:false},{r:'F',m:true},{r:'G',m:true}],
'A':  [{r:'A',m:false},{r:'H',m:true},{r:'C#',m:true},{r:'D',m:false},{r:'E',m:false},{r:'F#',m:true},{r:'G#',m:true}],
'A#': [{r:'A#',m:false},{r:'C',m:true},{r:'D',m:true},{r:'D#',m:false},{r:'F',m:false},{r:'G',m:true},{r:'A',m:true}],
'H':  [{r:'H',m:false},{r:'C#',m:true},{r:'D#',m:true},{r:'E',m:false},{r:'F#',m:false},{r:'G#',m:true},{r:'A#',m:true}]
};
let songs = [], setlists = [], teams = [];
let teamDataCache = {}, teamListenerUnsubs = {}, currentTeamDetailId = null;
let teamRegistryListenerUnsubs = {};
let membershipWatchUnsubs = {};
let recentlyLeftTeams = {};
let pinnedTeams = [];
let setlistStatusCache = {};
let failedSyncSetlists = {};
let teamRolesCache = {};
let teamRolesListenerUnsubs = {};
let setlistStatusListenerUnsubs = {};
let chatListenerUnsubs = {};
let chatReadsListenerUnsubs = {};
let chatMessagesCache = {};
let chatReadsCache = {};
let chatOldestLoaded = {};
let currentChatTeamId = null;
let chatEditingMessageId = null;
let currentTab = 'current', currentHomeView = 'songs', currentSongId = null, currentSlId = null;
let originalKey = 'C', currentKey = 'C', currentCapo = 0, currentColumns = 1, fontSize = 14;
let isLocalEdit = false, pendingSetlistAction = null, sectionNotes = {}, inlineComments = {}, personalViewSettings = {};
let isInlineEditing = false, currentImageKey = null, editingSectionIdx = null;
let editingSectionStartLine = -1, editingSectionEndLine = -1;
let currentAccidental = 'sharp';
let currentHideChords = false;
let currentHideLyrics = false;
let currentHideArrows = false;
let currentHideComments = false;
let toolbarExpanded = false;
let savedScrollPosition = 0;
let homeFilteredSongs = [];
let homeSongIndex = -1;
let currentTeamArchiveTeamId = null;
const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'H'];
const CHORD_RE = /^[A-H][#b]?(m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*(?:\/[A-H][#b]?(m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*)?$/i;
const REPEAT_RE = /^(x\d+|\d+[рpx])$/i;
const SECTION_RE = /^(\d+\s+)?[A-Za-zА-ЯЁа-яё][A-Za-zА-ЯЁа-яё\-]*(\s*\d+)?:/;
const IMAGE_COMMENT_PLACEHOLDER = 'Нажмите, чтобы добавить комментарий...';
const URL_REGEX = /https?:\/\/[^\s]+/g;
const LINK_PREFIX_REGEX = /^(ссылка|link|url|ссылка на песню)\s*[:\-]\s*/i;
const SEPARATOR_REGEX = /^[\s_\-=\*\~]{3,}$/;
const CHORD_SUFFIX = '(?:m|M|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|5|7sus4|sus2|sus4|maj7|min7|m7b5|dim7|aug7)?[0-9b]*';
const CHORD_OR_NOTE = `[A-H][#b]?${CHORD_SUFFIX}`;
const PAIR_RE_STR = `${CHORD_OR_NOTE}-${CHORD_OR_NOTE}`;
const PAIR_RE = new RegExp(`^${PAIR_RE_STR}$`, 'i');
const SHARP_TO_FLAT = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
const FLAT_TO_SHARP = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
const MAX_TEAMS = 15;
let carouselItems = [];
let carouselActiveIndex = 0;
let isTransitioning = false;
let carouselTouchStartX = 0, carouselTouchStartY = 0, carouselTracking = false, carouselMoved = false;
let editingTeamId = null;
let teamAvatarFile = null;
function compressTeamImage(file, callback) {
const reader = new FileReader();
reader.onload = function(e) {
const img = new Image();
img.onload = function() {
const canvas = document.createElement('canvas');
const size = 128;
canvas.width = size; canvas.height = size;
const ctx = canvas.getContext('2d');
const minDim = Math.min(img.width, img.height);
const sx = (img.width - minDim) / 2;
const sy = (img.height - minDim) / 2;
ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
callback(canvas.toDataURL('image/jpeg', 0.75));
};
img.src = e.target.result;
};
reader.readAsDataURL(file);
}
function compressSongImage(file, callback) {
const reader = new FileReader();
reader.onload = function(e) {
const img = new Image();
img.onload = function() {
const maxDim = 1000;
let w = img.width, h = img.height;
if (w > maxDim || h > maxDim) {
if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
else { w = Math.round(w * maxDim / h); h = maxDim; }
}
const canvas = document.createElement('canvas');
canvas.width = w; canvas.height = h;
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0, w, h);
callback(canvas.toDataURL('image/jpeg', 0.7));
};
img.src = e.target.result;
};
reader.readAsDataURL(file);
}
function withButtonSpinner(btn, promiseFactory) {
if (!btn || btn.dataset.loading === 'true') return;
btn.dataset.loading = 'true';
const original = btn.innerHTML;
btn.disabled = true;
btn.innerHTML = '<span class="btn-spinner"></span>';
const finish = () => { btn.disabled = false; btn.innerHTML = original; delete btn.dataset.loading; };
const result = promiseFactory();
if (result && typeof result.then === 'function') { result.then(finish).catch(finish); }
else { finish(); }
return result;
}
function clearSearchInput(inputId, rerenderFn) {
const input = document.getElementById(inputId);
if (input) { input.value = ''; toggleSearchClearBtn(input); }
if (typeof rerenderFn === 'function') rerenderFn();
}
function toggleSearchClearBtn(input) {
const btn = input.parentElement.querySelector('.search-clear-btn');
if (btn) btn.style.display = input.value ? 'flex' : 'none';
}