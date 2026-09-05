// === FIREBASE AUTHENTICATION ===
let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    const authPage = document.getElementById('page-auth');
    const homePage = document.getElementById('page-home');
    const profilePage = document.getElementById('page-profile');
    const profileBtn = document.getElementById('profile-btn');

    if (user) {
        // ✅ ПРОВЕРКА: Почта должна быть подтверждена
       if (!user.emailVerified) {
            currentUser = null;
            localStorage.removeItem('clc_current_uid');
            if (profileBtn) profileBtn.style.display = 'none';
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            if (authPage) authPage.classList.add('active');
            showAuthError(`⚠️ Почта не подтверждена! Проверьте ящик ${user.email}.`);
            return;
        }

       currentUser = user;
localStorage.setItem('clc_current_uid', user.uid);
console.log('✅ Авторизован:', user.email);
if (profileBtn) profileBtn.style.display = 'flex';

       // ✅ СНАЧАЛА ПОКАЗЫВАЕМ ГЛАВНЮ С ЛОКАЛЬНЫМИ ДАННЫМИ (мгновенно!) — но не перебиваем уже восстановленную страницу песни/сет-листа
        const __savedStateForAuth = JSON.parse(localStorage.getItem('clc_state') || '{}');
        if (__savedStateForAuth.page !== 'page-song-view' && __savedStateForAuth.page !== 'page-setlist-detail') {
            showPage('page-home');
        }
        loadUserAvatar();

        // ✅ ЗАГРУЖАЕМ ОБЛАЧНЫЕ ДАННЫЕ В ФОНЕ (не блокируя UI)
        showToast('↻ Синхронизация данных...', 'info');
        loadUserDataFromCloud().then(() => {
            showToast('✅ Данные синхронизированы', 'success');
            syncPublicProfileToTeams();
        }).catch(err => {
            console.error('Ошибка синхронизации:', err);
            showToast('⚠️ Ошибка синхронизации. Данные загружены локально.', 'error');
        });

        // ✅ ЗАПУСКАЕМ СИНХРОНИЗАЦИЮ В РЕАЛЬНОМ ВРЕМЕНИ (было пропущено!)
        startCloudSync();
 
        // ✅ РЕГИСТРИРУЕМ СЕССИЮ УСТРОЙСТВА
        registerSession();
 
        // ✅ ПОЧИНКА СТАРЫХ КОМАНД: создаём "пропуск" участника, если его нет
        if (typeof ensureTeamMemberships === 'function') {
            ensureTeamMemberships();
        }
 
    } else {
        currentUser = null;
        localStorage.removeItem('clc_current_uid');
        console.log('❌ Не авторизован');
        if (profileBtn) profileBtn.style.display = 'none';
        resetAvatarsInUI();
        stopCloudSync();
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        if (authPage) authPage.classList.add('active');
    }
});

// Обновленная функция выхода
async function logout() {
    if (confirm('Выйти из аккаунта?')) {
        // ✅ Останавливаем синхронизацию
        if (typeof stopCloudSync === 'function') {
            stopCloudSync();
        }
        // ✅ Очищаем сессию
        if (currentUser) {
            try {
                await db.collection('users').doc(currentUser.uid).collection('sessions').doc(currentSessionId).delete();
            } catch (e) {
                console.log('Сессия уже удалена или не существовала');
            }
        }
        localStorage.removeItem('session_id');
        // ✅ Firebase сам вызовет onAuthStateChanged(null) во ВСЕХ вкладках
        await auth.signOut();
    }
}

// Sign in with Google
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    showAuthError(getAuthErrorMessage(error.code));
  }
}

// Login with Email/Password
async function loginWithEmail() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showAuthError('Заполните все поля');
    return;
  }
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    showAuthError(getAuthErrorMessage(error.code));
  }
}

// Register with Email/Password
async function registerWithEmail() {
const name = document.getElementById('register-name').value.trim();
const email = document.getElementById('login-email').value.trim();
const password = document.getElementById('login-password').value;
if (!name) {
showAuthError('Введите имя');
return;
}
if (!email || !password) {
showAuthError('Заполните все поля');
return;
}
if (password.length < 6) {
showAuthError('Пароль должен быть минимум 6 символов');
return;
}
try {
// 1. Создаем пользователя в Firebase Auth
const userCredential = await auth.createUserWithEmailAndPassword(email, password);
// 1.5 Сохраняем имя прямо в аккаунт Firebase Auth
await userCredential.user.updateProfile({ displayName: name });
// 2. Отправляем письмо для подтверждения (требует интернет!)
await userCredential.user.sendEmailVerification();
alert('✅ Аккаунт создан! Пожалуйста, проверьте почту и перейдите по ссылке для подтверждения.');
console.log('📧 Письмо для подтверждения отправлено на', email);
// ❗ НЕ сохраняем данные в Firestore здесь! 
// Данные попадут в облако автоматически через saveToStorage() 
// только ПОСЛЕ того, как onAuthStateChanged разрешит вход.
} catch (error) {
showAuthError(getAuthErrorMessage(error.code));
}
}

// Reset password / Resend verification
async function resetPassword() {
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
        showAuthError('Сначала введите email в поле выше');
        return;
    }
    try {
        await auth.sendPasswordResetEmail(email);
        alert('✅ Письмо отправлено на ' + email + '\n\nПроверьте почту (включая спам). После перехода по ссылке ваш email будет автоматически подтверждён, и вы сможете войти.');
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            showAuthError('Пользователь с таким email не найден');
        } else {
            showAuthError(getAuthErrorMessage(error.code));
        }
    }
}

// Повторная отправка письма подтверждения
async function resendVerification() {
  if (auth.currentUser) {
    try {
      await auth.currentUser.sendEmailVerification();
      alert('✅ Письмо подтверждения отправлено на ' + auth.currentUser.email + '\nПроверьте почту (включая спам).');
    } catch (error) {
      showAuthError(getAuthErrorMessage(error.code));
    }
    return;
  }
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showAuthError('Введите email и пароль в поля выше, затем нажмите ещё раз');
    return;
  }
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    await cred.user.sendEmailVerification();
    alert('✅ Письмо подтверждения отправлено на ' + email + '\nПроверьте почту (включая спам).');
  } catch (error) {
    showAuthError(getAuthErrorMessage(error.code));
  }
}

// Show error
function showAuthError(message) {
  const errorDiv = document.getElementById('auth-error');
  if (errorDiv) {
    errorDiv.innerText = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
  }
}

// Get error message
function getAuthErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'Этот email уже зарегистрирован',
    'auth/invalid-email': 'Неверный формат email',
    'auth/weak-password': 'Пароль слишком слабый',
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/invalid-credential': 'Неверные учетные данные',
    'auth/popup-closed-by-user': 'Окно входа закрыто'
  };
  return messages[code] || 'Ошибка авторизации';
}

// Show register form
function showRegisterForm() {
  const nameField = document.getElementById('register-name');
  if (nameField.style.display === 'none') {
    nameField.style.display = 'block';
    nameField.focus();
    return;
  }
  if (confirm('Создать новый аккаунт?')) {
    registerWithEmail();
  }
}

// === УПРАВЛЕНИЕ СЕССИЯМИ (УСТРОЙСТВАМИ) ===
let currentSessionId = localStorage.getItem('session_id');
if (!currentSessionId) {
    currentSessionId = window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now().toString();
    localStorage.setItem('session_id', currentSessionId);
}

let unsubscribeSessionWatch = null;

async function registerSession() {
    if (!currentUser) return;
    const deviceLabel = /Mobi|Android/i.test(navigator.userAgent) ? "📱 Мобильное устройство" : "💻 Компьютер";
    
    await db.collection('users').doc(currentUser.uid).collection('sessions').doc(currentSessionId).set({
        deviceLabel: deviceLabel,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (unsubscribeSessionWatch) unsubscribeSessionWatch();
    unsubscribeSessionWatch = db.collection('users').doc(currentUser.uid).collection('sessions').doc(currentSessionId)
        .onSnapshot((doc) => {
            if (!doc.exists) {
                console.log("Сессия удалена удаленно. Выполняется выход...");
                auth.signOut();
                alert("Эта сессия была завершена с другого устройства.");
            }
        });
}

async function revokeSession(sessionId) {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).collection('sessions').doc(sessionId).delete();
    renderProfile(); 
}

async function loadSessionsForProfile() {
    if (!currentUser) return [];
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('sessions').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
function deleteAccount() {
confirm('⏳ Функция удаления аккаунта временно недоступна');
}