// ===== LOGIN SYSTEM =====

// Поточний користувач
let currentUser = null;
let selectedUsername = null;

// Емодзі для аватарів
const AVATARS = {
    'Admin': '👑',
    'Настя': '👩',
    'Лев': '🦁',
    'Ярик': '⚡',
    'Анонім': '👤'
};

// Ініціалізація системи автентифікації
window.initAuthSystem = function() {
    console.log('🔐 Ініціалізація системи автентифікації...');
    
    // Перевіряємо, чи є збережений користувач
    const savedUser = localStorage.getItem('halloween_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('✅ Користувач завантажений з кешу:', currentUser.name);
            showAppContent();
        } catch (error) {
            console.error('❌ Помилка завантаження користувача:', error);
            localStorage.removeItem('halloween_user');
            showLoginForm();
        }
    } else {
        showLoginForm();
    }
};

// Показати форму входу
function showLoginForm() {
    const app = document.getElementById('app');
    
    // Перевіряємо чи конфігурація завантажена
    if (typeof USERS === 'undefined') {
        app.innerHTML = `
            <div class="login-overlay" id="loginOverlay">
                <div class="login-container">
                    <div class="login-header">
                        <h1>🎃</h1>
                        <h2>Кухонний Планувальник</h2>
                        <p>Завантаження...</p>
                    </div>
                    <div class="error-message">
                        Помилка: конфігурація не завантажена. Перезавантажте сторінку.
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // Генеруємо список акаунтів
    let accountsHTML = '';
    for (const [username, user] of Object.entries(USERS)) {
        const avatar = AVATARS[username] || '👤';
        const roleText = user.role === 'Dev' ? '🔧 Розробник' : '👀 Користувач';
        
        accountsHTML += `
            <div class="account-card" onclick="window.selectAccount('${username}')">
                <div class="account-avatar">${avatar}</div>
                <div class="account-info">
                    <p class="account-name">${user.name}</p>
                    <p class="account-role">${roleText}</p>
                </div>
                <div class="account-arrow">→</div>
            </div>
        `;
    }
    
    app.innerHTML = `
        <div class="login-overlay" id="loginOverlay">
            <div class="login-container">
                <div class="login-header">
                    <h1>🎃</h1>
                    <h2>Кухонний Планувальник</h2>
                    <p>Виберіть акаунт</p>
                </div>
                
                <div id="accountSelection" class="account-selection">
                    <div class="account-list">
                        ${accountsHTML}
                    </div>
                </div>
                
                <div id="passwordForm" class="password-form">
                    <div class="selected-account" id="selectedAccountInfo"></div>
                    
                    <form class="login-form" onsubmit="window.loginWithPassword(event)">
                        <div class="form-group">
                            <label for="password">Пароль:</label>
                            <input type="password" id="password" name="password" 
                                   placeholder="Введіть пароль" required autofocus>
                            <small style="color: #7f8c8d; font-size: 0.8em; margin-top: 5px; display: block;">
                                Для акаунта "Анонім" пароль не потрібен
                            </small>
                        </div>
                        
                        <div class="login-buttons">
                            <button type="button" class="btn btn-secondary" onclick="window.backToAccounts()">
                                <span>←</span>
                                <span>Назад</span>
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <span>🔑</span>
                                <span>Увійти</span>
                            </button>
                        </div>
                    </form>
                </div>
                
                <div id="errorMessage" class="error-message" style="display: none;"></div>
            </div>
        </div>
    `;
}

// Вибір акаунта
window.selectAccount = function(username) {
    selectedUsername = username;
    const user = USERS[username];
    const avatar = AVATARS[username] || '👤';
    const roleText = user.role === 'Dev' ? '🔧 Розробник' : '👀 Користувач';
    
    // Оновлюємо інформацію про вибраний акаунт
    document.getElementById('selectedAccountInfo').innerHTML = `
        <div class="account-avatar">${avatar}</div>
        <div class="selected-account-info">
            <p class="selected-account-name">${user.name}</p>
            <p class="selected-account-role">${roleText}</p>
        </div>
    `;
    
    // Показуємо форму пароля
    document.getElementById('accountSelection').style.display = 'none';
    document.getElementById('passwordForm').classList.add('active');
    document.getElementById('errorMessage').style.display = 'none';
    
    // Фокус на поле пароля
    setTimeout(() => {
        document.getElementById('password').focus();
    }, 100);
};

// Повернутися до вибору акаунтів
window.backToAccounts = function() {
    selectedUsername = null;
    document.getElementById('accountSelection').style.display = 'block';
    document.getElementById('passwordForm').classList.remove('active');
    document.getElementById('password').value = '';
    document.getElementById('errorMessage').style.display = 'none';
};

// Вхід з паролем
window.loginWithPassword = function(event) {
    event.preventDefault();
    
    if (!selectedUsername) {
        showMessage('Будь ласка, виберіть акаунт', 'error');
        return;
    }
    
    const password = document.getElementById('password').value;
    const user = USERS[selectedUsername];
    
    // Перевіряємо пароль
    if (user && user.password === password) {
        currentUser = {
            name: user.name,
            username: selectedUsername,
            role: user.role,
            promptFile: user.promptFile
        };
        
        localStorage.setItem('halloween_user', JSON.stringify(currentUser));
        showAppContent();
        setTimeout(() => {
            showMessage(`Вітаємо, ${user.name}!`, 'success');
        }, 100);
    } else {
        showMessage('Неправильний пароль', 'error');
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }
};

// Показати контент додатку
function showAppContent() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="app-content visible">
            <div id="mainAppContent"></div>
        </div>
    `;
    
    // Викликаємо функцію створення структури з general.js
    if (typeof window.createMainApp === 'function') {
        window.createMainApp(currentUser, AVATARS);
    } else {
        console.error('❌ Функція createMainApp не знайдена!');
    }
}

// Вихід з системи
window.logout = function() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        currentUser = null;
        selectedUsername = null;
        localStorage.removeItem('halloween_user');
        
        // Очищаємо історію чату при виході
        localStorage.removeItem('jarvis_chat_history');
        localStorage.removeItem('jarvis_context');
        
        showLoginForm();
        setTimeout(() => {
            showMessage('Ви успішно вийшли з системи', 'success');
        }, 100);
    }
};

// Перевірка прав на зміну даних
function canModifyData() {
    return currentUser && currentUser.role === 'Dev';
}

// Перевірка прав на збереження в Firebase
function canSaveToFirebase() {
    return currentUser && currentUser.role === 'Dev';
}

// Показати повідомлення
function showMessage(message, type = 'error') {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.className = `${type}-message`;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Експорт функцій для глобального використання
window.canModifyData = canModifyData;
window.canSaveToFirebase = canSaveToFirebase;
window.currentUser = () => currentUser;
window.getAvatars = () => AVATARS;

console.log('✅ Login system завантажено');
