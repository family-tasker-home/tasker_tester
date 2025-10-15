// ===== TASKS BREAKDOWN LOGIC =====

// Структура для зберігання стану завдань користувача
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

// Отримати категорію завдань для поточного користувача
function getUserTaskCategory() {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return null;
    
    const roleInfo = window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : null;
    if (!roleInfo) return null;
    
    const role = roleInfo.role;
    
    // Якщо Admin або Dev - показуємо всі категорії
    if (role === 'Dev') {
        return null; // null означає "всі категорії"
    }
    
    // Якщо Viewer - нічого не показуємо
    if (role === 'Viewer') {
        return 'Viewer'; // Спеціальне значення
    }
    
    // Інакше повертаємо назву категорії (Кухня, Ванна, Кладовка)
    return role;
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
    
    const currentUser = window.currentUser ? window.currentUser() : null;
    const roleInfo = currentUser ? (window.getTodayRoleInfo ? window.getTodayRoleInfo(currentUser.username) : null) : null;
    const todayRole = roleInfo ? roleInfo.role : 'Viewer';
    const dayName = roleInfo ? roleInfo.dayName : '';
    
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>🎯 Розподіл завдань</h1>
                <p>Ваша роль сьогодні (${dayName}): <strong>${todayRole}</strong></p>
                ${todayRole === 'Viewer' ? '<p style="color: #ffa500;">Сьогодні у вас вихідний! 🎉</p>' : '<p style="color: #4CAF50; font-size: 0.9em; margin-top: 5px;">💾 Всі зміни автоматично зберігаються</p>'}
            </div>
            
            <div class="content">
                <div id="tasksList" class="tasks-container"></div>
            </div>
        </div>
    `;
    
    window.renderTasks();
};

// Перемикання стану завдання
window.toggleTask = function(category, subcategory, taskIndex) {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return;
    
    const username = currentUser.username;
    const key = `${category}|${subcategory}|${taskIndex}`;
    
    if (!window.tasksState[username]) {
        window.tasksState[username] = {};
    }
    
    if (!window.tasksState[username][key]) {
        window.tasksState[username][key] = { 
            completed: false,
            completedAt: null
        };
    }
    
    const wasCompleted = window.tasksState[username][key].completed;
    window.tasksState[username][key].completed = !wasCompleted;
    window.tasksState[username][key].completedAt = !wasCompleted ? new Date().toISOString() : null;
    
    window.renderTasks();
    
    // Автоматичне збереження в Firebase
    if (typeof window.autoSaveTasksToFirebase === 'function') {
        window.autoSaveTasksToFirebase();
    }
    
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
};

// Перемикання стану всієї підкатегорії
window.toggleSubcategory = function(category, subcategory) {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return;
    
    const username = currentUser.username;
    const subcategoryData = tasksStructure[category].subcategories[subcategory];
    const tasksCount = subcategoryData.tasks.length;
    
    if (!window.tasksState[username]) {
        window.tasksState[username] = {};
    }
    
    // Перевіряємо чи всі завдання виконані
    let allCompleted = true;
    for (let i = 0; i < tasksCount; i++) {
        const key = `${category}|${subcategory}|${i}`;
        if (!window.tasksState[username][key] || !window.tasksState[username][key].completed) {
            allCompleted = false;
            break;
        }
    }
    
    // Якщо всі виконані - знімаємо, якщо ні - ставимо всі
    const now = new Date().toISOString();
    for (let i = 0; i < tasksCount; i++) {
        const key = `${category}|${subcategory}|${i}`;
        window.tasksState[username][key] = { 
            completed: !allCompleted,
            completedAt: !allCompleted ? now : null
        };
    }
    
    window.renderTasks();
    
    // Автоматичне збереження в Firebase
    if (typeof window.autoSaveTasksToFirebase === 'function') {
        window.autoSaveTasksToFirebase();
    }
    
    if (typeof window.autoSaveToCache === 'function') {
        window.autoSaveToCache();
    }
};

// Розгорнути/згорнути категорію
window.toggleCategory = function(category) {
    const element = document.getElementById(`category-${category}`);
    if (element) {
        element.classList.toggle('collapsed');
    }
};

// Отримати прогрес підкатегорії для поточного користувача
function getSubcategoryProgress(category, subcategory) {
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) return { completed: 0, total: 0, percentage: 0 };
    
    const username = currentUser.username;
    const subcategoryData = tasksStructure[category].subcategories[subcategory];
    const total = subcategoryData.tasks.length;
    let completed = 0;
    
    for (let i = 0; i < total; i++) {
        const key = `${category}|${subcategory}|${i}`;
        if (window.tasksState[username] && 
            window.tasksState[username][key] && 
            window.tasksState[username][key].completed) {
            completed++;
        }
    }
    
    return { completed, total, percentage: Math.round((completed / total) * 100) };
}

// Отримати прогрес категорії для поточного користувача
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
    
    const currentUser = window.currentUser ? window.currentUser() : null;
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state"><p>Користувач не визначений</p></div>';
        return;
    }
    
    const username = currentUser.username;
    const userCategory = getUserTaskCategory();
    
    // Якщо Viewer - показуємо повідомлення про вихідний
    if (userCategory === 'Viewer') {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 4em; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #ffa500; margin-bottom: 10px;">Сьогодні у вас вихідний!</h2>
                <p style="font-size: 1.2em; color: #d0d0d0;">Відпочивайте та насолоджуйтесь днем! 😊</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    let categoriesToShow = [];
    
    // Визначаємо які категорії показувати
    if (userCategory === null) {
        // Dev бачить всі категорії
        categoriesToShow = Object.keys(tasksStructure);
    } else {
        // Інші бачать тільки свою категорію
        categoriesToShow = [userCategory];
    }
    
    // Перевіряємо чи категорія існує
    const validCategories = categoriesToShow.filter(cat => tasksStructure[cat]);
    
    if (validCategories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Немає завдань для вашої ролі</p>
            </div>
        `;
        return;
    }
    
    for (const category of validCategories) {
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
                                        const taskState = window.tasksState[username] && window.tasksState[username][key];
                                        const completed = taskState && taskState.completed;
                                        const completedAt = taskState && taskState.completedAt;
                                        
                                        let timeInfo = '';
                                        if (completed && completedAt) {
                                            const date = new Date(completedAt);
                                            timeInfo = `<span class="task-time">✓ ${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>`;
                                        }
                                        
                                        return `
                                            <div class="task-item ${completed ? 'completed' : ''}" 
                                                 onclick="window.toggleTask('${category}', '${subcategory}', ${index})">
                                                <div class="task-checkbox">
                                                    <span class="checkmark">${completed ? '✓' : ''}</span>
                                                </div>
                                                <div class="task-info">
                                                    <span class="task-text">${task}</span>
                                                    ${timeInfo}
                                                </div>
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

console.log('✅ Tasks system завантажено (персоналізована версія)');
