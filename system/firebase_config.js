// ===== FIREBASE CONFIGURATION =====

const firebaseConfig = {
    apiKey: "AIzaSyBDpCzT9SzSJptn0LqPYP-CjRGn6p-JbW0",
    authDomain: "halloween-planner.firebaseapp.com",
    databaseURL: "https://halloween-planner-default-rtdb.firebaseio.com",
    projectId: "halloween-planner",
    storageBucket: "halloween-planner.firebasestorage.app",
    messagingSenderId: "841307055659",
    appId: "1:841307055659:web:c8713c25b29e3f908fac6e",
    measurementId: "G-WZ5HN8E1T2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Secret code for saving/loading
const SECRET_CODE = "1111";

// ===== LOCAL STORAGE (CACHE) FUNCTIONS =====

function saveToCache() {
    try {
        const data = {
            dailySchedule: typeof window.dailySchedule !== 'undefined' ? window.dailySchedule : [],
            tasks: typeof window.tasks !== 'undefined' ? window.tasks : [],
            weeklyMenu: typeof window.weeklyMenu !== 'undefined' ? window.weeklyMenu : {},
            suppliesStatus: typeof window.suppliesStatus !== 'undefined' ? window.suppliesStatus : {},
            shoppingList: typeof window.shoppingList !== 'undefined' ? window.shoppingList : {}
        };
        
        localStorage.setItem('halloween_dailySchedule', JSON.stringify(data.dailySchedule));
        localStorage.setItem('halloween_tasks', JSON.stringify(data.tasks));
        localStorage.setItem('halloween_weeklyMenu', JSON.stringify(data.weeklyMenu));
        localStorage.setItem('halloween_suppliesStatus', JSON.stringify(data.suppliesStatus));
        localStorage.setItem('halloween_shoppingList', JSON.stringify(data.shoppingList));
        
        console.log('✅ Дані збережено в кеш');
    } catch (error) {
        console.error('❌ Помилка збереження в кеш:', error);
    }
}

function loadFromCache() {
    try {
        // Daily Schedule
        const cachedDaily = localStorage.getItem('halloween_dailySchedule');
        if (cachedDaily && cachedDaily !== 'undefined' && cachedDaily !== 'null') {
            try {
                const parsed = JSON.parse(cachedDaily);
                if (Array.isArray(parsed)) {
                    window.dailySchedule = parsed;
                    console.log('✅ Daily schedule завантажено з кешу');
                }
            } catch (e) {
                console.error('Помилка парсингу dailySchedule:', e);
            }
        }

        // Tasks
        const cachedTasks = localStorage.getItem('halloween_tasks');
        if (cachedTasks && cachedTasks !== 'undefined' && cachedTasks !== 'null') {
            try {
                const parsed = JSON.parse(cachedTasks);
                if (Array.isArray(parsed)) {
                    window.tasks = parsed;
                    console.log('✅ Tasks завантажено з кешу');
                }
            } catch (e) {
                console.error('Помилка парсингу tasks:', e);
            }
        }

        // Weekly Menu
        const cachedMenu = localStorage.getItem('halloween_weeklyMenu');
        if (cachedMenu && cachedMenu !== 'undefined' && cachedMenu !== 'null') {
            try {
                const parsed = JSON.parse(cachedMenu);
                if (parsed && typeof parsed === 'object') {
                    window.weeklyMenu = parsed;
                    console.log('✅ Weekly menu завантажено з кешу');
                }
            } catch (e) {
                console.error('Помилка парсингу weeklyMenu:', e);
            }
        }

        // Supplies Status
        const cachedSupplies = localStorage.getItem('halloween_suppliesStatus');
        if (cachedSupplies && cachedSupplies !== 'undefined' && cachedSupplies !== 'null') {
            try {
                const parsed = JSON.parse(cachedSupplies);
                if (parsed && typeof parsed === 'object') {
                    window.suppliesStatus = parsed;
                    console.log('✅ Supplies завантажено з кешу');
                }
            } catch (e) {
                console.error('Помилка парсингу suppliesStatus:', e);
            }
        }

        // Shopping List
        const cachedShop = localStorage.getItem('halloween_shoppingList');
        if (cachedShop && cachedShop !== 'undefined' && cachedShop !== 'null') {
            try {
                const parsed = JSON.parse(cachedShop);
                if (parsed && typeof parsed === 'object') {
                    window.shoppingList = parsed;
                    console.log('✅ Shopping list завантажено з кешу');
                }
            } catch (e) {
                console.error('Помилка парсингу shoppingList:', e);
            }
        }

        console.log('✅ Завантаження з кешу завершено');
    } catch (error) {
        console.error('❌ Помилка завантаження з кешу:', error);
    }
}

function autoSaveToCache() {
    saveToCache();
}

// ===== UTILITY FUNCTIONS =====

// Функція для очищення ключів від заборонених символів Firebase
function sanitizeFirebaseKey(key) {
    if (typeof key !== 'string') return key;
    return key.replace(/[.#$/[\]]/g, '_');
}

// Функція для очищення об'єкта з вкладеними ключами
function sanitizeFirebaseObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeFirebaseObject);
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        const cleanKey = sanitizeFirebaseKey(key);
        sanitized[cleanKey] = sanitizeFirebaseObject(value);
    }
    return sanitized;
}

// Функція для відновлення оригінальних ключів (для сумісності з існуючими даними)
function restoreOriginalKeys(obj, originalKeys) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => restoreOriginalKeys(item, originalKeys));
    
    const restored = {};
    for (const [key, value] of Object.entries(obj)) {
        // Якщо є мапінг для цього ключа, використовуємо оригінальний
        const originalKey = originalKeys[key] || key;
        restored[originalKey] = restoreOriginalKeys(value, originalKeys);
    }
    return restored;
}

// ===== GLOBAL SAVE/LOAD FUNCTIONS =====

window.saveAllToFirebase = function() {
    // Перевірка прав доступу - тільки Dev користувачі можуть зберігати
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser || currentUser.role !== 'Dev') {
        alert('❌ Тільки користувачі з роллю Dev можуть зберігати дані в хмару!');
        return;
    }
    
    const code = prompt("Введіть код для збереження всіх даних:");
    if (code !== SECRET_CODE) {
        alert("❌ Неправильний код!");
        return;
    }

    const btn = event ? event.target : null;
    const originalText = btn ? btn.textContent : '';
    
    if (btn) {
        btn.textContent = '⏳ Збереження...';
        btn.disabled = true;
    }

    const allData = {
        dailySchedule: window.dailySchedule || [],
        tasks: window.tasks || [],
        weeklyMenu: window.weeklyMenu || {},
        supplies: sanitizeFirebaseObject(window.suppliesStatus || {}),
        shoppingList: window.shoppingList || {},
        lastUpdated: new Date().toISOString()
    };

    database.ref('allData').set(allData)
        .then(() => {
            saveToCache();
            alert("✅ Всі дані збережено в хмару та кеш!");
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        })
        .catch((error) => {
            alert("❌ Помилка збереження: " + error.message);
            console.error("Firebase error:", error);
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
};

window.loadAllFromFirebase = function() {
    // Завантаження доступне всім автентифікованим користувачам (без коду)
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Потрібно увійти в систему!');
        return;
    }

    const confirmation = confirm("Завантажити всі дані з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    const btn = event ? event.target : null;
    const originalText = btn ? btn.textContent : '';
    
    if (btn) {
        btn.textContent = '⏳ Завантаження...';
        btn.disabled = true;
    }

    database.ref('allData').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                if (data.dailySchedule && Array.isArray(data.dailySchedule)) {
                    window.dailySchedule = data.dailySchedule;
                    if (typeof window.renderDailySchedule === 'function') {
                        window.renderDailySchedule();
                    }
                }

                if (data.tasks && Array.isArray(data.tasks)) {
                    window.tasks = data.tasks;
                    if (typeof window.renderTasks === 'function') {
                        window.renderTasks();
                    }
                }

                if (data.weeklyMenu && typeof data.weeklyMenu === 'object') {
                    window.weeklyMenu = data.weeklyMenu;
                    if (typeof window.renderMenu === 'function') {
                        window.renderMenu();
                    }
                }

                if (data.supplies && typeof data.supplies === 'object') {
                    // Дані вже очищені при збереженні, тому використовуємо їх як є
                    window.suppliesStatus = data.supplies;
                    if (typeof window.renderSupplies === 'function') {
                        window.renderSupplies();
                    }
                }

                if (data.shoppingList && typeof data.shoppingList === 'object') {
                    window.shoppingList = data.shoppingList;
                    if (typeof window.renderList === 'function') {
                        window.renderList();
                    }
                }

                saveToCache();
                
                const lastUpdated = data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('uk-UA') : 'невідомо';
                alert(`✅ Всі дані завантажено з хмари!\n\nОстаннє оновлення: ${lastUpdated}`);
                
                if (btn) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            } else {
                alert("Немає збережених даних у хмарі!");
                if (btn) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            }
        })
        .catch((error) => {
            alert("❌ Помилка завантаження: " + error.message);
            console.error("Firebase error:", error);
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
};

// ===== INDIVIDUAL SAVE/LOAD FUNCTIONS =====

window.saveDailyToFirebase = function() {
    // Перевірка прав доступу - тільки Dev користувачі можуть зберігати
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser || currentUser.role !== 'Dev') {
        alert('❌ Тільки користувачі з роллю Dev можуть зберігати дані в хмару!');
        return;
    }
    
    const code = prompt("Введіть код для збереження:");
    if (code !== SECRET_CODE) {
        alert("❌ Неправильний код!");
        return;
    }

    if (!window.dailySchedule || window.dailySchedule.length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    database.ref('allData/dailySchedule').set(window.dailySchedule)
        .then(() => {
            saveToCache();
            alert("✅ Розпорядок дня збережено в хмару!");
        })
        .catch((error) => {
            alert("❌ Помилка збереження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.loadDailyFromFirebase = function() {
    // Завантаження доступне всім автентифікованим користувачам (без коду)
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Потрібно увійти в систему!');
        return;
    }
    

    const confirmation = confirm("Завантажити розпорядок дня з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    database.ref('allData/dailySchedule').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (Array.isArray(data)) {
                    window.dailySchedule = data;
                    if (typeof window.renderDailySchedule === 'function') {
                        window.renderDailySchedule();
                    }
                    saveToCache();
                    alert("✅ Розпорядок дня завантажено з хмари!");
                } else {
                    alert("❌ Помилка: неправильний формат даних!");
                }
            } else {
                alert("Немає збережених даних у хмарі!");
            }
        })
        .catch((error) => {
            alert("❌ Помилка завантаження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.saveTasksToFirebase = function() {
    // Перевірка прав доступу - тільки Dev користувачі можуть зберігати
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser || currentUser.role !== 'Dev') {
        alert('❌ Тільки користувачі з роллю Dev можуть зберігати дані в хмару!');
        return;
    }
    
    const code = prompt("Введіть код для збереження:");
    if (code !== SECRET_CODE) {
        alert("❌ Неправильний код!");
        return;
    }

    if (!window.tasks || window.tasks.length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    database.ref('allData/tasks').set(window.tasks)
        .then(() => {
            saveToCache();
            alert("✅ Завдання збережено в хмару!");
        })
        .catch((error) => {
            alert("❌ Помилка збереження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.loadTasksFromFirebase = function() {
    // Завантаження доступне всім автентифікованим користувачам (без коду)
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Потрібно увійти в систему!');
        return;
    }
    

    const confirmation = confirm("Завантажити завдання з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    database.ref('allData/tasks').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (Array.isArray(data)) {
                    window.tasks = data;
                    if (typeof window.renderTasks === 'function') {
                        window.renderTasks();
                    }
                    saveToCache();
                    alert("✅ Завдання завантажено з хмари!");
                } else {
                    alert("❌ Помилка: неправильний формат даних!");
                }
            } else {
                alert("Немає збережених даних у хмарі!");
            }
        })
        .catch((error) => {
            alert("❌ Помилка завантаження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.saveMenuToFirebase = function() {
    // Перевірка прав доступу - тільки Dev користувачі можуть зберігати
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser || currentUser.role !== 'Dev') {
        alert('❌ Тільки користувачі з роллю Dev можуть зберігати дані в хмару!');
        return;
    }
    
    const code = prompt("Введіть код для збереження:");
    if (code !== SECRET_CODE) {
        alert("❌ Неправильний код!");
        return;
    }

    if (!window.weeklyMenu) {
        alert("Немає даних для збереження!");
        return;
    }

    const hasAnyMeals = Object.values(window.weeklyMenu).some(day => Object.keys(day).length > 0);
    if (!hasAnyMeals) {
        alert("Немає даних для збереження!");
        return;
    }

    database.ref('allData/weeklyMenu').set(window.weeklyMenu)
        .then(() => {
            saveToCache();
            alert("✅ Меню збережено в хмару!");
        })
        .catch((error) => {
            alert("❌ Помилка збереження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.loadMenuFromFirebase = function() {
    // Завантаження доступне всім автентифікованим користувачам (без коду)
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Потрібно увійти в систему!');
        return;
    }
    

    const confirmation = confirm("Завантажити меню з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    database.ref('allData/weeklyMenu').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (typeof data === 'object' && data !== null) {
                    window.weeklyMenu = data;
                    if (typeof window.renderMenu === 'function') {
                        window.renderMenu();
                    }
                    saveToCache();
                    alert("✅ Меню завантажено з хмари!");
                } else {
                    alert("❌ Помилка: неправильний формат даних!");
                }
            } else {
                alert("Немає збережених даних у хмарі!");
            }
        })
        .catch((error) => {
            alert("❌ Помилка завантаження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.saveSuppliestoFirebase = function() {
    // Перевірка прав доступу - тільки Dev користувачі можуть зберігати
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser || currentUser.role !== 'Dev') {
        alert('❌ Тільки користувачі з роллю Dev можуть зберігати дані в хмару!');
        return;
    }
    
    const code = prompt("Введіть код для збереження:");
    if (code !== SECRET_CODE) {
        alert("❌ Неправильний код!");
        return;
    }

    if (!window.suppliesStatus || Object.keys(window.suppliesStatus).length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    // Очищуємо ключі від заборонених символів Firebase
    const sanitizedSupplies = sanitizeFirebaseObject(window.suppliesStatus);

    database.ref('allData/supplies').set(sanitizedSupplies)
        .then(() => {
            saveToCache();
            alert("✅ Запаси збережено в хмару!");
        })
        .catch((error) => {
            alert("❌ Помилка збереження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.loadSuppliesFromFirebase = function() {
    // Завантаження доступне всім автентифікованим користувачам (без коду)
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Потрібно увійти в систему!');
        return;
    }
    

    const confirmation = confirm("Завантажити запаси з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    database.ref('allData/supplies').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (typeof data === 'object' && data !== null) {
                    // Дані вже очищені при збереженні, тому використовуємо їх як є
                    window.suppliesStatus = data;
                    if (typeof window.renderSupplies === 'function') {
                        window.renderSupplies();
                    }
                    saveToCache();
                    alert("✅ Запаси завантажено з хмари!");
                } else {
                    alert("❌ Помилка: неправильний формат даних!");
                }
            } else {
                alert("Немає збережених даних у хмарі!");
            }
        })
        .catch((error) => {
            alert("❌ Помилка завантаження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.saveShopToFirebase = function() {
    // Перевірка прав доступу - тільки Dev користувачі можуть зберігати
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser || currentUser.role !== 'Dev') {
        alert('❌ Тільки користувачі з роллю Dev можуть зберігати дані в хмару!');
        return;
    }
    
    const code = prompt("Введіть код для збереження:");
    if (code !== SECRET_CODE) {
        alert("❌ Неправильний код!");
        return;
    }

    if (!window.shoppingList || Object.keys(window.shoppingList).length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    database.ref('allData/shoppingList').set(window.shoppingList)
        .then(() => {
            saveToCache();
            alert("✅ Список покупок збережено в хмару!");
        })
        .catch((error) => {
            alert("❌ Помилка збереження: " + error.message);
            console.error("Firebase error:", error);
        });
};

window.loadShopFromFirebase = function() {
    // Завантаження доступне всім автентифікованим користувачам (без коду)
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Потрібно увійти в систему!');
        return;
    }
    

    const confirmation = confirm("Завантажити список покупок з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    database.ref('allData/shoppingList').once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (typeof data === 'object' && data !== null) {
                    window.shoppingList = data;
                    if (typeof window.renderList === 'function') {
                        window.renderList();
                    }
                    saveToCache();
                    alert("✅ Список покупок завантажено з хмари!");
                } else {
                    alert("❌ Помилка: неправильний формат даних!");
                }
            } else {
                alert("Немає збережених даних у хмарі!");
            }
        })
        .catch((error) => {
            alert("❌ Помилка завантаження: " + error.message);
            console.error("Firebase error:", error);
        });
};

// Глобальні функції для доступу
window.saveToCache = saveToCache;
window.loadFromCache = loadFromCache;
window.autoSaveToCache = autoSaveToCache;

console.log('✅ Firebase config завантажено');
