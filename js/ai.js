// AI Assistant - Джарвіс (Gemini API через Vercel) з голосовим режимом

let currentApiKeyIndex = 0;
let chatHistory = [];
let conversationContext = null;
let JARVIS_PROMPT = null;
let currentChatUser = null;

// Завантаження промпту для поточного користувача
async function loadUserPrompt() {
    try {
        const currentUser = window.currentUser ? window.currentUser() : null;
        if (!currentUser) {
            console.error('❌ Користувач не авторизований');
            return false;
        }

        const username = currentUser.username || 'Анонім';
        currentChatUser = username;
        
        if (typeof window.getUserApiKeyIndex === 'function') {
            currentApiKeyIndex = window.getUserApiKeyIndex(username);
            console.log(`🔑 Користувач ${username} використовує API ключ #${currentApiKeyIndex}`);
        }
        
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
        
        console.log('📤 Відправка до Gemini API...');
        console.log('🔑 API Key Index:', currentApiKeyIndex);
        
        const endpoint = typeof API_ENDPOINT !== 'undefined' && API_ENDPOINT 
            ? API_ENDPOINT 
            : '/api/gemini';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents,
                apiKeyIndex: currentApiKeyIndex,
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
        
        if (data.assignedUser) {
            console.log(`✅ Відповідь отримана від ключа #${data.usedApiIndex} (${data.assignedUser})`);
        }
        
        let aiResponse = data.candidates[0].content.parts[0].text;
        aiResponse = cleanMarkdown(aiResponse);

        console.log('📥 Відповідь від AI:', aiResponse.substring(0, 100) + '...');

        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: aiResponse });
        
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
        
        chatContainer.removeChild(loadingMessage);
        chatContainer.appendChild(createMessageElement(aiResponse, 'assistant'));
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        saveHistoryToCache();

    } catch (error) {
        console.error('Error:', error);
        if (chatContainer.contains(loadingMessage)) chatContainer.removeChild(loadingMessage);
        
        showError(getErrorMessage(error));
    }
}

// Допоміжні функції
function buildConversationHistory(message) {
    const contents = [];
    
    if (chatHistory.length === 0 || !conversationContext) {
        const currentData = getCurrentSiteData();
        
        contents.push({
            role: 'user',
            parts: [{ text: `${JARVIS_PROMPT}\n\n=== ПОТОЧНІ ДАНІ З СИСТЕМИ ===\n${currentData}\n\n=== КІНЕЦЬ ДАНИХ ===\n\nВажливо: Ти маєш доступ до всіх команд.` }]
        });
        
        contents.push({
            role: 'model',
            parts: [{ text: 'Зрозумів! Я Джарвіс, ваш асистент. Готовий допомогти!' }]
        });
        
        conversationContext = currentData;
        console.log('✅ Системний промпт додано до контексту');
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
    } else {
        msg += error.message;
    }
    return msg;
}

// Збереження/завантаження історії
function saveHistoryToCache() {
    try {
        if (!currentChatUser) return;
        
        const storageKey = `jarvis_chat_history_${currentChatUser}`;
        localStorage.setItem(storageKey, JSON.stringify(chatHistory));
        
        console.log(`💾 Історія збережена для користувача: ${currentChatUser}`);
    } catch (error) {
        console.error('❌ Помилка збереження історії:', error);
    }
}

function loadHistoryFromCache() {
    try {
        const currentUser = window.currentUser ? window.currentUser() : null;
        if (!currentUser) {
            chatHistory = [];
            conversationContext = null;
            return;
        }
        
        const username = currentUser.username;
        currentChatUser = username;
        
        const storageKey = `jarvis_chat_history_${username}`;
        const savedHistory = localStorage.getItem(storageKey);
        
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            console.log(`✅ Історія завантажена для користувача: ${username}`);
        } else {
            chatHistory = [];
            console.log(`ℹ️ Немає збереженої історії для ${username}`);
        }
        
        conversationContext = null;
    } catch (error) {
        console.error('❌ Помилка завантаження історії:', error);
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

    await loadUserPrompt();
    loadHistoryFromCache();
    
    if (chatHistory.length > 0) {
        for (const historyItem of chatHistory) {
            chatContainer.appendChild(createMessageElement(
                historyItem.content, 
                historyItem.role === 'user' ? 'user' : 'assistant'
            ));
        }
        console.log(`📜 Відновлено ${chatHistory.length} повідомлень з історії`);
    } else {
        const currentUser = window.currentUser ? window.currentUser() : null;
        const userName = currentUser ? currentUser.name : 'Користувач';
        
        chatContainer.appendChild(createMessageElement(
            `Доброго дня, ${userName}! Я Джарвіс, ваш асистент.\n\nЯ готовий допомогти з меню, покупками, завданнями та розпорядком дня. Чим можу допомогти сьогодні?`,
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
    if (!confirm('Ви впевнені, що хочете очистити історію чату?')) return;
    
    const chatContainer = document.getElementById('chatMessages');
    if (chatContainer) {
        chatContainer.innerHTML = '';
        chatHistory = [];
        conversationContext = null;
        
        if (currentChatUser) {
            localStorage.removeItem(`jarvis_chat_history_${currentChatUser}`);
            console.log(`🗑️ Історія видалена для користувача: ${currentChatUser}`);
        }
        
        initChat();
    }
}

function updateContext() {
    conversationContext = getCurrentSiteData();
    console.log('✅ Контекст Джарвіса оновлено');
}

// Експорт функцій
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;
window.clearChat = clearChat;
window.initChat = initChat;
window.updateJarvisContext = updateContext;
window.getCurrentSiteData = getCurrentSiteData;

console.log('✅ AI Assistant з текстовим режимом завантажено');
