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
    
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : null;
    const todayRole = roleInfo ? roleInfo.role : 'Viewer';
    const dayName = roleInfo ? roleInfo.dayName : '';
    const canModify = todayRole !== 'Viewer';
    
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>📅 Розпорядок дня</h1>
                <p>Профіль: <strong>${currentUser.avatar} ${currentUser.name}</strong></p>
                <p style="font-size: 0.9em; margin-top: 5px;">Ваша роль сьогодні (${dayName}): <strong>${todayRole}</strong></p>
                ${canModify ? '<p style="color: #4CAF50; font-size: 0.9em; margin-top: 5px;">💾 Всі зміни автоматично зберігаються</p>' : '<p style="color: #ffa500; font-size: 0.9em; margin-top: 5px;">Сьогодні у вас вихідний! 🎉</p>'}
            </div>
            
            <div class="content">
                ${canModify ? `
                    <div class="add-task">
                        <input type="time" id="dailyTimeInput" placeholder="Година">
                        <input type="text" id="dailyTaskInput" placeholder="Введіть завдання...">
                        <button onclick="window.addDailyTask()">➕ Додати</button>
                    </div>
                ` : ''}

                <div id="dailyScheduleList" class="schedule-list">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                        </svg>
                        <p>${canModify ? 'Почніть додавати завдання до вашого розпорядку дня' : 'Розпорядок дня порожній'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Додаємо обробник Enter для поля вводу (тільки якщо можна редагувати)
    if (canModify) {
        const taskInput = document.getElementById('dailyTaskInput');
        if (taskInput) {
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    window.addDailyTask();
                }
            });
        }
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
    if (!currentUser) return;
    
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : null;
    if (roleInfo && roleInfo.role === 'Viewer') {
        alert('❌ Сьогодні у вас вихідний! Ви не можете додавати завдання.');
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
    
    window.dailyScheduleState[username].push({ time, task });
    window.dailyScheduleState[username].sort((a, b) => a.time.localeCompare(b.time));

    timeInput.value = '';
    taskInput.value = '';
    
    window.renderDailySchedule();
    
    // Автоматичне збереження в Firebase
    if (typeof window.autoSaveDailySchedule === 'function') {
        window.autoSaveDailySchedule();
    }
    
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
};

// Видалити завдання
window.deleteDailyTask = function(index) {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return;
    
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : null;
    if (roleInfo && roleInfo.role === 'Viewer') {
        alert('❌ Сьогодні у вас вихідний! Ви не можете видаляти завдання.');
        return;
    }
    
    const username = currentUser.username;
    if (!window.dailyScheduleState[username]) return;
    
    window.dailyScheduleState[username].splice(index, 1);
    window.renderDailySchedule();
    
    // Автоматичне збереження в Firebase
    if (typeof window.autoSaveDailySchedule === 'function') {
        window.autoSaveDailySchedule();
    }
    
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
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : null;
    const canModify = roleInfo && roleInfo.role !== 'Viewer';
    
    if (!schedule || schedule.length === 0) {
        if (roleInfo && roleInfo.role === 'Viewer') {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="emoji">🎉</div>
                    <h2>Сьогодні у вас вихідний!</h2>
                    <p style="font-size: 1.2em; color: #d0d0d0;">Відпочивайте та насолоджуйтесь днем! 😊</p>
                </div>
            `;
        } else {
            list.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                    <p>Почніть додавати завдання до вашого розпорядку дня</p>
                </div>
            `;
        }
        return;
    }

    list.innerHTML = schedule.map((item, index) => `
        <div class="schedule-item">
            <div class="schedule-time">${item.time}</div>
            <div class="schedule-task">${item.task}</div>
            ${canModify ? `<button class="delete-btn" onclick="window.deleteDailyTask(${index})">🗑️</button>` : ''}
        </div>
    `).join('');
};

// Експорт для Firebase
window.getDailyScheduleForSave = function() {
    return window.dailyScheduleState;
};

window.loadDailyScheduleFromSave = function(state) {
    if (state && typeof state === 'object') {
        window.dailyScheduleState = state;
        window.renderDailySchedule();
    }
};

console.log('✅ Daily schedule system завантажено (персоналізована версія)');
