// config.example.js
// Це файл-шаблон для GitHub
// Скопіюйте його як config.js і додайте свої ключі

const API_CONFIGS = [
    {
        key: 'YOUR_GEMINI_API_KEY_1',
        model: 'gemini-2.0-flash-exp'
    },
    {
        key: 'YOUR_GEMINI_API_KEY_2',
        model: 'gemini-2.0-flash'
    },
    {
        key: 'YOUR_GEMINI_API_KEY_3',
        model: 'gemini-1.5-flash'
    },
    {
        key: 'YOUR_GEMINI_API_KEY_4',
        model: 'gemini-2.5-flash'
    },
    {
        key: 'YOUR_GEMINI_API_KEY_5',
        model: 'gemini-2.0-flash-lite'
    }
];

// Експорт для використання в ai.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIGS };
}
