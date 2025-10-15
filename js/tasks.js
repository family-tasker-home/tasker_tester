// ===== TASKS BREAKDOWN LOGIC =====

// Структура для зберігання стану завдань
if (typeof window.tasksState === 'undefined') {
    window.tasksState = {};
}

let tasksStructure = null;

// Завантаження структури завдань з JSON
async function loadTasksStructure() {
    try {
        const response = await fetch('system/tasks.json');
        if (!response.ok) {
            throw new Error('Failed to load tasks structure');
        }
        tasksStructure = await response.json();
        console.log('✅ Структура завдань завантажена');
        return tasksStructure;
    } catch (error) {
        console.error('❌ Помилка завантаження структури завдань:', error);
        return null;
    }
}

// Створення HTML структури секції
window.createTasksSection = async function() {
    const section = document.getElementById('tasks-section');
    
    // Завантажуємо структуру якщо ще не завантажена
    if (!tasksStructure) {
        await loadTasksStructure();
    }
    
    if (!tasksStructure) {
        section.innerHTML = `
            <div class="container">
                <div class="header">
                    <h1>🎯 Розподіл завдань</h1>
                    <p>Помилка завантаження структури завдань</p>
                </div>
            </div>
        `;
        return;
    }
    
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>🎯 Розподіл завдань</h1>
                <p>Виконуйте завдання та відмічайте прогрес</p>
            </div>
            
            <div class="content">
                <div id="tasksList" class="tasks-container"></div>

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
    
    window.renderTasks();
};

// Перемикання стану завдання
window.toggleTask = function(category, subcategory, taskIndex) {
    const key = `${category}|${subcategory}|${taskIndex}`;
    
    if (!window.tasksState[key]) {
        window.tasksState[key] = { completed: false };
    }
    
    window.tasksState[key].completed = !window.tasksState[key].completed;
    
    window.renderTasks();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

// Перемикання стану всієї підкатегорії
window.toggleSubcategory = function(category, subcategory) {
    const subcategoryData = tasksStructure[category].subcategories[subcategory];
    const tasksCount = subcategoryData.tasks.length;
    
    // Перевіряємо чи всі завдання виконані
    let allCompleted = true;
    for (let i = 0; i < tasksCount; i++) {
        const key = `${category}|${subcategory}|${i}`;
        if (!window.tasksState[key] || !window.tasksState[key].completed) {
            allCompleted = false;
            break;
        }
    }
    
    // Якщо всі виконані - знімаємо, якщо ні - ставимо всі
    for (let i = 0; i < tasksCount; i++) {
        const key = `${category}|${subcategory}|${i}`;
        window.tasksState[key] = { completed: !allCompleted };
    }
    
    window.renderTasks();
    if (typeof window.autoSaveToCache === 'function') window.autoSaveToCache();
};

// Розгорнути/згорнути категорію
window.toggleCategory = function(category) {
    const element = document.getElementById(`category-${category}`);
    if (element) {
        element.classList.toggle('collapsed');
    }
};

// Отримати прогрес підкатегорії
function getSubcategoryProgress(category, subcategory) {
    const subcategoryData = tasksStructure[category].subcategories[subcategory];
    const total = subcategoryData.tasks.length;
    let completed = 0;
    
    for (let i = 0; i < total; i++) {
        const key = `${category}|${subcategory}|${i}`;
        if (window.tasksState[key] && window.tasksState[key].completed) {
            completed++;
        }
    }
    
    return { completed, total, percentage: Math.round((completed / total) * 100) };
}

// Отримати прогрес категорії
function getCategoryProgress(category) {
    const categoryData = tasksStructure[category];
    let totalTasks = 0;
    let completedTasks = 0;
    
    for (const subcategory in categoryData.subcategories) {
        const progress = getSubcategoryProgress(category, subcategory);
        totalTasks += progress.total;
        completedTasks += progress.completed;
    }
    
    return { 
        completed: completedTasks, 
        total: totalTasks, 
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0 
    };
}

// Рендер всіх завдань
window.renderTasks = function() {
    const container = document.getElementById('tasksList');
    if (!container || !tasksStructure) return;
    
    let html = '';
    
    for (const category in tasksStructure) {
        const categoryData = tasksStructure[category];
        const categoryProgress = getCategoryProgress(category);
        
        html += `
            <div class="task-category" id="category-${category}">
                <div class="category-header" onclick="window.toggleCategory('${category}')">
                    <div class="category-title">
                        <span class="category-icon">${categoryData.icon}</span>
                        <h2>${category}</h2>
                        <span class="category-progress">${categoryProgress.completed}/${categoryProgress.total}</span>
                    </div>
                    <div class="category-progress-bar">
                        <div class="progress-fill" style="width: ${categoryProgress.percentage}%"></div>
                    </div>
                    <button class="collapse-btn">▼</button>
                </div>
                
                <div class="category-content">
                    ${Object.keys(categoryData.subcategories).map(subcategory => {
                        const subcategoryData = categoryData.subcategories[subcategory];
                        const progress = getSubcategoryProgress(category, subcategory);
                        const allCompleted = progress.completed === progress.total;
                        
                        return `
                            <div class="subcategory-card ${allCompleted ? 'completed' : ''}">
                                <div class="subcategory-header" onclick="window.toggleSubcategory('${category}', '${subcategory}')">
                                    <div class="subcategory-title">
                                        <span class="subcategory-icon">${subcategoryData.icon}</span>
                                        <h3>${subcategory}</h3>
                                    </div>
                                    <div class="subcategory-stats">
                                        <span class="progress-text">${progress.completed}/${progress.total}</span>
                                        <div class="progress-circle" style="--progress: ${progress.percentage}%">
                                            <span>${progress.percentage}%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="tasks-list">
                                    ${subcategoryData.tasks.map((task, index) => {
                                        const key = `${category}|${subcategory}|${index}`;
                                        const completed = window.tasksState[key] && window.tasksState[key].completed;
                                        
                                        return `
                                            <div class="task-item ${completed ? 'completed' : ''}" 
                                                 onclick="window.toggleTask('${category}', '${subcategory}', ${index})">
                                                <div class="task-checkbox">
                                                    <span class="checkmark">${completed ? '✓' : ''}</span>
                                                </div>
                                                <span class="task-text">${task}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
};

// Експорт для Firebase
window.getTasksStateForSave = function() {
    return window.tasksState;
};

window.loadTasksStateFromSave = function(state) {
    if (state && typeof state === 'object') {
        window.tasksState = state;
        window.renderTasks();
    }
};

console.log('✅ Tasks system завантажено');
