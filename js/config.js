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

// Користувачі системи
const USERS = {
    "Admin": {
        password: "admin_777",
        role: "Dev",
        name: "Адміністратор",
        promptFile: "admin"
    },
    "Настя": {
        password: "nastya123",
        role: "Viewer",
        name: "Настя",
        promptFile: "nastya"
    },
    "Микола": {
        password: "mykola",
        role: "Dev",
        name: "Микола",
        promptFile: "mykola"
    },
    "Лев": {
        password: "lev_noob",
        role: "Viewer",
        name: "Лев",
        promptFile: "lev"
    },
    "Ярик": {
        password: "yarik_noob",
        role: "Viewer",
        name: "Ярик",
        promptFile: "yarik"
    },
    "Анонім": {
        password: "",
        role: "Viewer",
        name: "Анонім",
        promptFile: "base_prompt"
    }
};

// Експорт для використання в ai.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { USERS, API_ENDPOINT, LOCAL_API_CONFIGS, IS_PRODUCTION };
}
