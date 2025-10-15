// ===== SUPPLIES LOGIC =====

// Ініціалізація змінної
if (typeof window.suppliesStatus === 'undefined') {
    window.suppliesStatus = {};
}

// Функція для очищення ключів від заборонених символів Firebase
function sanitizeFirebaseKey(key) {
    if (typeof key !== 'string') return key;
    return key.replace(/[.#$/[\]]/g, '_');
}

// Категорії з безпечними ключами для Firebase
const suppliesCategories = {
    'meat_fish': {
        display: '🥩 Мясо та риба',
        items: ['Куряче філе або стегна', 'Свинина','Відбивна','Котлети', 'Індичка (філе)', 'Лосось (свіжий або заморожений)', 'Хек / минтай (заморожений)', 'Скумбрія (свіжа або солена)', 'Оселедець (філе або слабосолений)', 'Консервований тунець / сардини','Пельмені (заморожені)']
    },
    'eggs_dairy': {
        display: '🥚 Яйця, молочне, сир',
        items: ['Яйця', 'Молоко (свіже або сухе)', 'Сметана', 'Сир кисломолочний', 'Йогурт натуральний', 'Масло вершкове', 'Вершки кулінарні', 'Сир твердий (типу гауда, моцарела)']
    },
    'grains_pasta': {
        display: '🌾 Крупи, борошно, макарони',
        items: ['Вівсянка', 'Гречка', 'Рис', 'Булгур', 'Пшоно', 'Манка', 'Кус-кус (додатково, якщо любиш)', 'Макарони (різних видів)','Птітім', 'Борошно пшеничне', 'Панірувальні сухарі', 'Крохмаль (для сирників, соусів)']
    },
    'vegetables': {
        display: '🧅 Овочі (свіжі / заморожені)',
        items: ['Картопля', 'Морква', 'Цибуля', 'Буряк', 'Капуста (свіжа або квашена)', 'Помідори', 'Огірки', 'Болгарський перець', 'Часник', 'Зелень (кріп, петрушка, цибуля зелена)', 'Заморожена овочева суміш', 'Кабачки / баклажани (за бажанням)']
    },
    'fruits_nuts': {
        display: '🍏 Фрукти, горіхи, солодощі',
        items: ['Яблука', 'Банани', 'Груші', 'Сезонні ягоди (свіжі або заморожені)', 'Горіхи (волоські, мигдаль, кеш\'ю)', 'Сухофрукти (курага, родзинки, чорнослив)', 'Мед', 'Варення', 'Шоколад (чорний або молочний — для млинців, десертів)']
    },
    'spices_oils': {
        display: '🧂 Спеції, олії, соуси',
        items: ['Сіль', 'Перець чорний (мелений і горошком)', 'Паприка', 'Куркума', 'Лавровий лист', 'Базилік, орегано, розмарин', 'Приправа до риби', 'Приправа до картоплі', 'Приправа до м\'яса', 'Рослинна олія (соняшникова / оливкова)', 'Соєвий соус', 'Кетчуп / томатна паста', 'Майонез', 'Гірчиця', 'Оцет (яблучний або звичайний)']
    },
    'bread_bakery': {
        display: '🥖 Хліб, випічка, снеки',
        items: ['Хліб пшеничний', 'Хліб житній', 'Батони / булочки', 'Сухарики', 'Галети або крекери', 'Лаваш / тортильї']
    },
    'beverages': {
        display: '🍶 Напої',
        items: ['Вода питна (бутильована або фільтрована)', 'Чай чорний', 'Чай зелений', 'Кава мелена / розчинна', 'Какао / гарячий шоколад', 'Соки', 'Компоти']
    },
    'canned_goods': {
        display: '🧃 Консерви та довготривалі продукти',
        items: ['Консервований горошок', 'Кукурудза', 'Квасоля в банках', 'Томатна паста', 'Оливки / маслини', 'Консервовані гриби', 'Тушонка (на екстрений випадок)']
    },
    'baking_supplies': {
        display: '🍯 Додаткові продукти для випічки / десертів',
        items: ['Цукор', 'Ванільний цукор', 'Розпушувач тіста', 'Какао', 'Медові коржі / печиво (для швидких десертів)', 'Сухе молоко (запас для випічки)']
    }
};

// Створення HTML структури секції
window.createSuppliesSection = function() {
    const section = document.getElementById('supplies-section');
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>📦 Запаси</h1>
                <p>Відстежуйте наявність продуктів вдома</p>
            </div>
            
            <div class="content">
                <div class="supplies-legend">
                    <div class="legend-item">
                        <span class="legend-icon">🟢</span>
                        <span>Є вдома</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-icon">🟡</span>
                        <span>Мало залишилось</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-icon">🔴</span>
                        <span>Потрібно купити</span>
                    </div>
                </div>

                <div id="suppliesList" class="supplies-categories">
                    <!-- Заповнюється динамічно -->
                </div>

                <div class="action-buttons">
                    <button class="download-btn" onclick="window.addToShoppingList()">
                        <span>🛒</span>
                        <span>Додати в список покупок</span>
                    </button>
                    <button class="save-btn" onclick="window.saveSuppliestoFirebase()">
                        <span>☁️</span>
                        <span>Зберегти в хмару</span>
                    </button>
                    <button class="load-btn" onclick="window.loadSuppliesFromFirebase()">
                        <span>☁️</span>
                        <span>Завантажити з хмари</span>
                    </button>
                </div>
            </div>
        </div>
    `;
};

window.initializeSupplies = function() {
    if (!window.suppliesStatus) {
        window.suppliesStatus = {};
    }
    
    Object.keys(suppliesCategories).forEach(categoryKey => {
        if (!window.suppliesStatus[categoryKey]) {
            window.suppliesStatus[categoryKey] = {};
        }
        suppliesCategories[categoryKey].items.forEach(item => {
            if (window.suppliesStatus[categoryKey][item] === undefined) {
                window.suppliesStatus[categoryKey][item] = null;
            }
        });
    });
};

window.setSupplyStatus = function(categoryKey, item, status) {
    // Перевірка існування категорії
    if (!window.suppliesStatus[categoryKey]) {
        window.suppliesStatus[categoryKey] = {};
    }
    
    // Перевірка існування товару
    if (!window.suppliesStatus[categoryKey][item]) {
        window.suppliesStatus[categoryKey][item] = null;
    }
    
    if (window.suppliesStatus[categoryKey][item] === status) {
        window.suppliesStatus[categoryKey][item] = null;
    } else {
        window.suppliesStatus[categoryKey][item] = status;
    }
    window.renderSupplies();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

window.renderSupplies = function() {
    const container = document.getElementById('suppliesList');
    
    if (!container) return;
    
    container.innerHTML = Object.keys(suppliesCategories).map(categoryKey => {
        const category = suppliesCategories[categoryKey];
        const items = category.items;
        
        const itemsHtml = items.map(item => {
            // Безпечна перевірка існування даних
            let status = null;
            if (window.suppliesStatus && window.suppliesStatus[categoryKey]) {
                // Перевіряємо як оригінальний ключ, так і очищений
                const originalKey = item;
                const sanitizedKey = sanitizeFirebaseKey(item);
                
                if (window.suppliesStatus[categoryKey][originalKey]) {
                    status = window.suppliesStatus[categoryKey][originalKey];
                } else if (window.suppliesStatus[categoryKey][sanitizedKey]) {
                    status = window.suppliesStatus[categoryKey][sanitizedKey];
                }
            }
            
            const escapedItem = item.replace(/'/g, "\\'");
            
            return `
                <div class="supply-item">
                    <span class="supply-name">${item}</span>
                    <div class="supply-status-buttons">
                        <button class="supply-status-btn ${status === 'available' ? 'active' : ''}" onclick="window.setSupplyStatus('${categoryKey}', '${escapedItem}', 'available')" title="Є вдома">🟢</button>
                        <button class="supply-status-btn ${status === 'low' ? 'active' : ''}" onclick="window.setSupplyStatus('${categoryKey}', '${escapedItem}', 'low')" title="Мало залишилось">🟡</button>
                        <button class="supply-status-btn ${status === 'needed' ? 'active' : ''}" onclick="window.setSupplyStatus('${categoryKey}', '${escapedItem}', 'needed')" title="Потрібно купити">🔴</button>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="supply-category">
                <div class="supply-category-header"><h3>${category.display}</h3></div>
                <div class="supply-items">${itemsHtml}</div>
            </div>
        `;
    }).join('');
};

window.addToShoppingList = function() {
    let itemsToAdd = [];
    
    Object.keys(window.suppliesStatus).forEach(categoryKey => {
        Object.keys(window.suppliesStatus[categoryKey]).forEach(item => {
            const status = window.suppliesStatus[categoryKey][item];
            if (status === 'low' || status === 'needed') {
                // Знаходимо оригінальну назву товару в категорії
                const originalItem = suppliesCategories[categoryKey]?.items.find(original => 
                    original === item || sanitizeFirebaseKey(original) === item
                ) || item;
                itemsToAdd.push({ name: originalItem, categoryKey: categoryKey });
            }
        });
    });
    
    if (itemsToAdd.length === 0) {
        alert('Немає товарів для додавання до списку покупок!\n\nПозначте товари жовтим (🟡) або червоним (🔴) кольором.');
        return;
    }
    
    // Мапінг безпечних ключів до категорій списку покупок
    const categoryMapping = {
        'meat_fish': '🍖 Мясо та риба',
        'eggs_dairy': '🥛 Молочні продукти',
        'grains_pasta': '🍝 Бакалія',
        'vegetables': '🥗 Овочі та фрукти',
        'fruits_nuts': '🥗 Овочі та фрукти',
        'spices_oils': '🍝 Бакалія',
        'bread_bakery': '🥖 Хліб та випічка',
        'beverages': '🥤 Напої',
        'canned_goods': '🍝 Бакалія',
        'baking_supplies': '🍝 Бакалія'
    };
    
    if (typeof window.shoppingList !== 'undefined') {
        itemsToAdd.forEach(item => {
            const shopCategory = categoryMapping[item.categoryKey] || '📦 Інше';
            
            if (!window.shoppingList[shopCategory]) window.shoppingList[shopCategory] = [];
            
            const exists = window.shoppingList[shopCategory].some(shopItem => 
                shopItem.name.toLowerCase() === item.name.toLowerCase()
            );
            
            if (!exists) {
                window.shoppingList[shopCategory].push({
                    id: Date.now() + Math.random(),
                    name: item.name,
                    checked: false
                });
            }
        });
        
        if (typeof window.renderList === 'function') window.renderList();
        if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
        
        alert(`Додано ${itemsToAdd.length} товарів до списку покупок!`);
    } else {
        alert('Помилка: список покупок не завантажено!');
    }
};
