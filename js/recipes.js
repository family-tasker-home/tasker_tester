// ===== RECIPES LOGIC WITH DISH TYPE CATEGORIES =====

// Маппінг типів страв на іконки та кольори
const dishTypeConfig = {
    'meat': {
        name: 'М\'ясна',
        icon: '🍖',
        color: '#e74c3c'
    },
    'fish': {
        name: 'Рибна',
        icon: '🐟',
        color: '#3498db'
    },
    'vegetarian': {
        name: 'Вегетаріанська',
        icon: '🥗',
        color: '#2ecc71'
    },
    'vegan': {
        name: 'Веганська',
        icon: '🌱',
        color: '#27ae60'
    }
};

// Кеш завантажених рецептів
let recipesCache = {};

// Поточна відкрита категорія
let currentOpenCategory = null;

// Стан пошуку
let isSearchOpen = false;

// Всі рецепти для пошуку
let allRecipes = [];

// Список категорій (завантажується динамічно)
let recipeCategories = [];

// Завантаження списку категорій
async function loadCategories() {
    try {
        const response = await fetch('recepts/categories.json');
        if (response.ok) {
            const data = await response.json();
            recipeCategories = data;
            console.log(`✅ Завантажено ${recipeCategories.length} категорій`);
        }
    } catch (error) {
        console.error('Помилка завантаження категорій:', error);
        recipeCategories = [];
    }
}

// Створення HTML структури секції рецептів
window.createRecipesSection = async function() {
    // Завантажуємо категорії перед створенням
    await loadCategories();
    
    const section = document.getElementById('recipes-section');
    
    section.innerHTML = `
        <div class="container">
            <div class="header">
                <h1>📖 Книга рецептів</h1>
                <p>Збірка улюблених страв</p>
                <button class="search-toggle-btn" onclick="window.toggleSearch()" title="Пошук рецептів">
                    🔍
                </button>
            </div>
            
            <!-- Панель пошуку -->
            <div class="search-panel" id="searchPanel" style="display: none;">
                <div class="search-header">
                    <h2>🔍 Пошук рецептів</h2>
                    <button class="close-search-btn" onclick="window.closeSearch()">✕</button>
                </div>
                <div class="search-input-wrapper">
                    <input 
                        type="text" 
                        id="recipeSearchInput" 
                        class="search-input" 
                        placeholder="Введіть назву страви..."
                        oninput="window.searchRecipes()"
                    >
                    <button class="clear-search-btn" onclick="window.clearSearchInput()" style="display: none;">✕</button>
                </div>
                <div class="search-results" id="searchResults">
                    <div class="empty-search">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                        </svg>
                        <p>Почніть вводити назву страви</p>
                    </div>
                </div>
            </div>
            
            <div class="content">
                <!-- Категорії рецептів -->
                <div class="recipes-categories">
                    <h2>🗂️ Категорії</h2>
                    <div class="categories-grid" id="categoriesGrid">
                        <!-- Категорії створюються динамічно -->
                    </div>
                </div>

                <!-- Список рецептів -->
                <div class="recipes-list" id="recipesList" style="display: none;">
                    <!-- Рецепти створюються динамічно -->
                </div>

                <!-- Детальний вигляд рецепту -->
                <div class="recipe-detail" id="recipeDetail" style="display: none;">
                    <!-- Деталі рецепту створюються динамічно -->
                </div>
            </div>
        </div>
    `;
    
    renderCategories();
    loadAllRecipesForSearch();
};

// Відображення категорій
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    
    if (recipeCategories.length === 0) {
        grid.innerHTML = '<p style="color: #b0b0b0; grid-column: 1/-1;">Категорії не завантажені</p>';
        return;
    }
    
    grid.innerHTML = recipeCategories.map(category => `
        <div class="category-card" onclick="window.toggleRecipeCategory('${category.type}', '${category.name}')">
            <div class="category-icon">${category.icon}</div>
            <div class="category-name">${category.name}</div>
        </div>
    `).join('');
}

// Перемикання категорії рецептів
window.toggleRecipeCategory = async function(categoryType, categoryName) {
    currentOpenCategory = categoryType;
    await window.loadRecipeCategory(categoryType, categoryName);
    
    document.querySelector('.recipes-categories').style.display = 'none';
    document.querySelector('.header').style.display = 'none';
    document.getElementById('recipesList').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Закрити список рецептів
function closeRecipesList() {
    const recipesList = document.getElementById('recipesList');
    const recipeDetail = document.getElementById('recipeDetail');
    
    recipeDetail.style.display = 'none';
    recipesList.style.display = 'none';
    
    document.querySelector('.recipes-categories').style.display = 'block';
    document.querySelector('.header').style.display = 'block';
    
    currentOpenCategory = null;
    renderCategories();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Завантаження рецептів категорії
window.loadRecipeCategory = async function(categoryType, categoryName) {
    const recipesList = document.getElementById('recipesList');
    const recipeDetail = document.getElementById('recipeDetail');
    
    recipeDetail.style.display = 'none';
    
    recipesList.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Завантаження рецептів...</p>
        </div>
    `;
    
    try {
        // Знаходимо категорію
        const category = recipeCategories.find(cat => cat.type === categoryType);
        if (!category || !category.files) {
            throw new Error('Категорія не знайдена');
        }
        
        // Завантажуємо всі файли цієї категорії
        const allCategoryRecipes = [];
        
        for (const file of category.files) {
            // Перевіряємо кеш
            if (!recipesCache[file]) {
                const response = await fetch(file);
                if (!response.ok) {
                    console.error(`Не вдалося завантажити ${file}`);
                    continue;
                }
                const data = await response.json();
                recipesCache[file] = data;
            }
            
            // Додаємо рецепти до загального списку
            const data = recipesCache[file];
            allCategoryRecipes.push(...data.recipes);
        }
        
        if (allCategoryRecipes.length === 0) {
            throw new Error('Немає рецептів у цій категорії');
        }
        
        renderRecipesList({
            recipes: allCategoryRecipes,
            icon: category.icon,
            category: category.name
        }, categoryName);
        
    } catch (error) {
        console.error('Помилка завантаження рецептів:', error);
        recipesList.innerHTML = `
            <div class="error-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
                <p>Не вдалося завантажити рецепти</p>
                <button onclick="window.loadRecipeCategory('${categoryType}', '${categoryName}')" class="retry-btn">
                    Спробувати ще раз
                </button>
            </div>
        `;
    }
};

// Відображення списку рецептів
function renderRecipesList(data, categoryName) {
    const recipesList = document.getElementById('recipesList');
    
    recipesList.innerHTML = `
        <button class="back-btn" onclick="closeRecipesList()">
            ← Назад до категорій
        </button>
        <div class="recipes-header">
            <h2>${data.icon} ${data.category}</h2>
            <p class="recipes-count">${data.recipes.length} рецептів</p>
        </div>
        <div class="recipes-grid">
            ${data.recipes.map(recipe => {
                const dishType = dishTypeConfig[recipe.type] || dishTypeConfig.meat;
                return `
                    <div class="recipe-card" onclick="window.showRecipeDetail('${data.category}', '${recipe.id}')">
                        <div class="recipe-card-header">
                            <h3>${recipe.name}</h3>
                            <span class="recipe-difficulty ${recipe.difficulty.toLowerCase()}">${recipe.difficulty}</span>
                        </div>
                        <div class="recipe-card-type">
                            <span class="recipe-type-badge" style="border-color: ${dishType.color}; color: ${dishType.color};">
                                ${dishType.icon} ${dishType.name}
                            </span>
                        </div>
                        <div class="recipe-card-info">
                            <div class="recipe-info-item">
                                <span>⏱️</span>
                                <span>${recipe.time}</span>
                            </div>
                            <div class="recipe-info-item">
                                <span>👥</span>
                                <span>${recipe.servings} порцій</span>
                            </div>
                        </div>
                        <div class="recipe-card-footer">
                            <span>Переглянути рецепт →</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Показати деталі рецепту
window.showRecipeDetail = function(categoryName, recipeId) {
    const recipeDetail = document.getElementById('recipeDetail');
    const recipesList = document.getElementById('recipesList');
    
    let recipe = null;
    
    // Шукаємо рецепт в усіх завантажених файлах
    for (const file in recipesCache) {
        const data = recipesCache[file];
        const foundRecipe = data.recipes.find(r => r.id === recipeId);
        if (foundRecipe) {
            recipe = foundRecipe;
            break;
        }
    }
    
    if (!recipe) {
        console.error('Рецепт не знайдено');
        return;
    }
    
    const dishType = dishTypeConfig[recipe.type] || dishTypeConfig.meat;
    
    recipesList.style.display = 'none';
    
    recipeDetail.innerHTML = `
        <div class="recipe-detail-content">
            <button class="back-btn" onclick="window.closeRecipeDetail()">
                ← Назад до списку
            </button>
            
            <div class="recipe-detail-header">
                <h2>${recipe.name}</h2>
                <div class="recipe-meta">
                    <span class="recipe-difficulty ${recipe.difficulty.toLowerCase()}">${recipe.difficulty}</span>
                    <span class="recipe-type-badge" style="border-color: ${dishType.color}; color: ${dishType.color};">
                        ${dishType.icon} ${dishType.name}
                    </span>
                    <span class="recipe-time">⏱️ ${recipe.time}</span>
                    <span class="recipe-servings">👥 ${recipe.servings} порцій</span>
                </div>
            </div>
            
            <div class="recipe-detail-body">
                <div class="recipe-section">
                    <h3>🛒 Інгредієнти</h3>
                    <ul class="ingredients-list">
                        ${recipe.ingredients.map(ingredient => `
                            <li>${ingredient}</li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="recipe-section">
                    <h3>👨‍🍳 Приготування</h3>
                    <ol class="steps-list">
                        ${recipe.steps.map(step => `
                            <li>${step}</li>
                        `).join('')}
                    </ol>
                </div>
            </div>
        </div>
    `;
    
    recipeDetail.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Закрити деталі рецепту
window.closeRecipeDetail = function() {
    const recipeDetail = document.getElementById('recipeDetail');
    const recipesList = document.getElementById('recipesList');
    
    recipeDetail.style.display = 'none';
    recipesList.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ===== ФУНКЦІЇ ПОШУКУ =====

// Завантаження всіх рецептів для пошуку
async function loadAllRecipesForSearch() {
    allRecipes = [];
    
    for (const category of recipeCategories) {
        if (!category.files) continue;
        
        for (const file of category.files) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    const data = await response.json();
                    const recipesWithCategory = data.recipes.map(recipe => ({
                        ...recipe,
                        category: category.name,
                        categoryIcon: category.icon
                    }));
                    allRecipes = allRecipes.concat(recipesWithCategory);
                    recipesCache[file] = data;
                }
            } catch (error) {
                console.error(`Помилка завантаження ${file}:`, error);
            }
        }
    }
    
    console.log(`✅ Завантажено ${allRecipes.length} рецептів для пошуку`);
}

// Відкрити/закрити панель пошуку
window.toggleSearch = function() {
    const searchPanel = document.getElementById('searchPanel');
    const searchInput = document.getElementById('recipeSearchInput');
    
    isSearchOpen = !isSearchOpen;
    
    if (isSearchOpen) {
        searchPanel.style.display = 'block';
        searchInput.focus();
    } else {
        searchPanel.style.display = 'none';
        clearSearchInput();
    }
};

// Закрити пошук
window.closeSearch = function() {
    isSearchOpen = false;
    const searchPanel = document.getElementById('searchPanel');
    searchPanel.style.display = 'none';
    clearSearchInput();
};

// Очистити поле пошуку
window.clearSearchInput = function() {
    const searchInput = document.getElementById('recipeSearchInput');
    const clearBtn = document.querySelector('.clear-search-btn');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    searchResults.innerHTML = `
        <div class="empty-search">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
            </svg>
            <p>Почніть вводити назву страви</p>
        </div>
    `;
};

// Пошук рецептів
window.searchRecipes = function() {
    const searchInput = document.getElementById('recipeSearchInput');
    const clearBtn = document.querySelector('.clear-search-btn');
    const searchResults = document.getElementById('searchResults');
    const query = searchInput.value.trim().toLowerCase();
    
    clearBtn.style.display = query ? 'flex' : 'none';
    
    if (!query) {
        searchResults.innerHTML = `
            <div class="empty-search">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
                </svg>
                <p>Почніть вводити назву страви</p>
            </div>
        `;
        return;
    }
    
    const results = allRecipes.filter(recipe => 
        recipe.name.toLowerCase().includes(query)
    );
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="no-results">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                </svg>
                <p>Нічого не знайдено за запитом "<strong>${query}</strong>"</p>
                <p class="hint">Спробуйте інший запит</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML = `
        <div class="search-results-header">
            <h3>Знайдено: ${results.length} ${getRecipeWord(results.length)}</h3>
        </div>
        <div class="search-results-grid">
            ${results.map(recipe => {
                const dishType = dishTypeConfig[recipe.type] || dishTypeConfig.meat;
                return `
                    <div class="search-result-card" onclick="window.showRecipeDetailFromSearch('${recipe.category}', '${recipe.id}')">
                        <div class="search-result-category">
                            <span>${recipe.categoryIcon}</span>
                            <span>${recipe.category}</span>
                        </div>
                        <h4>${highlightText(recipe.name, query)}</h4>
                        <div class="search-result-info">
                            <span style="color: ${dishType.color}; font-weight: 500;">${dishType.icon} ${dishType.name}</span>
                            <span>⏱️ ${recipe.time}</span>
                            <span class="recipe-difficulty ${recipe.difficulty.toLowerCase()}">${recipe.difficulty}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
};

// Підсвітка тексту в результатах
function highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Отримання правильної форми слова "рецепт"
function getRecipeWord(count) {
    if (count === 1) return 'рецепт';
    if (count >= 2 && count <= 4) return 'рецепти';
    return 'рецептів';
}

// Показати рецепт з пошуку
window.showRecipeDetailFromSearch = function(categoryName, recipeId) {
    closeSearch();
    
    document.querySelector('.recipes-categories').style.display = 'none';
    document.querySelector('.header').style.display = 'none';
    
    window.showRecipeDetail(categoryName, recipeId);
};
