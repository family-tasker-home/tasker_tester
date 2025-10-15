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
    // Якщо не вказано користувача, беремо поточного
    if (!username && window.currentUser) {
        username = window.currentUser().username;
    }
    
    if (!username || !USERS[username]) {
        console.error('❌ Користувач не знайдений!');
        return false;
    }
    
    const user = USERS[username];
    const role = window.getCurrentRole ? window.getCurrentRole(username) : user.role;
    
    // Перевіряємо чи користувач має права зберігати
    if (role === "Viewer") {
        console.error('❌ У вас немає прав для збереження даних сьогодні!');
        return false;
    }
    
    // Перевіряємо код
    return inputCode === user.secretCode;
}

// Встановлення секретного коду (тепер не потрібно - коди в profiles.json)
window.setupSecretCode = async function(newCode) {
    alert("⚠️ Секретні коди налаштовуються в файлі system/profiles.json");
};

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
    
    // Перевіряємо права
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
        alert(`✅ Всі дані збережено в хмару!\n\nЗбережено користувачем: ${currentUserObj.name}`);
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
            
            const lastUpdated = data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('uk-UA') : 'невідомо';
            const updatedBy = data.lastUpdatedBy ? `\nОстаннє збереження: ${data.lastUpdatedBy}` : '';
            alert(`✅ Всі дані завантажено з хмари!\n\nОстаннє оновлення: ${lastUpdated}${updatedBy}`);
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

    if (!window.tasks || window.tasks.length === 0) {
        alert("Немає даних для збереження!");
        return;
    }

    try {
        await database.ref('allData/tasks').set(window.tasks);
        await database.ref('allData/lastUpdated').set(new Date().toISOString());
        await database.ref('allData/lastUpdatedBy').set(currentUserObj.name);
        alert("✅ Завдання збережено в хмару!");
    } catch (error) {
        handleFirebaseError(error, 'збереження');
    }
};

window.loadTasksFromFirebase = async function() {
    const confirmation = confirm("Завантажити завдання з хмари?\n\nПоточні дані будуть замінені!");
    if (!confirmation) return;

    try {
        const snapshot = await database.ref('allData/tasks').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (Array.isArray(data)) {
                window.tasks = data;
                if (typeof window.renderTasks === 'function') {
                    window.renderTasks();
                }
                alert("✅ Завдання завантажено з хмари!");
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

console.log('✅ Firebase config завантажено (dynamic roles with individual secret codes)');
