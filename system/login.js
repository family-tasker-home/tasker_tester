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
            <!-- Main app content will be inserted here -->
            <div id="mainAppContent"></div>
        </div>
    `;
    
    // Ініціалізуємо основний додаток
    if (typeof window.createSiteStructure === 'function') {
        const mainContent = document.getElementById('mainAppContent');
        mainContent.innerHTML = `
            <!-- Sidebar Navigation -->
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h2>🎃 Кухонний Планувальник</h2>
                    <div class="user-badge">
                        <span>${AVATARS[currentUser.username] || '👤'} ${currentUser.name}</span>
                        <span class="role-badge role-${currentUser.role.toLowerCase()}">${currentUser.role}</span>
                    </div>
                    <button class="close-btn" onclick="window.toggleSidebar()">✕</button>
                </div>
                <nav class="sidebar-nav">
                    <button class="nav-item active" onclick="window.showSection('daily')">
                        <span class="nav-icon">📅</span>
                        <span>Розпорядок дня</span>
                    </button>
                    <button class="nav-item" onclick="window.showSection('tasks')">
                        <span class="nav-icon">🎯</span>
                        <span>Розподіл завдань</span>
                    </button>
                    <button class="nav-item" onclick="window.showSection('menu')">
                        <span class="nav-icon">🍽️</span>
                        <span>Меню на тиждень</span>
                    </button>
                    <button class="nav-item" onclick="window.showSection('recipes')">
                        <span class="nav-icon">📖</span>
                        <span>Книга рецептів</span>
                    </button>
                    <button class="nav-item" onclick="window.showSection('supplies')">
                        <span class="nav-icon">📦</span>
                        <span>Запаси</span>
                    </button>
                    <button class="nav-item" onclick="window.showSection('shop')">
                        <span class="nav-icon">🛒</span>
                        <span>Список покупок</span>
                    </button>
                    ${currentUser.role === 'Dev' ? `
                    <button class="nav-item" onclick="window.showSection('assistant')">
                        <span class="nav-icon">🤖</span>
                        <span>Помічник</span>
                    </button>
                    ` : ''}
                    
                    <!-- Global Save/Load Buttons -->
                    <div class="global-actions">
                        <button class="global-save-btn" onclick="window.saveAllToFirebase()" ${!canModifyData() ? 'disabled title="Тільки Dev може змінювати дані"' : ''}>
                            <span>☁️</span>
                            <span>Зберегти все</span>
                        </button>
                        <button class="global-load-btn" onclick="window.loadAllFromFirebase()">
                            <span>☁️</span>
                            <span>Завантажити все</span>
                        </button>
                        <button class="logout-btn" onclick="window.logout()">
                            <span>🚪</span>
                            <span>Вийти</span>
                        </button>
                    </div>
                </nav>
                <div class="sidebar-footer">
                    <p>👻 Spooky Planning 👻</p>
                    <p style="font-size: 0.8em; opacity: 0.7; margin-top: 5px;">Дані автоматично зберігаються в кеш</p>
                </div>
            </div>

            <!-- Menu Toggle Button -->
            <button class="menu-toggle" onclick="window.toggleSidebar()">
                <span>☰</span>
            </button>

            <!-- Main Content -->
            <div class="main-content" id="mainContent">
                <div class="section active" id="daily-section"></div>
                <div class="section" id="tasks-section"></div>
                <div class="section" id="menu-section"></div>
                <div class="section" id="recipes-section"></div>
                <div class="section" id="supplies-section"></div>
                <div class="section" id="shop-section"></div>
                <div class="section" id="assistant-section"></div>
            </div>
        `;
        
        // Ініціалізуємо додаток
        initializeApp();
    }
}

// Ініціалізація основного додатку
function initializeApp() {
    // Ініціалізація порожніх структур даних
    if (typeof window.dailySchedule === 'undefined') window.dailySchedule = [];
    if (typeof window.tasks === 'undefined') window.tasks = [];
    if (typeof window.weeklyMenu === 'undefined') {
        window.weeklyMenu = {
            'Понеділок': {},
            'Вівторок': {},
            'Середа': {},
            'Четвер': {},
            "П'ятниця": {},
            'Субота': {},
            'Неділя': {}
        };
    }
    if (typeof window.suppliesStatus === 'undefined') window.suppliesStatus = {};
    if (typeof window.shoppingList === 'undefined') window.shoppingList = {};
    
    // Створення HTML секцій
    if (typeof window.createDailySection === 'function') window.createDailySection();
    if (typeof window.createTasksSection === 'function') window.createTasksSection();
    if (typeof window.createMenuSection === 'function') window.createMenuSection();
    if (typeof window.createRecipesSection === 'function') window.createRecipesSection();
    if (typeof window.createSuppliesSection === 'function') window.createSuppliesSection();
    if (typeof window.createShopSection === 'function') window.createShopSection();
    
    // Створення секції помічника (тільки для Dev)
    if (currentUser && currentUser.role === 'Dev') {
        createAssistantSection();
    }
    
    // Ініціалізація запасів
    if (typeof window.initializeSupplies === 'function') {
        window.initializeSupplies();
        console.log('✅ Supplies ініціалізовано');
    }
    
    // Завантаження даних з кешу
    if (typeof window.loadFromCache === 'function') {
        window.loadFromCache();
    }
    
    // Рендер інтерфейсів
    setTimeout(() => {
        if (typeof window.renderDailySchedule === 'function') window.renderDailySchedule();
        if (typeof window.renderTasks === 'function') window.renderTasks();
        if (typeof window.renderMenu === 'function') window.renderMenu();
        if (typeof window.renderSupplies === 'function') window.renderSupplies();
        if (typeof window.renderList === 'function') window.renderList();
        
        console.log('✅ Всі рендер-функції виконано');
    }, 100);

    // Обробка зміни розміру вікна
    window.addEventListener('resize', function() {
        const sidebar = document.getElementById('sidebar');
        
        if (window.innerWidth > 768) {
            sidebar.classList.remove('hidden');
            sidebar.classList.remove('visible');
        } else {
            sidebar.classList.add('hidden');
        }
    });

    // Початковий стан для мобільних
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.add('hidden');
    }
    
    console.log('✅ Кухонний Планувальник готовий до роботи!');
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

// Оновлені функції для перевірки прав доступу
window.checkSavePermissions = function() {
    if (!canSaveToFirebase()) {
        alert('❌ Тільки користувачі з роллю Dev можуть зберігати дані в хмару!');
        return false;
    }
    return true;
};

window.checkModifyPermissions = function() {
    if (!canModifyData()) {
        alert('❌ Тільки користувачі з роллю Dev можуть змінювати дані!');
        return false;
    }
    return true;
};

// Створення секції помічника
function createAssistantSection() {
    const assistantSection = document.getElementById('assistant-section');
    if (!assistantSection) return;
    
    assistantSection.innerHTML = `
        <div id="assistant-content">
            <div class="chat-container">
                <div class="chat-header">
                    <h2><span class="jarvis-icon">🤖</span> Джарвіс - Кухонний Асистент</h2>
                    <div class="chat-user-info">
                        <span>Профіль: ${AVATARS[currentUser.username] || '👤'} ${currentUser.name}</span>
                    </div>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <textarea 
                            id="chatInput" 
                            class="chat-input" 
                            placeholder="Напишіть повідомлення Джарвісу..."
                            onkeypress="window.handleKeyPress(event)"
                            rows="1"
                        ></textarea>
                        <button class="chat-send-btn" onclick="window.sendMessage()">
                            <span>📤</span>
                        </button>
                    </div>
                    <div class="chat-controls">
                        <button class="chat-clear-btn" onclick="window.clearChat()">
                            🗑️ Очистити чат
                        </button>
                        <div class="chat-status online">
                            <span>🟢</span> Онлайн
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Ініціалізуємо чат
    if (typeof window.initChat === 'function') {
        window.initChat();
    }
}

// Експорт функцій для глобального використання
window.canModifyData = canModifyData;
window.canSaveToFirebase = canSaveToFirebase;
window.currentUser = () => currentUser;

console.log('✅ Login system завантажено');
