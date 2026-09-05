 //=== ЛОГИКА СТРАНИЦЫ ПРОФИЛЬ ===
function updateBirthdayDayOptions(preselectDay) {
    const monthSel = document.getElementById('profile-birthday-month');
    const daySel = document.getElementById('profile-birthday-day');
    if (!monthSel || !daySel) return;
    const month = monthSel.value;
    const daysInMonth = { '01':31,'02':29,'03':31,'04':30,'05':31,'06':30,'07':31,'08':31,'09':30,'10':31,'11':30,'12':31 };
    const max = daysInMonth[month] || 0;
    const prevValue = preselectDay !== undefined ? preselectDay : daySel.value;
    let opts = '<option value="">День</option>';
    for (let d = 1; d <= max; d++) { const val = String(d).padStart(2, '0'); opts += `<option value="${val}">${d}</option>`; }
    daySel.innerHTML = opts;
    daySel.disabled = !month;
    if (prevValue && parseInt(prevValue, 10) <= max) daySel.value = prevValue;
}
function openProfile() {
    renderProfile();
    showPage('page-profile');
}

function goBackFromProfile() {
    showPage('page-home');
    activateCarouselItem(carouselActiveIndex);
}

function applyProfileFieldsToForm(data) {
if (!data) return;
const nameInput = document.getElementById('profile-name-input');
if (nameInput) nameInput.value = data.displayName || (currentUser && currentUser.displayName) || '';
const lastnameInput = document.getElementById('profile-lastname-input');
if (lastnameInput) lastnameInput.value = data.lastName || '';
const genderInput = document.getElementById('profile-gender-input');
if (genderInput) genderInput.value = data.gender || '';
const bDay = document.getElementById('profile-birthday-day');
const bMonth = document.getElementById('profile-birthday-month');
if (bDay && bMonth) {
const raw = data.birthDate || '';
const parts = raw.split('-');
let mm = '', dd = '';
if (parts.length === 3) { mm = parts[1]; dd = parts[2]; }
else if (parts.length === 2) { mm = parts[0]; dd = parts[1]; }
bMonth.value = mm;
updateBirthdayDayOptions(dd);
}
const countryInput = document.getElementById('profile-country-input');
if (countryInput) countryInput.value = data.country || '';
const cityInput = document.getElementById('profile-city-input');
if (cityInput) cityInput.value = data.city || '';
const aboutInput = document.getElementById('profile-about-input');
if (aboutInput) aboutInput.value = data.aboutMe || '';
}
async function renderProfile() {
if (!currentUser) return;
const avatarEl = document.getElementById('profile-avatar');
const emailEl = document.getElementById('profile-email');
const providerEl = document.getElementById('profile-provider');
const btnChangePass = document.getElementById('btn-change-password');
const btnVerify = document.getElementById('btn-verify-email');
const localAvatar = localStorage.getItem('clc_avatar_' + currentUser.uid);
const avatarUrl = localAvatar || currentUser.photoURL;
if (avatarUrl) {
avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
} else {
avatarEl.innerHTML = '👤';
}
emailEl.innerText = currentUser.email || '—';
const providers = currentUser.providerData.map(p => p.providerId).join(', ');
providerEl.innerText = providers.includes('google') ? 'Google' : 'Email / Пароль';
if (providers.includes('password')) btnChangePass.style.display = 'block';
else btnChangePass.style.display = 'none';
if (!currentUser.emailVerified) btnVerify.style.display = 'block';
else btnVerify.style.display = 'none';

// ✅ СНАЧАЛА ПОКАЗЫВАЕМ ТО, ЧТО ЕСТЬ В КЭШЕ — МГНОВЕННО
let profileCache = {};
try { profileCache = JSON.parse(localStorage.getItem('clc_profile_cache_' + currentUser.uid) || '{}'); } catch {}
if (Object.keys(profileCache).length) applyProfileFieldsToForm(profileCache);
 
// ✅ ЗАГРУЖАЕМ ДАННЫЕ ПРОФИЛЯ ИЗ FIRESTORE
try {
const userDoc = await db.collection('users').doc(currentUser.uid).get();
if (userDoc.exists) {
const data = userDoc.data();
applyProfileFieldsToForm(data);
try { localStorage.setItem('clc_profile_cache_' + currentUser.uid, JSON.stringify(data)); } catch {}
}
} catch (err) {
console.error('Ошибка загрузки профиля:', err);
}

// === Отображение активных сессий ===
const oldList = document.getElementById('sessions-list-profile');
if (oldList) oldList.remove();
const oldHeader = document.querySelector('.sessions-header-profile');
if (oldHeader) oldHeader.remove();
const sessions = await loadSessionsForProfile();
let sessionsHtml = `
<div class="sessions-header-profile" style="margin-top: 25px; border-top: 1px solid #333; padding-top: 15px;">
<h3 style="font-size: 16px; margin-bottom: 15px; color: #90caf9;">📱 Активные устройства</h3>
<div id="sessions-list-profile" style="display: flex; flex-direction: column; gap: 10px;">
`;
if (sessions.length === 0) {
sessionsHtml += `<div style="color: #888; text-align: center; padding: 20px;">Нет активных устройств</div>`;
} else {
sessions.forEach(s => {
const isCurrent = s.id === currentSessionId;
sessionsHtml += `
<div style="display: flex; justify-content: space-between; align-items: center; background: rgba(144, 202, 249, 0.1); padding: 10px; border-radius: 8px;">
<div style="font-size: 14px; color: #eee; flex: 1;">
${s.deviceLabel}
 ${isCurrent ? '<span style="color: #4caf50; font-size: 12px;">(это устройство)</span>' : ''}
                <div style="font-size: 11px; color: #666; width: 300px; max-width: 100%; word-break: break-all;">
                    ${s.id.substring(0, 8)}...
                </div>
</div>
${!isCurrent ? `<button class="btn-danger" style="padding: 6px 12px; font-size: 12px; min-height: auto; border-radius: 6px;" onclick="revokeSession('${s.id}')">Завершить</button>` : ''}
</div>`;
});
}
sessionsHtml += `</div></div>`;
const profileActions = document.querySelector('.profile-actions');
profileActions.insertAdjacentHTML('beforebegin', sessionsHtml);
}

async function changePassword() {
    const email = currentUser.email;
    if (!email) { alert('❌ Не удалось определить email'); return; }
    try {
        await auth.sendPasswordResetEmail(email);
        alert(`✅ Письмо для смены пароля отправлено на ${email}.\nПроверьте почту (включая спам)!`);
    } catch (error) { alert('❌ Ошибка: ' + getAuthErrorMessage(error.code)); }
}

async function sendVerificationEmail() {
    try {
        await currentUser.sendEmailVerification();
        alert('✅ Письмо для подтверждения отправлено!\nПроверьте почту и перейдите по ссылке.');
    } catch (error) { alert('❌ Ошибка: ' + getAuthErrorMessage(error.code)); }
}

// === ЛОГИКА ЗАГРУЗКИ И ОБРЕЗКИ АВАТАРКИ ===
let cropState = { 
    dragging: false, startX: 0, startY: 0, 
    imgX: 0, imgY: 0, baseScale: 1, zoom: 1, 
    natW: 0, natH: 0, containerSize: 300 
};

function initCropEvents() {
    const img = document.getElementById('crop-image');
    if (!img) return;
    const onStart = (x, y) => {
        cropState.dragging = true;
        cropState.startX = x - cropState.imgX;
        cropState.startY = y - cropState.imgY;
    };
    const onMove = (x, y) => {
        if (!cropState.dragging) return;
        let newX = x - cropState.startX;
        let newY = y - cropState.startY;
        const finalScale = cropState.baseScale * cropState.zoom;
        const w = cropState.natW * finalScale;
        const h = cropState.natH * finalScale;
        const minX = Math.min(0, cropState.containerSize - w);
        const maxX = Math.max(0, cropState.containerSize - w);
        const minY = Math.min(0, cropState.containerSize - h);
        const maxY = Math.max(0, cropState.containerSize - h);
        newX = Math.min(maxX, Math.max(minX, newX));
        newY = Math.min(maxY, Math.max(minY, newY));
        cropState.imgX = newX;
        cropState.imgY = newY;
        img.style.left = newX + 'px';
        img.style.top = newY + 'px';
    };
    const onEnd = () => { cropState.dragging = false; img.classList.remove('dragging'); };
    img.addEventListener('mousedown', (e) => { e.preventDefault(); img.classList.add('dragging'); onStart(e.clientX, e.clientY); });
    document.addEventListener('mousemove', (e) => { if(cropState.dragging) onMove(e.clientX, e.clientY); });
    document.addEventListener('mouseup', onEnd);
    img.addEventListener('touchstart', (e) => { const t = e.touches[0]; img.classList.add('dragging'); onStart(t.clientX, t.clientY); }, {passive: true});
    document.addEventListener('touchmove', (e) => { if(cropState.dragging) { const t = e.touches[0]; onMove(t.clientX, t.clientY); } }, {passive: true});
    document.addEventListener('touchend', onEnd);
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Пожалуйста, выберите изображение'); return; }
    const reader = new FileReader();
    reader.onload = function(e) { openCropModal(e.target.result); };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function openCropModal(src) {
    const img = document.getElementById('crop-image');
    cropState.containerSize = 300; 
    img.src = src;
    img.onload = function() {
        cropState.natW = this.naturalWidth;
        cropState.natH = this.naturalHeight;
        cropState.baseScale = Math.max(cropState.containerSize / cropState.natW, cropState.containerSize / cropState.natH);
        cropState.zoom = 1;
        document.getElementById('crop-zoom').value = 1;
        cropState.imgX = (cropState.containerSize - cropState.natW * cropState.baseScale) / 2;
        cropState.imgY = (cropState.containerSize - cropState.natH * cropState.baseScale) / 2;
        applyCropZoom(1);
    };
    document.getElementById('modal-crop').classList.add('show');
}

function applyCropZoom(val) {
    cropState.zoom = parseFloat(val);
    const img = document.getElementById('crop-image');
    const finalScale = cropState.baseScale * cropState.zoom;
    const w = cropState.natW * finalScale;
    const h = cropState.natH * finalScale;
    cropState.imgX = Math.min(0, Math.max(cropState.containerSize - w, cropState.imgX));
    cropState.imgY = Math.min(0, Math.max(cropState.containerSize - h, cropState.imgY));
    img.style.width = w + 'px';
    img.style.height = h + 'px';
    img.style.left = cropState.imgX + 'px';
    img.style.top = cropState.imgY + 'px';
}

function saveCroppedAvatar() {
    const img = document.getElementById('crop-image');
    const canvas = document.createElement('canvas');
    
    // ✅ УМЕНЬШАЕМ РАЗМЕР С 512 ДО 256 (для аватарки в кружочке этого более чем достаточно)
    const size = 256; 
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    const finalScale = cropState.baseScale * cropState.zoom;
    const srcX = -cropState.imgX / finalScale;
    const srcY = -cropState.imgY / finalScale;
    const srcSize = cropState.containerSize / finalScale;
    
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);
    
    // ✅ УМЕНЬШАЕМ КАЧЕСТВО С 0.8 ДО 0.5 (визуально в кружке 48x48px разницы нет, но файл легче в 3 раза)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5); 
    
    saveAvatarToStorage(dataUrl);
    closeModal('modal-crop');
}
function saveAvatarToStorage(dataUrl) {
    if (!currentUser) return;
    localStorage.setItem('clc_avatar_' + currentUser.uid, dataUrl);
db.collection('users').doc(currentUser.uid).set({ avatar: dataUrl }, { merge: true })
    .then(() => { updateAvatarsInUI(dataUrl); syncPublicProfileToTeams(); })
    .catch(err => console.error('Ошибка сохранения аватарки:', err));
}

function updateAvatarsInUI(dataUrl) {
    const btnAvatar = document.getElementById('profile-btn-avatar');
    const btnIcon = document.getElementById('profile-btn-icon');
    if (btnAvatar && btnIcon) {
        btnAvatar.src = dataUrl;
        btnAvatar.style.display = 'block';
        btnIcon.style.display = 'none';
    }
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) {
        profileAvatar.innerHTML = `<img src="${dataUrl}" alt="Avatar">`;
    }
}

function resetAvatarsInUI() {
    const btnAvatar = document.getElementById('profile-btn-avatar');
    const btnIcon = document.getElementById('profile-btn-icon');
    if (btnAvatar && btnIcon) {
        btnAvatar.style.display = 'none';
        btnIcon.style.display = 'block';
    }
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) profileAvatar.innerHTML = '👤';
}

function loadUserAvatar() {
    if (!currentUser) return;
    const localAvatar = localStorage.getItem('clc_avatar_' + currentUser.uid);
    if (localAvatar) { updateAvatarsInUI(localAvatar); return; }
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists && doc.data().avatar) {
            const url = doc.data().avatar;
            localStorage.setItem('clc_avatar_' + currentUser.uid, url);
            updateAvatarsInUI(url);
        } else if (currentUser.photoURL) {
            updateAvatarsInUI(currentUser.photoURL);
        } else { resetAvatarsInUI(); }
    }).catch(() => {
        if (currentUser.photoURL) updateAvatarsInUI(currentUser.photoURL);
        else resetAvatarsInUI();
    });
}