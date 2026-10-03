// === ЧАТ КОМАНДЫ: сообщения, прочтения, меню, очистка, подгрузка истории ===
// Состояние чата (chatMessagesCache, chatReadsCache и др.) объявлено в state-utils.js
function openTeamChat(teamId) {
const team = teams.find(t => t.id === teamId);
if (!team) return;
currentChatTeamId = teamId;
chatEditingMessageId = null;
cancelChatReply();
document.getElementById('chat-team-name').innerText = team.name;
document.getElementById('chat-team-avatar').innerHTML = team.avatar ? `<img src="${escapeHtml(team.avatar)}" alt="">` : '🎸';
document.getElementById('chat-input').value = '';
showPage('page-team-chat');
setupChatKeyboardHandling();
setupChatFixedAreasTouchBlock();
setupChatTouchGuard();
setupChatFocusPin();
lockBodyScroll();
setTimeout(adjustChatForKeyboard, 50);
if (!chatMessagesCache[teamId]) chatMessagesCache[teamId] = [];
let mCache = {};
try { mCache = JSON.parse(localStorage.getItem('clc_team_members_cache') || '{}'); } catch {}
if (mCache[teamId] && mCache[teamId].profiles) {
currentMembersProfiles = { ...currentMembersProfiles, ...mCache[teamId].profiles };
}
startTeamRolesListener(teamId);
renderChatMessages(teamId);
if (db && currentUser) {
db.collection('teamRegistry').doc(teamId).collection('private').doc('profiles').get().then(doc => {
if (doc.exists) {
currentMembersProfiles = { ...currentMembersProfiles, ...(doc.data() || {}) };
try {
const c = JSON.parse(localStorage.getItem('clc_team_members_cache') || '{}');
c[teamId] = { ids: (c[teamId] && c[teamId].ids) || [], profiles: currentMembersProfiles };
localStorage.setItem('clc_team_members_cache', JSON.stringify(c));
} catch {}
if (currentChatTeamId === teamId) renderChatMessages(teamId);
}
}).catch(err => console.error('Не удалось загрузить профили для чата:', err));
}
startChatListener(teamId);
startChatReadsListener(teamId);
markChatRead(teamId);
setTimeout(() => scrollChatToBottom(), 50);
}
function setupChatFixedAreasTouchBlock() {
if (window.__chatFixedTouchBound) return;
window.__chatFixedTouchBound = true;
const header = document.getElementById('chat-page-header');
const inputBar = document.getElementById('chat-input-bar');
const block = (e) => { e.preventDefault(); };
if (header) header.addEventListener('touchmove', block, { passive: false });
if (inputBar) inputBar.addEventListener('touchmove', block, { passive: false });
}
function setupChatTouchGuard() {
if (window.__chatTouchGuardBound) return;
window.__chatTouchGuardBound = true;
const page = document.getElementById('page-team-chat');
if (!page) return;
page.addEventListener('touchmove', (e) => {
const list = document.getElementById('chat-messages-list');
// жест не по списку сообщений (по шапке, полю ввода, пустому месту) — глушим
if (!list || !list.contains(e.target)) { e.preventDefault(); return; }
// список пуст или короткий — прокручивать нечего, глушим
const canScroll = list.scrollHeight > list.clientHeight + 1;
if (!canScroll) { e.preventDefault(); return; }
// список на краю, а жест тянет дальше — глушим, чтобы не дёргать страницу
const atTop = list.scrollTop <= 0;
const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
if (page.__lastTouchY !== undefined) {
const dy = e.touches[0].clientY - page.__lastTouchY;
if ((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
}
page.__lastTouchY = e.touches[0].clientY;
}, { passive: false });
page.addEventListener('touchend', () => { page.__lastTouchY = undefined; }, { passive: true });
}
function setupChatFocusPin() {
if (window.__chatFocusPinBound) return;
window.__chatFocusPinBound = true;
const input = document.getElementById('chat-input');
if (!input) return;
const chatActive = () => {
const page = document.getElementById('page-team-chat');
return !!(page && page.classList.contains('active'));
};
// ГЛАВНОЕ: гасим любую прокрутку страницы СИНХРОННО — в момент события,
// до того как браузер успеет нарисовать сдвинутый кадр
window.addEventListener('scroll', () => {
if (chatActive() && window.scrollY !== 0) window.scrollTo(0, 0);
}, true);
// focusin срабатывает раньше, чем iOS начнёт подвозить страницу к полю ввода
input.addEventListener('focusin', () => {
if (chatActive()) window.scrollTo(0, 0);
});
input.addEventListener('focus', () => {
// пока клавиатура выезжает — держим прокрутку в нуле и пересчитываем размер
[0, 100, 300, 600].forEach(ms => setTimeout(() => {
if (chatActive()) { window.scrollTo(0, 0); adjustChatForKeyboard(); }
}, ms));
});
input.addEventListener('blur', () => setTimeout(() => {
if (chatActive()) window.scrollTo(0, 0);
}, 100));
}
function setupChatKeyboardHandling() {
if (!window.visualViewport || window.__chatKeyboardHandlerBound) return;
window.__chatKeyboardHandlerBound = true;
window.visualViewport.addEventListener('resize', adjustChatForKeyboard);
window.visualViewport.addEventListener('scroll', adjustChatForKeyboard);
}
let __chatKBLast = -1;
let __vvMaxH = 0; // запоминаем высоту экрана БЕЗ клавиатуры
function adjustChatForKeyboard() {
const page = document.getElementById('page-team-chat');
if (!page || !page.classList.contains('active') || !window.visualViewport) return;
const vv = window.visualViewport;
const vh = Math.round(vv.height);
if (vh > __vvMaxH) __vvMaxH = vh;
// высота клавиатуры = насколько экран стал ниже максимума
const kb = __vvMaxH > 0 ? (__vvMaxH - vh) : 0;
if (kb > 150) {
page.style.setProperty('height', vh + 'px', 'important');
// компенсация сдвига визуального вьюпорта iOS — шапка стоит на месте
page.style.setProperty('top', vv.offsetTop + 'px', 'important');
window.scrollTo(0, 0);
} else {
page.style.removeProperty('height');
page.style.removeProperty('top');
}
if (kb !== __chatKBLast) { __chatKBLast = kb; scrollChatToBottom(); }
}
function autoGrowChatInput(el) {
el.style.setProperty('height', 'auto', 'important');
const newHeight = Math.min(el.scrollHeight, 98);
el.style.setProperty('height', Math.max(newHeight, 38) + 'px', 'important');
el.style.overflowY = el.scrollHeight > 98 ? 'auto' : 'hidden';
}
function closeTeamChat() {
currentChatTeamId = null;
chatEditingMessageId = null;
cancelChatReply();
__chatKBLast = -1;
__vvMaxH = 0;
const pageEl = document.getElementById('page-team-chat');
if (pageEl) { pageEl.style.removeProperty('height'); pageEl.style.removeProperty('top'); }
showPage('page-home');
unlockBodyScroll();
}
function scrollChatToBottom() {
const list = document.getElementById('chat-messages-list');
if (list) list.scrollTop = list.scrollHeight;
updateChatScrollBottomBtn();
}
// стрелка «вниз» — как в Telegram: видна, когда прокрутили далеко от последнего сообщения
function updateChatScrollBottomBtn() {
const list = document.getElementById('chat-messages-list');
const btn = document.getElementById('chat-scroll-bottom-btn');
if (!list || !btn) return;
const awayFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
btn.style.display = awayFromBottom > 200 ? 'flex' : 'none';
}
function startChatListener(teamId) {
if (chatListenerUnsubs[teamId] || !db || !currentUser) return;
chatListenerUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).collection('chat')
.orderBy('createdAt', 'desc').limit(50)
.onSnapshot(snap => {
const msgs = [];
snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
msgs.reverse();
chatMessagesCache[teamId] = msgs;
if (currentChatTeamId === teamId) {
const list = document.getElementById('chat-messages-list');
const wasAtBottom = list ? (list.scrollHeight - list.scrollTop - list.clientHeight < 60) : true;
renderChatMessages(teamId);
if (wasAtBottom) scrollChatToBottom();
markChatRead(teamId);
}
renderCarousel();
if (currentTeamDetailId === teamId) showTeamDetailView(teamId);
}, err => console.error('chat listener error:', err));
}
function startChatReadsListener(teamId) {
if (chatReadsListenerUnsubs[teamId] || !db || !currentUser) return;
chatReadsListenerUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).collection('chatReads')
.onSnapshot(snap => {
const reads = {};
snap.forEach(doc => { reads[doc.id] = doc.data().lastReadAt || 0; });
chatReadsCache[teamId] = reads;
try { localStorage.setItem('clc_chat_reads_cache', JSON.stringify(chatReadsCache)); } catch {}
if (currentChatTeamId === teamId) renderChatMessages(teamId);
renderCarousel();
if (currentTeamDetailId === teamId) showTeamDetailView(teamId);
}, err => console.error('chat reads listener error:', err));
}

function getUnreadChatCount(teamId) {
if (!currentUser) return 0;
const msgs = chatMessagesCache[teamId] || [];
const reads = chatReadsCache[teamId] || {};
const myLastRead = reads[currentUser.uid] || 0;
return msgs.filter(m => !m.deleted && m.senderId !== currentUser.uid && m.createdAt > myLastRead).length;
}
function markChatRead(teamId) {
if (!db || !currentUser) return;
db.collection('teamRegistry').doc(teamId).collection('chatReads').doc(currentUser.uid)
.set({ lastReadAt: Date.now() }, { merge: true }).catch(err => console.error('mark chat read failed:', err));
}
function formatChatDateLabel(ts) {
const d = new Date(ts);
const now = new Date();
const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / (24 * 60 * 60 * 1000));
if (diffDays === 0) return 'Сегодня';
if (diffDays === 1) return 'Вчера';
const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
return `${d.getDate()} ${months[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`;
}
// дата+время у сообщения: сегодня — только время, раньше — как в Telegram («вчера, 21:10» / «12 сентября, 14:35»)
function formatChatMsgDateTime(ts) {
const d = new Date(ts);
const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
const now = new Date();
const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / (24 * 60 * 60 * 1000));
if (diffDays === 0) return time;
return formatChatDateLabel(ts) + ', ' + time;
}
function renderChatMessages(teamId) {
const list = document.getElementById('chat-messages-list');
if (!list) return;
const msgs = chatMessagesCache[teamId] || [];
const roles = teamRolesCache[teamId] || {};
const reads = chatReadsCache[teamId] || {};
let lastDayKey = null;
list.innerHTML = msgs.map(m => {
let dateDivider = '';
const dayKey = new Date(m.createdAt).toDateString();
if (dayKey !== lastDayKey) {
lastDayKey = dayKey;
dateDivider = `<div style="text-align:center;margin:8px 0;"><span style="background:rgba(255,255,255,0.08);color:#888;font-size:12px;padding:4px 12px;border-radius:12px;">${formatChatDateLabel(m.createdAt)}</span></div>`;
}
const isMe = m.senderId === currentUser.uid;
const p = currentMembersProfiles[m.senderId] || {};
const name = [p.displayName, p.lastName].filter(Boolean).join(' ').trim() || 'Без имени';
const roleObj = roles[m.senderId];
const roleLabel = roleObj && roleObj.role === 'owner' ? 'Владелец' : (roleObj && roleObj.role === 'admin' ? 'Админ' : '');
const avatarHtml = p.avatar ? `<img src="${escapeHtml(p.avatar)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">` : `<div style="width:32px;height:32px;border-radius:50%;background:#444;display:flex;align-items:center;justify-content:center;">👤</div>`;
const time = formatChatMsgDateTime(m.createdAt);
const bodyText = m.deleted ? '<i style="opacity:0.6;">Сообщение удалено</i>' : escapeHtml(m.text || '');
const editedTag = (!m.deleted && m.editedAt) ? ' <span style="opacity:0.6;font-size:11px;">(изменено)</span>' : '';
const otherUids = Object.keys(roles).filter(uid => uid !== m.senderId);
let statusHtml = '';
if (isMe && !m.deleted) {
const allRead = otherUids.every(uid => (reads[uid] || 0) >= m.createdAt);
statusHtml = allRead ? `<span style="color:#42a5f5;font-size:11px;">✔\uFE0E✔\uFE0E</span>` : `<span style="color:#888;font-size:11px;">✔\uFE0E</span>`;
}
// цитата отвеченного сообщения (свайп влево → ответ); тап по цитате — переход к исходному
let replyHtml = '';
if (m.replyTo) {
const src = msgs.find(x => x.id === m.replyTo);
const sp = src ? (currentMembersProfiles[src.senderId] || {}) : {};
const srcName = [sp.displayName, sp.lastName].filter(Boolean).join(' ').trim() || 'Без имени';
replyHtml = `<div onclick="event.stopPropagation(); chatScrollToMessage('${m.replyTo}')" style="border-left:3px solid #42a5f5;padding:2px 8px;margin-bottom:4px;background:rgba(66,165,245,0.08);border-radius:4px;cursor:pointer;"><div style="font-size:11px;color:#42a5f5;font-weight:bold;">${escapeHtml(srcName)}</div><div style="font-size:12px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${src ? (src.deleted ? 'Сообщение удалено' : escapeHtml((src.text || '').slice(0, 80))) : 'Сообщение'}</div></div>`;
}
const pressAttrs = !m.deleted ? `ontouchstart="startChatMsgPress(event,'${teamId}','${m.id}','${m.senderId}')" ontouchmove="chatMsgTouchMove(event)" ontouchend="cancelChatMsgPress()" ontouchcancel="cancelChatMsgPress()" onmousedown="startChatMsgPress(event,'${teamId}','${m.id}','${m.senderId}')" onmouseup="cancelChatMsgPress()" onmouseleave="cancelChatMsgPress()"` : '';
// сердечки-реакции (двойное нажатие)
const heartCount = Object.values(m.reactions || {}).filter(Boolean).length;
const reactionHtml = heartCount ? `<span style="font-size:11px;">❤️${heartCount > 1 ? ' ' + heartCount : ''}</span>` : '';
let bubbleHtml;
if (isMe) {
bubbleHtml = `<div id="chat-msg-${m.id}" style="display:flex;justify-content:flex-end;">
<div ${pressAttrs} data-msg-id="${m.id}" style="max-width:75%;background:rgba(144,202,249,0.18);border-radius:14px 14px 4px 14px;padding:8px 12px;">
${replyHtml}<div style="font-size:14px;color:#eee;white-space:pre-wrap;word-break:break-word;">${bodyText}${editedTag}</div>
<div style="display:flex;justify-content:flex-end;align-items:center;gap:4px;margin-top:2px;">${m.starred ? '<span style="font-size:11px;">⭐</span>' : ''}${reactionHtml}<span style="font-size:11px;color:#888;">${time}</span>${statusHtml}</div>
</div>
</div>`;
} else {
bubbleHtml = `<div id="chat-msg-${m.id}" style="display:flex;gap:8px;align-items:flex-end;">
${avatarHtml}
<div ${pressAttrs} data-msg-id="${m.id}" style="max-width:75%;background:#2a2a2a;border-radius:14px 14px 14px 4px;padding:8px 12px;">
<div style="font-size:12px;color:#90caf9;font-weight:bold;">${escapeHtml(name)}${roleLabel ? ` <span style="color:#888;font-weight:normal;">· ${roleLabel}</span>` : ''}</div>
${replyHtml}<div style="font-size:14px;color:#eee;white-space:pre-wrap;word-break:break-word;margin-top:2px;">${bodyText}${editedTag}</div>
<div style="font-size:11px;color:#888;margin-top:2px;">${m.starred ? '⭐ ' : ''}${heartCount ? '❤️' + (heartCount > 1 ? heartCount + ' ' : '') : ''}${time}</div>
</div>
</div>`;
}
return dateDivider + bubbleHtml;
}).join('');
bindChatSwipeToReply(teamId);
updateChatScrollBottomBtn();
}
function handleChatInputKeydown(e) {
}
async function sendOrEditChatMessage() {
const teamId = currentChatTeamId;
if (!teamId || !db || !currentUser) return;
const input = document.getElementById('chat-input');
const text = input.value.trim();
if (!text) return;
input.value = '';
autoGrowChatInput(input); // сбрасываем выросшую высоту поля
try {
if (chatEditingMessageId) {
await db.collection('teamRegistry').doc(teamId).collection('chat').doc(chatEditingMessageId).update({ text, editedAt: Date.now() });
chatEditingMessageId = null;
} else {
await db.collection('teamRegistry').doc(teamId).collection('chat').add({ text, senderId: currentUser.uid, createdAt: Date.now(), replyTo: chatReplyToMessageId || null });
cancelChatReply();
}
} catch (err) {
console.error('Не удалось отправить сообщение:', err);
alert('❌ Не удалось отправить сообщение: ' + err.code);
input.value = text;
}
// клавиатура не должна закрываться после отправки — возвращаем фокус в поле
input.focus();
// страховка: поле обязано вернуться к высоте в одну строку
setTimeout(() => autoGrowChatInput(input), 0);
}
function startChatMsgPress(e, teamId, msgId, senderId) {
const x = e.touches ? e.touches[0].clientX : e.clientX;
const y = e.touches ? e.touches[0].clientY : e.clientY;
window.__chatPressX = x; window.__chatPressY = y; // точка старта — для отмены по движению (скролл)
window.__chatPressFired = false;
window.__chatPressTimer = setTimeout(() => {
window.__chatPressFired = true;
if (navigator.vibrate) navigator.vibrate(30);
openChatMsgMenu(teamId, msgId, senderId, x, y);
}, 500);
}
// удержание + прокрутка = не открывать меню; отменяем нажатие при сдвиге пальца
function chatMsgTouchMove(e) {
if (window.__chatPressTimer === undefined || !e.touches || !e.touches.length) return;
const dx = e.touches[0].clientX - (window.__chatPressX || 0);
const dy = e.touches[0].clientY - (window.__chatPressY || 0);
if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelChatMsgPress();
}
function cancelChatMsgPress() { clearTimeout(window.__chatPressTimer); }
function closeChatMsgMenuPopup() {
const menu = document.getElementById('chat-msg-menu-popup');
if (menu) menu.remove();
const overlay = document.getElementById('chat-msg-menu-overlay');
if (overlay) overlay.remove();
}
function openChatMsgMenu(teamId, msgId, senderId, x, y) {
closeChatMsgMenuPopup();
const myRole = getMyRole(teamId);
const isMine = currentUser && senderId === currentUser.uid;
const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';
const msg = (chatMessagesCache[teamId] || []).find(m => m.id === msgId);
if (!msg) return;
const reads = chatReadsCache[teamId] || {};
const roles = teamRolesCache[teamId] || {};
const otherUids = Object.keys(roles).filter(uid => uid !== senderId);
const allRead = otherUids.every(uid => (reads[uid] || 0) >= msg.createdAt);
const options = [];
options.push(['reply', '↩️ Ответить']);
if (msg.text) options.push(['copy', '📋 Копировать текст']);
options.push(['star', msg.starred ? '⭐ Убрать из избранного' : '⭐ В избранное']);
// своё сообщение можно править 48 часов после отправки — как в Telegram
const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;
if (isMine && !msg.deleted && (Date.now() - msg.createdAt) < EDIT_WINDOW_MS) options.push(['edit', '✏️ Изменить']);
if (isMine || isOwnerOrAdmin) options.push(['delete', '🗑️ Удалить сообщение']);
if (!isMine && isOwnerOrAdmin) options.push(['deleteAllKick', '⛔ Удалить все сообщения и исключить']);
if (options.length === 0) return;
const overlay = document.createElement('div');
overlay.id = 'chat-msg-menu-overlay';
overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:transparent;';
overlay.onclick = closeChatMsgMenuPopup;
document.body.appendChild(overlay);
const menu = document.createElement('div');
menu.id = 'chat-msg-menu-popup';
menu.style.cssText = 'position:fixed;background:#2a2a2a;border-radius:10px;overflow:hidden;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.5);min-width:220px;';
menu.innerHTML = options.map(([val, label]) =>
`<div class="chat-menu-option" data-action="${val}" style="padding:13px 18px;color:${val==='deleteAllKick'?'#ef5350':'#eee'};font-size:15px;">${label}</div>`
).join('<div style="height:1px;background:rgba(255,255,255,0.1);"></div>');
document.body.appendChild(menu);
menu.querySelectorAll('.chat-menu-option').forEach(el => {
el.addEventListener('click', (e) => {
e.stopPropagation();
const action = el.dataset.action;
closeChatMsgMenuPopup();
if (action === 'reply') startChatReply(teamId, msgId);
else if (action === 'copy') copyChatMessageText(msg.text);
else if (action === 'star') toggleStarChatMessage(teamId, msgId);
else if (action === 'edit') startEditChatMessage(msgId);
else if (action === 'delete') deleteChatMessage(teamId, msgId);
else if (action === 'deleteAllKick') deleteAllMessagesFromUserAndKick(teamId, senderId);
});
});
const menuHeight = options.length * 45;
menu.style.left = Math.min(x, window.innerWidth - 230) + 'px';
menu.style.top = Math.min(y, window.innerHeight - menuHeight - 10) + 'px';
}
function startEditChatMessage(msgId) {
const teamId = currentChatTeamId;
const msg = (chatMessagesCache[teamId] || []).find(m => m.id === msgId);
if (!msg) return;
chatEditingMessageId = msgId;
const input = document.getElementById('chat-input');
input.value = msg.text || '';
input.focus();
}
function startChatBtnPress(e, teamId) {
const x = e.touches ? e.touches[0].clientX : e.clientX;
const y = e.touches ? e.touches[0].clientY : e.clientY;
window.__chatBtnPressFired = false;
window.__chatBtnPressTimer = setTimeout(() => {
window.__chatBtnPressFired = true;
if (navigator.vibrate) navigator.vibrate(30);
openClearChatMenu(teamId, x, y);
}, 500);
}
function cancelChatBtnPress() { clearTimeout(window.__chatBtnPressTimer); }
function closeClearChatMenuPopup() {
const menu = document.getElementById('clear-chat-menu-popup');
if (menu) menu.remove();
const overlay = document.getElementById('clear-chat-menu-overlay');
if (overlay) overlay.remove();
}
function openClearChatMenu(teamId, x, y) {
if (getMyRole(teamId) !== 'owner') return;
closeClearChatMenuPopup();
const overlay = document.createElement('div');
overlay.id = 'clear-chat-menu-overlay';
overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:transparent;';
overlay.onclick = closeClearChatMenuPopup;
document.body.appendChild(overlay);
const menu = document.createElement('div');
menu.id = 'clear-chat-menu-popup';
menu.style.cssText = 'position:fixed;background:#2a2a2a;border-radius:10px;overflow:hidden;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.5);min-width:240px;';
menu.innerHTML = `<div class="clear-chat-option" data-action="keepStarred" style="padding:13px 18px;color:#eee;font-size:15px;">⭐ Очистить, оставить избранные</div><div style="height:1px;background:rgba(255,255,255,0.1);"></div><div class="clear-chat-option" data-action="clearAll" style="padding:13px 18px;color:#ef5350;font-size:15px;">🗑️ Очистить чат полностью</div>`;
document.body.appendChild(menu);
menu.querySelectorAll('.clear-chat-option').forEach(el => {
el.addEventListener('click', (e) => {
e.stopPropagation();
const action = el.dataset.action;
closeClearChatMenuPopup();
if (action === 'clearAll') clearTeamChat(teamId, false);
else if (action === 'keepStarred') clearTeamChat(teamId, true);
});
});
menu.style.left = Math.min(x, window.innerWidth - 250) + 'px';
menu.style.top = Math.min(y, window.innerHeight - 100) + 'px';
}
async function clearTeamChat(teamId, keepStarred) {
if (!db || !currentUser) return;
const confirmMsg = keepStarred ? 'Очистить чат, оставив только избранные сообщения?' : 'Очистить весь чат полностью? Это действие необратимо для всех участников.';
if (!confirm(confirmMsg)) return;
try {
const snap = await db.collection('teamRegistry').doc(teamId).collection('chat').get();
const docsToDelete = snap.docs.filter(doc => !(keepStarred && doc.data().starred));
let batch = db.batch();
let count = 0;
for (const doc of docsToDelete) {
batch.delete(doc.ref);
count++;
if (count === 400) { await batch.commit(); batch = db.batch(); count = 0; }
}
if (count > 0) await batch.commit();
showToast('✅ Чат очищен', 'success');
} catch (err) {
console.error('Не удалось очистить чат:', err);
alert('❌ Не удалось очистить чат: ' + err.code);
}
}
async function toggleStarChatMessage(teamId, msgId) {
const msg = (chatMessagesCache[teamId] || []).find(m => m.id === msgId);
if (!msg) return;
try {
await db.collection('teamRegistry').doc(teamId).collection('chat').doc(msgId).update({ starred: !msg.starred });
} catch (err) {
console.error('Не удалось изменить избранное:', err);
}
}
async function deleteChatMessage(teamId, msgId) {
if (!confirm('Удалить это сообщение?')) return;
try {
await db.collection('teamRegistry').doc(teamId).collection('chat').doc(msgId).update({ text: null, deleted: true, editedAt: null });
} catch (err) {
console.error('Не удалось удалить сообщение:', err);
alert('❌ Не удалось удалить сообщение: ' + err.code);
}
}
async function deleteAllMessagesFromUserAndKick(teamId, senderId) {
if (!confirm('Удалить все сообщения этого участника и исключить его из команды?')) return;
try {
const snap = await db.collection('teamRegistry').doc(teamId).collection('chat').where('senderId', '==', senderId).get();
const batch = db.batch();
snap.forEach(doc => batch.update(doc.ref, { text: null, deleted: true, editedAt: null }));
await batch.commit();
} catch (err) {
console.error('Не удалось удалить сообщения участника:', err);
}
currentMembersTeamId = teamId;
await kickTeamMember(senderId);
}
function handleChatScroll(el) {
updateChatScrollBottomBtn();
if (el.scrollTop < 40) loadMoreChatMessages(currentChatTeamId);
}
async function loadMoreChatMessages(teamId) {
if (!teamId || !db || chatOldestLoaded[teamId] === 'end') return;
const msgs = chatMessagesCache[teamId] || [];
if (msgs.length === 0) return;
const oldestTs = msgs[0].createdAt;
try {
const snap = await db.collection('teamRegistry').doc(teamId).collection('chat')
.orderBy('createdAt', 'desc').startAfter(oldestTs).limit(30).get();
if (snap.empty) { chatOldestLoaded[teamId] = 'end'; return; }
const older = [];
snap.forEach(doc => older.push({ id: doc.id, ...doc.data() }));
older.reverse();
const list = document.getElementById('chat-messages-list');
const prevHeight = list ? list.scrollHeight : 0;
chatMessagesCache[teamId] = older.concat(chatMessagesCache[teamId] || []);
renderChatMessages(teamId);
if (list) list.scrollTop = list.scrollHeight - prevHeight;
} catch (err) { console.error('Не удалось подгрузить старые сообщения:', err); }
}

// === ОТВЕТ НА СООБЩЕНИЕ СВАЙПОМ ВЛЕВО (как в Telegram) ===
function bindChatSwipeToReply(teamId) {
const list = document.getElementById('chat-messages-list');
if (!list) return;
list.querySelectorAll('[data-msg-id]').forEach(el => {
el.addEventListener('touchstart', (e) => {
el.__sx = e.touches[0].clientX; el.__sy = e.touches[0].clientY; el.__moved = false;
el.style.transition = 'none';
}, { passive: true });
el.addEventListener('touchmove', (e) => {
if (el.__sx === undefined) return;
const dx = e.touches[0].clientX - el.__sx;
const dy = e.touches[0].clientY - el.__sy;
// горизонтальное движение сильнее вертикального — это свайп, а не скролл
if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) {
el.__moved = true;
cancelChatMsgPress(); // свайп глушит долгое нажатие
if (dx < 0) el.style.transform = `translateX(${Math.max(dx, -80)}px)`;
else el.style.transform = '';
}
}, { passive: true });
el.addEventListener('touchend', (e) => {
el.style.transition = '';
el.style.transform = '';
if (el.__moved && el.__sx !== undefined) {
const dx = e.changedTouches[0].clientX - el.__sx;
if (dx < -60) startChatReply(teamId, el.dataset.msgId);
} else if (el.__sx !== undefined && !window.__chatPressFired) {
// двойной тап — сердечко-реакция (как в Telegram)
const now = Date.now();
if (el.__lastTapAt && now - el.__lastTapAt < 300) {
el.__lastTapAt = 0;
toggleHeartReaction(teamId, el.dataset.msgId);
} else el.__lastTapAt = now;
}
el.__sx = undefined;
});
// двойной клик мышью — тоже сердечко (для ПК)
el.addEventListener('dblclick', () => toggleHeartReaction(teamId, el.dataset.msgId));
});
}
function startChatReply(teamId, msgId) {
const msg = (chatMessagesCache[teamId] || []).find(m => m.id === msgId);
if (!msg || msg.deleted) return;
chatEditingMessageId = null; // ответ и редактирование несовместимы
chatReplyToMessageId = msgId;
const p = currentMembersProfiles[msg.senderId] || {};
const name = [p.displayName, p.lastName].filter(Boolean).join(' ').trim() || 'Без имени';
const preview = document.getElementById('chat-reply-preview');
if (!preview) return;
preview.innerHTML = `<div style="flex:1;min-width:0;border-left:3px solid #42a5f5;padding:2px 8px;"><div style="font-size:12px;color:#42a5f5;font-weight:bold;">Ответ: ${escapeHtml(name)}</div><div style="font-size:12px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml((msg.text || '').slice(0, 80))}</div></div><button style="background:none;border:none;color:#888;font-size:18px;padding:4px 8px;" onclick="cancelChatReply()">✕</button>`;
preview.style.display = 'flex';
document.getElementById('chat-input').focus();
}
function cancelChatReply() {
chatReplyToMessageId = null;
const preview = document.getElementById('chat-reply-preview');
if (!preview) return;
preview.style.display = 'none';
preview.innerHTML = '';
}
// Сердечко-реакция: двойное нажатие ставит/снимает, хранится в поле reactions сообщения
async function toggleHeartReaction(teamId, msgId) {
if (!db || !currentUser) return;
const msg = (chatMessagesCache[teamId] || []).find(m => m.id === msgId);
if (!msg || msg.deleted) return;
try {
await db.collection('teamRegistry').doc(teamId).collection('chat').doc(msgId)
.update({ ['reactions.' + currentUser.uid]: !(msg.reactions && msg.reactions[currentUser.uid]) });
if (navigator.vibrate) navigator.vibrate(20);
} catch (err) { console.error('Не удалось поставить реакцию:', err); }
}
function copyChatMessageText(text) {
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(text).then(() => showToast('✅ Текст скопирован', 'success')).catch(() => fallbackCopyText(text));
} else fallbackCopyText(text);
}
// Переход к исходному сообщению по тапу на цитату (как в Telegram).
// Если сообщение ещё не загружено — догружаем историю, потом прокручиваем и подсвечиваем.
async function chatScrollToMessage(msgId) {
const teamId = currentChatTeamId;
if (!teamId || !msgId) return;
let el = document.getElementById('chat-msg-' + msgId);
let guard = 0;
while (!el && chatOldestLoaded[teamId] !== 'end' && guard < 10) {
guard++;
const prevCount = (chatMessagesCache[teamId] || []).length;
await loadMoreChatMessages(teamId);
if ((chatMessagesCache[teamId] || []).length === prevCount) break; // дальше подгружать нечего
el = document.getElementById('chat-msg-' + msgId);
}
if (!el) {
showToast('⚠️ Сообщение не найдено', 'info');
return;
}
const list = document.getElementById('chat-messages-list');
const target = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - list.clientHeight / 3;
list.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
// подсветка найденного сообщения
el.style.transition = 'background 0.4s';
el.style.background = 'rgba(66,165,245,0.28)';
setTimeout(() => { el.style.background = ''; }, 1400);
}
