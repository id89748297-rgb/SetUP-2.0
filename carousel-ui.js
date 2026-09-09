function buildCarouselItems() {
carouselItems = [
{ id: 'songs',    type: 'songs',    label: 'Песни',      icon: '🎵' },
{ id: 'setlists', type: 'setlists', label: 'Сет-листы',  icon: '📋' },
{ id: 'teams', type: 'teams', label: 'Команды', icon: '👥' }
];
getSortedTeams().forEach(t => {
carouselItems.push({
id: 'team_' + t.id,
type: 'team',
teamId: t.id,
label: t.name,
icon: '🎸',
avatar: t.avatar || null
});
});
}
function escapeHtml(str) {
return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function renderCarousel() {
buildCarouselItems();
const track = document.getElementById('carousel-track');
if (!track) return;
if (carouselItems.length === 0) { track.innerHTML = ''; return; }
const first = carouselItems[0];
const last = carouselItems[carouselItems.length - 1];
const extended = [last, ...carouselItems, first];
track.innerHTML = extended.map((item, idx) => {
const realIdx = idx - 1;
const isActive = realIdx === carouselActiveIndex;
const len = carouselItems.length;
const isNeighbor = Math.abs(realIdx - carouselActiveIndex) === 1 ||
(carouselActiveIndex === 0 && realIdx === len - 1) ||
(carouselActiveIndex === len - 1 && realIdx === 0);
const classes = ['carousel-item'];
if (isActive) classes.push('active');
if (isNeighbor && !isActive) classes.push('neighbor');
const badge = getTeamBadge(item);
const unreadCount = item.type === 'team' ? getUnreadChatCount(item.teamId) : 0;
const iconHtml = item.type === 'team' && item.avatar
? `<img src="${escapeHtml(item.avatar)}" alt="">`
: item.icon;
return `<div class="${classes.join(' ')}" data-real-idx="${realIdx}" data-item-id="${item.id}" onclick="handleCarouselClick(${realIdx})">
<div class="carousel-item-inner" style="position:relative;">
${unreadCount > 0 ? `<div style="position:absolute;top:-4px;left:-4px;background:#ef5350;color:#fff;font-size:10px;font-weight:bold;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;z-index:2;">${unreadCount}</div>` : ''}
<div class="carousel-item-icon">${iconHtml}</div>
<div class="carousel-item-label">${escapeHtml(item.label)}</div>
${badge ? `<div class="carousel-item-badge">${badge}</div>` : ''}
</div>
</div>`;
}).join('');
const container = document.getElementById('carousel-container');
const itemWidth = container.offsetWidth / 3;
if (itemWidth > 0) {
const domIdx = carouselActiveIndex + 1;
const translateX = itemWidth - domIdx * itemWidth;
track.style.transition = 'none';
track.style.transform = `translateX(${translateX}px)`;
}
renderCarouselIndicator();
}
function getTeamBadge(item) {
if (item.type !== 'team') return null;
const teamSetlists = setlists.filter(sl => sl.teamId === item.teamId && !sl.isArchived);
if (teamSetlists.length === 0) return null;
const withChanges = teamSetlists.filter(sl => sl.hasChanges).length;
if (withChanges > 0) return `${withChanges}`;
return null;
}
function updateCarouselBadges() {
document.querySelectorAll('.carousel-item').forEach(el => {
const itemId = el.dataset.itemId;
const item = carouselItems.find(i => i.id === itemId);
if (!item) return;
const badge = getTeamBadge(item);
const inner = el.querySelector('.carousel-item-inner');
if (!inner) return;
const existingBadge = inner.querySelector('.carousel-item-badge');
if (badge && !existingBadge) {
const badgeEl = document.createElement('div');
badgeEl.className = 'carousel-item-badge';
badgeEl.textContent = badge;
inner.appendChild(badgeEl);
} else if (!badge && existingBadge) {
existingBadge.remove();
} else if (badge && existingBadge) {
if (existingBadge.textContent !== badge) existingBadge.textContent = badge;
}
});
}
function renderCarouselIndicator() {
const indicator = document.getElementById('carousel-indicator');
if (!indicator) return;
if (carouselItems.length <= 1) { indicator.innerHTML = ''; return; }
indicator.innerHTML = carouselItems.map((_, idx) =>
`<div class="carousel-dot ${idx === carouselActiveIndex ? 'active' : ''}"></div>`
).join('');
}
function handleCarouselClick(realIdx) {
const len = carouselItems.length;
if (len === 0) return;
let targetIdx;
if (realIdx < 0) targetIdx = len - 1;
else if (realIdx >= len) targetIdx = 0;
else targetIdx = realIdx;
if (targetIdx === carouselActiveIndex) {
activateCarouselItem(targetIdx);
return;
}
setCarouselIndex(targetIdx);
}
function setCarouselIndex(newIdx, animate = true) {
const len = carouselItems.length;
if (len === 0) return;
if (isTransitioning && animate) return;
const targetActive = ((newIdx % len) + len) % len;
if (targetActive === carouselActiveIndex) {
activateCarouselItem(carouselActiveIndex);
return;
}
let delta = targetActive - carouselActiveIndex;
while (delta > len / 2) delta -= len;
while (delta < -len / 2) delta += len;
carouselActiveIndex = targetActive;
let domIdx;
if (delta === -1 && carouselActiveIndex === len - 1) {
domIdx = 0;
} else if (delta === 1 && carouselActiveIndex === 0) {
domIdx = len + 1;
} else {
domIdx = carouselActiveIndex + 1;
}
const container = document.getElementById('carousel-container');
const itemWidth = container.offsetWidth / 3;
if (itemWidth === 0) return;
const translateX = itemWidth - domIdx * itemWidth;
const track = document.getElementById('carousel-track');
track.style.transition = animate ? 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';
track.style.transform = `translateX(${translateX}px)`;
if (animate) isTransitioning = true;
setTimeout(() => { isTransitioning = false; }, 500);
renderCarouselIndicator();
document.querySelectorAll('.carousel-item').forEach(el => {
const ri = parseInt(el.dataset.realIdx);
el.classList.toggle('active', ri === carouselActiveIndex);
const isNeighbor = Math.abs(ri - carouselActiveIndex) === 1 ||
(carouselActiveIndex === 0 && ri === len - 1) ||
(carouselActiveIndex === len - 1 && ri === 0);
el.classList.toggle('neighbor', isNeighbor && ri !== carouselActiveIndex);
});
activateCarouselItem(carouselActiveIndex);
if (domIdx === 0 || domIdx === len + 1) {
if (animate) {
const onTransitionEnd = () => {
track.removeEventListener('transitionend', onTransitionEnd);
isTransitioning = false;
const realDomIdx = carouselActiveIndex + 1;
const realTranslateX = itemWidth - realDomIdx * itemWidth;
track.style.transition = 'none';
track.style.transform = `translateX(${realTranslateX}px)`;
};
track.addEventListener('transitionend', onTransitionEnd);
} else {
isTransitioning = false;
const realDomIdx = carouselActiveIndex + 1;
const realTranslateX = itemWidth - realDomIdx * itemWidth;
track.style.transition = 'none';
track.style.transform = `translateX(${realTranslateX}px)`;
}
} else {
if (animate) {
const onTransitionEnd = () => {
track.removeEventListener('transitionend', onTransitionEnd);
isTransitioning = false;
};
track.addEventListener('transitionend', onTransitionEnd);
} else {
isTransitioning = false;
}
}
}
function hideAllHomeViews() {
document.getElementById('home-view-songs').style.display = 'none';
document.getElementById('home-view-setlists').style.display = 'none';
const tv = document.getElementById('home-view-teams');
if (tv) tv.style.display = 'none';
const td = document.getElementById('home-view-team-detail');
if (td) td.style.display = 'none';
currentTeamDetailId = null;
}
function activateCarouselItem(idx) {
const item = carouselItems[idx];
if (!item) return;
const subtitle = document.getElementById('home-page-subtitle');
hideAllHomeViews();
if (item.type === 'songs') {
if (subtitle) subtitle.innerText = 'песни';
currentHomeView = 'songs';
document.getElementById('home-view-songs').style.display = 'block';
renderSongs();
} else if (item.type === 'setlists') {
if (subtitle) subtitle.innerText = 'сет-листы';
currentHomeView = 'setlists';
document.getElementById('home-view-setlists').style.display = 'block';
renderSetlists();
} else if (item.type === 'teams') {
if (subtitle) subtitle.innerText = 'команды';
currentHomeView = 'teams';
showTeamsView();
} else if (item.type === 'team') {
if (subtitle) subtitle.innerText = item.label;
currentHomeView = 'team_' + item.teamId;
showTeamDetailView(item.teamId);
}
saveAppState();
}
function setupCarouselSwipe() {
const container = document.getElementById('carousel-container');
if (!container) return;
container.addEventListener('touchstart', (e) => {
e.stopPropagation();
carouselTouchStartX = e.touches[0].clientX;
carouselTouchStartY = e.touches[0].clientY;
carouselTracking = true;
carouselMoved = false;
}, { passive: true });
container.addEventListener('touchmove', (e) => {
if (!carouselTracking) return;
const dx = Math.abs(e.touches[0].clientX - carouselTouchStartX);
const dy = Math.abs(e.touches[0].clientY - carouselTouchStartY);
if (dx > 8 || dy > 8) carouselMoved = true;
if (dx > dy && dx > 10) e.preventDefault();
}, { passive: false });
container.addEventListener('touchend', (e) => {
if (!carouselTracking) return;
carouselTracking = false;
if (!carouselMoved) return;
if (window.__suppressCarouselSwipeUntil && Date.now() < window.__suppressCarouselSwipeUntil) return;
const dx = carouselTouchStartX - e.changedTouches[0].clientX;
const dy = carouselTouchStartY - e.changedTouches[0].clientY;
if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
if (dx > 0) setCarouselIndex(carouselActiveIndex + 1);
else setCarouselIndex(carouselActiveIndex - 1);
}
}, { passive: true });
}