// ===== MENU SECTION LOGIC WITH PERSONAL MENUS =====

// Структура для зберігання меню всіх користувачів
if (typeof window.weeklyMenuState === 'undefined') {
    window.weeklyMenuState = {};
}

// Ініціалізація порожнього меню
function getEmptyWeekMenu() {
    return {
        'Понеділок': {},
        'Вівторок': {},
        'Середа': {},
        'Четвер': {},
        "П'ятниця": {},
        'Субота': {},
        'Неділя': {}
    };
}

// Отримати меню поточного користувача
function getUserMenu() {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return getEmptyWeekMenu();
    
    const username = currentUser.username;
    if (!window.weeklyMenuState[username]) {
        window.weeklyMenuState[username] = getEmptyWeekMenu();
    }
    
    return window.weeklyMenuState[username];
}

// Створення HTML структури секції
window.createMenuSection = function() {
    const section = document.getElementById('menu-section');
    
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        section.innerHTML = `
            <div class="container">
                <div class="header">
                    <h1>🍽️ Меню на тиждень</h1>
                    <p>Користувач не визначений</p>
                </div>
            </div>
        `;
        return;
    }
    
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : {};
    const isDev = roleInfo.role === 'Dev';
    
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>🍽️ Меню на тиждень</h1>
                <p>Профіль: <strong>${currentUser.avatar} ${currentUser.name}</strong></p>
                ${isDev ? `
                    <p style="color: #4CAF50; font-size: 0.9em; margin-top: 10px;">💾 Всі зміни автоматично зберігаються в базу</p>
                    <p style="color: #d0d0d0; font-size: 0.85em; margin-top: 5px; opacity: 0.8;">Це ваше персональне меню - тільки ви його бачите</p>
                ` : `
                    <p style="color: #ff6b6b; font-size: 0.9em; margin-top: 10px;">🔒 Редагування доступне тільки для Dev</p>
                    <p style="color: #d0d0d0; font-size: 0.85em; margin-top: 5px; opacity: 0.8;">Перегляд загального меню</p>
                `}
            </div>
            
            <div class="content">
                ${isDev ? `
                    <div class="add-menu-section">
                        <h2>➕ Додати страву</h2>
                        <form class="add-menu-form" onsubmit="window.addMenuItem(event)">
                            <select id="menuDay" required>
                                <option value="">Оберіть день</option>
                                <option value="Понеділок">Понеділок</option>
                                <option value="Вівторок">Вівторок</option>
                                <option value="Середа">Середа</option>
                                <option value="Четвер">Четвер</option>
                                <option value="П'ятниця">П'ятниця</option>
                                <option value="Субота">Субота</option>
                                <option value="Неділя">Неділя</option>
                            </select>
                            <select id="menuMeal" required>
                                <option value="">Оберіть прийом їжі</option>
                                <option value="🌅 Сніданок">🌅 Сніданок</option>
                                <option value="🌞 Обід">🌞 Обід</option>
                                <option value="🌙 Вечеря">🌙 Вечеря</option>
                            </select>
                            <input type="text" id="menuDish" placeholder="Назва страви" required>
                            <button type="submit">➕ Додати</button>
                        </form>
                    </div>
                ` : ''}
                
                <div class="days-grid" id="menuGrid"></div>
            </div>
        </div>
    `;
};

// Додати страву до меню
window.addMenuItem = function(event) {
    event.preventDefault();
    
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Користувач не визначений!');
        return;
    }
    
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : {};
    if (roleInfo.role !== 'Dev') {
        alert('❌ Тільки Dev може редагувати меню!');
        return;
    }
    
    const day = document.getElementById('menuDay').value;
    const meal = document.getElementById('menuMeal').value;
    const dish = document.getElementById('menuDish').value.trim();

    if (!day || !meal || !dish) {
        alert('Будь ласка, заповніть всі поля!');
        return;
    }

    const username = currentUser.username;
    if (!window.weeklyMenuState[username]) {
        window.weeklyMenuState[username] = getEmptyWeekMenu();
    }

    if (!window.weeklyMenuState[username][day]) {
        window.weeklyMenuState[username][day] = {};
    }

    window.weeklyMenuState[username][day][meal] = dish;

    // Очищаємо форму
    document.getElementById('menuDay').value = '';
    document.getElementById('menuMeal').value = '';
    document.getElementById('menuDish').value = '';

    window.renderMenu();
    
    console.log(`✅ Додано страву для ${username}:`, { day, meal, dish });
    
    // Автоматичне збереження в Firebase
    if (typeof window.autoSaveMenu === 'function') {
        window.autoSaveMenu();
    }
    
    // Додатково зберігаємо в локальний кеш
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
};

// Видалити страву з меню
window.deleteMenuItem = function(day, meal) {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Користувач не визначений!');
        return;
    }
    
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : {};
    if (roleInfo.role !== 'Dev') {
        alert('❌ Тільки Dev може редагувати меню!');
        return;
    }
    
    const username = currentUser.username;
    if (!window.weeklyMenuState[username]) return;
    
    if (window.weeklyMenuState[username][day] && window.weeklyMenuState[username][day][meal]) {
        const deletedDish = window.weeklyMenuState[username][day][meal];
        delete window.weeklyMenuState[username][day][meal];
        
        window.renderMenu();
        
        console.log(`🗑️ Видалено страву для ${username}:`, { day, meal, dish: deletedDish });
        
        // Автоматичне збереження в Firebase
        if (typeof window.autoSaveMenu === 'function') {
            window.autoSaveMenu();
        }
        
        // Додатково зберігаємо в локальний кеш
        if (typeof window.autoSaveToCache === 'function') {
            window.autoSaveToCache();
        }
    }
};

// Групування страв по типу (сніданок, обід, вечеря)
function groupMealsByType(dayMeals) {
    const grouped = {};
    for (const [mealType, dish] of Object.entries(dayMeals)) {
        if (!grouped[mealType]) {
            grouped[mealType] = [];
        }
        grouped[mealType].push(dish);
    }
    return grouped;
}

// Рендер меню на тиждень
window.renderMenu = function() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        grid.innerHTML = '<div class="empty-day">Користувач не визначений</div>';
        return;
    }
    
    const menu = getUserMenu();
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : {};
    const isDev = roleInfo.role === 'Dev';

    const days = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
    const dayEmojis = {
        'Понеділок': '🌙',
        'Вівторок': '🔥',
        'Середа': '⭐',
        'Четвер': '⚡',
        "П'ятниця": '🎉',
        'Субота': '🌈',
        'Неділя': '☀️'
    };

    grid.innerHTML = days.map(day => {
        const dayMeals = menu[day] || {};
        const meals = Object.entries(dayMeals);

        return `
            <div class="day-card">
                <div class="day-header">
                    <div class="day-title">${dayEmojis[day]} ${day}</div>
                </div>
                
                ${meals.length > 0 ? `
                    ${Object.entries(groupMealsByType(dayMeals)).map(([mealType, dishes]) => `
                        <div class="meal-group">
                            <div class="meal-title">${mealType}</div>
                            ${dishes.map(dish => `
                                <div class="meal-item">
                                    <span class="meal-name">${dish}</span>
                                    ${isDev ? `<button class="delete-meal-btn" onclick="window.deleteMenuItem('${day}', '${mealType}')">✕</button>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                ` : `
                    <div class="empty-day">
                        ${isDev ? 'Додайте страви для цього дня' : 'Меню не заповнене'}
                    </div>
                `}
            </div>
        `;
    }).join('');
    
    console.log(`📋 Відображено меню для ${currentUser.username}`);
};

// Експорт для Firebase (повертає меню ТІЛЬКИ поточного користувача)
window.getMenuForSave = function() {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return getEmptyWeekMenu();
    
    const username = currentUser.username;
    return window.weeklyMenuState[username] || getEmptyWeekMenu();
};

// Завантаження меню з Firebase (для поточного користувача)
window.loadMenuFromSave = function(username, data) {
    if (!username || !data) return;
    
    if (!window.weeklyMenuState) {
        window.weeklyMenuState = {};
    }
    
    window.weeklyMenuState[username] = data;
    
    // Рендеримо тільки якщо це поточний користувач
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (currentUser && currentUser.username === username) {
        window.renderMenu();
    }
    
    console.log(`✅ Меню завантажено для ${username}:`, data);
};

console.log('✅ Menu system завантажено (персоналізована версія з автозбереженням, Dev only)');
