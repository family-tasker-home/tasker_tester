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

// ===== AUTO-SAVE FUNCTIONS =====

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

        console.log(`💾 Збереження завдань для ${username}...`);

        const sanitizedUsername = username.replace(/[.#$/[\]]/g, '_');
        const ref = database.ref(`users/${sanitizedUsername}/tasksState`);
        await ref.set(userTasksState);
        
        const updateRef = database.ref(`users/${sanitizedUsername}/lastTasksUpdate`);
        await updateRef.set(new Date().toISOString());
        
        console.log(`✅ Завдання для ${username} успішно збережено`);
    } catch (error) {
        console.error('❌ Помилка автозбереження завдань:', error);
    }
};

// Автозбереження розпорядку дня
window.autoSaveDailySchedule = async function() {
    try {
        const currentUserObj = window.currentUser ? window.currentUser() : null;
        if (!currentUserObj) {
            console.log('⚠️ Користувач не авторизований');
            return;
        }
        
        const username = currentUserObj.username;
        const userSchedule = window.dailyScheduleState ? window.dailyScheduleState[username] : null;
        
        if (!userSchedule || userSchedule.length === 0) {
            console.log('⚠️ Немає розпорядку для збереження');
            return;
        }

        console.log(`💾 Збереження розпорядку для ${username}...`, userSchedule);

        const sanitizedUsername = username.replace(/[.#$/[\]]/g, '_');
        const ref = window.database.ref(`users/${sanitizedUsername}/dailySchedule`);
        await ref.set(userSchedule);
        
        const updateRef = window.database.ref(`users/${sanitizedUsername}/lastScheduleUpdate`);
        await updateRef.set(new Date().toISOString());
        
        console.log(`✅ Розпорядок для ${username} успішно збережено в Firebase`);
        
        if (typeof window.showSaveStatus === 'function') {
            window.showSaveStatus('💾 Розпорядок збережено!', 'success');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Помилка автозбереження розпорядку:', error);
        
        if (typeof window.showSaveStatus === 'function') {
            window.showSaveStatus('❌ Помилка збереження!', 'error');
        }
        
        return false;
    }
};

// Автозбереження меню (тільки для Dev)
window.autoSaveMenu = async function() {
    try {
        const currentUserObj = window.currentUser ? window.currentUser() : null;
        if (!currentUserObj) {
            console.log('⚠️ Користувач не авторизований');
            return;
        }
        
        const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUserObj.username) : {};
        if (roleInfo.role !== 'Dev') {
            console.log('⚠️ Тільки Dev може зберігати меню');
            return;
        }
        
        const username = currentUserObj.username;
        const userMenu = window.weeklyMenuState ? window.weeklyMenuState[username] : null;
        
        const hasData = userMenu && Object.values(userMenu).some(day => 
            day && typeof day === 'object' && Object.keys(day).length > 0
        );
        
        if (!hasData) {
            console.log('⚠️ Немає меню для збереження');
            return;
        }

        console.log(`💾 Збереження меню для ${username}...`, userMenu);

        const sanitizedUsername = username.replace(/[.#$/[\]]/g, '_');
        const ref = window.database.ref(`users/${sanitizedUsername}/weeklyMenu`);
        await ref.set(userMenu);
        
        const updateRef = window.database.ref(`users/${sanitizedUsername}/lastMenuUpdate`);
        await updateRef.set(new Date().toISOString());
        
        console.log(`✅ Меню для ${username} успішно збережено в Firebase`);
        
        if (typeof window.showSaveStatus === 'function') {
            window.showSaveStatus('💾 Меню збережено!', 'success');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Помилка автозбереження меню:', error);
        
        if (typeof window.showSaveStatus === 'function') {
            window.showSaveStatus('❌ Помилка збереження меню!', 'error');
        }
        
        return false;
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
        console.log(`🔄 Завантаження завдань для ${username}...`);
        
        const sanitizedUsername = username.replace(/[.#$/[\]]/g, '_');
        const ref = database.ref(`users/${sanitizedUsername}/tasksState`);
        const snapshot = await ref.once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            if (!window.tasksState) {
                window.tasksState = {};
            }
            
            window.tasksState[username] = data;
            console.log(`✅ Завдання для ${username} завантажено:`, data);
            
            const currentUser = window.currentUser ? window.currentUser() : null;
            if (currentUser && currentUser.username === username) {
                if (typeof window.renderTasks === 'function') {
                    window.renderTasks();
                }
            }
        } else {
            console.log(`ℹ️ Немає збережених завдань для ${username}`);
        }
    } catch (error) {
        console.error('❌ Помилка автозавантаження завдань:', error);
    }
};

// Автозавантаження розпорядку дня при вході
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

// Автозавантаження меню при вході
window.autoLoadMenuOnLogin = async function(username) {
    if (!username) return;
    
    try {
        console.log(`🔄 Завантаження меню для ${username}...`);
        
        const sanitizedUsername = username.replace(/[.#$/[\]]/g, '_');
        const ref = window.database.ref(`users/${sanitizedUsername}/weeklyMenu`);
        const snapshot = await ref.once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            if (!window.weeklyMenuState) {
                window.weeklyMenuState = {};
            }
            
            window.weeklyMenuState[username] = data;
            console.log(`✅ Меню для ${username} завантажено:`, data);
            
            const currentUser = window.currentUser ? window.currentUser() : null;
            if (currentUser && currentUser.username === username) {
                if (typeof window.renderMenu === 'function') {
                    window.renderMenu();
                }
            }
        } else {
            console.log(`ℹ️ Немає збереженого меню для ${username}`);
        }
    } catch (error) {
        console.error('❌ Помилка автозавантаження меню:', error);
    }
};

// Автозавантаження всіх даних при вході
window.autoLoadAllDataOnLogin = async function(username) {
    if (!username) return;
    
    console.log('🔄 Автоматичне завантаження даних...');
    
    // Завантажуємо персональні дані користувача
    await window.autoLoadTasksOnLogin(username);
    await window.autoLoadDailyScheduleOnLogin(username);
    await window.autoLoadMenuOnLogin(username);
    
    console.log('✅ Всі персональні дані завантажено з Firebase');
};

console.log('✅ Firebase config завантажено (персоналізована версія з автозбереженням)');
