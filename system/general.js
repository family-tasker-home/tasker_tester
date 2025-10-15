// ===== GENERAL SITE LOGIC =====

// Створення структури сайту
function createSiteStructure() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <!-- Sidebar Navigation -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h2>🎃 Halloween Planner</h2>
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
                
                <!-- Global Save/Load Buttons -->
                <div class="global-actions">
                    <button class="global-save-btn" onclick="window.saveAllToFirebase()">
                        <span>☁️</span>
                        <span>Зберегти все</span>
                    </button>
                    <button class="global-load-btn" onclick="window.loadAllFromFirebase()">
                        <span>☁️</span>
                        <span>Завантажити все</span>
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
            <!-- Секції створюються динамічно -->
            <div class="section active" id="daily-section"></div>
            <div class="section" id="tasks-section"></div>
            <div class="section" id="menu-section"></div>
            <div class="section" id="recipes-section"></div>
            <div class="section" id="supplies-section"></div>
            <div class="section" id="shop-section"></div>
        </div>
    `;
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

// Створення структури сайту (викликається з login.js)
window.createSiteStructure = createSiteStructure;

// Ініціалізація при завантаженні сторінки (тепер керується login.js)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎃 Halloween Planner завантажується...');
    // Ініціалізація тепер керується системою автентифікації
});
