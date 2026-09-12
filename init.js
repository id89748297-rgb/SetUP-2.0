// === ИНИЦИАЛИЗАЦИЯ ===
const lastBackup = parseInt(localStorage.getItem('clc_last_backup') || '0');
if (Date.now() - lastBackup > 365 * 24 * 60 * 60 * 1000) {
setTimeout(() => showToast('💾 Давно не делали резервную копию — сохраните базу в настройках', 'info'), 2000);
}
loadFromStorage();
initCropEvents();  // ← НОВАЯ СТРОЧКА
buildCarouselItems();
renderCarousel();
setupCarouselSwipe();
let savedStateInit = {};
try { savedStateInit = JSON.parse(localStorage.getItem('clc_state') || '{}'); }
catch (e) { console.warn('clc_state повреждён, сброшен'); localStorage.removeItem('clc_state'); }
const restoringDetailPage = savedStateInit.page === 'page-song-view' || savedStateInit.page === 'page-setlist-detail';
if (savedStateInit.carouselIdx !== undefined && savedStateInit.carouselIdx < carouselItems.length) {
carouselActiveIndex = savedStateInit.carouselIdx;
renderCarousel();
if (!restoringDetailPage) activateCarouselItem(carouselActiveIndex);
} else {
carouselActiveIndex = 0;
renderCarousel();
if (!restoringDetailPage) activateCarouselItem(0);
}
if (savedStateInit.membersModalTeamId && typeof openTeamMembers === 'function') {
openTeamMembers(savedStateInit.membersModalTeamId);
}
setupSwipe();
setupVlButton();
applyBodyClasses();
updateToggleButtonsUI();
document.getElementById('team-edit-avatar').addEventListener('change', function() {
previewTeamAvatar(this);
});
window.addEventListener('resize', () => {
updatePdfOrCopyButton();
const container = document.getElementById('carousel-container');
const track = document.getElementById('carousel-track');
if (container && track) {
const itemWidth = container.offsetWidth / 3;
if (itemWidth > 0) {
const domIdx = carouselActiveIndex + 1;
const translateX = itemWidth - domIdx * itemWidth;
track.style.transition = 'none';
track.style.transform = `translateX(${translateX}px)`;
}
}
});
// Безопасная регистрация Service Worker (только для http/https)
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => console.log('✅ SW зарегистрирован:', registration.scope))
      .catch(error => console.error('❌ Ошибка регистрации SW:', error));
  });
}
async function saveProfileChanges() {
const name = document.getElementById('profile-name-input').value.trim();
const lastname = document.getElementById('profile-lastname-input').value.trim();
const gender = document.getElementById('profile-gender-input').value;
const bDay = document.getElementById('profile-birthday-day').value;
const bMonth = document.getElementById('profile-birthday-month').value;
const birthDate = (bDay && bMonth) ? (bMonth + '-' + bDay) : '';
const country = document.getElementById('profile-country-input').value.trim();
const city = document.getElementById('profile-city-input').value.trim();
const about = document.getElementById('profile-about-input').value.trim().slice(0, 100);

if (!name) {
alert('❌ Введите хотя бы имя!');
return;
}

try {
// ✅ Обновляем displayName в Firebase Auth
await currentUser.updateProfile({ displayName: name });

// ✅ Сохраняем ВСЕ поля в Firestore
await db.collection('users').doc(currentUser.uid).set({
displayName: name,
lastName: lastname,
gender: gender,
birthDate: birthDate,
country: country,
city: city,
aboutMe: about,
aboutMe: about,
updatedAt: firebase.firestore.FieldValue.serverTimestamp()
}, { merge: true });
 
syncPublicProfileToTeams();
alert('✅ Все изменения сохранены!');
renderProfile(); // Перерисовываем профиль
} catch (error) {
alert('❌ Ошибка: ' + error.message);
}
}
// === СОСТОЯНИЕ КНОПКИ ОБНОВЛЕНИЯ (вместо всплывающих окон) ===
// state: 'spin' — крутится (идёт синхронизация/обновление), 'ok' — зелёный квадрат (готово), 'idle' — обычная стрелка
function setRefreshBtnState(state) {
const btn = document.querySelector('.page.active .btn-refresh-round') || document.querySelector('.btn-refresh-round');
if (!btn) return;
if (btn.dataset.wasArrow === undefined) btn.dataset.wasArrow = btn.innerText || '↻';
if (state === 'spin') {
// крутится шестерёнка (стрелка не вращается никогда)
btn.classList.remove('sync-ok');
btn.innerText = '⚙';
btn.classList.add('spinning');
} else if (state === 'ok') {
btn.classList.remove('spinning');
btn.classList.add('sync-ok');
btn.innerText = '✔\uFE0E'; // \uFE0E — текстовая галочка: эмодзи-версия на телефонах игнорирует белый цвет
clearTimeout(window.__refreshOkTimer);
window.__refreshOkTimer = setTimeout(() => {
btn.classList.remove('sync-ok');
btn.innerText = btn.dataset.wasArrow;
}, 1500);
} else {
btn.classList.remove('spinning', 'sync-ok');
btn.innerText = btn.dataset.wasArrow;
}
}

// === ФУНКЦИЯ ОБНОВЛЕНИЯ СТРАНИЦЫ ===
function refreshPage(btnEl) {
    // Вместо стрелки — крутящаяся шестерёнка, пока страница перезагружается
    if (btnEl) {
        btnEl.classList.remove('sync-ok');
        if (btnEl.dataset.wasArrow === undefined) btnEl.dataset.wasArrow = btnEl.innerText || '↻';
        btnEl.innerText = '⚙';
        btnEl.classList.add('spinning');
    }

    // Проверяем наличие интернета
    if (!navigator.onLine) {
        if (btnEl) { btnEl.classList.remove('spinning'); btnEl.innerText = btnEl.dataset.wasArrow || '↻'; }
        showToast('❌ Нет подключения к интернету. Синхронизация невозможна.', 'error');
        return;
    }

    // Если интернет есть — перезагружаем страницу
    setTimeout(() => {
        location.reload();
    }, 600);
}

// === TOAST-УВЕДОМЛЕНИЯ ===
function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    while (container.children.length >= 3) container.firstChild.remove();
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

// === СЛУШАТЕЛИ СОСТОЯНИЯ СЕТИ ===
window.addEventListener('online', () => {
    showToast('✅ Подключение восстановлено', 'success');
});
window.addEventListener('offline', () => {
    showToast('❌ Потеряно подключение к интернету', 'error');
});