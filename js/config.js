// js/config.js
// Конфігурація для локальної розробки

// Визначаємо, чи ми на Vercel
const IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// API endpoint (для локальної розробки використовуємо прямий доступ)
const API_ENDPOINT = IS_PRODUCTION ? '/api/gemini' : null;

// Для локальної розробки все ще можна використовувати прямі ключі
const LOCAL_API_CONFIGS = IS_PRODUCTION ? [] : [
    {
        key: 'YOUR_GEMINI_API_KEY_1',
        model: 'gemini-2.0-flash-exp'
    },
    {
        key: 'YOUR_GEMINI_API_KEY_2',
        model: 'gemini-2.0-flash'
    }
];

// Завантаження профілів користувачів
let USERS = {};
let PROFILES_LOADED = false;

// Функція для завантаження профілів
async function loadProfiles() {
    try {
        const response = await fetch('system/profiles.json');
        if (!response.ok) {
            throw new Error('Failed to load profiles');
        }
        USERS = await response.json();
        PROFILES_LOADED = true;
        console.log('✅ Профілі користувачів завантажено');
        return USERS;
    } catch (error) {
        console.error('❌ Помилка завантаження профілів:', error);
        // Fallback до базового конфігу
        USERS = {
            "Анонім": {
                password: "",
                secretCode: "",
                role: "Viewer",
                name: "Анонім",
                avatar: "👤",
                promptFile: "base_prompt",
                schedule: {
                    monday: "Viewer",
                    tuesday: "Viewer",
                    wednesday: "Viewer",
                    thursday: "Viewer",
                    friday: "Viewer",
                    saturday: "Viewer",
                    sunday: "Viewer"
                }
            }
        };
        PROFILES_LOADED = true;
        return USERS;
    }
}

// Функція для отримання поточної ролі користувача
function getCurrentRole(username) {
    if (!USERS[username]) return "Viewer";
    
    const user = USERS[username];
    
    // Якщо є фіксована роль (Admin)
    if (user.role) return user.role;
    
    // Інакше дивимось на розклад
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const dayName = days[today];
    
    return user.schedule[dayName] || "Viewer";
}

// Функція для отримання інформації про роль на сьогодні
function getTodayRoleInfo(username) {
    const role = getCurrentRole(username);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const dayNames = {
        'sunday': 'Неділя',
        'monday': 'Понеділок',
        'tuesday': 'Вівторок',
        'wednesday': 'Середа',
        'thursday': 'Четвер',
        'friday': "П'ятниця",
        'saturday': 'Субота'
    };
    
    return {
        role: role,
        dayName: dayNames[days[today]],
        canModify: role !== "Viewer",
        canSave: role !== "Viewer"
    };
}

// Функція для перевірки чи користувач може зберігати дані
function canUserSaveData(username) {
    return getCurrentRole(username) !== "Viewer";
}

// Експорт для використання в ai.js та інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        USERS, 
        API_ENDPOINT, 
        LOCAL_API_CONFIGS, 
        IS_PRODUCTION,
        loadProfiles,
        getCurrentRole,
        getTodayRoleInfo,
        canUserSaveData
    };
}

// Експорт для браузера
window.loadProfiles = loadProfiles;
window.getCurrentRole = getCurrentRole;
window.getTodayRoleInfo = getTodayRoleInfo;
window.canUserSaveData = canUserSaveData;
