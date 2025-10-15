// ===== SHOPPING LIST LOGIC =====

// Ініціалізація змінної
if (typeof window.shoppingList === 'undefined') {
    window.shoppingList = {};
}

// Перевірка прав на редагування списку покупок
function canEditShopping() {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return false;
    
    const role = window.getCurrentRole ? window.getCurrentRole(currentUser.username) : null;
    const editRoles = ['Dev', 'Кухня', 'Кладовка', 'Ванна'];
    return editRoles.includes(role);
}

// Створення HTML структури секції
window.createShopSection = function() {
    const section = document.getElementById('shop-section');
    const canEdit = canEditShopping();
    
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>🛒 Список покупок</h1>
                <p>Організуйте свої покупки за категоріями</p>
                ${!canEdit ? '<p style="color: #ff6b6b; font-size: 0.9em; margin-top: 10px;">🔒 Перегляд доступен, редагування обмежено</p>' : ''}
            </div>
            
            <div class="content">
                <div class="action-buttons-top">
                    <button class="action-btn action-btn-secondary" onclick="window.clearChecked()" ${!canEdit ? 'disabled title="Редагування недоступне"' : ''}>
                        <span>✓</span>
                        <span>Видалити куплене</span>
                    </button>
                </div>

                ${canEdit ? `
                    <div class="add-item-section">
                        <h2>➕ Додати товар</h2>
                        <div class="add-item-form">
                            <input type="text" id="itemNameInput" placeholder="Назва товару...">
                            <select id="categorySelect">
                                <option value="🥗 Овочі та фрукти">🥗 Овочі та фрукти</option>
                                <option value="🥖 Хліб та випічка">🥖 Хліб та випічка</option>
                                <option value="🥛 Молочні продукти">🥛 Молочні продукти</option>
                                <option value="🍖 Мясо та риба">🍖 Мясо та риба</option>
                                <option value="🍝 Бакалія">🍝 Бакалія</option>
                                <option value="🧊 Заморожені продукти">🧊 Заморожені продукти</option>
                                <option value="🧴 Побутова хімія">🧴 Побутова хімія</option>
                                <option value="💊 Гігієна та здоровя">💊 Гігієна та здоровя</option>
                                <option value="🍪 Солодощі та снеки">🍪 Солодощі та снеки</option>
                                <option value="🥤 Напої">🥤 Напої</option>
                                <option value="📦 Інше">📦 Інше</option>
                            </select>
                            <button onclick="window.addItem()">Додати</button>
                        </div>
                    </div>
                ` : ''}

                <div id="categoriesList" class="categories-grid">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18M16,11L18.78,6H6.14L8.5,11H16Z"/>
                        </svg>
                        <p>Додайте свій перший товар до списку</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Додаємо обробник Enter для поля вводу
    const itemInput = document.getElementById('itemNameInput');
    if (itemInput) {
        itemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.addItem();
            }
        });
    }
};

// Додати новий товар
window.addItem = function() {
    if (!canEditShopping()) {
        alert('❌ У вас немає прав редагування списку покупок!');
        return;
    }
    
    const nameInput = document.getElementById('itemNameInput');
    const categorySelect = document.getElementById('categorySelect');
    
    if (!nameInput || !categorySelect) return;
    
    const itemName = nameInput.value.trim();
    const category = categorySelect.value;

    if (!itemName) {
        alert('Будь ласка, введіть назву товару!');
        return;
    }

    if (!window.shoppingList[category]) {
        window.shoppingList[category] = [];
    }

    window.shoppingList[category].push({
        id: Date.now(),
        name: itemName,
        checked: false
    });

    nameInput.value = '';
    window.renderList();
    
    // Автозбереження
    if (typeof window.autoSaveShoppingList === 'function') {
        window.autoSaveShoppingList();
    }
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
};

// Перемкнути стан товару (куплено/не куплено)
window.toggleItem = function(category, itemId) {
    if (!canEditShopping()) {
        return;
    }
    
    const item = window.shoppingList[category].find(i => i.id === itemId);
    if (item) {
        item.checked = !item.checked;
        window.renderList();
        
        // Автозбереження
        if (typeof window.autoSaveShoppingList === 'function') {
            window.autoSaveShoppingList();
        }
        if (typeof window.autoSaveToCache === 'function') {
            window.autoSaveToCache();
        }
    }
};

// Видалити конкретний товар
window.deleteItem = function(category, itemId) {
    if (!canEditShopping()) {
        alert('❌ У вас немає прав редагування списку покупок!');
        return;
    }
    
    window.shoppingList[category] = window.shoppingList[category].filter(i => i.id !== itemId);
    if (window.shoppingList[category].length === 0) {
        delete window.shoppingList[category];
    }
    window.renderList();
    
    // Автозбереження
    if (typeof window.autoSaveShoppingList === 'function') {
        window.autoSaveShoppingList();
    }
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
};

// Очистити всі куплені товари
window.clearChecked = function() {
    if (!canEditShopping()) {
        alert('❌ У вас немає прав редагування списку покупок!');
        return;
    }
    
    let clearedCount = 0;
    for (const category in window.shoppingList) {
        const before = window.shoppingList[category].length;
        window.shoppingList[category] = window.shoppingList[category].filter(item => !item.checked);
        clearedCount += before - window.shoppingList[category].length;
        
        if (window.shoppingList[category].length === 0) {
            delete window.shoppingList[category];
        }
    }
    
    if (clearedCount > 0) {
        alert(`✅ Видалено ${clearedCount} куплених товарів`);
        window.renderList();
        
        // Автозбереження
        if (typeof window.autoSaveShoppingList === 'function') {
            window.autoSaveShoppingList();
        }
        if (typeof window.autoSaveToCache === 'function') {
            window.autoSaveToCache();
        }
    } else {
        alert('Немає відмічених товарів для видалення');
    }
};

// Рендер списку покупок
window.renderList = function() {
    const container = document.getElementById('categoriesList');
    const canEdit = canEditShopping();

    if (!container) return;

    const categories = Object.keys(window.shoppingList);

    if (categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18M16,11L18.78,6H6.14L8.5,11H16Z"/>
                </svg>
                <p>Додайте свій перший товар до списку</p>
            </div>
        `;
        return;
    }

    container.innerHTML = categories.map(category => {
        const items = window.shoppingList[category];
        const icon = category.split(' ')[0];
        const title = category.substring(category.indexOf(' ') + 1);

        const itemsHtml = items.length > 0 ? items.map(item => `
            <div class="item ${item.checked ? 'checked' : ''}">
                <input 
                    type="checkbox" 
                    ${item.checked ? 'checked' : ''}
                    onchange="window.toggleItem('${category}', ${item.id})"
                    ${!canEdit ? 'disabled' : ''}
                >
                <span class="item-name">${item.name}</span>
                <button class="delete-item-btn" onclick="window.deleteItem('${category}', ${item.id})" ${!canEdit ? 'disabled' : ''}>✕</button>
            </div>
        `).join('') : '<div class="empty-category">Немає товарів</div>';

        return `
            <div class="category-card">
                <div class="category-header">
                    <span class="category-icon">${icon}</span>
                    <span class="category-title">${title}</span>
                    <span class="category-count">${items.length}</span>
                </div>
                <div class="items-list">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }).join('');
};

console.log('✅ Shopping list system завантажено (з правами доступу та авто-збереженням)');
