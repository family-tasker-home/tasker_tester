// ===== TASKS BREAKDOWN LOGIC =====

// Ініціалізація змінної
if (typeof window.tasks === 'undefined') {
    window.tasks = [];
}

// Створення HTML структури секції
window.createTasksSection = function() {
    const section = document.getElementById('tasks-section');
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>🎯 Розподіл завдань</h1>
                <p>Створюйте завдання та розбивайте їх на підзавдання</p>
            </div>
            
            <div class="content">
                <div class="add-task-section">
                    <h2>➕ Додати нове завдання</h2>
                    <div class="add-task-input">
                        <input type="text" id="mainTaskInput" placeholder="Введіть назву завдання...">
                        <button onclick="window.addMainTask()">Додати завдання</button>
                    </div>
                </div>

                <div id="tasksList" class="tasks-grid">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M15,18V16H6V18H15M18,14V12H6V14H18Z"/>
                        </svg>
                        <p>Додайте своє перше завдання, щоб почати</p>
                    </div>
                </div>

                <div class="action-buttons">
                    <button class="save-btn" onclick="window.saveTasksToFirebase()">
                        <span>☁️</span>
                        <span>Зберегти в хмару</span>
                    </button>
                    <button class="load-btn" onclick="window.loadTasksFromFirebase()">
                        <span>☁️</span>
                        <span>Завантажити з хмари</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Додаємо обробник Enter для поля вводу
    const mainTaskInput = document.getElementById('mainTaskInput');
    if (mainTaskInput) {
        mainTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.addMainTask();
            }
        });
    }
};

// Додати нове головне завдання
window.addMainTask = function() {
    const input = document.getElementById('mainTaskInput');
    const taskName = input.value.trim();

    if (!taskName) {
        alert('Будь ласка, введіть назву завдання!');
        return;
    }

    window.tasks.push({
        id: Date.now(),
        name: taskName,
        subtasks: []
    });

    input.value = '';
    window.renderTasks();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

// Видалити головне завдання
window.deleteMainTask = function(taskId) {
    window.tasks = window.tasks.filter(t => t.id !== taskId);
    window.renderTasks();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

// Додати підзавдання
window.addSubtask = function(taskId) {
    const input = document.getElementById(`subtask-input-${taskId}`);
    const subtaskName = input.value.trim();

    if (!subtaskName) {
        alert('Будь ласка, введіть назву підзавдання!');
        return;
    }

    const task = window.tasks.find(t => t.id === taskId);
    if (task && task.subtasks.length < 5) {
        task.subtasks.push({
            id: Date.now(),
            name: subtaskName
        });
        input.value = '';
        window.renderTasks();
        if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
    }
};

// Видалити підзавдання
window.deleteSubtask = function(taskId, subtaskId) {
    const task = window.tasks.find(t => t.id === taskId);
    if (task) {
        task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
        window.renderTasks();
        if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
    }
};

// Рендер всіх завдань
window.renderTasks = function() {
    const container = document.getElementById('tasksList');

    if (!container) return;

    if (!window.tasks || window.tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M15,18V16H6V18H15M18,14V12H6V14H18Z"/>
                </svg>
                <p>Додайте своє перше завдання, щоб почати</p>
            </div>
        `;
        return;
    }

    container.innerHTML = window.tasks.map(task => {
        const canAddMore = task.subtasks.length < 5;
        const subtasksHtml = task.subtasks.map(subtask => `
            <div class="subtask-item">
                <span class="subtask-text">🔹 ${subtask.name}</span>
                <button class="delete-subtask-btn" onclick="window.deleteSubtask(${task.id}, ${subtask.id})">✕</button>
            </div>
        `).join('');

        return `
            <div class="task-card">
                <div class="task-header">
                    <div class="task-title">${task.name}</div>
                    <button class="delete-task-btn" onclick="window.deleteMainTask(${task.id})">🗑️</button>
                </div>
                
                ${task.subtasks.length > 0 ? `
                    <div class="subtasks">
                        ${subtasksHtml}
                    </div>
                ` : '<p style="color: #9ca3af; font-style: italic;">Ще немає підзавдань</p>'}
                
                <div class="add-subtask">
                    <input 
                        type="text" 
                        id="subtask-input-${task.id}" 
                        placeholder="Додати підзавдання..."
                        onkeypress="if(event.key === 'Enter') window.addSubtask(${task.id})"
                        ${!canAddMore ? 'disabled' : ''}
                    >
                    <button 
                        onclick="window.addSubtask(${task.id})"
                        ${!canAddMore ? 'disabled' : ''}
                    >
                        ➕
                    </button>
                </div>
                <div class="subtask-counter">
                    ${task.subtasks.length} / 5 підзавдань
                </div>
            </div>
        `;
    }).join('');
};
