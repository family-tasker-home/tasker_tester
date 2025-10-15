// AI Assistant - Джарвіс (Gemini API через Vercel)
// Кожен користувач має свій виділений API ключ

let currentApiKeyIndex = 0;
let chatHistory = [];
let conversationContext = null;
let JARVIS_PROMPT = null;

// Завантаження промпту для поточного користувача
async function loadUserPrompt() {
    try {
        const currentUser = window.currentUser ? window.currentUser() : null;
        if (!currentUser) {
            console.error('❌ Користувач не авторизований');
            return false;
        }

        const username = currentUser.username || 'Анонім';
        
        // Отримуємо API ключ індекс для користувача
        if (typeof window.getUserApiKeyIndex === 'function') {
            currentApiKeyIndex = window.getUserApiKeyIndex(username);
            console.log(`🔑 Користувач ${username} використовує API ключ #${currentApiKeyIndex}`);
        }
        
        // Завантажуємо промпт з API
        const response = await fetch(`/api/prompts?username=${encodeURIComponent(username)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        JARVIS_PROMPT = data.prompt;
        
        console.log('✅ Промпт завантажено для користувача:', username);
        return true;
    } catch (error) {
        console.error('❌ Помилка завантаження промпту:', error);
        
        // Fallback промпт
        JARVIS_PROMPT = `Ти - Джарвіс, AI-асистент системи Halloween Planner.
        
Допомагай користувачам з організацією меню, покупок, завдань та розкладу.
Будь ввічливим, корисним та конкретним у відповідях.`;
        
        return false;
    }
}

// Отримання поточних даних з сайту
function getCurrentSiteData() {
    const supplies = window.suppliesStatus || {};
    const shoppingList = window.shoppingList || {};
    const weeklyMenu = window.weeklyMenu || {};
    const dailySchedule = window.dailySchedule || [];
    const tasks = window.tasks || [];
    
    const formattedData = {
        'Запаси (продукти вдома)': formatSupplies(supplies),
        'Список покупок': formatShoppingList(shoppingList),
        'Меню на тиждень': formatWeeklyMenu(weeklyMenu),
        'Розпорядок дня': formatDailySchedule(dailySchedule),
        'Завдання': formatTasks(tasks)
    };
    
    return JSON.stringify(formattedData, null, 2);
}

// Форматування запасів
function formatSupplies(supplies) {
    if (!supplies || Object.keys(supplies).length === 0) return "Немає даних про запаси";
    
    const result = { '✅ Є в наявності': [], '⚠️ Закінчується': [], '❌ Відсутнє': [] };
    
    for (const [category, items] of Object.entries(supplies)) {
        if (!items || typeof items !== 'object') continue;
        
        for (const [item, status] of Object.entries(items)) {
            if (!status) continue;
            if (status === '✅' || status === 'available') result['✅ Є в наявності'].push(item);
            else if (status === '⚠️' || status === 'low') result['⚠️ Закінчується'].push(item);
            else if (status === '❌' || status === 'needed') result['❌ Відсутнє'].push(item);
        }
    }
    
    return Object.keys(result).some(k => result[k].length > 0) ? result : "Запаси не позначені";
}

// Форматування списку покупок
function formatShoppingList(shoppingList) {
    if (!shoppingList || Object.keys(shoppingList).length === 0) return "Список покупок порожній";
    
    const result = {};
    for (const [category, items] of Object.entries(shoppingList)) {
        if (!items || !Array.isArray(items)) continue;
        const notBought = items.filter(item => !item.bought).map(item => item.name);
        if (notBought.length > 0) result[category] = notBought;
    }
    
    return Object.keys(result).length > 0 ? result : "Список покупок порожній";
}

// Форматування меню
function formatWeeklyMenu(menu) {
    if (!menu || Object.keys(menu).length === 0) return "Меню не заповнене";
    const result = {};
    for (const [day, meals] of Object.entries(menu)) {
        if (Object.keys(meals).length > 0) result[day] = meals;
    }
    return Object.keys(result).length > 0 ? result : "Меню не заповнене";
}

// Форматування розкладу дня
function formatDailySchedule(schedule) {
    return !schedule || schedule.length === 0 ? "Розклад порожній" : schedule.map(e => `${e.time}: ${e.text}`);
}

// Форматування завдань
function formatTasks(tasks) {
    return !tasks || tasks.length === 0 ? "Завдання відсутні" : tasks.map(t => ({
        'Завдання': t.text,
        'Відповідальний': t.assignee,
        'Статус': t.completed ? 'Виконано' : 'В процесі'
    }));
}

// Відправка повідомлення до Gemini AI через Vercel
async function sendMessageToAI(message) {
    // Перевірка промпту
    if (!JARVIS_PROMPT) {
        await loadUserPrompt();
        if (!JARVIS_PROMPT) {
            showError('❌ Помилка: Не вдалося завантажити конфігурацію асистента.');
            return;
        }
    }

    const chatContainer = document.getElementById('chatMessages');
    chatContainer.appendChild(createMessageElement(message, 'user'));
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const loadingMessage = createMessageElement('Джарвіс думає...', 'assistant', true);
    chatContainer.appendChild(loadingMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const contents = buildConversationHistory(message);
        
        // Визначаємо endpoint
        const endpoint = typeof API_ENDPOINT !== 'undefined' && API_ENDPOINT 
            ? API_ENDPOINT 
            : '/api/gemini';
        
        console.log(`📤 Відправка запиту з API ключем #${currentApiKeyIndex}`);
        
        // Відправляємо запит через Vercel API з виділеним ключем користувача
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents,
                apiKeyIndex: currentApiKeyIndex, // Використовуємо виділений ключ користувача
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates?.[0]?.content) {
            throw new Error('Некоректна відповідь від Gemini API');
        }
        
        // Логуємо інформацію про використаний ключ
        if (data.assignedUser) {
            console.log(`✅ Відповідь отримана від ключа #${data.usedApiIndex} (${data.assignedUser})`);
        }
        
        let aiResponse = data.candidates[0].content.parts[0].text;
        aiResponse = cleanMarkdown(aiResponse);

        // ОБРОБКА КОМАНД і АВТОЗБЕРЕЖЕННЯ
const commandsExecuted = executeCommands(aiResponse);
        if (commandsExecuted.length > 0) {
            console.log('✅ Виконано команд:', commandsExecuted.length);
            
            // АВТОМАТИЧНЕ ЗБЕРЕЖЕННЯ В FIREBASE БЕЗ PROMPT
            const modifyCommands = commandsExecuted.filter(cmd => !cmd.type.startsWith('ПЕРЕГЛЯНУТИ_'));
            if (modifyCommands.length > 0) {
                setTimeout(async () => {
                    console.log('💾 Автоматичне збереження в Firebase...');
                    await autoSaveToFirebaseNoPrompt();
                    conversationContext = getCurrentSiteData();
                }, 800);
            }
        }

        chatContainer.removeChild(loadingMessage);
        chatContainer.appendChild(createMessageElement(aiResponse, 'assistant'));
        chatContainer.scrollTop = chatContainer.scrollHeight;

        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: aiResponse });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
        
        saveHistoryToCache();

    } catch (error) {
        console.error('Error:', error);
        if (chatContainer.contains(loadingMessage)) chatContainer.removeChild(loadingMessage);
        
        showError(getErrorMessage(error));
    }
}

// Автоматичне збереження в Firebase БЕЗ PROMPT
async function autoSaveToFirebaseNoPrompt() {
    try {
        if (typeof window.auth === 'undefined' || !window.auth.currentUser) {
            console.log('⚠️ Користувач не авторизований, збереження пропущено');
            return;
        }

        const user = window.auth.currentUser;
        const userId = user.uid;

        const dataToSave = {
            supplies: window.suppliesStatus || {},
            shopping: window.shoppingList || {},
            menu: window.weeklyMenu || {},
            daily: window.dailySchedule || [],
            tasks: window.tasks || [],
            lastUpdate: new Date().toISOString()
        };

        if (typeof window.database !== 'undefined') {
            const userRef = window.database.ref(`users/${userId}`);
            await userRef.set(dataToSave);
            console.log('✅ Дані автоматично збережено в Firebase');
        }

        if (typeof window.autoSaveToCache === 'function') {
            window.autoSaveToCache();
        }

    } catch (error) {
        console.error('❌ Помилка автоматичного збереження:', error);
    }
}

// Допоміжні функції
function buildConversationHistory(message) {
    const contents = [];
    
    if (chatHistory.length === 0 || !conversationContext) {
        const currentData = getCurrentSiteData();
        contents.push({
            role: 'user',
            parts: [{ text: `${JARVIS_PROMPT}\n\nПоточні дані з системи:\n${currentData}` }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: 'Зрозумів. Я Джарвіс, ваш кухонний асистент. Я бачу всі дані про запаси, список покупок, меню, розклад та завдання. Готовий допомогти!' }]
        });
        conversationContext = currentData;
    }
    
    for (const historyItem of chatHistory) {
        contents.push({
            role: historyItem.role === 'user' ? 'user' : 'model',
            parts: [{ text: historyItem.content }]
        });
    }
    
    contents.push({ role: 'user', parts: [{ text: message }] });
    return contents;
}

function cleanMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/_(.+?)_/g, '$1');
}

function showError(message) {
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.appendChild(createMessageElement(message, 'assistant'));
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function getErrorMessage(error) {
    let msg = 'Вибачте, виникла помилка з\'єднання з Gemini API.\n\n';
    if (error.message.includes('401') || error.message.includes('403')) {
        msg += 'Помилка авторизації. Перевірте налаштування API.';
    } else if (error.message.includes('429')) {
        msg += 'Перевищено ліміт запитів. Спробуйте через хвилину.';
    } else if (error.message.includes('No API keys configured')) {
        msg += 'API ключі не налаштовані на сервері. Зверніться до адміністратора.';
    } else if (error.message.includes('Invalid API key index')) {
        msg += 'Невірний індекс API ключа. Зверніться до адміністратора.';
    } else {
        msg += error.message;
    }
    return msg;
}

// Збереження/завантаження історії
function saveHistoryToCache() {
    try {
        localStorage.setItem('jarvis_chat_history', JSON.stringify(chatHistory));
        localStorage.setItem('jarvis_context', conversationContext);
    } catch (error) {
        console.error('Помилка збереження історії:', error);
    }
}

function loadHistoryFromCache() {
    try {
        const savedHistory = localStorage.getItem('jarvis_chat_history');
        const savedContext = localStorage.getItem('jarvis_context');
        
        if (savedHistory) chatHistory = JSON.parse(savedHistory);
        if (savedContext) conversationContext = savedContext;
    } catch (error) {
        console.error('Помилка завантаження історії:', error);
        chatHistory = [];
        conversationContext = null;
    }
}

// Створення елемента повідомлення
function createMessageElement(content, sender, isLoading = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}${isLoading ? ' loading' : ''}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = content.replace(/\n/g, '<br>');
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);
    
    return messageDiv;
}

// Ініціалізація чату
async function initChat() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;

    // Завантажуємо промпт користувача і встановлюємо API ключ
    await loadUserPrompt();

    loadHistoryFromCache();
    
    if (chatHistory.length > 0) {
        for (const historyItem of chatHistory) {
            chatContainer.appendChild(createMessageElement(
                historyItem.content, 
                historyItem.role === 'user' ? 'user' : 'assistant'
            ));
        }
    } else {
        chatContainer.appendChild(createMessageElement(
            'Доброго дня! Я Джарвіс, ваш кухонний асистент.\n\nЯ бачу всі ваші дані:\n• Запаси продуктів\n• Список покупок\n• Меню на тиждень\n• Розпорядок дня\n• Завдання\n\nЧим можу допомогти сьогодні?',
            'assistant'
        ));
    }
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// UI функції
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message) {
        sendMessageToAI(message);
        input.value = '';
        input.style.height = 'auto';
    }
}

function clearChat() {
    if (!confirm('Ви впевнені, що хочете очистити історію чату?\n\nЦе видалить всі попередні повідомлення та контекст розмови.')) return;
    
    const chatContainer = document.getElementById('chatMessages');
    if (chatContainer) {
        chatContainer.innerHTML = '';
        chatHistory = [];
        conversationContext = null;
        localStorage.removeItem('jarvis_chat_history');
        localStorage.removeItem('jarvis_context');
        initChat();
    }
}

function updateContext() {
    conversationContext = getCurrentSiteData();
    console.log('✅ Контекст Джарвіса оновлено');
}

// ВИКОНАННЯ КОМАНД
function executeCommands(text) {
    const executedCommands = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // КОМАНДИ ПЕРЕГЛЯДУ ДАНИХ
        if (trimmed.startsWith('ПЕРЕГЛЯНУТИ_ЗАПАСИ')) {
            const freshData = refreshSuppliesData();
            executedCommands.push({ original: line, type: 'ПЕРЕГЛЯНУТИ_ЗАПАСИ', data: freshData });
        }
        else if (trimmed.startsWith('ПЕРЕГЛЯНУТИ_ПОКУПКИ')) {
            const freshData = refreshShoppingData();
            executedCommands.push({ original: line, type: 'ПЕРЕГЛЯНУТИ_ПОКУПКИ', data: freshData });
        }
        else if (trimmed.startsWith('ПЕРЕГЛЯНУТИ_МЕНЮ')) {
            const freshData = refreshMenuData();
            executedCommands.push({ original: line, type: 'ПЕРЕГЛЯНУТИ_МЕНЮ', data: freshData });
        }
        else if (trimmed.startsWith('ПЕРЕГЛЯНУТИ_РОЗКЛАД')) {
            const freshData = refreshScheduleData();
            executedCommands.push({ original: line, type: 'ПЕРЕГЛЯНУТИ_РОЗКЛАД', data: freshData });
        }
        else if (trimmed.startsWith('ПЕРЕГЛЯНУТИ_ЗАВДАННЯ')) {
            const freshData = refreshTasksData();
            executedCommands.push({ original: line, type: 'ПЕРЕГЛЯНУТИ_ЗАВДАННЯ', data: freshData });
        }
        else if (trimmed.startsWith('ПЕРЕГЛЯНУТИ_ВСЕ')) {
            const freshData = getCurrentSiteData();
            executedCommands.push({ original: line, type: 'ПЕРЕГЛЯНУТИ_ВСЕ', data: freshData });
        }
        // КОМАНДИ МОДИФІКАЦІЇ
        else if (trimmed.startsWith('ДОДАТИ_ЗАПАС:')) {
            const params = trimmed.replace('ДОДАТИ_ЗАПАС:', '').trim().split(',').map(p => p.trim());
            if (params.length === 2) {
                executeAddSupply(params[0], params[1]);
                executedCommands.push({ original: line, type: 'ДОДАТИ_ЗАПАС' });
            }
        }
        else if (trimmed.startsWith('ДОДАТИ_ПОКУПКУ:')) {
            const params = trimmed.replace('ДОДАТИ_ПОКУПКУ:', '').trim().split(',').map(p => p.trim());
            if (params.length === 2) {
                executeAddShopping(params[0], params[1]);
                executedCommands.push({ original: line, type: 'ДОДАТИ_ПОКУПКУ' });
            }
        }
        else if (trimmed.startsWith('ВИДАЛИТИ_ПОКУПКУ:')) {
            const product = trimmed.replace('ВИДАЛИТИ_ПОКУПКУ:', '').trim();
            executeRemoveShopping(product);
            executedCommands.push({ original: line, type: 'ВИДАЛИТИ_ПОКУПКУ' });
        }
        else if (trimmed.startsWith('ДОДАТИ_МЕНЮ:')) {
            const params = trimmed.replace('ДОДАТИ_МЕНЮ:', '').trim().split(',').map(p => p.trim());
            if (params.length === 3) {
                executeAddMenu(params[0], params[1], params[2]);
                executedCommands.push({ original: line, type: 'ДОДАТИ_МЕНЮ' });
            }
        }
        else if (trimmed.startsWith('ВИДАЛИТИ_МЕНЮ:')) {
            const params = trimmed.replace('ВИДАЛИТИ_МЕНЮ:', '').trim().split(',').map(p => p.trim());
            if (params.length === 2) {
                executeRemoveMenu(params[0], params[1]);
                executedCommands.push({ original: line, type: 'ВИДАЛИТИ_МЕНЮ' });
            }
        }
        else if (trimmed.startsWith('ДОДАТИ_РОЗКЛАД:')) {
            const params = trimmed.replace('ДОДАТИ_РОЗКЛАД:', '').trim().split(',').map(p => p.trim());
            if (params.length === 2) {
                executeAddSchedule(params[0], params[1]);
                executedCommands.push({ original: line, type: 'ДОДАТИ_РОЗКЛАД' });
            }
        }
        else if (trimmed.startsWith('ВИДАЛИТИ_РОЗКЛАД:')) {
            const time = trimmed.replace('ВИДАЛИТИ_РОЗКЛАД:', '').trim();
            executeRemoveSchedule(time);
            executedCommands.push({ original: line, type: 'ВИДАЛИТИ_РОЗКЛАД' });
        }
        else if (trimmed.startsWith('ДОДАТИ_ЗАВДАННЯ:')) {
            const params = trimmed.replace('ДОДАТИ_ЗАВДАННЯ:', '').trim().split(',').map(p => p.trim());
            if (params.length === 2) {
                executeAddTask(params[0], params[1]);
                executedCommands.push({ original: line, type: 'ДОДАТИ_ЗАВДАННЯ' });
            }
        }
    }
    
    return executedCommands;
}

// Мапінг категорій для запасів
const supplyCategoryMap = {
    'meat_fish': ['мясо', 'риба', 'куряче', 'свинина', 'індичка', 'лосось', 'хек', 'скумбрія', 'оселедець', 'тунець', 'сардини'],
    'eggs_dairy': ['яйця', 'яйце', 'молоко', 'сметана', 'сир', 'йогурт', 'масло', 'вершки'],
    'grains_pasta': ['вівсянка', 'гречка', 'рис', 'булгур', 'пшоно', 'манка', 'кус-кус', 'макарони', 'борошно', 'крохмаль'],
    'vegetables': ['картопля', 'морква', 'цибуля', 'буряк', 'капуста', 'помідори', 'огірки', 'перець', 'часник', 'зелень', 'кабачки', 'баклажани'],
    'fruits_nuts': ['яблука', 'банани', 'груші', 'ягоди', 'горіхи', 'сухофрукти', 'мед', 'варення', 'шоколад'],
    'spices_oils': ['сіль', 'перець', 'паприка', 'куркума', 'лавровий', 'базилік', 'олія', 'соус', 'кетчуп', 'майонез', 'гірчиця', 'оцет'],
    'bread_bakery': ['хліб', 'батон', 'булочки', 'сухарики', 'галети', 'крекери', 'лаваш', 'тортильї'],
    'beverages': ['вода', 'чай', 'кава', 'какао', 'сік', 'компот'],
    'canned_goods': ['горошок', 'кукурудза', 'квасоля', 'томатна паста', 'оливки', 'маслини', 'гриби', 'тушонка'],
    'baking_supplies': ['цукор', 'ванільний', 'розпушувач', 'какао', 'медові коржі']
};

function findSupplyCategory(productName) {
    const lower = productName.toLowerCase();
    for (const [category, keywords] of Object.entries(supplyCategoryMap)) {
        if (keywords.some(kw => lower.includes(kw))) return category;
    }
    return 'vegetables';
}

// КОМАНДИ ВИКОНАННЯ
function executeAddSupply(product, statusText) {
    const statusMap = { 'є': 'available', 'закінчується': 'low', 'немає': 'needed' };
    const status = statusMap[statusText.toLowerCase()] || 'available';
    const category = findSupplyCategory(product);
    
    if (!window.suppliesStatus[category]) window.suppliesStatus[category] = {};
    window.suppliesStatus[category][product] = status;
    
    if (typeof window.renderSupplies === 'function') window.renderSupplies();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
    
    console.log(`✅ Додано запас: ${product} (${statusText})`);
}

function executeAddShopping(categoryName, product) {
    const categoryMap = {
        "м'ясо": "🍖 Мясо та риба",
        "молочне": "🥛 Молочні продукти",
        "овочі": "🥗 Овочі та фрукти",
        "бакалія": "🍝 Бакалія",
        "хліб": "🥖 Хліб та випічка",
        "напої": "🥤 Напої",
        "інше": "📦 Інше"
    };
    
    const category = categoryMap[categoryName.toLowerCase()] || "📦 Інше";
    
    if (!window.shoppingList[category]) window.shoppingList[category] = [];
    
    const exists = window.shoppingList[category].some(item => 
        item.name.toLowerCase() === product.toLowerCase()
    );
    
    if (!exists) {
        window.shoppingList[category].push({
            id: Date.now() + Math.random(),
            name: product,
            bought: false
        });
        
        if (typeof window.renderList === 'function') window.renderList();
        if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
        
        console.log(`✅ Додано в покупки: ${product}`);
    }
}

function executeRemoveShopping(product) {
    let found = false;
    for (const category in window.shoppingList) {
        window.shoppingList[category] = window.shoppingList[category].filter(item => {
            if (item.name.toLowerCase().includes(product.toLowerCase())) {
                found = true;
                return false;
            }
            return true;
        });
    }
    
    if (found) {
        if (typeof window.renderList === 'function') window.renderList();
        if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
        console.log(`✅ Видалено з покупок: ${product}`);
    }
}

function executeAddMenu(day, meal, dish) {
    if (!window.weeklyMenu[day]) window.weeklyMenu[day] = {};
    window.weeklyMenu[day][meal] = dish;
    
    if (typeof window.renderMenu === 'function') window.renderMenu();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
    
    console.log(`✅ Додано меню: ${day}, ${meal} - ${dish}`);
}

function executeRemoveMenu(day, meal) {
    if (window.weeklyMenu[day] && window.weeklyMenu[day][meal]) {
        delete window.weeklyMenu[day][meal];
        
        if (typeof window.renderMenu === 'function') window.renderMenu();
        if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
        
        console.log(`✅ Видалено меню: ${day}, ${meal}`);
    }
}

function executeAddSchedule(time, event) {
    if (!window.dailySchedule) window.dailySchedule = [];
    
    const existingIndex = window.dailySchedule.findIndex(item => item.time === time);
    
    if (existingIndex !== -1) {
        window.dailySchedule[existingIndex].text = event;
    } else {
        window.dailySchedule.push({
            id: Date.now() + Math.random(),
            time: time,
            text: event,
            completed: false
        });
        window.dailySchedule.sort((a, b) => a.time.localeCompare(b.time));
    }
    
    if (typeof window.renderDailySchedule === 'function') window.renderDailySchedule();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
    
    console.log(`✅ Додано розклад: ${time} - ${event}`);
}

function executeRemoveSchedule(time) {
    if (window.dailySchedule) {
        window.dailySchedule = window.dailySchedule.filter(item => item.time !== time);
        
        if (typeof window.renderDailySchedule === 'function') window.renderDailySchedule();
        if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
        
        console.log(`✅ Видалено розклад: ${time}`);
    }
}

function executeAddTask(task, assignee) {
    if (!window.tasks) window.tasks = [];
    
    window.tasks.push({
        id: Date.now() + Math.random(),
        text: task,
        assignee: assignee,
        completed: false
    });
    
    if (typeof window.renderTasks === 'function') window.renderTasks();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
    
    console.log(`✅ Додано завдання: ${task} (${assignee})`);
}

// ФУНКЦІЇ ОНОВЛЕННЯ ДАНИХ
function refreshSuppliesData() {
    const supplies = window.suppliesStatus || {};
    return `📦 ЗАПАСИ:\n${JSON.stringify(formatSupplies(supplies), null, 2)}`;
}

function refreshShoppingData() {
    const shopping = window.shoppingList || {};
    return `🛒 СПИСОК ПОКУПОК:\n${JSON.stringify(formatShoppingList(shopping), null, 2)}`;
}

function refreshMenuData() {
    const menu = window.weeklyMenu || {};
    return `🍽️ МЕНЮ НА ТИЖДЕНЬ:\n${JSON.stringify(formatWeeklyMenu(menu), null, 2)}`;
}

function refreshScheduleData() {
    const schedule = window.dailySchedule || [];
    return `📅 РОЗПОРЯДОК ДНЯ:\n${JSON.stringify(formatDailySchedule(schedule), null, 2)}`;
}

function refreshTasksData() {
    const tasks = window.tasks || [];
    return `🎯 ЗАВДАННЯ:\n${JSON.stringify(formatTasks(tasks), null, 2)}`;
}

// Експорт функцій
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.clearChat = clearChat;
window.initChat = initChat;
window.updateJarvisContext = updateContext;

console.log('✅ Джарвіс з виділеними API ключами завантажено');
            commandsExecuted.forEach(cmd => {
                aiResponse = aiResponse.replace(cmd.original, '');
            });
            aiResponse = aiResponse.trim();
            
            // Перевірка команд перегляду даних
            const viewCommands = commandsExecuted.filter(cmd => cmd.type.startsWith('ПЕРЕГЛЯНУТИ_'));
            
            if (viewCommands.length > 0) {
                chatHistory.push({ role: 'user', content: message });
                if (aiResponse) {
                    chatHistory.push({ role: 'assistant', content: aiResponse });
                }
                
                let freshDataMessage = '📊 Оновлені дані:\n\n';
                for (const cmd of viewCommands) {
                    freshDataMessage += cmd.data + '\n\n';
                }
                
                chatHistory.push({ role: 'user', content: freshDataMessage });
                
                chatContainer.removeChild(loadingMessage);
                if (aiResponse) {
                    chatContainer.appendChild(createMessageElement(aiResponse, 'assistant'));
                }
                chatContainer.appendChild(createMessageElement(freshDataMessage, 'user'));
                chatContainer.scrollTop = chatContainer.scrollHeight;
                
                const newLoadingMessage = createMessageElement('Джарвіс аналізує оновлені дані...', 'assistant', true);
                chatContainer.appendChild(newLoadingMessage);
                chatContainer.scrollTop = chatContainer.scrollHeight;
                
                const followUpContents = buildConversationHistory('Проаналізуй ці дані та дай відповідь на моє питання');
                
                const followUpResponse = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: followUpContents,
                        apiKeyIndex: currentApiKeyIndex, // Той самий виділений ключ
                        generationConfig: {
                            temperature: 0.9,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 2048,
                        }
                    })
                });
                
                if (!followUpResponse.ok) throw new Error(`HTTP error! status: ${followUpResponse.status}`);
                
                const followUpData = await followUpResponse.json();
                if (!followUpData.candidates?.[0]?.content) throw new Error('Некоректна відповідь від Gemini API');
                
                let finalResponse = followUpData.candidates[0].content.parts[0].text;
                finalResponse = cleanMarkdown(finalResponse);
                
                chatContainer.removeChild(newLoadingMessage);
                chatContainer.appendChild(createMessageElement(finalResponse, 'assistant'));
                chatContainer.scrollTop = chatContainer.scrollHeight;
                
                chatHistory.push({ role: 'assistant', content: finalResponse });
                if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
                
                saveHistoryToCache();
                return;
            }
            
            //
