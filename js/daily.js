// ===== DAILY SCHEDULE LOGIC =====

// Структура для зберігання розпорядків всіх користувачів
if (typeof window.dailyScheduleState === 'undefined') {
    window.dailyScheduleState = {};
}

// Створення HTML структури секції
window.createDailySection = function() {
    const section = document.getElementById('daily-section');
    
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        section.innerHTML = `
            <div class="container">
                <div class="header">
                    <h1>📅 Розпорядок дня</h1>
                    <p>Користувач не визначений</p>
                </div>
            </div>
        `;
        return;
    }
    
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>📅 Розпорядок дня</h1>
                <p>Профіль: <strong>${currentUser.avatar} ${currentUser.name}</strong></p>
                <p style="color: #4CAF50; font-size: 0.9em; margin-top: 10px;">💾 Всі зміни автоматично зберігаються в базу</p>
                <p style="color: #d0d0d0; font-size: 0.85em; margin-top: 5px; opacity: 0.8;">Це ваш персональний розпорядок - тільки ви його бачите</p>
            </div>
            
            <div class="content">
                <div class="add-task">
                    <input type="time" id="dailyTimeInput" placeholder="Година">
                    <input type="text" id="dailyTaskInput" placeholder="Введіть завдання...">
                    <button onclick="window.addDailyTask()">➕ Додати</button>
                </div>

                <div id="dailyScheduleList" class="schedule-list">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                        </svg>
                        <p>Почніть додавати завдання до вашого розпорядку дня</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Додаємо обробник Enter для поля вводу
    const taskInput = document.getElementById('dailyTaskInput');
    if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.addDailyTask();
            }
        });
    }
};

// Отримати розпорядок поточного користувача
function getUserSchedule() {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return [];
    
    const username = currentUser.username;
    if (!window.dailyScheduleState[username]) {
        window.dailyScheduleState[username] = [];
    }
    
    return window.dailyScheduleState[username];
}

// Додати нове завдання
window.addDailyTask = function() {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Користувач не визначений!');
        return;
    }
    
    const timeInput = document.getElementById('dailyTimeInput');
    const taskInput = document.getElementById('dailyTaskInput');
    
    if (!timeInput || !taskInput) return;
    
    const time = timeInput.value;
    const task = taskInput.value.trim();

    if (!time || !task) {
        alert('Будь ласка, заповніть всі поля!');
        return;
    }

    const username = currentUser.username;
    if (!window.dailyScheduleState[username]) {
        window.dailyScheduleState[username] = [];
    }
    
    // Додаємо завдання
    window.dailyScheduleState[username].push({ time, task });
    
    // Сортуємо за часом
    window.dailyScheduleState[username].sort((a, b) => a.time.localeCompare(b.time));

    // Очищаємо поля вводу
    timeInput.value = '';
    taskInput.value = '';
    
    // Рендеримо список
    window.renderDailySchedule();
    
    console.log(`✅ Додано завдання для ${username}:`, { time, task });
    console.log('📊 Поточний розпорядок:', window.dailyScheduleState[username]);
    
    // Автоматичне збереження в Firebase (тільки розпорядку цього користувача)
    if (typeof window.autoSaveDailySchedule === 'function') {
        window.autoSaveDailySchedule();
    }
    
    // Додатково зберігаємо в локальний кеш
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
};

// Видалити завдання
window.deleteDailyTask = function(index) {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        alert('❌ Користувач не визначений!');
        return;
    }
    
    const username = currentUser.username;
    if (!window.dailyScheduleState[username]) return;
    
    // Видаляємо завдання
    const deletedTask = window.dailyScheduleState[username][index];
    window.dailyScheduleState[username].splice(index, 1);
    
    // Рендеримо список
    window.renderDailySchedule();
    
    console.log(`🗑️ Видалено завдання для ${username}:`, deletedTask);
    console.log('📊 Поточний розпорядок:', window.dailyScheduleState[username]);
    
    // Автоматичне збереження в Firebase
    if (typeof window.autoSaveDailySchedule === 'function') {
        window.autoSaveDailySchedule();
    }
    
    // Додатково зберігаємо в локальний кеш
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
};

// Рендер списку завдань
window.renderDailySchedule = function() {
    const list = document.getElementById('dailyScheduleList');
    
    if (!list) return;
    
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        list.innerHTML = `
            <div class="empty-state">
                <p>Користувач не визначений</p>
            </div>
        `;
        return;
    }
    
    const schedule = getUserSchedule();
    
    if (!schedule || schedule.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                <p>Почніть додавати завдання до вашого розпорядку дня</p>
                <p style="font-size: 0.9em; color: #888; margin-top: 10px;">Це ваш персональний розпорядок - тільки ви можете його бачити та редагувати</p>
            </div>
        `;
        return;
    }

    list.innerHTML = schedule.map((item, index) => `
        <div class="schedule-item">
            <div class="schedule-time">${item.time}</div>
            <div class="schedule-task">${item.task}</div>
            <button class="delete-btn" onclick="window.deleteDailyTask(${index})">🗑️</button>
        </div>
    `).join('');
    
    console.log(`📋 Відображено ${schedule.length} завдань для ${currentUser.username}`);
};

// Функція для показу статусу збереження
window.showSaveStatus = function(message, type = 'success') {
    // Видаляємо попередні повідомлення
    const existingStatus = document.querySelector('.save-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = `save-status ${type}`;
    statusDiv.textContent = message;
    
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        statusDiv.style.animation = 'slideOutToRight 0.3s ease';
        setTimeout(() => statusDiv.remove(), 300);
    }, 2000);
};

// Експорт для Firebase (повертає розпорядок ТІЛЬКИ поточного користувача)
window.getDailyScheduleForSave = function() {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return [];
    
    const username = currentUser.username;
    return window.dailyScheduleState[username] || [];
};

// Завантаження розпорядку з Firebase (для поточного користувача)
window.loadDailyScheduleFromSave = function(username, data) {
    if (!username || !data) return;
    
    if (!window.dailyScheduleState) {
        window.dailyScheduleState = {};
    }
    
    window.dailyScheduleState[username] = data;
    
    // Рендеримо тільки якщо це поточний користувач
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (currentUser && currentUser.username === username) {
        window.renderDailySchedule();
    }
    
    console.log(`✅ Розпорядок завантажено для ${username}:`, data);
};

console.log('✅ Daily schedule system завантажено (персоналізована версія з автозбереженням)');
