// ===== GENERAL SITE LOGIC =====

window.createMainApp = function(currentUser, USERS) {
    const mainContent = document.getElementById('mainAppContent');
    
    if (!mainContent) {
        console.error('❌ mainAppContent не знайдено!');
        return;
    }
    
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : { role: currentUser.role };
    const todayRole = roleInfo.role || currentUser.role;
    const canModify = todayRole !== "Viewer";
    
    mainContent.innerHTML = `
        <!-- Sidebar Navigation -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2>🎃 Дім</h2>
                <div class="user-badge">
                    <span>${currentUser.avatar || '👤'} ${currentUser.name}</span>
                    <span class="role-badge role-${todayRole.toLowerCase()}">${todayRole}</span>
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
                <button class="nav-item" onclick="window.showSection('assistant')">
                    <span class="nav-icon">🤖</span>
                    <span>Помічник</span>
                </button>
                
                <div class="global-actions">
                    <button class="global-actions-logout" onclick="window.logout()">
                        <span>🚪</span>
                        <span>Вийти</span>
                    </button>
                </div>
            </nav>
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
    
    initializeApp(currentUser, USERS);
};

function initializeApp(currentUser, USERS) {
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
    
    if (typeof window.createDailySection === 'function') window.createDailySection();
    if (typeof window.createTasksSection === 'function') window.createTasksSection();
    if (typeof window.createMenuSection === 'function') window.createMenuSection();
    if (typeof window.createRecipesSection === 'function') window.createRecipesSection();
    if (typeof window.createSuppliesSection === 'function') window.createSuppliesSection();
    if (typeof window.createShopSection === 'function') window.createShopSection();
    
    createAssistantSection(currentUser, USERS);
    
    if (typeof window.initializeSupplies === 'function') {
        window.initializeSupplies();
        console.log('✅ Supplies ініціалізовано');
    }
    
    if (typeof window.loadFromCache === 'function') {
        window.loadFromCache();
    }
    
    setTimeout(() => {
        if (typeof window.renderDailySchedule === 'function') window.renderDailySchedule();
        if (typeof window.renderTasks === 'function') window.renderTasks();
        if (typeof window.renderMenu === 'function') window.renderMenu();
        if (typeof window.renderSupplies === 'function') window.renderSupplies();
        if (typeof window.renderList === 'function') window.renderList();
        
        console.log('✅ Всі рендер-функції виконано');
    }, 100);

    window.addEventListener('resize', function() {
        const sidebar = document.getElementById('sidebar');
        
        if (window.innerWidth > 768) {
            sidebar.classList.remove('hidden');
            sidebar.classList.remove('visible');
        } else {
            sidebar.classList.add('hidden');
        }
    });

    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.add('hidden');
    }
    
    console.log('✅ Кухонний Планувальник готовий до роботи!');
}

function createAssistantSection(currentUser, USERS) {
    const assistantSection = document.getElementById('assistant-section');
    if (!assistantSection) return;
    
    const userAvatar = currentUser.avatar || '👤';
    const userName = currentUser.name || 'Користувач';
    
    assistantSection.innerHTML = `
        <div id="assistant-content">
            <div class="chat-container">
                <div class="chat-header">
                    <h2><span class="jarvis-icon">🤖</span> Джарвіс - Кухонний Асистент</h2>
                    <div class="chat-user-info">
                        <span>Профіль: ${userAvatar} ${userName}</span>
                    </div>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                
                <!-- Voice Chat Panel -->
                <div class="voice-chat-panel">
                    <div class="voice-panel-header">
                        <div class="voice-panel-title">
                            <span class="icon">🎤</span>
                            <span>Голосовий режим</span>
                        </div>
                        <button class="voice-stop-btn" onclick="window.stopVoiceChat()">
                            🛑 Зупинити
                        </button>
                    </div>
                    
                    <div class="voice-status">
                        <div class="recording-indicator">
                            <div class="recording-dot"></div>
                            <span class="recording-text">ЗАПИС...</span>
                        </div>
                        <div class="voice-status-text">Говоріть зараз (макс. 30 сек)</div>
                        
                        <div class="voice-level-indicator">
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                        </div>
                    </div>
                    
                    <div class="voice-processing">
                        <div class="voice-processing-spinner"></div>
                        <div class="voice-processing-text">Обробка вашого голосу...</div>
                    </div>
                    
                    <div class="voice-instructions">
                        <strong>💡 Підказки:</strong><br>
                        • Говоріть чітко та не дуже швидко<br>
                        • Уникайте фонового шуму<br>
                        • Розмовляйте природньо, як з людиною<br>
                        • Можете давати команди ("додай запас", "що в меню")
                    </div>
                    
                    <div class="voice-api-info">
                        <span class="icon">🔑</span>
                        <span>Використовуються виділені ключі для голосу (API #6-10)</span>
                    </div>
                </div>
                
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <textarea 
                            id="chatInput" 
                            class="chat-input" 
                            placeholder="Напишіть повідомлення Джарвісу..."
                            onkeypress="window.handleKeyPress(event)"
                            rows="1"
                        ></textarea>
                        
                        <button class="voice-chat-btn" onclick="window.toggleVoiceChat()" title="Голосовий чат">
                            🎤
                        </button>
                        
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
    
    if (typeof window.initChat === 'function') {
        window.initChat();
    }
    
    if (typeof window.initVoiceSystem === 'function') {
        window.initVoiceSystem();
    }
}

window.toggleVoiceChat = function() {
    if (typeof isVoiceActive !== 'undefined' && isVoiceActive) {
        window.stopVoiceChat();
    } else {
        window.startVoiceChat();
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('visible');
    sidebar.classList.toggle('hidden');
};

window.showSection = function(sectionName) {
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

window.checkSavePermissions = function() {
    if (!window.canSaveToFirebase()) {
        const currentUser = window.currentUser ? window.currentUser() : null;
        if (currentUser) {
            const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : {};
            alert(`❌ У вас немає прав для збереження даних!\n\nВаша роль сьогодні: ${roleInfo.role || 'Viewer'}`);
        } else {
            alert('❌ Користувач не визначений!');
        }
        return false;
    }
    return true;
};

window.checkModifyPermissions = function() {
    if (!window.canModifyData()) {
        const currentUser = window.currentUser ? window.currentUser() : null;
        if (currentUser) {
            const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : {};
            alert(`❌ У вас немає прав для зміни даних!\n\nВаша роль сьогодні: ${roleInfo.role || 'Viewer'}`);
        } else {
            alert('❌ Користувач не визначений!');
        }
        return false;
    }
    return true;
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎃 Кухонний Планувальник завантажується...');
});

console.log('✅ General system завантажено з голосовою панеллю');
