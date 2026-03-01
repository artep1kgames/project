// Функция для проверки аутентификации
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Функции для работы с событиями
async function loadEvents() {
    try {
        showLoading('eventsContainer');
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.LIST), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Не удалось загрузить события');
        }

        const events = await response.json();
        displayEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        showError('eventsContainer', error.message);
    } finally {
        hideLoading('eventsContainer');
    }
}

function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    if (!container) return;

    if (events.length === 0) {
        container.innerHTML = '<p class="no-events">Нет доступных событий</p>';
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="event-card">
            <h3>${event.title}</h3>
            <p class="event-date">${new Date(event.start_date).toLocaleDateString()}</p>
            <p class="event-description">${event.short_description}</p>
            <div class="event-details">
                <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                <span><i class="fas fa-users"></i> ${event.current_participants}/${event.max_participants}</span>
            </div>
            ${isAuthenticated() ? `
                <button onclick="registerForEvent(${event.id})" class="btn btn-primary">
                    Зарегистрироваться
                </button>
            ` : `
                <button onclick="showLoginModal()" class="btn btn-primary">
                    Войти для регистрации
                </button>
            `}
        </div>
    `).join('');
}

async function registerForEvent(eventId) {
    try {
        showLoading(`event-${eventId}`);
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.REGISTER, { id: eventId }), {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Не удалось зарегистрироваться на событие');
        }

        alert('Вы успешно зарегистрировались на событие!');
        loadEvents(); // Перезагружаем список событий
    } catch (error) {
        console.error('Error registering for event:', error);
        showError(`event-${eventId}`, error.message);
    } finally {
        hideLoading(`event-${eventId}`);
    }
}

// Вспомогательные функции для UI
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('loading');
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('loading');
    }
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        let errorDiv = element.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            element.insertBefore(errorDiv, element.firstChild);
        }
        errorDiv.textContent = message;
    }
}

function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'block';
    }
}

// Функции для работы с контекстным меню
function createUserMenu(user) {
    const userMenu = document.querySelector('.user-menu');
    const username = document.querySelector('.user-menu .username');
    const adminLink = userMenu.querySelector('a[href="./admin.html"]');
    
    if (userMenu && username) {
        username.textContent = user.full_name || user.email;
        
        // Скрываем ссылку на админ-панель для не-админов
        if (adminLink) {
            adminLink.style.display = user.role === 'admin' ? 'block' : 'none';
        }
        
        // Добавляем обработчик для кнопки выхода
        const logoutBtn = userMenu.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                logout();
            });
        }
    }
}

// Функция для обновления UI в зависимости от состояния авторизации
async function updateAuthUI() {
    console.log('Обновление UI после входа');
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (!authButtons || !userMenu) {
        console.log('Элементы UI не найдены');
        return;
    }

    const token = localStorage.getItem('token');
    if (token) {
        console.log('Токен найден, обновляем UI для авторизованного пользователя');
        authButtons.style.display = 'none';
        userMenu.style.display = 'block';
        
        try {
            const user = await getCurrentUser();
            if (user) {
                console.log('Получены данные пользователя:', user);
                createUserMenu(user);
            }
        } catch (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            logout();
        }
    } else {
        console.log('Токен не найден, показываем кнопки авторизации');
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

// Функция для выхода из системы
function logout() {
    console.log('Выход из системы');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

// Универсальный обработчик logout для всех страниц
function setupLogoutHandler() {
    // Поиск по id
    const logoutBtnById = document.getElementById('logout-button');
    if (logoutBtnById) {
        logoutBtnById.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    // Поиск по классу
    const logoutBtnByClass = document.querySelector('.logout-btn');
    if (logoutBtnByClass) {
        logoutBtnByClass.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница загружена, инициализация...');
    
    // Создаем модальные окна
    createModals();
    
    // Проверяем авторизацию и обновляем UI
    await updateAuthUI();
    
    // Загружаем события только на странице событий
    if (document.getElementById('eventsContainer')) {
        loadEvents();
    }

    setupLogoutHandler();
}); 