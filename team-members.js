// === УЧАСТНИКИ КОМАНДЫ И ИХ ПУБЛИЧНЫЕ ПРОФИЛИ ===
// Публичная карточка профиля (имя, фамилия, пол, дата рождения, страна, город, аватар)
// хранится в teamRegistry/{teamId}/private/profiles и доступна ТОЛЬКО участникам этой команды
// (см. обновлённые правила безопасности Firestore).
 
let currentMembersTeamId = null;
let currentMembersProfiles = {};
 
// Публикует профиль текущего пользователя во все команды, в которых он состоит.
// Вызывается после сохранения профиля, смены аватарки, вступления в команду и создания команды.
async function syncPublicProfileToTeams() {
    if (!currentUser || !db) return;
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const data = userDoc.exists ? userDoc.data() : {};
        const localAvatar = localStorage.getItem('clc_avatar_' + currentUser.uid);
       const publicProfile = {
    displayName: data.displayName || currentUser.displayName || '',
    lastName: data.lastName || '',
    email: currentUser.email || '',
    gender: data.gender || '',
    birthDate: data.birthDate || '',
    country: data.country || '',
    city: data.city || '',
    aboutMe: data.aboutMe || '',
    avatar: localAvatar || data.avatar || currentUser.photoURL || null,
    updatedAt: Date.now()
};
        const myTeams = (teams || []).filter(t => t && t.id);
        await Promise.all(myTeams.map(t =>
            db.collection('teamRegistry').doc(t.id).collection('private').doc('profiles')
                .set({ [currentUser.uid]: publicProfile }, { merge: true })
                .catch(err => console.error('Не удалось синхронизировать профиль в команду ' + t.id + ':', err))
        ));
    } catch (err) {
        console.error('syncPublicProfileToTeams error:', err);
    }
}
 
let currentMembersIds = [];
 
// Самопочинка для команд, созданных/полученных ДО появления подколлекции members:
// создаёт свой документ-пропуск teamRegistry/{teamId}/members/{uid} для каждой
// команды, которая уже есть в локальном списке пользователя. Идемпотентно —
// безопасно вызывать при каждом входе в приложение.
async function ensureTeamMemberships() {
    if (!currentUser || !db) return;
    const myTeams = (teams || []).filter(t => t && t.id);
    await Promise.all(myTeams.map(async t => {
        try {
            const memberDoc = await db.collection('teamRegistry').doc(t.id).collection('members').doc(currentUser.uid).get();
            if (!memberDoc.exists) {
                await db.collection('teamRegistry').doc(t.id).collection('members').doc(currentUser.uid).set({ joinedAt: Date.now() });
            }
        } catch (err) {
            console.error('Не удалось создать пропуск участника для команды ' + t.id + ':', err);
        }
    }));
}
 
function openTeamMembers(teamId) {
    closeRoleMenu();
    if (typeof closeChatMsgMenuPopup === 'function') closeChatMsgMenuPopup();
    if (typeof closeClearChatMenuPopup === 'function') closeClearChatMenuPopup();
    if (typeof closeTeamPinMenu === 'function') closeTeamPinMenu();
    applyFullscreenModalStyle('modal-team-members');
lockBodyScroll();
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    currentMembersTeamId = teamId;
    startTeamRolesListener(teamId);
    setupModalSwipeClose('modal-team-members', closeTeamMembers);
    let mCache = {};
    try { mCache = JSON.parse(localStorage.getItem('clc_team_members_cache') || '{}'); } catch {}
    const cached = mCache[teamId];
    currentMembersProfiles = cached ? cached.profiles : {};
    currentMembersIds = cached ? cached.ids : (team.members || []);
    document.getElementById('team-members-name').innerText = team.name;
    const avatarEl = document.getElementById('team-members-avatar');
    avatarEl.innerHTML = team.avatar ? `<img src="${team.avatar}" alt="">` : '🎸';
    const searchInput = document.getElementById('team-members-search');
    searchInput.value = '';
    if (cached) { renderTeamMembersList(); } else { document.getElementById('team-members-list').innerHTML = '<div style="text-align:center;color:#888;padding:30px;">Загрузка...</div>'; }
    document.getElementById('modal-team-members').classList.add('show');
    document.getElementById('modal-team-members').onclick = clearMembersSearchOnOutsideClick;
saveAppState();
    if (!db || !currentUser) { renderTeamMembersList(); return; }
    db.collection('teamRegistry').doc(teamId).get()
        .then(regDoc => {
            if (regDoc.exists) {
                const regData = regDoc.data();
                if (regData.name) { team.name = regData.name; document.getElementById('team-members-name').innerText = regData.name; }
                if (regData.avatar !== undefined) { team.avatar = regData.avatar; avatarEl.innerHTML = regData.avatar ? `<img src="${regData.avatar}" alt="">` : '🎸'; }
            }
            return db.collection('teamRegistry').doc(teamId).collection('members').get();
        })
        .then(membersSnap => {
            currentMembersIds = membersSnap.docs.map(d => d.id);
            return db.collection('teamRegistry').doc(teamId).collection('private').doc('profiles').get();
        })
        .then(doc => {
            currentMembersProfiles = doc.exists ? (doc.data() || {}) : {};
            renderTeamMembersList();
            try {
                const c = JSON.parse(localStorage.getItem('clc_team_members_cache') || '{}');
                c[teamId] = { ids: currentMembersIds, profiles: currentMembersProfiles };
                localStorage.setItem('clc_team_members_cache', JSON.stringify(c));
            } catch {}
        })
        .catch(err => {
            console.error('Не удалось загрузить участников команды:', err);
            if (!cached) document.getElementById('team-members-list').innerHTML = '<div style="text-align:center;color:#ef5350;padding:30px;">Не удалось загрузить участников</div>';
        });
}
 
function closeTeamMembers() {
    closeModal('modal-team-members');
    currentMembersTeamId = null;
    currentMembersProfiles = {};
unlockBodyScroll();
    saveAppState();
}
async function changeTeamMemberRole(uid, newRole) {
    const team = teams.find(t => t.id === currentMembersTeamId);
    if (!team || !currentUser) return;
    if (getMyRole(team.id) !== 'owner') { notAllowedForRole(); return; }
    if (uid === currentUser.uid) { alert('❌ Нельзя менять роль самому себе'); return; }
    if (team.createdBy && uid === team.createdBy) { alert('❌ Нельзя изменить роль создателя команды'); return; }
    try {
        await db.collection('teamRegistry').doc(team.id).collection('members').doc(uid).update({ role: newRole });
        showToast('✅ Роль обновлена', 'success');
    } catch (err) {
        console.error('role change failed:', err);
        showToast('⚠️ Не удалось изменить роль: ' + err.code, 'error');
    }
}
async function kickTeamMember(uid) {
    const team = teams.find(t => t.id === currentMembersTeamId);
    if (!team || !currentUser) return;
    const myRole = getMyRole(team.id);
    const roles = teamRolesCache[team.id] || {};
    const targetRole = (roles[uid] && roles[uid].role) || 'member';
    if (targetRole === 'owner') { alert('❌ Нельзя исключить владельца'); return; }
    if (myRole === 'admin' && targetRole === 'admin') { alert('❌ Администратор не может исключить другого администратора'); return; }
    if (myRole !== 'owner' && myRole !== 'admin') { alert('❌ Удалять участников может только владелец или администратор'); return; }
    if (uid === currentUser.uid) { alert('❌ Нельзя удалить самого себя'); return; }
    const label = [currentMembersProfiles[uid]?.displayName, currentMembersProfiles[uid]?.lastName].filter(Boolean).join(' ').trim() || 'этого участника';
    if (!confirm(`Удалить ${label} из команды «${team.name}»?`)) return;
    try {
        await db.collection('teamRegistry').doc(team.id).collection('members').doc(uid).delete();
        await db.collection('teamRegistry').doc(team.id).update({ members: firebase.firestore.FieldValue.arrayRemove(uid) });
        currentMembersIds = currentMembersIds.filter(id => id !== uid);
        renderTeamMembersList();
        showToast('✅ Участник удалён из команды', 'success');
    } catch (err) {
        console.error('Не удалось удалить участника:', err);
        showToast('⚠️ Не удалось удалить участника: ' + err.code, 'error');
    }
}
 
function closeRoleMenu() {
    const menu = document.getElementById('role-menu-popup');
    if (menu) menu.remove();
    const overlay = document.getElementById('role-menu-overlay');
    if (overlay) overlay.remove();
}
function openRoleMenu(uid, x, y) {
    closeRoleMenu();
    const team = teams.find(t => t.id === currentMembersTeamId);
    if (!team || getMyRole(team.id) !== 'owner') return;
    if (currentUser && uid === currentUser.uid) return;
    const overlay = document.createElement('div');
    overlay.id = 'role-menu-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:transparent;';
    overlay.onclick = closeRoleMenu;
    document.body.appendChild(overlay);
    const menu = document.createElement('div');
    menu.id = 'role-menu-popup';
    menu.style.cssText = 'position:fixed;background:#2a2a2a;border-radius:10px;overflow:hidden;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.5);min-width:150px;';
    const opts = [['owner', 'Владелец'], ['admin', 'Админ'], ['member', 'Участник']];
    menu.innerHTML = opts.map(([val, label]) =>
        `<div class="role-menu-option" data-role="${val}" style="padding:13px 18px;color:#eee;font-size:15px;">${label}</div>`
    ).join('<div style="height:1px;background:rgba(255,255,255,0.1);"></div>');
    document.body.appendChild(menu);
    menu.querySelectorAll('.role-menu-option').forEach(el => {
        el.addEventListener('click', (e) => { e.stopPropagation(); selectMemberRole(uid, el.dataset.role); });
    });
    menu.style.left = Math.min(x, window.innerWidth - 160) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 160) + 'px';
}
function selectMemberRole(uid, role) {
    closeRoleMenu();
    changeTeamMemberRole(uid, role);
}
function startRolePress(e, uid) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    window.__rolePressFired = false;
    window.__rolePressTimer = setTimeout(() => {
        window.__rolePressFired = true;
        if (navigator.vibrate) navigator.vibrate(30);
        openRoleMenu(uid, x, y);
    }, 800);
}
function cancelRolePress() {
    clearTimeout(window.__rolePressTimer);
}
 
function clearMembersSearchOnOutsideClick(e) {
    const searchInput = document.getElementById('team-members-search');
    if (!searchInput) return;
    if (e.target.closest('#team-members-search')) return;
    if (searchInput.value) { searchInput.value = ''; renderTeamMembersList(); }
}
function renderTeamMembersList() {
    cancelRolePress();
    const team = teams.find(t => t.id === currentMembersTeamId);
    const list = document.getElementById('team-members-list');
    if (!team) { list.innerHTML = ''; return; }
   const query = (document.getElementById('team-members-search').value || '').trim().toLowerCase();
    const memberIds = currentMembersIds && currentMembersIds.length ? currentMembersIds : [];
    if (memberIds.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#888;padding:30px;">В команде пока нет участников</div>';
        return;
    }
    let rows = memberIds.map(uid => {
        const p = currentMembersProfiles[uid] || {};
        const fullName = [p.displayName, p.lastName].filter(Boolean).join(' ').trim();
        return { uid, p, label: fullName || 'Без имени' };
    });
    if (query) rows = rows.filter(r => r.label.toLowerCase().includes(query));
    rows.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    if (rows.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#888;padding:30px;">Никого не найдено</div>';
        return;
    }
    const myRole = getMyRole(team.id);
    const iAmOwner = myRole === 'owner';
    const iAmAdmin = myRole === 'admin';
    const roles = teamRolesCache[team.id] || {};
    list.innerHTML = rows.map(r => {
        const avatarHtml = r.p.avatar
            ? `<img src="${escapeHtml(r.p.avatar)}" class="team-member-avatar" alt="">`
            : `<div class="team-member-avatar-placeholder">👤</div>`;
        const isMe = currentUser && r.uid === currentUser.uid;
        const targetRole = (roles[r.uid] && roles[r.uid].role) || 'member';
        const roleText = targetRole === 'owner' ? 'Владелец' : targetRole === 'admin' ? 'Админ' : '';
        const canKick = !isMe && targetRole !== 'owner' && (iAmOwner || (iAmAdmin && targetRole !== 'admin'));
        const kickBtn = canKick ? `<button class="btn-icon" onclick="event.stopPropagation();kickTeamMember('${r.uid}')" title="Удалить">🗑️</button>` : '';
        const canChangeRole = iAmOwner && !isMe;
        return `<div class="list-item" data-member-uid="${r.uid}" data-can-change-role="${canChangeRole}" style="cursor:pointer;">
<div class="item-left">
${avatarHtml}
<div style="min-width:0;flex:1;">
<div class="item-title">${escapeHtml(r.label)}${team.createdBy && r.uid === team.createdBy ? ' <span style="font-size:10px;vertical-align:middle;opacity:0.85;">❤️</span>' : ''}${isMe ? ' <span style="color:#4caf50;font-size:11px;">(вы)</span>' : ''}</div>
${roleText ? `<div style="color:#888;font-size:11px;margin-top:2px;">${roleText}</div>` : ''}
</div>
${kickBtn}
</div>
</div>`;
    }).join('');
    list.querySelectorAll('[data-member-uid]').forEach(el => {
        initMemberRowGesture(el, el.dataset.memberUid, el.dataset.canChangeRole === 'true');
    });
}
function initMemberRowGesture(el, uid, canChangeRole) {
    let startX = 0, startY = 0, moved = false, longPressTimer = null, longPressFired = false;
    function onStart(x, y) {
        startX = x; startY = y; moved = false; longPressFired = false;
        clearTimeout(longPressTimer);
        if (canChangeRole) {
            longPressTimer = setTimeout(() => {
                if (!moved) { longPressFired = true; if (navigator.vibrate) navigator.vibrate(30); openRoleMenu(uid, startX, startY); }
            }, 500);
        }
    }
    function onMove(x, y) {
        if (Math.abs(x - startX) > 10 || Math.abs(y - startY) > 10) { moved = true; clearTimeout(longPressTimer); }
    }
    function onEnd() {
        clearTimeout(longPressTimer);
        if (longPressFired || moved) return;
        openMemberProfile(uid);
    }
el.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    openMemberProfile(uid);
});
    el.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    el.addEventListener('mousemove', (e) => { if (e.buttons === 1) onMove(e.clientX, e.clientY); });
    el.addEventListener('mouseup', onEnd);
    el.addEventListener('click', (e) => { if (!e.target.closest('button')) openMemberProfile(uid); });
}
 
function formatBirthDateForProfile(dateString) {
    try {
        const parts = dateString.split('-');
        let mm, dd;
        if (parts.length === 3) { mm = parts[1]; dd = parts[2]; }
        else if (parts.length === 2) { mm = parts[0]; dd = parts[1]; }
        else return dateString;
        const monthIdx = parseInt(mm, 10) - 1;
        if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return dateString;
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        return `${parseInt(dd, 10)} ${months[monthIdx]}`;
    } catch { return dateString; }
}
 
function openMemberProfile(uid) {
    const p = currentMembersProfiles[uid] || {};
    const fullName = [p.displayName, p.lastName].filter(Boolean).join(' ').trim() || 'Без имени';
    document.getElementById('member-profile-name').innerText = fullName;
const emailEl = document.getElementById('member-profile-email');
if (emailEl) emailEl.innerText = p.email || '';
    const avatarEl = document.getElementById('member-profile-avatar');
    if (p.avatar) {
        const safeSrc = p.avatar.replace(/'/g, "\\'");
        avatarEl.innerHTML = `<img src="${escapeHtml(p.avatar)}" alt="" onclick="openMemberPhotoFull('${safeSrc}')">`;
    } else {
        avatarEl.innerHTML = '👤';
    }
    const genderLabels = { male: 'Мужской', female: 'Женский' };
    const fields = [
        ['🎂 День рождения', p.birthDate ? formatBirthDateForProfile(p.birthDate) : ''],
        ['🚻 Пол', p.gender ? (genderLabels[p.gender] || p.gender) : ''],
        ['🌍 Страна', p.country || ''],
        ['🏙 Город', p.city || '']
    ].filter(f => f[1]);
    const hadAnyField = fields.length > 0;
    fields.push(['📝 О себе', p.aboutMe ? p.aboutMe : 'пусто']);
    const details = document.getElementById('member-profile-details');
    if (!hadAnyField && !p.aboutMe) {
        details.innerHTML = '<div style="text-align:center;color:#888;padding:15px;">Участник пока не заполнил профиль</div>';
    } else {
        details.innerHTML = fields.map(f =>
            `<div class="member-profile-row"><span class="member-profile-label">${f[0]}</span><span class="member-profile-value">${escapeHtml(String(f[1]))}</span></div>`
        ).join('');
    }
    const profileModal = document.getElementById('modal-member-profile');
    if (profileModal.parentElement !== document.body) document.body.appendChild(profileModal);
    profileModal.style.zIndex = '99999';
    profileModal.classList.add('show');
}
 
function openMemberPhotoFull(src) {
    document.getElementById('photo-view-img').src = src;
    const photoModal = document.getElementById('modal-photo-view');
    if (photoModal.parentElement !== document.body) document.body.appendChild(photoModal);
    photoModal.style.zIndex = '99999';
    photoModal.classList.add('show');
}