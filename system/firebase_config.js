// ===== TASKS FUNCTIONS (Internal - Auto-save only) =====

// Внутрішня функція збереження (без UI)
async function saveTasksToFirebaseInternal(username, userTasksState) {
    if (!username || !userTasksState) return false;
    
    try {
        await database.ref(`users/${username}/tasksState`).set(userTasksState);
        await database.ref(`users/${username}/lastTasksUpdate`).set(new Date().toISOString());
        console.log(`💾 Завдання користувача ${username} збережено в Firebase`);
        return true;
    } catch (error) {
        console.error('❌ Помилка збереження завдань:', error);
        return false;
    }
}

// Внутрішня функція завантаження (без UI)
async function loadTasksFromFirebaseInternal(username) {
    if (!username) return null;
    
    try {
        const snapshot = await database.ref(`users/${username}/tasksState`).once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log(`✅ Завдання користувача ${username} завантажено з Firebase`);
            return data;
        }
        return null;
    } catch (error) {
        console.error('❌ Помилка завантаження завдань:', error);
        return null;
    }
}

// Автоматичне збереження завдань в Firebase (викликається при кожній зміні)
window.autoSaveTasksToFirebase = async function() {
    const currentUserObj = window.currentUser ? window.currentUser() : null;
    if (!currentUserObj) return;
    
    const role = window.getCurrentRole ? window.getCurrentRole(currentUserObj.username) : null;
    if (role === "Viewer") return; // Viewer не може зберігати
    
    const username = currentUserObj.username;
    const userTasksState = window.tasksState[username] || {};
    
    if (!userTasksState || Object.keys(userTasksState).length === 0) return;

    await saveTasksToFirebaseInternal(username, userTasksState);
};

// Автоматичне завантаження завдань при вході (викликається з login.js)
window.autoLoadTasksOnLogin = async function(username) {
    if (!username) return;
    
    const data = await loadTasksFromFirebaseInternal(username);
    
    if (data) {
        if (!window.tasksState) window.tasksState = {};
        window.tasksState[username] = data;
        
        if (typeof window.renderTasks === 'function') {
            window.renderTasks();
        }
    }
};// ===== FIREBASE CONFIGURATION =====

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
        alert('❌ У вас немає прав для цієї операції!');
    } else if (error.code === 'NETWORK_ERROR') {
        alert('❌ Помилка мережі. Перевірте з\'єднання з інтернетом.');
    } else {
        alert(`❌ Помилка ${operation}: ${error.message}`);
    }
}

// ===== GLOBAL SAVE/LOAD FUNCTIONS =====

window.saveAllToFirebase = async function() {
    const currentUserObj = window.currentUser ? window.currentUser() : null;
    if (!currentUserObj) {
        alert("❌ Користувач не визначений!");
        return;
    }
    
    const role = window.getCurrentRole(currentUserObj.username);
    if (role === "Viewer") {
        const roleInfo = window.getTodayRoleInfo(currentUserObj.username);
        alert(`❌ У вас немає прав для збереження даних!\n\nВаша роль сьогодні (${roleInfo.dayName}): ${role}\n\nВи можете зберігати дані тільки в свої робочі дні.`);
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

    const allData = {
        dailySchedule: window.dailySchedule || [],
        tasks: window.tasks || [],
        weeklyMenu: window.weeklyMenu || {},
        supplies: sanitizeFirebaseObject(window.suppliesStatus || {}),
        shoppingList: window.shoppingList || {},
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: currentUserObj.name
    };

    try {
        await database.ref('allData').set(allData);
        
        // Також зберігаємо завдання поточного користувача
        const username = currentUserObj.username;
        if (window.tasksState && window.tasksState[username]) {
            await saveTasksToFirebaseInternal(username, window.tasksState[username]);
        }
        
        alert(`✅ Всі дані збережено в хмару!\n\nЗбережено користувачем: ${currentUserObj.name}\n\n💡 Підказка: Завдання тепер зберігаються автоматично!`);
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
            
            if (data.dailySchedule && Array.isArray(data.dailySchedule)) {
                window.dailySchedule = data.dailySchedule;
                if (typeof window.renderDailySchedule === 'function') {
                    window.renderDailySchedule();
                }
            }

            if (data.tasks && Array.isArray(data.tasks)) {
                window.tasks = data.tasks;
            }

            if (data.weeklyMenu && typeof data.weeklyMenu === 'object') {
                window.weeklyMenu = data.weeklyMenu;
                if (typeof window.renderMenu === 'function') {
                    window.renderMenu();
                }
            }

            if (data.supplies && typeof data.supplies === 'object') {
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
            
            // Завантажуємо завдання поточного користувача
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
            const updatedBy = data.lastUpdatedBy ? `\nОстаннє збереження: ${data.lastUpdatedBy}` : '';
            alert(`✅ Всі дані завантажено з хмари!\n\nОстаннє оновлення: ${lastUpdated}${updatedBy}\n\n💡 Підказка: Завдання тепер зберігаються автоматично!`);
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

// ===== INDIVIDUAL SAVE/LOAD FUNCTIONS =====

window.saveDailyToFirebase = async function() {
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

    if (!window.dailySchedule || window.dailySchedule.length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    try {
        await database.ref('allData/dailySchedule').set(window.dailySchedule);
        await database.ref('allData/lastUpdated').set(new Date().toISOString());
        await database.ref('allData/lastUpdatedBy').set(currentUserObj.name);
        alert("✅ Розпорядок дня збережено в хмару!");
    } catch (error) {
        handleFirebaseError(error, 'збереження');
    }
};

window.loadDailyFromFirebase = async function() {
    const confirmation = confirm("Завантажити розпорядок дня з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    try {
        const snapshot = await database.ref('allData/dailySchedule').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (Array.isArray(data)) {
                window.dailySchedule = data;
                if (typeof window.renderDailySchedule === 'function') {
                    window.renderDailySchedule();
                }
                alert("✅ Розпорядок дня завантажено з хмари!");
            } else {
                alert("❌ Помилка: неправильний формат даних!");
            }
        } else {
            alert("Немає збережених даних у хмарі!");
        }
    } catch (error) {
        handleFirebaseError(error, 'завантаження');
    }
};

window.saveTasksToFirebase = async function() {
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

    if (!window.tasksState || Object.keys(window.tasksState).length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    try {
        await database.ref('allData/tasksState').set(window.tasksState);
        await database.ref('allData/lastUpdated').set(new Date().toISOString());
        await database.ref('allData/lastUpdatedBy').set(currentUserObj.name);
        alert("✅ Стан завдань збережено в хмару!");
    } catch (error) {
        handleFirebaseError(error, 'збереження');
    }
};

window.loadTasksFromFirebase = async function() {
    const confirmation = confirm("Завантажити стан завдань з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    try {
        const snapshot = await database.ref('allData/tasksState').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (typeof data === 'object' && data !== null) {
                window.tasksState = data;
                if (typeof window.renderTasks === 'function') {
                    window.renderTasks();
                }
                alert("✅ Стан завдань завантажено з хмари!");
            } else {
                alert("❌ Помилка: неправильний формат даних!");
            }
        } else {
            alert("Немає збережених даних у хмарі!");
        }
    } catch (error) {
        handleFirebaseError(error, 'завантаження');
    }
};

window.saveMenuToFirebase = async function() {
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

    if (!window.weeklyMenu) {
        alert("Немає даних для збереження!");
        return;
    }

    const hasAnyMeals = Object.values(window.weeklyMenu).some(day => Object.keys(day).length > 0);
    if (!hasAnyMeals) {
        alert("Немає даних для збереження!");
        return;
    }

    try {
        await database.ref('allData/weeklyMenu').set(window.weeklyMenu);
        await database.ref('allData/lastUpdated').set(new Date().toISOString());
        await database.ref('allData/lastUpdatedBy').set(currentUserObj.name);
        alert("✅ Меню збережено в хмару!");
    } catch (error) {
        handleFirebaseError(error, 'збереження');
    }
};

window.loadMenuFromFirebase = async function() {
    const confirmation = confirm("Завантажити меню з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    try {
        const snapshot = await database.ref('allData/weeklyMenu').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (typeof data === 'object' && data !== null) {
                window.weeklyMenu = data;
                if (typeof window.renderMenu === 'function') {
                    window.renderMenu();
                }
                alert("✅ Меню завантажено з хмари!");
            } else {
                alert("❌ Помилка: неправильний формат даних!");
            }
        } else {
            alert("Немає збережених даних у хмарі!");
        }
    } catch (error) {
        handleFirebaseError(error, 'завантаження');
    }
};

window.saveSuppliestoFirebase = async function() {
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

    if (!window.suppliesStatus || Object.keys(window.suppliesStatus).length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    const sanitizedSupplies = sanitizeFirebaseObject(window.suppliesStatus);

    try {
        await database.ref('allData/supplies').set(sanitizedSupplies);
        await database.ref('allData/lastUpdated').set(new Date().toISOString());
        await database.ref('allData/lastUpdatedBy').set(currentUserObj.name);
        alert("✅ Запаси збережено в хмару!");
    } catch (error) {
        handleFirebaseError(error, 'збереження');
    }
};

window.loadSuppliesFromFirebase = async function() {
    const confirmation = confirm("Завантажити запаси з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    try {
        const snapshot = await database.ref('allData/supplies').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (typeof data === 'object' && data !== null) {
                window.suppliesStatus = data;
                if (typeof window.renderSupplies === 'function') {
                    window.renderSupplies();
                }
                alert("✅ Запаси завантажено з хмари!");
            } else {
                alert("❌ Помилка: неправильний формат даних!");
            }
        } else {
            alert("Немає збережених даних у хмарі!");
        }
    } catch (error) {
        handleFirebaseError(error, 'завантаження');
    }
};

window.saveShopToFirebase = async function() {
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

    if (!window.shoppingList || Object.keys(window.shoppingList).length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    try {
        await database.ref('allData/shoppingList').set(window.shoppingList);
        await database.ref('allData/lastUpdated').set(new Date().toISOString());
        await database.ref('allData/lastUpdatedBy').set(currentUserObj.name);
        alert("✅ Список покупок збережено в хмару!");
    } catch (error) {
        handleFirebaseError(error, 'збереження');
    }
};

window.loadShopFromFirebase = async function() {
    const confirmation = confirm("Завантажити список покупок з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    try {
        const snapshot = await database.ref('allData/shoppingList').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (typeof data === 'object' && data !== null) {
                window.shoppingList = data;
                if (typeof window.renderList === 'function') {
                    window.renderList();
                }
                alert("✅ Список покупок завантажено з хмари!");
            } else {
                alert("❌ Помилка: неправильний формат даних!");
            }
        } else {
            alert("Немає збережених даних у хмарі!");
        }
    } catch (error) {
        handleFirebaseError(error, 'завантаження');
    }
};

console.log('✅ Firebase config завантажено (з підтримкою tasksState)');
