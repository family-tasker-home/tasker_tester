// ===== LOGIN SYSTEM =====
// Виправлена версія з персональним управлінням чатом

// Поточний користувач
let currentUser = null;
let selectedUsername = null;

// Ініціалізація системи автентифікації
window.initAuthSystem = async function() {
    console.log('🔐 Ініціалізація системи автентифікації...');
    
    // Завантажуємо профілі
    await window.loadProfiles();
    
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
    if (typeof USERS === 'undefined' || Object.keys(USERS).length === 0) {
        app.innerHTML = `
            <div class="login-overlay" id="loginOverlay">
                <div class="login-container">
                    <div class="login-header">
                        <h1>🎃</h1>
                        <h2>Кухонний Планувальник</h2>
                        <p>Завантаження...</p>
                    </div>
                    <div class="error-message">
                        Помилка: профілі не завантажені. Перезавантажте сторінку.
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    // Генеруємо список акаунтів
    let accountsHTML = '';
    for (const [username, user] of Object.entries(USERS)) {
        const avatar = user.avatar || '👤';
        
        // Отримуємо роль на сьогодні
        const roleInfo = window.getTodayRoleInfo(username);
        const roleEmoji = {
            'Dev': '🔧',
            'Кухня': '🍳',
            'Ванна': '🚿',
            'Кладовка': '📦',
            'Viewer': '👀'
        };
        
        const roleText = `${roleEmoji[roleInfo.role] || '👀'} ${roleInfo.role}`;
        const dayInfo = roleInfo.role !== 'Dev' ? ` (${roleInfo.dayName})` : '';
        
        accountsHTML += `
            <div class="account-card" data-role="${roleInfo.role}" onclick="window.selectAccount('${username}')">
                <div class="account-avatar">${avatar}</div>
                <div class="account-info">
                    <p class="account-name">${user.name}</p>
                    <p class="account-role">${roleText}${dayInfo}</p>
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
    
    // Якщо це Анонім - входимо без пароля
    if (username === 'Анонім') {
        const roleInfo = window.getTodayRoleInfo(username);
        
        currentUser = {
            name: user.name,
            username: username,
            role: roleInfo.role,
            promptFile: user.promptFile,
            avatar: user.avatar,
            canModify: roleInfo.canModify,
            canSave: roleInfo.canSave
        };
        
        localStorage.setItem('halloween_user', JSON.stringify(currentUser));
        showAppContent();
        setTimeout(() => {
            showMessage(`Вітаємо, ${user.name}!`, 'success');
        }, 100);
        return;
    }
    
    // Для інших користувачів показуємо форму пароля
    const avatar = user.avatar || '👤';
    const roleInfo = window.getTodayRoleInfo(username);
    
    const roleEmoji = {
        'Dev': '🔧',
        'Кухня': '🍳',
        'Ванна': '🚿',
        'Кладовка': '📦',
        'Viewer': '👀'
    };
    
    const roleText = `${roleEmoji[roleInfo.role] || '👀'} ${roleInfo.role}`;
    const dayInfo = roleInfo.role !== 'Dev' ? ` (${roleInfo.dayName})` : '';
    
    // Оновлюємо інформацію про вибраний акаунт
    document.getElementById('selectedAccountInfo').innerHTML = `
        <div class="account-avatar">${avatar}</div>
        <div class="selected-account-info">
            <p class="selected-account-name">${user.name}</p>
            <p class="selected-account-role">${roleText}${dayInfo}</p>
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
        const roleInfo = window.getTodayRoleInfo(selectedUsername);
        
        currentUser = {
            name: user.name,
            username: selectedUsername,
            role: roleInfo.role,
            promptFile: user.promptFile,
            avatar: user.avatar,
            canModify: roleInfo.canModify,
            canSave: roleInfo.canSave,
            dayName: roleInfo.dayName
        };
        
        localStorage.setItem('halloween_user', JSON.stringify(currentUser));
        showAppContent();
        setTimeout(() => {
            const roleEmoji = {
                'Dev': '🔧',
                'Кухня': '🍳',
                'Ванна': '🚿',
                'Кладовка': '📦',
                'Viewer': '👀'
            };
            showMessage(`Вітаємо, ${user.name}! 🎉\n\nВаша роль сьогодні: ${roleEmoji[roleInfo.role]} ${roleInfo.role}`, 'success');
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
        window.createMainApp(currentUser, USERS);
    } else {
        console.error('❌ Функція createMainApp не знайдена!');
    }
    
    // Автоматично завантажуємо всі дані з Firebase
    if (currentUser && currentUser.username) {
        setTimeout(() => {
            // Завантажуємо персональні дані користувача
            if (typeof window.autoLoadAllDataOnLogin === 'function') {
                window.autoLoadAllDataOnLogin(currentUser.username).then(() => {
                    console.log('✅ Персональні дані автоматично завантажено з Firebase');
                    
                    // Оновлюємо персональні інтерфейси
                    if (typeof window.renderDailySchedule === 'function') window.renderDailySchedule();
                    if (typeof window.renderTasks === 'function') window.renderTasks();
                    if (typeof window.renderMenu === 'function') window.renderMenu();
                });
            }
            
            // Завантажуємо спільні дані (запаси та список покупок)
            if (typeof window.autoLoadSharedDataOnLogin === 'function') {
                window.autoLoadSharedDataOnLogin().then(() => {
                    console.log('✅ Спільні дані автоматично завантажено з Firebase');
                });
            }
        }, 1500);
    }
}

// Вихід з системи (БЕЗ очищення чату)
window.logout = function() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        const previousUser = currentUser ? currentUser.username : null;
        
        currentUser = null;
        selectedUsername = null;
        localStorage.removeItem('halloween_user');
        
        // НЕ очищаємо історію чату - вона залишається для кожного користувача
        console.log(`👋 Користувач ${previousUser} вийшов (історія чату збережена)`);
        
        showLoginForm();
        setTimeout(() => {
            showMessage('Ви успішно вийшли з системи', 'success');
        }, 100);
    }
};

// Перевірка прав на зміну даних
function canModifyData() {
    if (!currentUser) return false;
    const role = window.getCurrentRole(currentUser.username);
    return role !== "Viewer";
}

// Перевірка прав на збереження в Firebase
function canSaveToFirebase() {
    if (!currentUser) return false;
    const role = window.getCurrentRole(currentUser.username);
    return role !== "Viewer";
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

console.log('✅ Login system завантажено (персональні чати збережені)');
