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
const auth = firebase.auth();

// Експортуємо для глобального доступу
window.database = database;
window.auth = auth;

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

// Перевірка що дані не порожні (для валідації Firebase)
function isValidData(data) {
    if (data === null || data === undefined) return false;
    if (typeof data === 'object') {
        if (Array.isArray(data)) return data.length > 0;
        return Object.keys(data).length > 0;
    }
    return true;
}

// Перевірка секретного коду користувача
async function verifySecretCode(inputCode, username = null) {
    if (!username && window.currentUser) {
        username = window.currentUser().username;
    }
    
    if (!username || !USERS[username]) {
        console.error('❌ Користувач не знайдений!');
        return false;
    }
    
    const user = USERS[username];
    const role = window.getCurrentRole ? window.getCurrentRole(username) : user.role;
    
    if (role === "Viewer") {
        console.error('❌ У вас немає прав для збереження даних сьогодні!');
        return false;
    }
    
    return inputCode === user.secretCode;
}

// Обробка помилок Firebase
function handleFirebaseError(error, operation) {
    console.error(`Firebase error (${operation}):`, error);
    
    if (error.code === 'PERMISSION_DENIED') {
        alert('❌ Помилка доступу до Firebase.\n\n' +
              'Можливі причини:\n' +
              '1. Дані не відповідають правилам валідації\n' +
              '2. Спроба записати порожній об\'єкт\n' +
              '3. Неправильна структура даних\n\n' +
              'Перевірте консоль для деталей.');
    } else if (error.code === 'NETWORK_ERROR') {
        alert('❌ Помилка мережі. Перевірте з\'єднання з інтернетом.');
    } else {
        alert(`❌ Помилка ${operation}: ${error.message}`);
    }
}

// ===== AUTO-SAVE FUNCTIONS (Internal) =====

// Внутрішнє збереження завдань користувача
async function saveTasksToFirebaseInternal(username, userTasksState) {
    if (!username || !userTasksState) {
        console.log('⚠️ Немає даних для збереження завдань');
        return false;
    }
    
    // Валідація: перевіряємо що є хоч щось для збереження
    if (!isValidData(userTasksState)) {
        console.log('⚠️ Завдання порожні, пропускаємо збереження');
        return false;
    }
    
    try {
        const sanitizedUsername = sanitizeFirebaseKey(username);
        const ref = database.ref(`users/${sanitizedUsername}/tasksState`);
        await ref.set(userTasksState);
        
        const updateRef = database.ref(`users/${sanitizedUsername}/lastTasksUpdate`);
        await updateRef.set(new Date().toISOString());
        
        console.log(`💾 Завдання користувача ${username} збережено`);
        return true;
    } catch (error) {
        console.error('❌ Помилка збереження завдань:', error);
        handleFirebaseError(error, 'збереження завдань');
        return false;
    }
}

// Внутрішнє завантаження завдань користувача
async function loadTasksFromFirebaseInternal(username) {
    if (!username) return null;
    
    try {
        const sanitizedUsername = sanitizeFirebaseKey(username);
        const ref = database.ref(`users/${sanitizedUsername}/tasksState`);
        const snapshot = await ref.once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log(`✅ Завдання користувача ${username} завантажено`);
            return data;
        }
        return null;
    } catch (error) {
        console.error('❌ Помилка завантаження завдань:', error);
        return null;
    }
}

// ===== AUTO-SAVE WRAPPERS (Called from other modules) =====

// Автозбереження завдань
window.autoSaveTasksToFirebase = async function() {
    try {
        const currentUserObj = window.currentUser ? window.currentUser() : null;
        if (!currentUserObj) {
            console.log('⚠️ Користувач не авторизований');
            return;
        }
        
        const role = window.getCurrentRole ? window.getCurrentRole(currentUserObj.username) : null;
        if (role === "Viewer") {
            console.log('⚠️ Viewer не може зберігати дані');
            return;
        }
        
        const username = currentUserObj.username;
        const userTasksState = window.tasksState ? window.tasksState[username] : null;
        
        if (!userTasksState || Object.keys(userTasksState).length === 0) {
            console.log('⚠️ Немає завдань для збереження');
            return;
        }

        await saveTasksToFirebaseInternal(username, userTasksState);
    } catch (error) {
        console.error('❌ Помилка автозбереження завдань:', error);
    }
};

// Автозбереження розпорядку дня
window.autoSaveDailySchedule = async function() {
    try {
        const currentUserObj = window.currentUser ? window.currentUser() : null;
        if (!currentUserObj) return;
        
        const role = window.getCurrentRole ? window.getCurrentRole(currentUserObj.username) : null;
        if (role === "Viewer") return;
        
        const schedule = window.dailySchedule || [];
        
        // Зберігаємо або null якщо порожньо (дозволено правилами)
        const scheduleRef = database.ref('allData/dailySchedule');
        await scheduleRef.set(schedule.length > 0 ? schedule : null);
        
        const updateRef = database.ref('allData/lastUpdated');
        await updateRef.set(new Date().toISOString());
        
        const userRef = database.ref('allData/lastUpdatedBy');
        await userRef.set(currentUserObj.name);
        
        console.log('💾 Розпорядок дня автозбережено');
    } catch (error) {
        console.error('❌ Помилка автозбереження розпорядку дня:', error);
        handleFirebaseError(error, 'автозбереження розпорядку');
    }
};

// Автозбереження меню
window.autoSaveMenu = async function() {
    try {
        const currentUserObj = window.currentUser ? window.currentUser() : null;
        if (!currentUserObj) return;
        
        const role = window.getCurrentRole ? window.getCurrentRole(currentUserObj.username) : null;
        if (role === "Viewer") return;
        
        const menu = window.weeklyMenu || {};
        
        // Перевіряємо що меню не порожнє
        const hasData = Object.values(menu).some(day => 
            day && typeof day === 'object' && Object.keys(day).length > 0
        );
        
        const menuRef = database.ref('allData/weeklyMenu');
        await menuRef.set(hasData ? menu : null);
        
        const updateRef = database.ref('allData/lastUpdated');
        await updateRef.set(new Date().toISOString());
        
        const userRef = database.ref('allData/lastUpdatedBy');
        await userRef.set(currentUserObj.name);
        
        console.log('💾 Меню автозбережено');
    } catch (error) {
        console.error('❌ Помилка автозбереження меню:', error);
        handleFirebaseError(error, 'автозбереження меню');
    }
};

// Автозбереження запасів
window.autoSaveSupplies = async function() {
    try {
        const currentUserObj = window.currentUser ? window.currentUser() : null;
        if (!currentUserObj) return;
        
        const role = window.getCurrentRole ? window.getCurrentRole(currentUserObj.username) : null;
        if (role === "Viewer") return;
        
        const supplies = window.suppliesStatus || {};
        const sanitizedSupplies = sanitizeFirebaseObject(supplies);
        
        // Перевіряємо що є дані
        const hasData = Object.keys(sanitizedSupplies).length > 0;
        
        const suppliesRef = database.ref('allData/supplies');
        await suppliesRef.set(hasData ? sanitizedSupplies : null);
        
        const updateRef = database.ref('allData/lastUpdated');
        await updateRef.set(new Date().toISOString());
        
        const userRef = database.ref('allData/lastUpdatedBy');
        await userRef.set(currentUserObj.name);
        
        console.log('💾 Запаси автозбережено');
    } catch (error) {
        console.error('❌ Помилка автозбереження запасів:', error);
        handleFirebaseError(error, 'автозбереження запасів');
    }
};

// Автозбереження списку покупок
window.autoSaveShoppingList = async function() {
    try {
        const currentUserObj = window.currentUser ? window.currentUser() : null;
        if (!currentUserObj) return;
        
        const role = window.getCurrentRole ? window.getCurrentRole(currentUserObj.username) : null;
        if (role === "Viewer") return;
        
        const shopping = window.shoppingList || {};
        
        // Перевіряємо що є дані
        const hasData = Object.keys(shopping).length > 0;
        
        const shoppingRef = database.ref('allData/shoppingList');
        await shoppingRef.set(hasData ? shopping : null);
        
        const updateRef = database.ref('allData/lastUpdated');
        await updateRef.set(new Date().toISOString());
        
        const userRef = database.ref('allData/lastUpdatedBy');
        await userRef.set(currentUserObj.name);
        
        console.log('💾 Список покупок автозбережено');
    } catch (error) {
        console.error('❌ Помилка автозбереження списку покупок:', error);
        handleFirebaseError(error, 'автозбереження покупок');
    }
};

// ===== AUTO-LOAD ON LOGIN =====

// Автозавантаження завдань при вході
window.autoLoadTasksOnLogin = async function(username) {
    if (!username) return;
    
    try {
        const data = await loadTasksFromFirebaseInternal(username);
        
        if (data) {
            if (!window.tasksState) window.tasksState = {};
            window.tasksState[username] = data;
            console.log('✅ Завдання користувача завантажено');
        }
    } catch (error) {
        console.error('❌ Помилка автозавантаження завдань:', error);
    }
};

// Автозавантаження всіх даних при вході
window.autoLoadAllDataOnLogin = async function(username) {
    if (!username) return;
    
    console.log('🔄 Автоматичне завантаження даних...');
    
    try {
        const snapshot = await database.ref('allData').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Завантажуємо дані (з перевіркою на null)
            if (data.dailySchedule && Array.isArray(data.dailySchedule)) {
                window.dailySchedule = data.dailySchedule;
                console.log('✅ Розпорядок дня завантажено');
            }

            if (data.weeklyMenu && typeof data.weeklyMenu === 'object') {
                window.weeklyMenu = data.weeklyMenu;
                console.log('✅ Меню завантажено');
            }

            if (data.supplies && typeof data.supplies === 'object') {
                window.suppliesStatus = data.supplies;
                console.log('✅ Запаси завантажено');
            }

            if (data.shoppingList && typeof data.shoppingList === 'object') {
                window.shoppingList = data.shoppingList;
                console.log('✅ Список покупок завантажено');
            }
            
            console.log('✅ Всі дані завантажено з Firebase');
        } else {
            console.log('ℹ️ Немає збережених даних у Firebase');
        }
    } catch (error) {
        console.error('❌ Помилка автозавантаження даних:', error);
        handleFirebaseError(error, 'завантаження даних');
    }
    
    // Завантажуємо завдання користувача
    await window.autoLoadTasksOnLogin(username);
};

// ===== MANUAL SAVE/LOAD FUNCTIONS =====

window.saveAllToFirebase = async function() {
    const currentUserObj = window.currentUser ? window.currentUser() : null;
    if (!currentUserObj) {
        alert("❌ Користувач не визначений!");
        return;
    }
    
    const role = window.getCurrentRole(currentUserObj.username);
    if (role === "Viewer") {
        const roleInfo = window.getTodayRoleInfo(currentUserObj.username);
        alert(`❌ У вас немає прав для збереження даних!\n\nВаша роль сьогодні (${roleInfo.dayName}): ${role}`);
        return;
    }
    
    const code = prompt("🔐 Введіть ваш секретний код для збереження:");
    if (!code) return;
    
    const isValid = await verifySecretCode(code, currentUserObj.username);
    if (!isValid) {
        alert("❌ Неправильний код!");
        return;
    }

    const btn = event ? event.target : null;
    const originalText = btn ? btn.textContent : '';
    
    if (btn) {
        btn.textContent = '⏳ Збереження...';
        btn.disabled = true;
    }

    try {
        // Готуємо дані з валідацією
        const schedule = window.dailySchedule || [];
        const tasks = window.tasks || [];
        const menu = window.weeklyMenu || {};
        const supplies = sanitizeFirebaseObject(window.suppliesStatus || {});
        const shopping = window.shoppingList || {};

        // Зберігаємо тільки непорожні дані або null
        const allData = {
            dailySchedule: schedule.length > 0 ? schedule : null,
            tasks: tasks.length > 0 ? tasks : null,
            weeklyMenu: Object.keys(menu).length > 0 ? menu : null,
            supplies: Object.keys(supplies).length > 0 ? supplies : null,
            shoppingList: Object.keys(shopping).length > 0 ? shopping : null,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUserObj.name
        };

        await database.ref('allData').set(allData);
        
        // Зберігаємо завдання користувача
        const username = currentUserObj.username;
        if (window.tasksState && window.tasksState[username]) {
            await saveTasksToFirebaseInternal(username, window.tasksState[username]);
        }
        
        alert(`✅ Всі дані збережено в хмару!\n\nЗбережено: ${currentUserObj.name}`);
    } catch (error) {
        handleFirebaseError(error, 'збереження');
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
};

window.loadAllFromFirebase = async function() {
    const confirmation = confirm("Завантажити всі дані з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    const btn = event ? event.target : null;
    const originalText = btn ? btn.textContent : '';
    
    if (btn) {
        btn.textContent = '⏳ Завантаження...';
        btn.disabled = true;
    }

    try {
        const snapshot = await database.ref('allData').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Завантажуємо дані з перевіркою
            if (data.dailySchedule) {
                window.dailySchedule = data.dailySchedule;
                if (typeof window.renderDailySchedule === 'function') {
                    window.renderDailySchedule();
                }
            }

            if (data.tasks) {
                window.tasks = data.tasks;
            }

            if (data.weeklyMenu) {
                window.weeklyMenu = data.weeklyMenu;
                if (typeof window.renderMenu === 'function') {
                    window.renderMenu();
                }
            }

            if (data.supplies) {
                window.suppliesStatus = data.supplies;
                if (typeof window.renderSupplies === 'function') {
                    window.renderSupplies();
                }
            }

            if (data.shoppingList) {
                window.shoppingList = data.shoppingList;
                if (typeof window.renderList === 'function') {
                    window.renderList();
                }
            }
            
            // Завантажуємо завдання користувача
            const currentUserObj = window.currentUser ? window.currentUser() : null;
            if (currentUserObj) {
                const username = currentUserObj.username;
                const userTasksData = await loadTasksFromFirebaseInternal(username);
                if (userTasksData) {
                    if (!window.tasksState) window.tasksState = {};
                    window.tasksState[username] = userTasksData;
                    if (typeof window.renderTasks === 'function') {
                        window.renderTasks();
                    }
                }
            }
            
            const lastUpdated = data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('uk-UA') : 'невідомо';
            const updatedBy = data.lastUpdatedBy || 'невідомо';
            alert(`✅ Всі дані завантажено!\n\nОновлено: ${lastUpdated}\nКористувач: ${updatedBy}`);
        } else {
            alert("Немає збережених даних у хмарі!");
        }
    } catch (error) {
        handleFirebaseError(error, 'завантаження');
    } finally {
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
};

console.log('✅ Firebase config завантажено (безпечна версія з валідацією)');
