// ===== CACHE MANAGEMENT =====
// Автоматичне збереження даних у LocalStorage

// Функція автоматичного збереження в кеш
window.autoSaveToCache = function() {
    try {
        // Зберігаємо розпорядок дня
        if (typeof window.dailySchedule !== 'undefined') {
            localStorage.setItem('dailySchedule', JSON.stringify(window.dailySchedule));
        }
        
        // Зберігаємо завдання (стара структура - для сумісності)
        if (typeof window.tasks !== 'undefined') {
            localStorage.setItem('tasks', JSON.stringify(window.tasks));
        }
        
        // Зберігаємо стан нових завдань
        if (typeof window.tasksState !== 'undefined') {
            localStorage.setItem('tasksState', JSON.stringify(window.tasksState));
        }
        
        // Зберігаємо меню
        if (typeof window.weeklyMenu !== 'undefined') {
            localStorage.setItem('weeklyMenu', JSON.stringify(window.weeklyMenu));
        }
        
        // Зберігаємо запаси
        if (typeof window.suppliesStatus !== 'undefined') {
            localStorage.setItem('suppliesStatus', JSON.stringify(window.suppliesStatus));
        }
        
        // Зберігаємо список покупок
        if (typeof window.shoppingList !== 'undefined') {
            localStorage.setItem('shoppingList', JSON.stringify(window.shoppingList));
        }
        
        // Зберігаємо час останнього збереження
        localStorage.setItem('lastCacheUpdate', new Date().toISOString());
        
        console.log('💾 Дані автоматично збережено в кеш');
    } catch (error) {
        console.error('❌ Помилка збереження в кеш:', error);
    }
};

// Функція завантаження з кешу
window.loadFromCache = function() {
    try {
        // Завантажуємо розпорядок дня
        const savedSchedule = localStorage.getItem('dailySchedule');
        if (savedSchedule) {
            window.dailySchedule = JSON.parse(savedSchedule);
            console.log('✅ Розпорядок дня завантажено з кешу');
        }
        
        // Завантажуємо завдання (стара структура)
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            window.tasks = JSON.parse(savedTasks);
            console.log('✅ Завдання завантажено з кешу');
        }
        
        // Завантажуємо стан нових завдань
        const savedTasksState = localStorage.getItem('tasksState');
        if (savedTasksState) {
            window.tasksState = JSON.parse(savedTasksState);
            console.log('✅ Стан завдань завантажено з кешу');
        }
        
        // Завантажуємо меню
        const savedMenu = localStorage.getItem('weeklyMenu');
        if (savedMenu) {
            window.weeklyMenu = JSON.parse(savedMenu);
            console.log('✅ Меню завантажено з кешу');
        }
        
        // Завантажуємо запаси
        const savedSupplies = localStorage.getItem('suppliesStatus');
        if (savedSupplies) {
            window.suppliesStatus = JSON.parse(savedSupplies);
            console.log('✅ Запаси завантажено з кешу');
        }
        
        // Завантажуємо список покупок
        const savedShopping = localStorage.getItem('shoppingList');
        if (savedShopping) {
            window.shoppingList = JSON.parse(savedShopping);
            console.log('✅ Список покупок завантажено з кешу');
        }
        
        // Показуємо час останнього збереження
        const lastUpdate = localStorage.getItem('lastCacheUpdate');
        if (lastUpdate) {
            const updateDate = new Date(lastUpdate);
            console.log(`📅 Останнє збереження: ${updateDate.toLocaleString('uk-UA')}`);
        }
        
    } catch (error) {
        console.error('❌ Помилка завантаження з кешу:', error);
    }
};

// Функція очищення кешу
window.clearCache = function() {
    if (!confirm('Ви впевнені, що хочете очистити весь кеш?\n\nВсі незбережені дані будуть втрачені!')) {
        return;
    }
    
    try {
        // Очищаємо всі дані
        localStorage.removeItem('dailySchedule');
        localStorage.removeItem('tasks');
        localStorage.removeItem('tasksState');
        localStorage.removeItem('weeklyMenu');
        localStorage.removeItem('suppliesStatus');
        localStorage.removeItem('shoppingList');
        localStorage.removeItem('lastCacheUpdate');
        
        // Ініціалізуємо порожні структури
        window.dailySchedule = [];
        window.tasks = [];
        window.tasksState = {};
        window.weeklyMenu = {
            'Понеділок': {},
            'Вівторок': {},
            'Середа': {},
            'Четвер': {},
            "П'ятниця": {},
            'Субота': {},
            'Неділя': {}
        };
        window.suppliesStatus = {};
        window.shoppingList = {};
        
        // Оновлюємо інтерфейс
        if (typeof window.renderDailySchedule === 'function') window.renderDailySchedule();
        if (typeof window.renderTasks === 'function') window.renderTasks();
        if (typeof window.renderMenu === 'function') window.renderMenu();
        if (typeof window.renderSupplies === 'function') window.renderSupplies();
        if (typeof window.renderList === 'function') window.renderList();
        
        alert('✅ Кеш успішно очищено!');
        console.log('🗑️ Кеш очищено');
    } catch (error) {
        console.error('❌ Помилка очищення кешу:', error);
        alert('❌ Помилка очищення кешу: ' + error.message);
    }
};

// Функція експорту даних
window.exportData = function() {
    try {
        const allData = {
            dailySchedule: window.dailySchedule || [],
            tasks: window.tasks || [],
            tasksState: window.tasksState || {},
            weeklyMenu: window.weeklyMenu || {},
            suppliesStatus: window.suppliesStatus || {},
            shoppingList: window.shoppingList || {},
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `halloween-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('📦 Дані експортовано');
        alert('✅ Дані успішно експортовано!');
    } catch (error) {
        console.error('❌ Помилка експорту:', error);
        alert('❌ Помилка експорту: ' + error.message);
    }
};

// Функція імпорту даних
window.importData = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                // Підтвердження
                if (!confirm('Імпортувати дані?\n\nПоточні дані будуть замінені!')) {
                    return;
                }
                
                // Імпортуємо дані
                if (data.dailySchedule) window.dailySchedule = data.dailySchedule;
                if (data.tasks) window.tasks = data.tasks;
                if (data.tasksState) window.tasksState = data.tasksState;
                if (data.weeklyMenu) window.weeklyMenu = data.weeklyMenu;
                if (data.suppliesStatus) window.suppliesStatus = data.suppliesStatus;
                if (data.shoppingList) window.shoppingList = data.shoppingList;
                
                // Зберігаємо в кеш
                window.autoSaveToCache();
                
                // Оновлюємо інтерфейс
                if (typeof window.renderDailySchedule === 'function') window.renderDailySchedule();
                if (typeof window.renderTasks === 'function') window.renderTasks();
                if (typeof window.renderMenu === 'function') window.renderMenu();
                if (typeof window.renderSupplies === 'function') window.renderSupplies();
                if (typeof window.renderList === 'function') window.renderList();
                
                alert('✅ Дані успішно імпортовано!');
                console.log('📥 Дані імпортовано');
            } catch (error) {
                console.error('❌ Помилка імпорту:', error);
                alert('❌ Помилка імпорту: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
};

// Автоматичне збереження кожні 30 секунд
setInterval(() => {
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
}, 30000);

console.log('✅ Cache management system завантажено (з підтримкою tasksState)');
