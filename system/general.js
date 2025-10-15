// ===== GENERAL SITE LOGIC =====

// Створення основного додатку (викликається з login.js після входу)
window.createMainApp = function(currentUser, AVATARS) {
    const mainContent = document.getElementById('mainAppContent');
    
    if (!mainContent) {
        console.error('❌ mainAppContent не знайдено!');
        return;
    }
    
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
                    <button class="global-save-btn" onclick="window.saveAllToFirebase()" ${!window.canModifyData() ? 'disabled title="Тільки Dev може змінювати дані"' : ''}>
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
    initializeApp(currentUser, AVATARS);
};

// Ініціалізація основного додатку
function initializeApp(currentUser, AVATARS) {
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
        createAssistantSection(currentUser, AVATARS);
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

// Створення секції помічника
function createAssistantSection(currentUser, AVATARS) {
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

// Перемикання sidebar
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('visible');
    sidebar.classList.toggle('hidden');
};

// Показ секції
window.showSection = function(sectionName) {
    // Перевірка доступу до секції помічника
    if (sectionName === 'assistant') {
        const currentUser = window.currentUser ? window.currentUser() : null;
        if (!currentUser || currentUser.role !== 'Dev') {
            alert('❌ Доступ до помічника мають тільки користувачі з роллю Dev!');
            return;
        }
    }

    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) targetSection.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    if (event && event.target) {
        event.target.closest('.nav-item').classList.add('active');
    }

    if (sectionName === 'menu' && typeof window.renderMenu === 'function') {
        window.renderMenu();
    }

    if (window.innerWidth <= 768) {
        window.toggleSidebar();
    }
};

// Оновлені функції для перевірки прав доступу
window.checkSavePermissions = function() {
    if (!window.canSaveToFirebase()) {
        alert('❌ Тільки користувачі з роллю Dev можуть зберігати дані в хмару!');
        return false;
    }
    return true;
};

window.checkModifyPermissions = function() {
    if (!window.canModifyData()) {
        alert('❌ Тільки користувачі з роллю Dev можуть змінювати дані!');
        return false;
    }
    return true;
};

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎃 Кухонний Планувальник завантажується...');
    // Ініціалізація тепер керується системою автентифікації
});

console.log('✅ General system завантажено');
