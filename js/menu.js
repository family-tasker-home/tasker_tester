// ===== WEEKLY MENU LOGIC =====

// Ініціалізація змінної
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

const mealIcons = {
    'Сніданок': '🌅',
    'Обід': '☀️',
    'Вечеря': '🌙',
    'Перекус': '🍎'
};

const predefinedDishes = {
    'Сніданки': [
        'Вівсянка з фруктами і горіхами',
        'Вівсянка з яблуками та медом',
        'Сирники зі сметаною або медом',
        'Млинці з медом, варенням, сиром, овочами, мясом',
        'Пластівці з молоком або йогуртом',
        'Фруктовий салат (яблуко + банан + груша + горіхи)',
        'Яєчня з овочами',
        'Яйця варені з тостами',
        'Омлет із зеленню, сиром, овочами'
    ],
    'Перші страви': [
        'Борщ (класичний або вегетаріанський)',
        'Курячий бульйон із локшиною',
        'Овочевий суп',
        'Гречаний суп',
        'Рисовий суп із куркою',
        'Пшоняний суп із морквою та цибулею'
    ],
    'Мясні страви': [
        'Гречка з відбивною',
        'Курячі котлети з гречкою або рисом',
        'Макарони з індичкою',
        'Макарони з сосисками',
        'Пшоняна каша з тушкованою свининою',
        'Булгур із куркою або індичкою',
        'Відварна картопля з котлетами',
        'Відбивна зі свинини або курки',
        'Пельмені зі сметаною або вершковим соусом'
    ],
    'Рибні страви': [
        'Печена картопля зі скумбрією',
        'Оселедець з відварною картоплею',
        'Рис із хеком або лососем на пару',
        'Макарони з тунцем',
        'Лосось на пару або запечений із овочами',
        'Скумбрія запечена з лимоном і зеленню'
    ],
    'Вегетаріанські страви': [
        'Вареники з картоплею, сиром, капустою',
        'Борщ без мяса',
        'Булгур або рис з овочами',
        'Млинці з овочами або сиром',
        'Сирники з медом',
        'Овочевий салат з яйцем',
        'Фруктовий салат з горіхами',
        'Картопля печена з зеленню',
        'Овочеве рагу'
    ],
    'Гарніри': [
        'Гречка',
        'Рис',
        'Булгур',
        'Пшоно',
        'Картопля печена',
        'Картопля варена',
        'Картопляне пюре',
        'Макарони',
        'Овочі тушковані',
        'Овочі на пару',
        'Овочі запечені'
    ],
    'Десерти / Перекуси': [
        'Млинці з варенням або шоколадом',
        'Сирники з медом',
        'Яблука',
        'Груші',
        'Банани',
        'Горіхи',
        'Сухофрукти',
        'Йогурт із пластівцями'
    ]
};

// Створення HTML структури секції
window.createMenuSection = function() {
    const section = document.getElementById('menu-section');
    
    const categoryIcons = {
        'Сніданки': '🌅',
        'Перші страви': '🍲',
        'Мясні страви': '🍖',
        'Рибні страви': '🐟',
        'Вегетаріанські страви': '🌿',
        'Гарніри': '🧂',
        'Десерти / Перекуски': '🍰'
    };
    
    const categoryOptions = Object.keys(predefinedDishes).map(category => 
        `<option value="${category}">${categoryIcons[category]} ${category}</option>`
    ).join('');
    
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>🍽️ Меню на тиждень</h1>
                <p>Плануйте свої страви на кожен день</p>
            </div>
            
            <div class="content">
                <div class="add-menu-section">
                    <h2>➕ Додати страву</h2>
                    <div class="add-menu-form">
                        <select id="menuDaySelect" title="День тижня">
                            <option value="Понеділок">Понеділок</option>
                            <option value="Вівторок">Вівторок</option>
                            <option value="Середа">Середа</option>
                            <option value="Четвер">Четвер</option>
                            <option value="П'ятниця">П'ятниця</option>
                            <option value="Субота">Субота</option>
                            <option value="Неділя">Неділя</option>
                        </select>
                        <select id="menuMealSelect" title="Прийом їжі">
                            <option value="Сніданок">🌅 Сніданок</option>
                            <option value="Обід">☀️ Обід</option>
                            <option value="Вечеря">🌙 Вечеря</option>
                            <option value="Перекус">🍎 Перекус</option>
                        </select>
                        <select id="menuCategorySelect" title="Категорія страви">
                            ${categoryOptions}
                        </select>
                        <select id="menuDishSelect" title="Назва страви">
                            <!-- Заповнюється динамічно -->
                        </select>
                        <input type="text" id="customDishInput" placeholder="Введіть свою страву..." style="display: none;">
                        <button onclick="window.addMeal()">Додати</button>
                    </div>
                </div>

                <div id="menuWeekList" class="tasks-grid">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8.1,13.34L5.64,11.59L4.16,13.35L8.1,16.64L16.84,9.23L15.36,7.47L8.1,13.34M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/>
                        </svg>
                        <p>Додайте страви до вашого тижневого меню</p>
                    </div>
                </div>

                <div class="action-buttons">
                    <button class="save-btn" onclick="window.saveMenuToFirebase()">
                        <span>☁️</span>
                        <span>Зберегти в хмару</span>
                    </button>
                    <button class="load-btn" onclick="window.loadMenuFromFirebase()">
                        <span>☁️</span>
                        <span>Завантажити з хмари</span>
                    </button>
                    <button class="clear-btn" onclick="window.clearWeek()">
                        <span>✕</span>
                        <span>Очистити меню</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Ініціалізація
    const categorySelect = document.getElementById('menuCategorySelect');
    if (categorySelect) {
        categorySelect.addEventListener('change', window.updateDishSelect);
        window.updateDishSelect();
    }
    
    const dishSelect = document.getElementById('menuDishSelect');
    if (dishSelect) {
        dishSelect.addEventListener('change', window.toggleCustomDish);
    }
    
    const customDishInput = document.getElementById('customDishInput');
    if (customDishInput) {
        customDishInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.addMeal();
            }
        });
    }
};

window.updateDishSelect = function() {
    const categorySelect = document.getElementById('menuCategorySelect');
    const dishSelect = document.getElementById('menuDishSelect');
    const customDishInput = document.getElementById('customDishInput');
    
    const category = categorySelect.value;
    const dishes = predefinedDishes[category] || [];
    
    dishSelect.innerHTML = dishes.map(dish => 
        `<option value="${dish}">${dish}</option>`
    ).join('') + '<option value="custom">✏️ Своя страва...</option>';
    
    customDishInput.style.display = 'none';
};

window.toggleCustomDish = function() {
    const dishSelect = document.getElementById('menuDishSelect');
    const customDishInput = document.getElementById('customDishInput');
    
    if (dishSelect.value === 'custom') {
        customDishInput.style.display = 'block';
        customDishInput.focus();
    } else {
        customDishInput.style.display = 'none';
    }
};

window.addMeal = function() {
    const daySelect = document.getElementById('menuDaySelect');
    const mealSelect = document.getElementById('menuMealSelect');
    const dishSelect = document.getElementById('menuDishSelect');
    const customDishInput = document.getElementById('customDishInput');
    
    const day = daySelect.value;
    const mealType = mealSelect.value;
    
    let dishName = '';
    if (dishSelect.value === 'custom') {
        dishName = customDishInput.value.trim();
    } else {
        dishName = dishSelect.value;
    }

    if (!dishName) {
        alert('Будь ласка, оберіть або введіть назву страви!');
        return;
    }

    if (!window.weeklyMenu[day][mealType]) {
        window.weeklyMenu[day][mealType] = [];
    }

    window.weeklyMenu[day][mealType].push({
        id: Date.now(),
        name: dishName
    });

    customDishInput.value = '';
    customDishInput.style.display = 'none';
    window.renderMenu();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

window.deleteMeal = function(day, mealType, mealId) {
    window.weeklyMenu[day][mealType] = window.weeklyMenu[day][mealType].filter(m => m.id !== mealId);
    
    if (window.weeklyMenu[day][mealType].length === 0) {
        delete window.weeklyMenu[day][mealType];
    }
    
    window.renderMenu();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

window.clearWeek = function() {
    if (confirm('Ви впевнені, що хочете очистити все меню на тиждень?')) {
        window.weeklyMenu = {
            'Понеділок': {},
            'Вівторок': {},
            'Середа': {},
            'Четвер': {},
            "П'ятниця": {},
            'Субота': {},
            'Неділя': {}
        };
        window.renderMenu();
        if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
        alert('Меню очищено!');
    }
};

window.renderMenu = function() {
    const container = document.getElementById('menuWeekList');
    
    if (!container) return;
    
    const days = Object.keys(window.weeklyMenu);
    
    const hasAnyMeals = days.some(day => Object.keys(window.weeklyMenu[day]).length > 0);
    
    if (!hasAnyMeals) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.1,13.34L5.64,11.59L4.16,13.35L8.1,16.64L16.84,9.23L15.36,7.47L8.1,13.34M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/>
                </svg>
                <p>Додайте страви до вашого тижневого меню</p>
            </div>
        `;
        return;
    }

    container.innerHTML = days.map(day => {
        const dayMeals = window.weeklyMenu[day];
        const mealTypes = Object.keys(dayMeals);
        
        const mealsHtml = mealTypes.length > 0 ? mealTypes.map(mealType => {
            const meals = dayMeals[mealType];
            const mealsListHtml = meals.map(meal => `
                <div class="meal-item">
                    <span class="meal-name">${meal.name}</span>
                    <button class="delete-meal-btn" onclick="window.deleteMeal('${day}', '${mealType}', ${meal.id})">✕</button>
                </div>
            `).join('');

            return `
                <div class="meal-group">
                    <div class="meal-title">
                        <span>${mealIcons[mealType]}</span>
                        <span>${mealType}</span>
                    </div>
                    ${mealsListHtml}
                </div>
            `;
        }).join('') : '<div class="empty-day">Страв ще не додано</div>';

        return `
            <div class="day-card">
                <div class="day-header">
                    <div class="day-title">${day}</div>
                </div>
                ${mealsHtml}
            </div>
        `;
    }).join('');
};
