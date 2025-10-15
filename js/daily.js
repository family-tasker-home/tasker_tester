// ===== DAILY SCHEDULE LOGIC =====

// Ініціалізація змінної
if (typeof window.dailySchedule === 'undefined') {
    window.dailySchedule = [];
}

// Створення HTML структури секції
window.createDailySection = function() {
    const section = document.getElementById('daily-section');
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>📅 Розпорядок дня</h1>
                <p>Плануйте свій день ефективно</p>
            </div>
            
            <div class="content">
                <div class="add-task">
                    <input type="time" id="dailyTimeInput" placeholder="Година">
                    <input type="text" id="dailyTaskInput" placeholder="Введіть завдання...">
                    <button onclick="addDailyTask()">➕ Додати</button>
                </div>

                <div id="dailyScheduleList" class="schedule-list">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                        </svg>
                        <p>Почніть додавати завдання до вашого розпорядку дня</p>
                    </div>
                </div>

                <div class="action-buttons">
                    <button class="save-btn" onclick="saveDailyToFirebase()">
                        <span>☁️</span>
                        <span>Зберегти в хмару</span>
                    </button>
                    <button class="load-btn" onclick="loadDailyFromFirebase()">
                        <span>☁️</span>
                        <span>Завантажити з хмари</span>
                    </button>
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

// Додати нове завдання
window.addDailyTask = function() {
    const timeInput = document.getElementById('dailyTimeInput');
    const taskInput = document.getElementById('dailyTaskInput');
    
    const time = timeInput.value;
    const task = taskInput.value.trim();

    if (!time || !task) {
        alert('Будь ласка, заповніть всі поля!');
        return;
    }

    window.dailySchedule.push({ time, task });
    window.dailySchedule.sort((a, b) => a.time.localeCompare(b.time));

    timeInput.value = '';
    taskInput.value = '';
    
    window.renderDailySchedule();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

// Видалити завдання
window.deleteDailyTask = function(index) {
    window.dailySchedule.splice(index, 1);
    window.renderDailySchedule();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

// Рендер списку завдань
window.renderDailySchedule = function() {
    const list = document.getElementById('dailyScheduleList');
    
    if (!list) return;
    
    if (!window.dailySchedule || window.dailySchedule.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                <p>Почніть додавати завдання до вашого розпорядку дня</p>
            </div>
        `;
        return;
    }

    list.innerHTML = window.dailySchedule.map((item, index) => `
        <div class="schedule-item">
            <div class="schedule-time">${item.time}</div>
            <div class="schedule-task">${item.task}</div>
            <button class="delete-btn" onclick="deleteDailyTask(${index})">🗑️</button>
        </div>
    `).join('');
};
