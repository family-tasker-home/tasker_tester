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

// Внутрішнє збереження розпорядку дня користувача
async function saveDailyScheduleToFirebaseInternal(username, userSchedule) {
    if (!username || !userSchedule) {
        console.log('⚠️ Немає даних для збереження розпорядку');
        return false;
    }
    
    // Валідація: перевіряємо що є хоч щось для збереження
    if (!isValidData(userSchedule)) {
        console.log('⚠️ Розпорядок порожній, пропускаємо збереження');
        return false;
    }
    
    try {
        const sanitizedUsername = sanitizeFirebaseKey(username);
        const ref = database.ref(`users/${sanitizedUsername}/dailySchedule`);
        await ref.set(userSchedule);
        
        const updateRef = database.ref(`users/${sanitizedUsername}/lastScheduleUpdate`);
        await updateRef.set(new Date().toISOString());
        
        console.log(`💾 Розпорядок дня користувача ${username} збережено`);
        return true;
    } catch (error) {
        console.error('❌ Помилка збереження розпорядку:', error);
        handleFirebaseError(error, 'збереження розпорядку');
        return false;
    }
}

// Внутрішнє завантаження розпорядку дня користувача
async function loadDailyScheduleFromFirebaseInternal(username) {
    if (!username) return null;
    
    try {
        const sanitizedUsername = sanitizeFirebaseKey(username);
        const ref = database.ref(`users/${sanitizedUsername}/dailySchedule`);
        const snapshot = await ref.once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log(`✅ Розпорядок дня користувача ${username} завантажено`);
            return data;
        }
        return null;
    } catch (error) {
        console.error('❌ Помилка завантаження розпорядку:', error);
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
// ===== ОНОВЛЕНА ФУНКЦІЯ АВТОЗБЕРЕЖЕННЯ РОЗПОРЯДКУ ДНЯ =====

// Автозбереження розпорядку дня (замінює стару версію в firebase_config.js)
window.autoSaveDailySchedule = async function() {
    try {
        const currentUserObj = window.currentUser ? window.currentUser() : null;
        if (!currentUserObj) {
            console.log('⚠️ Користувач не авторизований');
            return;
        }
        
        const username = currentUserObj.username;
        const userSchedule = window.dailyScheduleState ? window.dailyScheduleState[username] : null;
        
        // Перевіряємо що є дані для збереження
        if (!userSchedule || userSchedule.length === 0) {
            console.log('⚠️ Немає розпорядку для збереження');
            return;
        }

        console.log(`💾 Збереження розпорядку для ${username}...`, userSchedule);

        // Зберігаємо в Firebase
        const sanitizedUsername = username.replace(/[.#$/[\]]/g, '_');
        const ref = window.database.ref(`users/${sanitizedUsername}/dailySchedule`);
        await ref.set(userSchedule);
        
        // Оновлюємо час останнього збереження
        const updateRef = window.database.ref(`users/${sanitizedUsername}/lastScheduleUpdate`);
        await updateRef.set(new Date().toISOString());
        
        console.log(`✅ Розпорядок для ${username} успішно збережено в Firebase`);
        
        // Показуємо статус збереження (якщо функція доступна)
        if (typeof window.showSaveStatus === 'function') {
            window.showSaveStatus('💾 Розпорядок збережено!', 'success');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Помилка автозбереження розпорядку:', error);
        
        // Показуємо помилку
        if (typeof window.showSaveStatus === 'function') {
            window.showSaveStatus('❌ Помилка збереження!', 'error');
        }
        
        return false;
    }
};

// Автозавантаження розпорядку дня при вході (замінює стару версію)
window.autoLoadDailyScheduleOnLogin = async function(username) {
    if (!username) return;
    
    try {
        console.log(`🔄 Завантаження розпорядку для ${username}...`);
        
        const sanitizedUsername = username.replace(/[.#$/[\]]/g, '_');
        const ref = window.database.ref(`users/${sanitizedUsername}/dailySchedule`);
        const snapshot = await ref.once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            if (!window.dailyScheduleState) {
                window.dailyScheduleState = {};
            }
            
            window.dailyScheduleState[username] = data;
            console.log(`✅ Розпорядок для ${username} завантажено:`, data);
            
            // Оновлюємо інтерфейс якщо це поточний користувач
            const currentUser = window.currentUser ? window.currentUser() : null;
            if (currentUser && currentUser.username === username) {
                if (typeof window.renderDailySchedule === 'function') {
                    window.renderDailySchedule();
                }
            }
        } else {
            console.log(`ℹ️ Немає збереженого розпорядку для ${username}`);
        }
    } catch (error) {
        console.error('❌ Помилка автозавантаження розпорядку:', error);
    }
};

console.log('✅ Оновлені функції автозбереження розпорядку завантажено');

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

// Автозавантаження розпорядку дня при вході
window.autoLoadDailyScheduleOnLogin = async function(username) {
    if (!username) return;
    
    try {
        const data = await loadDailyScheduleFromFirebaseInternal(username);
        
        if (data) {
            if (!window.dailyScheduleState) window.dailyScheduleState = {};
            window.dailyScheduleState[username] = data;
            console.log('✅ Розпорядок дня користувача завантажено');
        }
    } catch (error) {
        console.error('❌ Помилка автозавантаження розпорядку:', error);
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
            
            console.log('✅ Загальні дані завантажено з Firebase');
        } else {
            console.log('ℹ️ Немає збережених загальних даних у Firebase');
        }
    } catch (error) {
        console.error('❌ Помилка автозавантаження загальних даних:', error);
        handleFirebaseError(error, 'завантаження даних');
    }
    
    // Завантажуємо персональні дані користувача
    await window.autoLoadTasksOnLogin(username);
    await window.autoLoadDailyScheduleOnLogin(username);
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
        // Готуємо загальні дані з валідацією
        const menu = window.weeklyMenu || {};
        const supplies = sanitizeFirebaseObject(window.suppliesStatus || {});
        const shopping = window.shoppingList || {};

        // Зберігаємо тільки непорожні дані або null
        const allData = {
            weeklyMenu: Object.keys(menu).length > 0 ? menu : null,
            supplies: Object.keys(supplies).length > 0 ? supplies : null,
            shoppingList: Object.keys(shopping).length > 0 ? shopping : null,
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUserObj.name
        };

        await database.ref('allData').set(allData);
        
        // Зберігаємо персональні дані користувача
        const username = currentUserObj.username;
        
        if (window.tasksState && window.tasksState[username]) {
            await saveTasksToFirebaseInternal(username, window.tasksState[username]);
        }
        
        if (window.dailyScheduleState && window.dailyScheduleState[username]) {
            await saveDailyScheduleToFirebaseInternal(username, window.dailyScheduleState[username]);
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
            
            // Завантажуємо персональні дані користувача
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
                
                const userScheduleData = await loadDailyScheduleFromFirebaseInternal(username);
                if (userScheduleData) {
                    if (!window.dailyScheduleState) window.dailyScheduleState = {};
                    window.dailyScheduleState[username] = userScheduleData;
                    if (typeof window.renderDailySchedule === 'function') {
                        window.renderDailySchedule();
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

console.log('✅ Firebase config завантажено (з підтримкою персональних розпорядків)');
