function switchHomeView(view) {
currentHomeView = view;
const idx = carouselItems.findIndex(i => i.type === view);
if (idx !== -1 && idx !== carouselActiveIndex) {
setCarouselIndex(idx, true);
} else {
activateCarouselItem(carouselActiveIndex);
}
}
function showTeamsView() {
const view = document.getElementById('home-view-teams');
view.style.display = 'block';
teams.forEach(t => startTeamDataListener(t.id));
let html = `<div style="padding: 10px 0;">
<div style="text-align: center; margin-bottom: 20px;">
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
<button class="btn-pastel" style="margin: 0;" onclick="createTeamPrompt()">➕ Создать команду</button>
<button class="btn-pastel" style="margin: 0;" onclick="showJoinTeamByLinkModal()">🔗 Присоединиться к команде</button>
</div>
<p style="color: #888; font-size: 12px; margin-top: 10px;">Создано: ${teams.length} / ${MAX_TEAMS}</p>
</div>`;
if (teams.length === 0) {
html += `<div style="text-align: center; padding: 30px 20px; color: #888;">
<div style="font-size: 48px; margin-bottom: 15px;">👥</div>
<p>У вас пока нет команд</p>
<p style="font-size: 13px; margin-top: 8px;">Создайте команду, чтобы делиться сет-листами</p>
</div>`;
} else {
getSortedTeams().forEach(t => {
const teamSetlists = setlists.filter(sl => sl.teamId === t.id && !sl.isArchived);
const rolesForCount = teamRolesCache[t.id];
const memberCount = rolesForCount ? Object.keys(rolesForCount).length : (t.members ? t.members.length : 1);
const leaveOrDeleteBtn = memberCount > 1
? `<button class="btn-icon" onclick="event.stopPropagation(); deleteTeam('${t.id}')" title="Покинуть" style="color: #ef5350;">🗑️</button>`
: `<button class="btn-icon" onclick="event.stopPropagation(); deleteTeam('${t.id}')" title="Удалить команду" style="color: #ef5350;">🗑️</button>`;
const avatarHtml = t.avatar
? `<img src="${escapeHtml(t.avatar)}" class="team-list-avatar" alt="">`
: `<div class="team-list-avatar-placeholder">🎸</div>`;
const teamUnread = getUnreadChatCount(t.id);
const unreadBadge = teamUnread > 0 ? `<div style="position:absolute;top:-4px;left:-4px;background:#ef5350;color:#fff;font-size:10px;font-weight:bold;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;z-index:2;">${teamUnread}</div>` : '';
html += `<div class="list-item" style="cursor: pointer;" ontouchstart="startTeamPress(event,'${t.id}')" ontouchend="cancelTeamPress()" ontouchcancel="cancelTeamPress()" onmousedown="startTeamPress(event,'${t.id}')" onmouseup="cancelTeamPress()" onmouseleave="cancelTeamPress()" onclick="if(window.__teamPressFired){window.__teamPressFired=false;return;} openTeamFromList('${t.id}')">
<div class="item-left">
<div style="position:relative;">
${unreadBadge}
${avatarHtml}
</div>
<div style="min-width: 0; flex: 1;">
<div class="item-title">${escapeHtml(t.name)}</div>
<div class="item-sub">Участники: ${memberCount}${t.password ? ' · 🔐' : ''}</div>
</div>
</div>
<div class="item-actions" style="display: flex; gap: 2px;">
<button class="btn-icon" onclick="event.stopPropagation(); openTeamMembers('${t.id}')" title="Участники">👥</button>
<button class="btn-icon" onclick="event.stopPropagation(); showTeamInvite('${t.id}')" title="Пригласить">🔗</button>
<button class="btn-icon" onclick="event.stopPropagation(); editTeam('${t.id}')" title="Изменить">✏️</button>
${leaveOrDeleteBtn}
</div>
</div>`;
});
}
html += `</div>`;
view.innerHTML = html;
}
function lockBodyScroll() {
window.__bodyScrollY = window.scrollY || window.pageYOffset || 0;
document.body.style.position = 'fixed';
document.body.style.top = '-' + window.__bodyScrollY + 'px';
document.body.style.left = '0';
document.body.style.right = '0';
document.body.style.width = '100%';
}
function unlockBodyScroll() {
document.body.style.position = '';
document.body.style.top = '';
document.body.style.left = '';
document.body.style.right = '';
document.body.style.width = '';
window.scrollTo(0, window.__bodyScrollY || 0);
}
// === ЖУРНАЛ ДЕЙСТВИЙ КОМАНДЫ (доступен админам и владельцу) ===
let currentActionsTeamId = null;
let currentActionsProfiles = {};
let currentActionsItems = [];
let actionsListenerUnsub = null;
const TEAM_ACTION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

function teamActionsPressed(teamId) {
openTeamActions(teamId);
}
// Записать событие в журнал команды (не блокирует основной код)
function logTeamAction(teamId, text) {
if (!db || !currentUser || !teamId || !text) return;
db.collection('teamRegistry').doc(teamId).collection('actions').add({
uid: currentUser.uid,
text: text,
createdAt: Date.now()
}).catch(err => console.error('Не удалось записать действие команды:', err));
}
function formatActionTime(ts) {
const d = new Date(ts || 0);
const now = new Date();
const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
if (d.toDateString() === now.toDateString()) return 'сегодня, ' + hhmm;
const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
if (d.toDateString() === yesterday.toDateString()) return 'вчера, ' + hhmm;
if (d.getFullYear() === now.getFullYear()) return d.getDate() + ' ' + months[d.getMonth()] + ', ' + hhmm;
return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + hhmm;
}
function openTeamActions(teamId) {
closeRoleMenu();
if (typeof closeChatMsgMenuPopup === 'function') closeChatMsgMenuPopup();
if (typeof closeClearChatMenuPopup === 'function') closeClearChatMenuPopup();
if (typeof closeTeamPinMenu === 'function') closeTeamPinMenu();
const role = getMyRole(teamId);
if (role !== 'owner' && role !== 'admin') { showToast('⛔ Недоступно для вашей роли', 'error'); return; }
applyFullscreenModalStyle('modal-team-actions');
lockBodyScroll();
setupModalSwipeClose('modal-team-actions', closeTeamActions);
currentActionsTeamId = teamId;
const actionsTeam = teams.find(t => t.id === teamId);
const actionsAvatarEl = document.getElementById('team-actions-avatar');
if (actionsAvatarEl) actionsAvatarEl.innerHTML = (actionsTeam && actionsTeam.avatar) ? `<img src="${escapeHtml(actionsTeam.avatar)}" alt="">` : '⚙';
// Свежие данные команды (аватар/название могли измениться)
if (db && actionsTeam) {
db.collection('teamRegistry').doc(teamId).get().then(regDoc => {
if (!regDoc.exists || currentActionsTeamId !== teamId) return;
const regData = regDoc.data();
if (regData.avatar !== undefined) actionsTeam.avatar = regData.avatar;
if (actionsAvatarEl) actionsAvatarEl.innerHTML = actionsTeam.avatar ? `<img src="${escapeHtml(actionsTeam.avatar)}" alt="">` : '⚙';
}).catch(() => {});
}
// Профили авторов — из общего кеша участников
let mCache = {};
try { mCache = JSON.parse(localStorage.getItem('clc_team_members_cache') || '{}'); } catch {}
const cachedProfiles = mCache[teamId];
currentActionsProfiles = cachedProfiles ? cachedProfiles.profiles : {};
currentMembersProfiles = currentActionsProfiles; // openMemberProfile читает эту переменную
// Кеш событий — показываем сразу, без сети
let aCache = {};
try { aCache = JSON.parse(localStorage.getItem('clc_team_actions_cache') || '{}'); } catch {}
currentActionsItems = (aCache[teamId] || []).filter(a => Date.now() - (a.createdAt || 0) < TEAM_ACTION_TTL_MS);
renderTeamActionsList();
document.getElementById('modal-team-actions').classList.add('show');
saveAppState();
if (!db || !currentUser) return;
// Свежие профили
db.collection('teamRegistry').doc(teamId).collection('private').doc('profiles').get()
.then(doc => {
if (doc.exists) {
currentActionsProfiles = doc.data() || {};
currentMembersProfiles = currentActionsProfiles;
renderTeamActionsList();
}
}).catch(() => {});
// Чистим просроченные записи (старше 30 дней)
purgeOldTeamActions(teamId);
// Живой слушатель событий
if (actionsListenerUnsub) { actionsListenerUnsub(); actionsListenerUnsub = null; }
actionsListenerUnsub = db.collection('teamRegistry').doc(teamId).collection('actions')
.orderBy('createdAt', 'desc').limit(200)
.onSnapshot(snap => {
currentActionsItems = snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
.filter(a => Date.now() - (a.createdAt || 0) < TEAM_ACTION_TTL_MS);
try {
const c = JSON.parse(localStorage.getItem('clc_team_actions_cache') || '{}');
c[teamId] = currentActionsItems;
localStorage.setItem('clc_team_actions_cache', JSON.stringify(c));
} catch {}
if (currentActionsTeamId === teamId) renderTeamActionsList();
}, err => console.error('Ошибка журнала действий:', err));
}
function renderTeamActionsList() {
const list = document.getElementById('team-actions-list');
if (!list) return;
const arr = currentActionsItems || [];
if (!arr.length) {
list.innerHTML = '<div style="text-align:center;color:#888;padding:30px;">Пока нет событий</div>';
return;
}
list.innerHTML = arr.map(a => {
const p = currentActionsProfiles[a.uid] || {};
const fullName = [p.displayName, p.lastName].filter(Boolean).join(' ').trim() || 'Участник';
const avatarHtml = p.avatar
? `<img src="${escapeHtml(p.avatar)}" class="team-member-avatar" alt="">`
: `<div class="team-member-avatar-placeholder">👤</div>`;
return `<div class="list-item" style="cursor:pointer;" onclick="openMemberProfile('${a.uid}')">
<div class="item-left">
${avatarHtml}
<div style="min-width:0;flex:1;">
<div class="item-title">${escapeHtml(fullName)}</div>
<div style="color:#aaa;font-size:13px;margin-top:2px;white-space:pre-line;">${escapeHtml(a.text || '')}</div>
<div style="color:#777;font-size:11px;margin-top:3px;">${formatActionTime(a.createdAt)}</div>
</div>
</div>
</div>`;
}).join('');
}
function closeTeamActions() {
if (actionsListenerUnsub) { actionsListenerUnsub(); actionsListenerUnsub = null; }
closeModal('modal-team-actions');
currentActionsTeamId = null;
currentActionsItems = [];
unlockBodyScroll();
saveAppState();
}
// Удаление из облака записей старше 30 дней (правила разрешают это любому участнику)
async function purgeOldTeamActions(teamId) {
if (!db || !currentUser) return;
try {
const cutoff = Date.now() - TEAM_ACTION_TTL_MS;
const snap = await db.collection('teamRegistry').doc(teamId).collection('actions')
.where('createdAt', '<', cutoff).limit(50).get();
if (snap.empty) return;
const batch = db.batch();
snap.docs.forEach(d => batch.delete(d.ref));
await batch.commit();
} catch (err) { /* не критично */ }
}
// Долгое нажатие кнопки «Действия» (владелец) → меню очистки истории
function startTeamActionsPress(ev, teamId) {
const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
window.__actionsPressFired = false;
window.__actionsPressTimer = setTimeout(() => {
if (getMyRole(teamId) !== 'owner') return;
window.__actionsPressFired = true;
if (navigator.vibrate) navigator.vibrate(30);
showClearActionsMenu(teamId, x, y);
}, 600);
}
function cancelTeamActionsPress() { clearTimeout(window.__actionsPressTimer); }
function showClearActionsMenu(teamId, x, y) {
closeClearActionsMenu();
const overlay = document.createElement('div');
overlay.id = 'clear-actions-overlay';
overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:transparent;';
overlay.onclick = closeClearActionsMenu;
document.body.appendChild(overlay);
const menu = document.createElement('div');
menu.id = 'clear-actions-menu';
menu.style.cssText = 'position:fixed;background:#2a2a2a;border-radius:10px;overflow:hidden;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.5);min-width:190px;';
menu.innerHTML = '<div class="clear-actions-option" style="padding:13px 18px;color:#ef5350;font-size:15px;">🗑 Очистить историю</div>'
+ '<div style="height:1px;background:rgba(255,255,255,0.1);"></div>'
+ '<div class="clear-actions-option" style="padding:13px 18px;color:#eee;font-size:15px;">Отмена</div>';
document.body.appendChild(menu);
const opts = menu.querySelectorAll('.clear-actions-option');
opts[0].onclick = (e) => { e.stopPropagation(); closeClearActionsMenu(); clearTeamActionsHistory(teamId); };
opts[1].onclick = (e) => { e.stopPropagation(); closeClearActionsMenu(); };
menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
menu.style.top = Math.min(y, window.innerHeight - 120) + 'px';
}
function closeClearActionsMenu() {
const menu = document.getElementById('clear-actions-menu'); if (menu) menu.remove();
const overlay = document.getElementById('clear-actions-overlay'); if (overlay) overlay.remove();
}
async function clearTeamActionsHistory(teamId) {
if (!db || !currentUser) return;
try {
const snap = await db.collection('teamRegistry').doc(teamId).collection('actions').limit(400).get();
const batch = db.batch();
snap.docs.forEach(d => batch.delete(d.ref));
await batch.commit();
try {
const c = JSON.parse(localStorage.getItem('clc_team_actions_cache') || '{}');
delete c[teamId];
localStorage.setItem('clc_team_actions_cache', JSON.stringify(c));
} catch {}
currentActionsItems = [];
if (currentActionsTeamId === teamId) renderTeamActionsList();
showToast('✅ История действий очищена', 'success');
} catch (err) {
console.error('Не удалось очистить историю:', err);
showToast('⚠️ Не удалось очистить: ' + (err.code || err.message), 'error');
}
}
function applyFullscreenModalStyle(modalId) {
const modal = document.getElementById(modalId);
if (!modal) return;
if (modal.parentElement !== document.body) {
document.body.appendChild(modal);
}
}
function setupModalSwipeClose(modalId, closeFn) {
const modal = document.getElementById(modalId);
if (!modal || modal.dataset.swipeBound) return;
modal.dataset.swipeBound = 'true';
let startX = 0, startY = 0, tracking = false;
modal.addEventListener('touchstart', (e) => {
if (e.target.closest('textarea, input, button')) { tracking = false; return; }
startX = e.touches[0].clientX;
startY = e.touches[0].clientY;
tracking = true;
}, { passive: true });
modal.addEventListener('touchend', (e) => {
if (!tracking) return;
tracking = false;
const dx = e.changedTouches[0].clientX - startX;
const dy = e.changedTouches[0].clientY - startY;
if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) closeFn();
}, { passive: true });
}
function getSortedTeams() {
return [...teams].sort((a, b) => {
const ai = pinnedTeams.indexOf(a.id);
const bi = pinnedTeams.indexOf(b.id);
if (ai !== -1 && bi !== -1) return ai - bi;
if (ai !== -1) return -1;
if (bi !== -1) return 1;
return 0;
});
}
function toggleTeamPin(teamId) {
const idx = pinnedTeams.indexOf(teamId);
if (idx !== -1) pinnedTeams.splice(idx, 1);
else pinnedTeams.unshift(teamId);
try { localStorage.setItem('clc_pinned_teams', JSON.stringify(pinnedTeams)); } catch {}
renderCarousel();
if (currentHomeView === 'teams') showTeamsView();
}
function closeTeamPinMenu() {
const menu = document.getElementById('team-pin-menu-popup');
if (menu) menu.remove();
const overlay = document.getElementById('team-pin-menu-overlay');
if (overlay) overlay.remove();
}
function openTeamPinMenu(teamId, x, y) {
closeTeamPinMenu();
const isPinned = pinnedTeams.includes(teamId);
const overlay = document.createElement('div');
overlay.id = 'team-pin-menu-overlay';
overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:transparent;';
overlay.onclick = closeTeamPinMenu;
document.body.appendChild(overlay);
const menu = document.createElement('div');
menu.id = 'team-pin-menu-popup';
menu.style.cssText = 'position:fixed;background:#2a2a2a;border-radius:10px;overflow:hidden;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.5);min-width:180px;';
menu.innerHTML = `<div class="team-pin-option" style="padding:13px 18px;color:#eee;font-size:15px;">${isPinned ? '📌 Открепить' : '📌 Закрепить вверху'}</div>`;
document.body.appendChild(menu);
menu.querySelector('.team-pin-option').addEventListener('click', (e) => { e.stopPropagation(); closeTeamPinMenu(); toggleTeamPin(teamId); });
menu.style.left = Math.min(x, window.innerWidth - 190) + 'px';
menu.style.top = Math.min(y, window.innerHeight - 60) + 'px';
}
function startTeamPress(e, teamId) {
const x = e.touches ? e.touches[0].clientX : e.clientX;
const y = e.touches ? e.touches[0].clientY : e.clientY;
window.__teamPressFired = false;
window.__teamPressTimer = setTimeout(() => {
window.__teamPressFired = true;
if (navigator.vibrate) navigator.vibrate(30);
openTeamPinMenu(teamId, x, y);
}, 500);
}
function cancelTeamPress() { clearTimeout(window.__teamPressTimer); }
function openTeamFromList(teamId) {
const idx = carouselItems.findIndex(i => i.type === 'team' && i.teamId === teamId);
if (idx !== -1) {
setCarouselIndex(idx, true);
} else {
showTeamDetailView(teamId);
}
}
function createTeamPrompt() {
if (teams.length >= MAX_TEAMS) {
alert(`❌ Достигнут лимит команд (${MAX_TEAMS})`);
return;
}
editingTeamId = null;
teamAvatarFile = null;
document.getElementById('team-modal-title').innerText = '➕ Создать команду';
document.getElementById('team-edit-name').value = '';
document.getElementById('team-edit-password').value = '';
document.getElementById('team-edit-avatar').value = '';
document.getElementById('team-avatar-preview-container').innerHTML = '';
document.getElementById('modal-team-edit').classList.add('show');
}
function previewTeamAvatar(input) {
const file = input.files[0];
if (!file) return;
if (!file.type.startsWith('image/')) {
alert(' Пожалуйста, выберите изображение');
return;
}
teamAvatarFile = file;
const reader = new FileReader();
reader.onload = function(e) {
const container = document.getElementById('team-avatar-preview-container');
container.innerHTML = `<img src="${e.target.result}" class="team-avatar-edit" alt="Preview">`;
};
reader.readAsDataURL(file);
}
function editTeam(teamId) {
if (getMyRole(teamId) === 'member') { notAllowedForRole(); return; }
const team = teams.find(t => t.id === teamId);
if (!team) return;
editingTeamId = teamId;
teamAvatarFile = null;
document.getElementById('team-modal-title').innerText = '✏️ Редактировать команду';
document.getElementById('team-edit-name').value = team.name;
document.getElementById('team-edit-password').value = team.password || '';
document.getElementById('team-edit-avatar').value = '';
const container = document.getElementById('team-avatar-preview-container');
if (team.avatar) {
container.innerHTML = `<img src="${escapeHtml(team.avatar)}" class="team-avatar-edit" alt="Avatar"><div style="font-size: 12px; color: #888; margin-top: 5px;">Загрузите новое, чтобы заменить</div>`;
} else {
container.innerHTML = '<div class="team-avatar-edit-placeholder"></div><div style="font-size: 12px; color: #888; margin-top: 5px;">Аватарка не установлена</div>';
}
document.getElementById('modal-team-edit').classList.add('show');
}
function saveTeamEdit() {
const newName = document.getElementById('team-edit-name').value.trim();
const newPassword = document.getElementById('team-edit-password').value.trim();
if (!newName) { alert('❌ Введите название команды!'); return; }
if (newName.length > 32) { alert('❌ Название команды — не больше 32 символов!'); return; }
function finalizeSave(avatarData) {
if (editingTeamId) {
const team = teams.find(t => t.id === editingTeamId);
if (team) {
const editTimestamp = Date.now();
const prevName = team.name, prevPassword = team.password, prevAvatar = team.avatar;
team.name = newName;
team.password = newPassword;
team.updatedAt = editTimestamp;
if (avatarData !== undefined) team.avatar = avatarData;
if (db && currentUser) {
console.log('DEBUG правка команды:', { teamId: team.id, uid: currentUser.uid, размерАватарки: avatarData ? avatarData.length : 'без изменений' });
db.collection('teamRegistry').doc(team.id).set({ name: newName, password: newPassword, avatar: avatarData !== undefined ? avatarData : (team.avatar || null), createdAt: team.createdAt || Date.now(), updatedAt: editTimestamp, members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) }, { merge: true })
.then(() => {
showToast('✅ Команда обновлена', 'success');
if (newName !== prevName) logTeamAction(team.id, 'Название команды изменено');
if (newPassword !== prevPassword) logTeamAction(team.id, 'Пароль команды изменён');
if (avatarData !== undefined && avatarData !== prevAvatar) logTeamAction(team.id, 'Аватарка команды обновлена');
})
.catch(err => { console.error('teamRegistry sync failed:', err); showToast('⚠️ Не синхронизировано с облаком: ' + err.message, 'error'); });
}
}
} else {
const id = 'team_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const newTeam = {
id,
name: newName,
password: newPassword,
avatar: avatarData || null,
members: [currentUser.uid],
createdAt: Date.now()
};
teams.push(newTeam);
startTeamDataListener(id);
if (db && currentUser) {
db.collection('teamRegistry').doc(id).set({ name: newName, password: newPassword, avatar: avatarData || null, createdBy: currentUser.uid, createdAt: newTeam.createdAt, members: [currentUser.uid] })
.then(() => db.collection('teamRegistry').doc(id).collection('members').doc(currentUser.uid).set({ joinedAt: Date.now(), role: 'owner' }))
.then(() => showToast('✅ Команда создана', 'success'))
.catch(err => { console.error('teamRegistry sync failed:', err.code, err); showToast('⚠️ Команда создана локально, но не в облаке: ' + err.code, 'error'); });
}
}
saveToStorage();
syncPublicProfileToTeams();
closeModal('modal-team-edit');
renderCarousel();
showTeamsView();
}
const avatarInput = document.getElementById('team-edit-avatar');
if (avatarInput.files && avatarInput.files[0]) {
compressTeamImage(avatarInput.files[0], finalizeSave);
} else {
finalizeSave(undefined);
}
}
function showTeamInvite(teamId) {
if (getMyRole(teamId) === 'member') { notAllowedForRole(); return; }
const team = teams.find(t => t.id === teamId);
if (!team) return;
const baseUrl = window.location.origin + window.location.pathname;
const inviteUrl = `${baseUrl}?invite=${team.id}${team.password ? '&pwd=1' : ''}`;
document.getElementById('team-invite-link').innerText = inviteUrl;
document.getElementById('team-invite-id').innerText = team.id;
if (team.password) {
document.getElementById('team-invite-pwd').innerText = team.password;
document.getElementById('team-invite-pwd-block').style.display = 'block';
} else {
document.getElementById('team-invite-pwd-block').style.display = 'none';
}
document.getElementById('modal-team-invite').dataset.teamId = teamId;
document.getElementById('modal-team-invite').classList.add('show');
}
function copyTeamInviteLink() {
const link = document.getElementById('team-invite-link').innerText;
navigator.clipboard.writeText(link).then(() => alert('✅ Ссылка скопирована!')).catch(() => {
const ta = document.createElement('textarea');
ta.value = link;
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
alert('✅ Ссылка скопирована!');
});
}
function deleteTeam(teamId) {
const team = teams.find(t => t.id === teamId);
if (!team) return;
const roles = teamRolesCache[teamId];
const memberCount = (roles && Object.keys(roles).length) || 2;
if (memberCount > 1) {
leaveTeamFlow(teamId, team);
} else {
deleteTeamPermanentlyFlow(teamId, team);
}
}
function leaveTeamFlow(teamId, team) {
const activeSetlists = setlists.filter(sl => sl.teamId === teamId && !sl.isArchived);
let warning = `Покинуть команду «${team.name}»?`;
if (activeSetlists.length > 0) {
warning += `\n⚠️ Скопированные вами сет-листы этой команды останутся у вас, остальные пропадут из этого приложения.`;
}
showDeleteConfirm('team', teamId, warning, async () => {
recentlyLeftTeams[teamId] = Date.now();
if (db && currentUser && getMyRole(teamId) === 'owner') {
const roles = teamRolesCache[teamId] || {};
const others = Object.entries(roles).filter(([uid]) => uid !== currentUser.uid);
const otherOwners = others.filter(([, r]) => r.role === 'owner');
if (otherOwners.length === 0) {
const admins = others.filter(([, r]) => r.role === 'admin').sort((a, b) => a[1].joinedAt - b[1].joinedAt);
const members = others.filter(([, r]) => r.role === 'member').sort((a, b) => a[1].joinedAt - b[1].joinedAt);
const successor = admins[0] || members[0];
if (successor) {
try {
await db.collection('teamRegistry').doc(teamId).collection('members').doc(successor[0]).update({ role: 'owner' });
} catch (err) {
console.error('Не удалось передать владение:', err);
}
}
}
}
if (db && currentUser && team.createdBy === currentUser.uid) {
const roles = teamRolesCache[teamId] || {};
const others = Object.entries(roles).filter(([uid]) => uid !== currentUser.uid);
const owners2 = others.filter(([, r]) => r.role === 'owner').sort((a, b) => a[1].joinedAt - b[1].joinedAt);
const admins2 = others.filter(([, r]) => r.role === 'admin').sort((a, b) => a[1].joinedAt - b[1].joinedAt);
const members2 = others.filter(([, r]) => r.role === 'member').sort((a, b) => a[1].joinedAt - b[1].joinedAt);
const newFounder = owners2[0] || admins2[0] || members2[0];
if (newFounder) {
try {
await db.collection('teamRegistry').doc(teamId).update({ createdBy: newFounder[0] });
} catch (err) {
console.error('Не удалось передать статус создателя:', err);
}
}
}
setlists = setlists.filter(sl => sl.teamId !== teamId);
songs = songs.filter(s => s.fromTeam !== teamId);
teams = teams.filter(t => t.id !== teamId);
if (teamListenerUnsubs[teamId]) { teamListenerUnsubs[teamId](); delete teamListenerUnsubs[teamId]; }
if (teamRegistryListenerUnsubs[teamId]) { teamRegistryListenerUnsubs[teamId](); delete teamRegistryListenerUnsubs[teamId]; }
if (membershipWatchUnsubs[teamId]) { membershipWatchUnsubs[teamId](); delete membershipWatchUnsubs[teamId]; }
if (teamRolesListenerUnsubs[teamId]) { teamRolesListenerUnsubs[teamId](); delete teamRolesListenerUnsubs[teamId]; }
delete teamRolesCache[teamId];
delete teamDataCache[teamId];
if (db && currentUser) {
db.collection('teamRegistry').doc(teamId).update({ members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) }).catch(err => console.error('Не удалось убрать себя из участников:', err));
db.collection('teamRegistry').doc(teamId).collection('members').doc(currentUser.uid).delete().catch(err => console.error('Не удалось удалить пропуск участника:', err));
}
saveToStorage();
renderCarousel();
currentHomeView = 'teams';
const teamsIdx = carouselItems.findIndex(i => i.type === 'teams');
if (teamsIdx !== -1) {
carouselActiveIndex = teamsIdx;
activateCarouselItem(teamsIdx);
}
alert(`✅ Вы покинули команду «${team.name}»`);
});
}
function deleteTeamPermanentlyFlow(teamId, team) {
const warning = `Удалить команду «${team.name}» безвозвратно?\n⚠️ Вы последний участник — все данные команды будут стёрты из облака.`;
showDeleteConfirm('team', teamId, warning, async () => {
if (!navigator.onLine) { alert('❌ Нужно подключение к интернету, чтобы удалить команду'); return; }
if (db && currentUser) {
try {
const membersSnap = await db.collection('teamRegistry').doc(teamId).collection('members').get();
const batch = db.batch();
membersSnap.forEach(doc => batch.delete(doc.ref));
batch.delete(db.collection('teamRegistry').doc(teamId).collection('private').doc('profiles'));
batch.delete(db.collection('teamData').doc(teamId));
batch.delete(db.collection('teamRegistry').doc(teamId));
await batch.commit();
} catch (err) {
console.error('Не удалось полностью удалить команду из облака:', err);
alert('⚠️ Не удалось удалить команду из облака: ' + err.code + '\nПопробуйте ещё раз.');
return;
}
}
recentlyLeftTeams[teamId] = Date.now();
setlists = setlists.filter(sl => sl.teamId !== teamId);
songs = songs.filter(s => s.fromTeam !== teamId);
teams = teams.filter(t => t.id !== teamId);
if (teamListenerUnsubs[teamId]) { teamListenerUnsubs[teamId](); delete teamListenerUnsubs[teamId]; }
if (teamRegistryListenerUnsubs[teamId]) { teamRegistryListenerUnsubs[teamId](); delete teamRegistryListenerUnsubs[teamId]; }
if (membershipWatchUnsubs[teamId]) { membershipWatchUnsubs[teamId](); delete membershipWatchUnsubs[teamId]; }
if (teamRolesListenerUnsubs[teamId]) { teamRolesListenerUnsubs[teamId](); delete teamRolesListenerUnsubs[teamId]; }
delete teamRolesCache[teamId];
delete teamDataCache[teamId];
saveToStorage();
renderCarousel();
currentHomeView = 'teams';
const teamsIdx = carouselItems.findIndex(i => i.type === 'teams');
if (teamsIdx !== -1) {
carouselActiveIndex = teamsIdx;
activateCarouselItem(teamsIdx);
}
alert(`✅ Команда «${team.name}» удалена`);
});
}
function copyTeamInviteId() {
const id = document.getElementById('team-invite-id').innerText;
navigator.clipboard.writeText(id).then(() => alert('✅ ID команды скопирован!')).catch(() => {
const ta = document.createElement('textarea');
ta.value = id;
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
alert('✅ ID команды скопирован!');
});
}
function copyTeamInvitePassword() {
const pwd = document.getElementById('team-invite-pwd').innerText;
navigator.clipboard.writeText(pwd).then(() => alert('✅ Пароль скопирован!')).catch(() => {
const ta = document.createElement('textarea');
ta.value = pwd;
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
alert('✅ Пароль скопирован!');
});
}
function showJoinTeamByLinkModal() {
if (teams.length >= MAX_TEAMS) {
alert(`❌ Достигнут лимит команд (${MAX_TEAMS})`);
return;
}
document.getElementById('join-team-link-input').value = '';
document.getElementById('join-team-password-input').value = '';
document.getElementById('join-team-password-row').style.display = 'block';
document.getElementById('modal-join-team-link').classList.add('show');
}
function onJoinLinkInput() {
// Поле пароля теперь всегда видно — определять по ссылке больше не требуется
}
function parseTeamLink(link) {
if (!link) return null;
try {
const url = new URL(link.trim());
const teamId = url.searchParams.get('invite');
const hasPwd = url.searchParams.get('pwd') === '1';
return { teamId, hasPwd };
} catch {
if (link.trim().startsWith('team_')) {
return { teamId: link.trim(), hasPwd: false };
}
return null;
}
}
function submitJoinTeam() {
const link = document.getElementById('join-team-link-input').value.trim();
if (!link) {
alert('❌ Введите ID команды или вставьте ссылку-приглашение');
return;
}
const parsed = parseTeamLink(link);
if (!parsed || !parsed.teamId) {
alert('❌ Не удалось распознать ID команды. Проверьте, что скопировали его полностью.');
return;
}
if (teams.find(t => t.id === parsed.teamId)) {
alert('️ Эта команда уже добавлена');
return;
}
const pwd = document.getElementById('join-team-password-input').value;
confirmJoinTeam(parsed.teamId, pwd);
}
async function confirmJoinTeam(teamId, password) {
if (teams.length >= MAX_TEAMS) {
alert(`❌ Достигнут лимит команд (${MAX_TEAMS})`);
return;
}
if (teams.find(t => t.id === teamId)) {
startTeamDataListener(teamId);
closeModal('modal-join-team-link');
renderCarousel();
showTeamsView();
alert('ℹ️ Вы уже состоите в этой команде');
return;
}
let registryDoc;
try {
registryDoc = await db.collection('teamRegistry').doc(teamId).get();
} catch (err) {
alert('❌ Не удалось проверить команду. Проверьте подключение к интернету.');
return;
}
if (!registryDoc.exists) {
alert('❌ Команда не найдена. Проверьте ссылку-приглашение.');
return;
}
const registry = registryDoc.data();
if (registry.password && registry.password !== password) {
alert('❌ Неверный пароль команды');
return;
}
const updatedMembers = Array.from(new Set([...(registry.members || []), registry.createdBy, currentUser.uid].filter(Boolean)));
try {
await db.collection('teamRegistry').doc(teamId).collection('members').doc(currentUser.uid).set({ joinedAt: Date.now() });
} catch (err) {
console.error('Не удалось зарегистрировать участие:', err);
alert('❌ Не удалось присоединиться к команде: ' + err.message);
return;
}
db.collection('teamRegistry').doc(teamId).update({ members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) }).catch(() => {});
const newTeam = {
id: teamId,
name: registry.name,
password: registry.password || '',
avatar: registry.avatar || null,
members: updatedMembers,
createdAt: Date.now(),
joinedByLink: true
};
teams.push(newTeam);
startTeamDataListener(teamId);
saveToStorage();
syncPublicProfileToTeams();
closeModal('modal-join-team-link');
renderCarousel();
showTeamsView();
alert(`✅ Вы присоединились к команде «${registry.name}»!`);
}
function openSetlistModalForTeam(teamId) {
if (getMyRole(teamId) === 'member') { notAllowedForRole(); return; }
document.getElementById('sl-date').value = getNextSundayDate();
document.getElementById('sl-time').value = '11:00';
document.getElementById('sl-name').value = '';
document.getElementById('modal-setlist').dataset.teamId = teamId;
document.getElementById('modal-setlist').classList.add('show');
}
function copySetlistToPersonal(setlistId) {
const sl = setlists.find(x => x.id === setlistId);
if (!sl) return;
const newId = getNextId(setlists);
const newSongs = sl.songs.map(item => {
const teamSong = songs.find(x => x.id === item.id);
if (!teamSong) return { ...item };
const existingPersonal = songs.find(x => !x.fromTeam && x.title.toLowerCase() === teamSong.title.toLowerCase());
if (existingPersonal) {
const teamChordpro = item.chordpro || teamSong.chordpro;
const differs = teamChordpro !== existingPersonal.chordpro;
return { ...item, id: existingPersonal.id, chordpro: differs ? teamChordpro : null };
}
const newSongId = getNextId(songs);
songs.push({ id: newSongId, title: teamSong.title, author: teamSong.author || '', key: teamSong.key, bpm: teamSong.bpm || '', category: teamSong.category || '', chordpro: item.chordpro || teamSong.chordpro, images: teamSong.images || {}, cloudId: generateCloudId(), createdAt: Date.now(), columns: currentColumns, fontSize });
return { ...item, id: newSongId, chordpro: null };
});
const newSl = {
id: newId,
date: sl.date,
time: sl.time || '',
name: sl.name,
isArchived: false,
teamId: null,
songs: newSongs,
copiedFrom: sl.id,
copiedAt: Date.now()
};
setlists.push(newSl);
saveToStorage();
renderSetlists();
showTeamDetailView(sl.teamId);
alert(`✅ Сет-лист «${sl.name}» добавлен в ваши сет-листы!`);
}
function applyTeamOverlay(teamId) {
const data = teamDataCache[teamId];
if (!data) return;
songs = songs.filter(s => s.fromTeam !== teamId);
(data.songs || []).forEach(s => {
songs.push({ ...s, fromTeam: teamId });
// Комментарии команды для этой песни — общие, приходят вместе с песней
if (data.sectionNotes && data.sectionNotes[s.id]) sectionNotes[s.id] = data.sectionNotes[s.id];
if (data.inlineComments && data.inlineComments[s.id]) inlineComments[s.id] = data.inlineComments[s.id];
});
const cloudSetlists = data.setlists || [];
const cloudIds = new Set(cloudSetlists.map(cs => cs.id));
// самый свежий момент публикации в пришедшем срезе — мера свежести снапшота
const cloudMaxSharedAt = cloudSetlists.reduce((mx, cs) => Math.max(mx, cs.sharedAt || 0), 0);
const existingById = {};
setlists.filter(sl => sl.teamId === teamId && sl.fromTeamSync).forEach(sl => { existingById[sl.id] = sl; });
// убираем и старые облачные копии, и ЛОКАЛЬНЫЕ дубликаты тех же сет-листов (тот же id) — иначе сет-лист задваивается
setlists = setlists.filter(sl => {
if (sl.teamId !== teamId) return true;
if (cloudIds.has(sl.id)) return false; // будет заменён облачной копией ниже
if (!sl.fromTeamSync) return true; // локальный, ещё не публиковали — не трогаем
// отсутствует в срезе, но мы сами опубликовали его позже самого свежего события среза —
// это устаревший (закэшированный) снапшот, эхо нашей публикации ещё не приехало: сохраняем
if (sl.sharedAt && sl.sharedAt > cloudMaxSharedAt) return true;
return false; // публикации нет и в облаке — сет-лист удалён с другого устройства
});
cloudSetlists.forEach(cloudSl => {
const existing = existingById[cloudSl.id];
const localIsNewer = existing && existing.localUpdatedAt && existing.localUpdatedAt > (cloudSl.sharedAt || 0);
if (localIsNewer) {
setlists.push(existing);
} else {
setlists.push({ ...cloudSl, teamId: teamId, fromTeamSync: true });
}
});
}
function applyAllTeamOverlays() {
Object.keys(teamDataCache).forEach(applyTeamOverlay);
}
function startTeamRegistryListener(teamId) {
if (teamRegistryListenerUnsubs[teamId] || !db || !currentUser) return;
teamRegistryListenerUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).onSnapshot(doc => {
if (!doc.exists) return;
const data = doc.data();
const team = teams.find(t => t.id === teamId);
if (!team) return;
if (data.updatedAt && team.updatedAt && data.updatedAt < team.updatedAt) return;
team.name = data.name;
team.avatar = data.avatar || null;
team.password = data.password || '';
team.updatedAt = data.updatedAt || team.updatedAt;
team.createdBy = data.createdBy || team.createdBy;
const membersSet = new Set(data.members || []);
if (data.createdBy) membersSet.add(data.createdBy);
team.members = Array.from(membersSet);
saveToStorage();
renderCarousel();
if (currentHomeView === 'teams') showTeamsView();
if (currentTeamDetailId === teamId) showTeamDetailView(teamId);
}, err => console.error('teamRegistry listener error:', err));
}
function startMembershipWatch(teamId) {
if (membershipWatchUnsubs[teamId] || !db || !currentUser) return;
let sawExisting = false;
membershipWatchUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).collection('members').doc(currentUser.uid)
.onSnapshot(doc => {
if (doc.exists) { sawExisting = true; return; }
if (!sawExisting) return;
handleKickedFromTeam(teamId);
}, err => console.error('membership watch error:', err));
}
function handleKickedFromTeam(teamId) {
const team = teams.find(t => t.id === teamId);
const teamName = team ? team.name : 'команда';
recentlyLeftTeams[teamId] = Date.now();
setlists = setlists.filter(sl => sl.teamId !== teamId);
songs = songs.filter(s => s.fromTeam !== teamId);
teams = teams.filter(t => t.id !== teamId);
if (teamListenerUnsubs[teamId]) { teamListenerUnsubs[teamId](); delete teamListenerUnsubs[teamId]; }
if (teamRegistryListenerUnsubs[teamId]) { teamRegistryListenerUnsubs[teamId](); delete teamRegistryListenerUnsubs[teamId]; }
if (membershipWatchUnsubs[teamId]) { membershipWatchUnsubs[teamId](); delete membershipWatchUnsubs[teamId]; }
delete teamDataCache[teamId];
saveToStorage();
renderCarousel();
if (currentTeamDetailId === teamId || currentHomeView === 'team_' + teamId) {
currentHomeView = 'teams';
const teamsIdx = carouselItems.findIndex(i => i.type === 'teams');
if (teamsIdx !== -1) { carouselActiveIndex = teamsIdx; activateCarouselItem(teamsIdx); }
} else if (currentHomeView === 'teams') {
showTeamsView();
}
alert(`⚠️ Вас удалили из команды «${teamName}»`);
}
function startSetlistStatusListener(teamId) {
if (setlistStatusListenerUnsubs[teamId] || !db || !currentUser) return;
setlistStatusListenerUnsubs[teamId] = db.collection('teamData').doc(teamId).collection('setlistStatus')
.onSnapshot(snap => {
const statuses = {};
snap.forEach(doc => { statuses[doc.id] = doc.data(); });
setlistStatusCache[teamId] = statuses;
try { localStorage.setItem('clc_setlist_status_cache', JSON.stringify(setlistStatusCache)); } catch {}
if (currentTeamDetailId === teamId) showTeamDetailView(teamId);
}, err => console.error('setlist status listener error:', err));
}
function startTeamRolesListener(teamId) {
if (teamRolesListenerUnsubs[teamId] || !db || !currentUser) return;
teamRolesListenerUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).collection('members')
.onSnapshot(snap => {
// пустой снапшот (сбой сети/прав) не должен затирать сохранённый кеш ролей —
// иначе после обновления страницы права пропадают до следующей удачной загрузки
if (snap.empty && teamRolesCache[teamId] && Object.keys(teamRolesCache[teamId]).length) return;
const roles = {};
let myRawRole;
snap.forEach(doc => {
roles[doc.id] = { role: doc.data().role || 'member', joinedAt: doc.data().joinedAt || 0 };
if (doc.id === currentUser.uid) myRawRole = doc.data().role;
});
teamRolesCache[teamId] = roles;
try { localStorage.setItem('clc_team_roles_cache', JSON.stringify(teamRolesCache)); } catch {}
const team = teams.find(t => t.id === teamId);
if (!myRawRole && team && team.createdBy === currentUser.uid) {
db.collection('teamRegistry').doc(teamId).collection('members').doc(currentUser.uid).update({ role: 'owner' }).catch(err => console.error('role bootstrap failed:', err));
}
if (currentMembersTeamId === teamId && typeof renderTeamMembersList === 'function') renderTeamMembersList();
if (currentTeamDetailId === teamId) showTeamDetailView(teamId);
if (currentHomeView === 'teams') showTeamsView();
}, err => console.error('roles listener error:', err));
}
function getMyRole(teamId) {
const roles = teamRolesCache[teamId];
if (!roles || !currentUser) return 'member';
const entry = roles[currentUser.uid];
return entry ? entry.role : 'member';
}
function isTeamOwner(teamId) { return getMyRole(teamId) === 'owner'; }
function isTeamOwnerOrAdmin(teamId) { const r = getMyRole(teamId); return r === 'owner' || r === 'admin'; }
function notAllowedForRole() { alert('⛔ Недоступно для вашей роли в команде'); }
function startTeamDataListener(teamId) {
startTeamRegistryListener(teamId);
startMembershipWatch(teamId);
startTeamRolesListener(teamId);
startSetlistStatusListener(teamId);
startChatListener(teamId);
startChatReadsListener(teamId);
if (teamListenerUnsubs[teamId] || !db || !currentUser) return;
teamListenerUnsubs[teamId] = db.collection('teamData').doc(teamId).onSnapshot(doc => {
teamDataCache[teamId] = doc.exists ? doc.data() : { songs: [], setlists: [] };
// Защита от старых версий приложения: они стирали поле setlists при синхронизации песен.
// Если поле исчезло, а локально командные сет-листы ещё есть — восстанавливаем их в облако.
if (doc.exists && teamDataCache[teamId].setlists === undefined) {
const rescueSetlists = setlists.filter(sl => sl.teamId === teamId && sl.fromTeamSync);
if (rescueSetlists.length) {
console.warn('⚠️ Поле setlists стёрто в данных команды — восстанавливаю сет-листы из локальной копии');
rescueSetlists.forEach(sl => {
logTeamAction(teamId, `⚠️ Сет-лист «${sl.name}» исчез из данных команды (аварийно) — автоматически восстановлен из локальной копии`);
publishSetlistToTeamData(sl, teamId).catch(err => console.error('Не удалось восстановить сет-лист:', err));
});
} else {
// локальных копий нет — фиксируем потерю, но пишем один раз за сеанс, чтобы не заспамить журнал
window.__setlistLossWarnedFor = window.__setlistLossWarnedFor || {};
if (!window.__setlistLossWarnedFor[teamId]) {
window.__setlistLossWarnedFor[teamId] = true;
logTeamAction(teamId, '⚠️ Обнаружена потеря сет-листов в данных команды (данные были стёрты). Локальных копий для восстановления не найдено');
}
}
}
applyTeamOverlay(teamId);
// пока идёт восстановление, держим локальные копии, чтобы не потерять их при сбое
for (const rsl of (typeof rescueSetlists !== 'undefined' ? rescueSetlists : [])) {
if (!setlists.some(x => x.id === rsl.id && x.teamId === teamId)) setlists.push(rsl);
}
if (currentTeamDetailId === teamId) showTeamDetailView(teamId);
if (currentHomeView === 'songs') renderSongs();
if (currentHomeView === 'setlists') renderSetlists();
if (document.getElementById('page-setlist-detail').classList.contains('active')) {
const sl = setlists.find(x => x.id === currentSlId);
if (sl && sl.teamId === teamId) { renderSlSongs(); markSetlistRead(sl); }
}
if (document.getElementById('page-song-view').classList.contains('active') && !isInlineEditing) {
const sl = currentSlId ? setlists.find(x => x.id === currentSlId) : null;
if (sl && sl.teamId === teamId) openSongView(currentSongId, currentSlId);
}
renderCarousel();
}, err => console.error('teamData listener error:', err));
}
function showTeamDetailView(teamId) {
const view = document.getElementById('home-view-team-detail');
const team = teams.find(t => t.id === teamId);
if (!team) {
view.innerHTML = '<p style="color:#ef5350;text-align:center;padding:40px;">Команда не найдена</p>';
view.style.display = 'block';
return;
}
currentTeamDetailId = teamId;
startTeamDataListener(teamId);
view.style.display = 'block';
const teamSetlists = setlists.filter(sl => sl.teamId === teamId);
const activeSetlists = teamSetlists.filter(sl => !sl.isArchived);
const archivedSetlists = teamSetlists.filter(sl => sl.isArchived);
const isArchiveMode = currentTeamArchiveTeamId === teamId;
let listsToShow = isArchiveMode ? archivedSetlists : activeSetlists;
listsToShow = [...listsToShow].sort((a, b) => {
const dateA = new Date(a.date + 'T' + (a.time || '00:00')).getTime();
const dateB = new Date(b.date + 'T' + (b.time || '00:00')).getTime();
if (isArchiveMode) {
return dateB - dateA;
}
const aExpired = isSetlistExpired(a);
const bExpired = isSetlistExpired(b);
if (aExpired && !bExpired) return 1;
if (!aExpired && bExpired) return -1;
if (aExpired && bExpired) return dateB - dateA;
return dateA - dateB;
});
const isLight = document.body.classList.contains('light');
const dateColorBase = isLight ? '#7e57c2' : '#9575cd';
let html = `<div style="padding: 10px 0;">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
<button class="btn-pastel" style="margin:0;" onclick="openSetlistModalForTeam('${team.id}')">➕ Сет-лист</button>
<button class="btn-pastel" style="margin:0;position:relative;" ontouchstart="startChatBtnPress(event,'${team.id}')" ontouchend="cancelChatBtnPress()" ontouchcancel="cancelChatBtnPress()" onmousedown="startChatBtnPress(event,'${team.id}')" onmouseup="cancelChatBtnPress()" onmouseleave="cancelChatBtnPress()" onclick="if(window.__chatBtnPressFired){window.__chatBtnPressFired=false;return;} openTeamChat('${team.id}')">💬 Чат${getUnreadChatCount(team.id) > 0 ? `<span style="position:absolute;top:-6px;right:-6px;background:#ef5350;color:#fff;font-size:11px;font-weight:bold;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;">${getUnreadChatCount(team.id)}</span>` : ''}</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:15px;">
<button class="btn-pastel" style="margin:0;" onclick="openTeamMembers('${team.id}')">👥 Участники</button>
<div class="btn-split-diag">
<button class="btn-pastel cut-left" onclick="showTeamInvite('${team.id}')">🔗 Пригласить</button>
<button class="btn-pastel cut-right" ontouchstart="startTeamActionsPress(event,'${team.id}')" ontouchend="cancelTeamActionsPress()" ontouchcancel="cancelTeamActionsPress()" onmousedown="startTeamActionsPress(event,'${team.id}')" onmouseup="cancelTeamActionsPress()" onmouseleave="cancelTeamActionsPress()" onclick="if(window.__actionsPressFired){window.__actionsPressFired=false;return;} teamActionsPressed('${team.id}')">⚙ Действия</button>
</div>
</div>`;
html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:15px;">`;
html += `<button class="btn-pastel" style="margin:0;${!isArchiveMode ? 'background:rgba(179,157,219,0.35);font-weight:bold;' : 'opacity:0.6;'}" onclick="toggleTeamArchive('${team.id}')">Актуальные (${activeSetlists.length})</button>`;
html += `<button class="btn-pastel" style="margin:0;${isArchiveMode ? 'background:rgba(179,157,219,0.35);font-weight:bold;' : 'opacity:0.6;'}" onclick="toggleTeamArchive('${team.id}')">Архив (${archivedSetlists.length})</button>`;
html += `</div>`;
if (listsToShow.length === 0) {
html += `<div style="text-align: center; padding: 30px 20px; color: #888;">
<div style="font-size: 48px; margin-bottom: 15px;">📋</div>
<p>${isArchiveMode ? 'Архив пуст' : 'В этой команде пока нет сет-листов'}</p>
${!isArchiveMode ? '<p style="font-size: 13px; margin-top: 8px;">Нажмите «Создать сет-лист»</p>' : ''}
</div>`;
} else {
listsToShow.forEach(sl => {
const isExpired = !sl.isArchived && isSetlistExpired(sl);
const dateColor = isExpired ? '#ef5350' : dateColorBase;
const expiredClass = isExpired ? 'setlist-expired' : '';
const changesBadge = sl.hasChanges ? ' <span style="background: #ef5350; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">ИЗМЕНЕНО</span>' : '';
const slStatus = (setlistStatusCache[teamId] && setlistStatusCache[teamId][sl.id]) || null;
let statusSlot = '';
if (failedSyncSetlists[sl.id]) {
statusSlot = `<button class="btn-icon" onclick="event.stopPropagation(); syncSetlistIfTeam(setlists.find(x=>x.id===${sl.id}))" title="Не удалось отправить — нажмите, чтобы повторить" style="color:#ef5350;">🔄</button>`;
} else if (slStatus && currentUser && slStatus.updatedBy === currentUser.uid) {
const allRead = (slStatus.requiredReaders || []).every(uid => (slStatus.readBy || []).includes(uid));
statusSlot = allRead
? `<span title="Прочитано всеми участниками" style="color:#42a5f5;font-size:13px;">✔\uFE0E✔\uFE0E</span>`
: `<span title="Ожидает прочтения" style="color:#888;font-size:13px;">✔\uFE0E</span>`;
}
			let actions = statusSlot;
			if (sl.isArchived) {
			actions += `<button class="btn-icon" onclick="event.stopPropagation(); restoreSetlist(${sl.id})">↻</button>`;
			actions += `<button class="btn-icon" onclick="event.stopPropagation(); showSetlistDeleteChoice(${sl.id}, '', false)">🗑️</button>`;
			} else {
			if (isTeamOwnerOrAdmin(teamId)) actions += `<button class="btn-icon" onclick="event.stopPropagation(); sendSetlistUpdates(${sl.id})" title="Отправить обновления в команду">☁️</button>`;
			actions += `<button class="btn-icon" onclick="event.stopPropagation(); openEditSetlistModal(${sl.id})">✏️</button>`;
			actions += `<button class="btn-icon" onclick="event.stopPropagation(); showSetlistDeleteChoice(${sl.id}, '', false)">🗑️</button>`;
			}
html += `<div class="list-item ${expiredClass}" style="cursor: pointer;" onclick="clearSetlistSearchAndOpen(${sl.id})">
<div class="item-left" style="min-width: 0; flex: 1;">
<div style="min-width: 0; flex: 1;">
<div class="item-title" style="${isExpired ? 'color: #ef5350;' : ''}">${escapeHtml(sl.name)}${changesBadge}</div>
<div style="font-size: 10px; color: ${isExpired ? '#ef5350' : '#888'}; margin-top: 2px;">${formatSetlistDate(sl.date, sl.time)} · ${sl.songs.length} песен</div>
</div>
</div>
<div class="item-actions" style="display: flex; gap: 4px;">${actions}</div>
</div>`;
});
}
html += `</div>`;
view.innerHTML = html;
}
function toggleTeamArchive(teamId) {
currentTeamArchiveTeamId = (currentTeamArchiveTeamId === teamId) ? null : teamId;
showTeamDetailView(teamId);
}
function createSetlistForTeam(teamId) {
const name = prompt('Название сет-листа:');
if (!name || !name.trim()) return;
const date = prompt('Дата (ДД.ММ.ГГГГ):', new Date().toLocaleDateString('ru-RU'));
if (!date) return;
const newId = getNextId(setlists);
setlists.push({
id: newId, date: date.trim(), time: '', name: name.trim(),
isArchived: false, teamId: teamId, songs: []
});
saveToStorage();
logTeamAction(teamId, `Создан сет-лист «${name.trim()}»`);
showTeamDetailView(teamId);
renderCarousel();
}
function exportSetlist() {
if (!currentSlId) return;
const sl = setlists.find(x => x.id === currentSlId);
if (!sl) return;
const modal = document.getElementById('modal-share-setlist');
if (!modal) {
exportSetlistAsFileDirect();
return;
}
const section = document.getElementById('share-to-team-section');
const shareableTeams = teams.filter(t => t.id !== sl.teamId);
let html = '';
if (sl.teamId) {
html += `<button class="btn-pastel" style="width: 100%; margin-bottom: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #444; text-align: left; color: #42a5f5;" onclick="updateSetlistInTeam(${sl.id})">🔄 Обновить изменения в команде</button>`;
html += `<button class="btn-pastel" style="width: 100%; margin-bottom: 6px; text-align: left; color: #4caf50;" onclick="copySetlistToPersonal(${sl.id}); closeModal('modal-share-setlist');">📥 В мои сет-листы</button>`;
}
if (shareableTeams.length > 0) {
html += `
<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
<p style="color: #888; font-size: 13px; margin-bottom: 8px;">Отправить в команду:</p>
${shareableTeams.map(t => {
const icon = t.avatar ? `<img src="${escapeHtml(t.avatar)}" style="width:20px;height:20px;border-radius:5px;object-fit:cover;vertical-align:middle;margin-right:6px;">` : '🎸 ';
return `<button class="btn-pastel" style="width: 100%; margin-bottom: 6px; text-align: left;" onclick="shareSetlistToTeam(${sl.id}, '${t.id}')">${icon}${escapeHtml(t.name)}</button>`;
}).join('')}
</div>
`;
} else if (teams.length === 0) {
html += `<p style="color: #888; font-size: 12px; margin-top: 10px; text-align: center;">Создайте команду, чтобы отправлять сет-листы</p>`;
}
section.innerHTML = html;
modal.classList.add('show');
}
// Отправить текущую (изменённую) версию сет-листа в его команду
async function updateSetlistInTeam(setlistId) {
const sl = setlists.find(x => x.id === setlistId);
if (!sl || !sl.teamId) return;
const team = teams.find(t => t.id === sl.teamId);
if (!confirm(`Отправить текущую версию сет-листа «${sl.name}» в команду «${team ? team.name : ''}»?\nУ всех участников сет-лист обновится автоматически.`)) return;
if (!db || !currentUser) { showToast('❌ Нет подключения к облаку', 'error'); return; }
try {
	await publishSetlistToTeamData(sl, sl.teamId);
	sl.fromTeamSync = true;
	saveToStorage();
	closeModal('modal-share-setlist');
	logTeamAction(sl.teamId, `Сет-лист «${sl.name}» обновлён`);
	showToast('✅ Обновление отправлено в команду', 'success');
} catch (err) {
console.error('update setlist in team failed:', err);
showToast('❌ Не удалось обновить: ' + (err.code || err.message), 'error');
}
}
function exportSetlistAsFile() {
closeModal('modal-share-setlist');
exportSetlistAsFileDirect();
}
function exportSetlistAsFileDirect() {
const sl = setlists.find(x => x.id === currentSlId);
if (!sl) return;
shareFile({ version: 2, type: 'setlist', app: 'Worship SetUP', data: { date: sl.date, time: sl.time || '', name: sl.name, songs: sl.songs.map(item => { const s = songs.find(x => x.id === item.id); return s ? exportSongFromSetlist(item, s) : null; }).filter(Boolean) } }, `${sl.date}_${sl.name}.clcsetlist`);
}
async function shareSetlistViaAPI() {
const sl = setlists.find(x => x.id === currentSlId);
if (!sl) return;
closeModal('modal-share-setlist');
const fileData = { version: 2, type: 'setlist', app: 'Worship SetUP', data: { date: sl.date, time: sl.time || '', name: sl.name, songs: sl.songs.map(item => { const s = songs.find(x => x.id === item.id); return s ? exportSongFromSetlist(item, s) : null; }).filter(Boolean) } };
const filename = `${sl.date}_${sl.name}.clcsetlist`;
const file = new File([JSON.stringify(fileData, null, 2)], filename, { type: 'application/json' });
if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
try {
await navigator.share({ files: [file], title: `Сет-лист: ${sl.name}` });
return;
} catch (err) {
if (err.name === 'AbortError') return;
}
}
downloadJson(fileData, filename);
}
// Личные настройки отображения — не отправляются в команду, у каждого участника свои
const TEAM_SYNC_EXCLUDE_FIELDS = ['capo', 'fontSize', 'columns', 'accidental', 'hideChords', 'hideLyrics', 'hideArrows', 'hideComments'];
function stripPersonalSettingsForTeam(item) {
    const clean = { ...item };
    TEAM_SYNC_EXCLUDE_FIELDS.forEach(f => delete clean[f]);
    return clean;
}
// Отправить/обновить одну песню в данных команды (транзакция, по образцу publishSetlistToTeamData)
async function publishSongToTeam(song, teamId) {
if (!db || !currentUser || !song || !teamId) return false;
const clean = stripPersonalSettingsForTeam(song);
const docRef = db.collection('teamData').doc(teamId);
await db.runTransaction(async (tx) => {
const doc = await tx.get(docRef);
const data = doc.exists ? doc.data() : { songs: [], setlists: [], sectionNotes: {}, inlineComments: {} };
const teamSongs = data.songs || [];
const idx = teamSongs.findIndex(ts => ts.id === clean.id);
if (idx !== -1) teamSongs[idx] = clean; else teamSongs.push(clean);
const teamSectionNotes = data.sectionNotes || {};
const teamInlineComments = data.inlineComments || {};
if (sectionNotes[song.id] && Object.keys(sectionNotes[song.id]).length) teamSectionNotes[song.id] = sectionNotes[song.id];
if (inlineComments[song.id] && Object.keys(inlineComments[song.id]).length) teamInlineComments[song.id] = inlineComments[song.id];
// tx.set перезаписал бы документ целиком и стёр бы сет-листы команды,
// поэтому при существующем документе обновляем только нужные поля
if (doc.exists) {
tx.update(docRef, { songs: teamSongs, sectionNotes: teamSectionNotes, inlineComments: teamInlineComments, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid });
} else {
tx.set(docRef, { songs: teamSongs, setlists: [], sectionNotes: teamSectionNotes, inlineComments: teamInlineComments, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid });
}
});
return true;
}
// Синхронизировать песню во ВСЕ команды, где она используется (правка песни разъезжается по командам)
function syncSongToAllTeams(song) {
if (!db || !currentUser || !song) return;
const teamIds = new Set();
if (song.fromTeam) teamIds.add(song.fromTeam);
setlists.forEach(sl => {
if (sl.teamId && sl.songs && sl.songs.some(it => it.id === song.id)) teamIds.add(sl.teamId);
});
if (!teamIds.size) return;
teamIds.forEach(teamId => {
// обычному участнику менять данные команды нельзя
if (teamRolesCache[teamId] && getMyRole(teamId) === 'member') return;
publishSongToTeam(song, teamId).catch(err => console.error('song sync error:', teamId, err));
// журнал: отдельная запись для каждого сет-листа, где используется песня
const affectedSetlists = setlists.filter(sl => sl.teamId === teamId && sl.songs && sl.songs.some(it => it.id === song.id));
if (affectedSetlists.length) {
affectedSetlists.forEach(sl => logTeamAction(teamId, `редактировал песню «${song.name || song.title || 'без названия'}» в сет-листе «${sl.name}»`));
} else {
logTeamAction(teamId, `Обновлена песня «${song.name || song.title || 'без названия'}»`);
}
});
}
async function publishSetlistToTeamData(sl, teamId, opts) {
    opts = opts || {};
    const force = opts.force !== false; // по умолчанию — принудительная публикация (явные действия пользователя)
    if (!db || !currentUser) return false;
    const songsToShare = sl.songs.map(item => {
        const s = songs.find(x => x.id === item.id);
        return s ? stripPersonalSettingsForTeam(s) : null;
    }).filter(Boolean);
    const docRef = db.collection('teamData').doc(teamId);
    let assignedId = null;
    let skippedStale = false;
    const sharedAtNow = Date.now();
    await db.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        const data = doc.exists ? doc.data() : { songs: [], setlists: [], sectionNotes: {}, inlineComments: {} };
        const teamSongs = data.songs || [];
        const teamSetlists = data.setlists || [];
        const teamSectionNotes = data.sectionNotes || {};
        const teamInlineComments = data.inlineComments || {};
        songsToShare.forEach(s => {
            const idx = teamSongs.findIndex(ts => ts.id === s.id);
            if (idx !== -1) teamSongs[idx] = s; else teamSongs.push(s);
            // Комментарии (под секциями и инлайн) — тоже общие для команды, идут вместе с песней
            if (sectionNotes[s.id] && Object.keys(sectionNotes[s.id]).length) teamSectionNotes[s.id] = sectionNotes[s.id];
            if (inlineComments[s.id] && Object.keys(inlineComments[s.id]).length) teamInlineComments[s.id] = inlineComments[s.id];
        });
        const existingIdx = teamSetlists.findIndex(ts => ts.id === sl.id);
        // Слияние с облачной копией: не даём устаревшему устройству стереть
        // локальный текст песни (доп. информацию) и тональность, которых у него нет
        const existingCloudSl = existingIdx !== -1 ? teamSetlists[existingIdx] : null;
        // Автосинхронизация (force=false) не перезаписывает более свежую облачную версию,
        // если у устройства нет собственных правок с момента получения данных
        if (!force && existingCloudSl) {
            const cloudRev = existingCloudSl.sharedAt || 0;
            const baseRev = sl.sharedAt || 0;
            const hasLocalEdits = sl.localUpdatedAt && sl.localUpdatedAt > baseRev;
            if (cloudRev > baseRev && !hasLocalEdits) {
                console.warn('⏭️ Публикация сет-листа «' + sl.name + '» пропущена: облако новее, локальных правок нет');
                skippedStale = true;
                return;
            }
        }
        const mergedSlSongs = sl.songs.map(item => {
            const local = stripPersonalSettingsForTeam(item);
            const cloudItem = existingCloudSl && existingCloudSl.songs ? existingCloudSl.songs.find(ci => ci.id === item.id) : null;
            if (!cloudItem) return local;
            if (local.chordpro == null && cloudItem.chordpro != null) local.chordpro = cloudItem.chordpro;
            if (local.key == null && cloudItem.key != null) local.key = cloudItem.key;
            return local;
        });
        const sharedSetlist = { id: sl.id, date: sl.date, time: sl.time || '', name: sl.name, isArchived: !!sl.isArchived, sharedBy: currentUser.uid, sharedAt: sharedAtNow, songs: mergedSlSongs };
        if (existingIdx !== -1) teamSetlists[existingIdx] = sharedSetlist; else teamSetlists.push(sharedSetlist);
        assignedId = sharedSetlist.id;
        tx.set(docRef, { songs: teamSongs, setlists: teamSetlists, sectionNotes: teamSectionNotes, inlineComments: teamInlineComments, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid });
    });
    if (skippedStale) return true;
    // новая база ревизий для будущих проверок устаревания
    sl.sharedAt = sharedAtNow;
    sl.sharedToTeams = sl.sharedToTeams || [];
    if (!sl.sharedToTeams.includes(teamId)) sl.sharedToTeams.push(teamId);
    try {
        const myTeamRoles = teamRolesCache[teamId] || {};
        const requiredReaders = Object.keys(myTeamRoles).filter(uid => uid !== currentUser.uid);
        await db.collection('teamData').doc(teamId).collection('setlistStatus').doc(String(sl.id)).set({
            updatedBy: currentUser.uid,
            updatedAt: Date.now(),
            requiredReaders,
            readBy: [currentUser.uid]
        });
    } catch (err) { console.error('Не удалось обновить статус прочтения:', err); }
    return true;
}
// Быстрая принудительная отправка текущей версии сет-листа в команду (кнопка ☁️ на карточке)
async function sendSetlistUpdates(setlistId) {
	const sl = setlists.find(x => x.id === setlistId);
	if (!sl || !sl.teamId) return;
	if (getMyRole(sl.teamId) === 'member') { notAllowedForRole(); return; }
	if (!db || !currentUser) { showToast('❌ Нет подключения к облаку', 'error'); return; }
	try {
		await publishSetlistToTeamData(sl, sl.teamId);
		delete failedSyncSetlists[sl.id];
		showToast('✅ Обновление отправлено в команду', 'success');
		if (currentTeamDetailId === sl.teamId) showTeamDetailView(sl.teamId);
	} catch (err) {
		console.error('sendSetlistUpdates failed:', err);
		failedSyncSetlists[sl.id] = true;
		showToast('❌ Не удалось отправить: ' + (err.code || err.message), 'error');
		if (currentTeamDetailId === sl.teamId) showTeamDetailView(sl.teamId);
	}
}
async function removeSetlistFromTeamData(setlistId, teamId) {
    if (!db || !currentUser || !teamId) return;
    const docRef = db.collection('teamData').doc(teamId);
    try {
        await db.runTransaction(async (tx) => {
            const doc = await tx.get(docRef);
            if (!doc.exists) return;
            const data = doc.data();
            const teamSetlists = (data.setlists || []).filter(ts => ts.id !== setlistId);
            tx.update(docRef, { setlists: teamSetlists, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: currentUser.uid });
        });
    } catch (err) { console.error('Team delete sync error:', err); }
}
function markSetlistRead(sl) {
if (!sl || !sl.teamId || !db || !currentUser) return;
db.collection('teamData').doc(sl.teamId).collection('setlistStatus').doc(String(sl.id)).set({
readBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
}, { merge: true }).catch(err => console.error('Не удалось отметить прочтение:', err));
}
function syncSetlistIfTeam(sl) {
    if (sl && sl.teamId) {
        // force:false — автосинхронизация не перезаписывает более свежую облако-версию,
        // если у устройства нет своих правок (sl.localUpdatedAt новее полученной версии)
        publishSetlistToTeamData(sl, sl.teamId, { force: false }).then(() => {
            delete failedSyncSetlists[sl.id];
            if (currentTeamDetailId === sl.teamId) showTeamDetailView(sl.teamId);
        }).catch(err => {
            console.error('Team sync error:', err);
            failedSyncSetlists[sl.id] = true;
            if (currentTeamDetailId === sl.teamId) showTeamDetailView(sl.teamId);
        });
    }
}
async function shareSetlistToTeam(setlistId, teamId) {
    const sl = setlists.find(x => x.id === setlistId);
    const team = teams.find(t => t.id === teamId);
    if (!sl || !team) return;
    if (!confirm(`Отправить сет-лист «${sl.name}» в команду «${team.name}»?`)) return;
    if (!db || !currentUser) { alert('❌ Нет подключения к облаку'); return; }
    try {
        await publishSetlistToTeamData(sl, teamId);
        saveToStorage();
        closeModal('modal-share-setlist');
        renderSetlists();
        logTeamAction(teamId, `Сет-лист «${sl.name}» опубликован в команду`);
        alert(`✅ Сет-лист «${sl.name}» отправлен в команду «${team.name}»!\nОн появится у всех участников автоматически.`);
    } catch (err) {
        alert('❌ Не удалось отправить сет-лист: ' + err.message);
    }
}

// === ЗАЩИТА ОТ УСТАРЕВШИХ ДАННЫХ ПРИ ВОЗВРАЩЕНИИ ИЗ ФОНА ===
// Устройство, свернутое на дни, держит старую копию сет-листов. Если участник
// сразу что-то публикует — он затирает свежие данные. Поэтому при возвращении
// в приложение принудительно перечитываем данные команд с сервера.
let __lastTeamsFocusRefresh = 0;
async function refreshTeamsDataOnFocus() {
    if (!db || !currentUser) return;
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - __lastTeamsFocusRefresh < 3000) return; // не чаще раза в 3 секунды
    __lastTeamsFocusRefresh = now;
    let updated = false;
    for (const t of teams) {
        try {
            const doc = await db.collection('teamData').doc(t.id).get({ source: 'server' });
            teamDataCache[t.id] = doc.exists ? doc.data() : { songs: [], setlists: [] };
            applyTeamOverlay(t.id);
            updated = true;
        } catch (err) { /* сети могло не быть — живой слушатель догонит сам */ }
    }
    if (!updated) return;
    if (currentTeamDetailId) showTeamDetailView(currentTeamDetailId);
    if (currentHomeView === 'songs') renderSongs();
    if (currentHomeView === 'setlists') renderSetlists();
    if (document.getElementById('page-setlist-detail').classList.contains('active') && typeof currentSlId !== 'undefined') {
        const sl = setlists.find(x => x.id === currentSlId);
        if (sl) renderSlSongs();
    }
    renderCarousel();
}
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshTeamsDataOnFocus();
});
window.addEventListener('online', refreshTeamsDataOnFocus);
