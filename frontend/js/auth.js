// Получаем элементы модальных окон
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginBtn = document.querySelector('.login-btn');
const registerBtn = document.querySelector('.register-btn');
const closeBtns = document.getElementsByClassName('close');

// Константы
const API_URL = '';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Функция для получения токена
function getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('Получен токен из localStorage:', token ? 'Токен найден' : 'Токен отсутствует');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            const isValid = Date.now() < expirationTime;
            console.log('Токен валиден:', isValid, 'Истекает:', new Date(expirationTime).toLocaleString());
            if (!isValid) {
                console.log('Токен истек, удаляем его');
                removeToken();
                return null;
            }
        } catch (e) {
            console.error('Ошибка при проверке токена:', e);
            removeToken();
            return null;
        }
    }
    return token;
}

// Функция для установки токена
function setToken(token) {
    if (token) {
        try {
            // Проверяем валидность токена перед сохранением
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            if (Date.now() >= expirationTime) {
                console.error('Попытка сохранить истекший токен');
                return false;
            }
            console.log('Сохраняем токен в localStorage');
            localStorage.setItem(TOKEN_KEY, token);
            // Проверяем сохранение
            const savedToken = localStorage.getItem(TOKEN_KEY);
            console.log('Проверка сохраненного токена:', savedToken ? 'Токен сохранен' : 'Токен не сохранен');
            return true;
        } catch (e) {
            console.error('Ошибка при проверке токена перед сохранением:', e);
            return false;
        }
    } else {
        console.log('Удаляем токен из localStorage');
        localStorage.removeItem(TOKEN_KEY);
        return true;
    }
}

// Функция для удаления токена
function removeToken() {
    console.log('Удаляем токен из localStorage');
    localStorage.removeItem(TOKEN_KEY);
    // Проверяем удаление
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('Проверка удаления токена:', token ? 'Токен не удален' : 'Токен удален');
}

// Функция для получения данных пользователя
function getUser() {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
}

// Функция для установки данных пользователя
function setUser(user) {
    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(USER_KEY);
    }
}

// Функция для удаления данных пользователя
function removeUser() {
    localStorage.removeItem(USER_KEY);
}

// Функция для проверки авторизации
function isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('Проверка авторизации:', {
        token: token ? 'Токен найден' : 'Токен отсутствует',
        user: user ? 'Данные пользователя найдены' : 'Данные пользователя отсутствуют'
    });
    return token !== null && user !== null;
}

// Функция для получения роли пользователя
function getUserRole() {
    const user = getUser();
    return user ? user.role : null;
}

// Функция для получения заголовков с токеном авторизации
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Токен отсутствует в localStorage');
        return {
            'Content-Type': 'application/json'
        };
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Обновление UI в зависимости от состояния авторизации
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
                console.log('Роль пользователя:', user.role);
                console.log('Тип роли:', typeof user.role);
                
                // Обновляем имя пользователя
                const usernameElements = document.querySelectorAll('.username');
                usernameElements.forEach(el => {
                    el.textContent = user.username;
                });
                
                // Показываем/скрываем кнопку модерации в контекстном меню
                const adminLinks = document.querySelectorAll('.dropdown-content .admin-link');
                adminLinks.forEach(link => {
                    const userRole = user.role?.toLowerCase();
                    const shouldShowAdmin = userRole === 'admin';
                    console.log('Показывать кнопку модерации:', shouldShowAdmin, 'для роли:', userRole);
                    link.style.display = shouldShowAdmin ? 'block' : 'none';
                });
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

// Функция для отображения модального окна
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        // Сбросить ошибку при открытии модального окна входа
        if (modalId === 'loginModal') {
            const loginError = document.getElementById('loginError');
            if (loginError) {
                loginError.textContent = '';
                loginError.style.display = 'none';
            }
        }
    }
}

// Функция для закрытия модального окна
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Функция для переключения между формами
function switchForm(fromModalId, toModalId) {
    hideModal(fromModalId);
    showModal(toModalId);
}

// Функция для создания модальных окон
function createModals() {
    console.log('Создание модальных окон...');
    
    // Проверяем, существуют ли уже модальные окна
    if (document.getElementById('loginModal') || document.getElementById('registerModal')) {
        console.log('Модальные окна уже существуют');
        return;
    }

    // Добавляем стили для модальных окон
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            overflow: auto;
        }

        .modal-content {
            background-color: #ffffff;
            margin: 10% auto;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            width: 90%;
            max-width: 500px;
            position: relative;
        }

        .modal h2 {
            margin-bottom: 1.5rem;
            color: #333;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #333;
            font-weight: 500;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #4a90e2;
            box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
        }

        .close {
            position: absolute;
            right: 1rem;
            top: 1rem;
            font-size: 1.5rem;
            font-weight: bold;
            color: #666;
            cursor: pointer;
        }

        .close:hover {
            color: #333;
        }

        .form-footer {
            margin-top: 1.5rem;
            text-align: center;
            padding-top: 1rem;
            border-top: 1px solid #ddd;
        }

        .form-footer a {
            color: #4a90e2;
            text-decoration: none;
            font-weight: 500;
        }

        .form-footer a:hover {
            text-decoration: underline;
        }
    `;
    document.head.appendChild(style);

    // Создаем модальные окна
    const modalsContainer = document.createElement('div');
    modalsContainer.innerHTML = `
        <div id="loginModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Вход</h2>
                <form id="loginForm">
                    <div class="form-group">
                        <label for="loginEmail">Email:</label>
                        <input type="email" id="loginEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Пароль:</label>
                        <input type="password" id="loginPassword" required>
                    </div>
                    <div id="loginError" style="color: #dc3545; margin-bottom: 1rem; display: none;"></div>
                    <button type="submit" class="btn btn-primary">Войти</button>
                </form>
                <p>Нет аккаунта? <a href="#" class="switch-to-register">Зарегистрироваться</a></p>
            </div>
        </div>
        <div id="registerModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Регистрация</h2>
                <form id="registerForm">
                    <div class="form-group">
                        <label for="registerUsername">Имя пользователя:</label>
                        <input type="text" id="registerUsername" required>
                    </div>
                    <div class="form-group">
                        <label for="registerEmail">Email:</label>
                        <input type="email" id="registerEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="registerPassword">Пароль:</label>
                        <input type="password" id="registerPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="registerRole">Роль:</label>
                        <select id="registerRole" required>
                            <option value="organizer">Организатор</option>
                            <option value="visitor">Посетитель</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Зарегистрироваться</button>
                </form>
                <p>Уже есть аккаунт? <a href="#" class="switch-to-login">Войти</a></p>
            </div>
        </div>
    `;
    document.body.appendChild(modalsContainer);

    // Добавляем обработчики событий после добавления модальных окон в DOM
    const loginBtn = document.querySelector('.login-btn');
    const registerBtn = document.querySelector('.register-btn');
    const closeBtns = document.querySelectorAll('.close');
    const switchToRegister = document.querySelector('.switch-to-register');
    const switchToLogin = document.querySelector('.switch-to-login');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => showModal('loginModal'));
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', () => showModal('registerModal'));
    }

    // Закрытие модальных окон
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('loginModal');
            hideModal('registerModal');
        });
    });

    // Переключение между формами
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('loginModal', 'registerModal');
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('registerModal', 'loginModal');
        });
    }

    // Инициализация форм
    initializeForms();
}

// Функция для создания кнопок авторизации
function createAuthButtons() {
    const authButtons = document.createElement('div');
    authButtons.className = 'auth-buttons';
    authButtons.innerHTML = `
        <button class="btn btn-outline login-btn">Войти</button>
        <button class="btn btn-primary register-btn">Регистрация</button>
    `;
    return authButtons;
}

// Создание контекстного меню пользователя
function createUserMenu(user) {
    console.log('Создание меню пользователя для:', user);
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu) {
        console.log('Элемент меню пользователя не найден');
        return;
    }

    const username = userMenu.querySelector('.username');
    if (username) {
        username.textContent = user.full_name || user.username;
    }

    // Добавляем обработчик клика на имя пользователя
    username.addEventListener('click', (e) => {
        e.stopPropagation(); // Предотвращаем всплытие события
        const dropdown = userMenu.querySelector('.dropdown-content');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
    });

    // Добавляем обработчик клика на документ для закрытия меню
    document.addEventListener('click', (e) => {
        const dropdown = userMenu.querySelector('.dropdown-content');
        if (dropdown && !userMenu.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Предотвращаем закрытие меню при клике внутри него
    const dropdown = userMenu.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем всплытие события
        });

        // Добавляем обработчик для кнопки выхода
        const logoutBtn = dropdown.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                logout();
            });
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, инициализация...');
    createModals();
    updateAuthUI();
});

// Инициализация форм
function initializeForms() {
    console.log('Инициализация форм...');
    
    // Инициализация формы регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log('Форма регистрации найдена');
        registerForm.onsubmit = async function(e) {
            e.preventDefault();
            console.log('Форма регистрации отправлена');
            
            // Получаем элементы формы
            const usernameInput = document.getElementById('registerUsername');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            const roleInput = document.getElementById('registerRole');
            
            // Проверяем существование всех элементов
            if (!usernameInput || !emailInput || !passwordInput || !roleInput) {
                console.error('Не найдены элементы формы:', {
                    username: !!usernameInput,
                    email: !!emailInput,
                    password: !!passwordInput,
                    role: !!roleInput
                });
                showAuthError('Ошибка формы: не найдены необходимые поля');
                return;
            }
            
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const role = roleInput.value;
            
            console.log('Данные формы:', { username, email, role });
            
            if (!username || !email || !password || !role) {
                showAuthError('Пожалуйста, заполните все поля');
                return;
            }
            
            try {
                await register(email, password, username, role);
            } catch (err) {
                showAuthError(err.message);
            }
        };
    } else {
        console.warn('Форма регистрации не найдена');
    }

    // Инициализация формы входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Форма входа найдена');
        loginForm.onsubmit = handleLogin;
    } else {
        console.warn('Форма входа не найдена');
    }

    // Инициализация кнопок переключения форм
    const switchFormLinks = document.getElementsByClassName('switch-to-register');
    Array.from(switchFormLinks).forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('loginModal', 'registerModal');
        });
    });

    // Инициализация кнопок переключения форм
    const switchFormLinksLogin = document.getElementsByClassName('switch-to-login');
    Array.from(switchFormLinksLogin).forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm('registerModal', 'loginModal');
        });
    });

    // Инициализация кнопок закрытия
    const closeButtons = document.getElementsByClassName('close');
    Array.from(closeButtons).forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
}

// Обработчик формы входа
async function handleLogin(e) {
    e.preventDefault();
    // Сбросить ошибку при отправке формы
    const loginError = document.getElementById('loginError');
    if (loginError) {
        loginError.textContent = '';
        loginError.style.display = 'none';
    }
    console.log('Отправка формы входа');
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) {
        console.error('Поля формы входа не найдены');
        showAuthError('Ошибка инициализации формы');
        return;
    }
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        showAuthError('Пожалуйста, заполните все поля');
        return;
    }
    
    try {
        await login(email, password);
    } catch (error) {
        console.error('Ошибка при входе:', error);
        let msg = error.message;
        try {
            const parsed = JSON.parse(msg);
            if (parsed.detail) msg = parsed.detail;
        } catch {}
        showAuthError(msg);
    }
}

// Функция для регистрации пользователя
async function register(email, password, username, role) {
    try {
        console.log('Начало процесса регистрации');
        showLoading();
        
        // Формируем данные в соответствии с моделью UserCreate
        const registerData = {
            email: email,
            username: username,
            password: password,
            full_name: username, // Используем username как full_name
            role: role // Передаём выбранную роль
        };
        
        console.log('Отправка данных для регистрации:', { 
            ...registerData, 
            password: '***' 
        });
        
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(registerData)
        });

        console.log('Получен ответ от сервера:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка при регистрации:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.detail || 'Ошибка при регистрации');
            } catch (e) {
                throw new Error(errorText || 'Ошибка при регистрации');
            }
        }

        const data = await response.json();
        console.log('Регистрация успешно завершена');
        
        // Закрываем модальное окно регистрации
        const registerModal = document.getElementById('registerModal');
        if (registerModal) {
            registerModal.style.display = 'none';
        }
        
        // Показываем модальное окно входа
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'block';
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        showAuthError(error.message);
        throw error;
    } finally {
        hideLoading();
    }
}

// Функция для получения информации о пользователе
async function getCurrentUser() {
    try {
        console.log('Получение информации о пользователе');
        const token = localStorage.getItem(TOKEN_KEY);
        
        if (!token) {
            console.error('Токен отсутствует в localStorage');
            throw new Error('Токен отсутствует');
        }

        console.log('Отправка запроса с токеном:', token.substring(0, 10) + '...');
        console.log('URL запроса:', getApiUrl(API_CONFIG.ENDPOINTS.AUTH.PROFILE));
        
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.PROFILE), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include' // Добавляем для поддержки CORS с credentials
        });

        console.log('Статус ответа:', response.status);
        console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
        
        if (response.status === 401) {
            console.error('Токен недействителен');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            throw new Error('Токен недействителен');
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка ответа:', errorText);
            throw new Error('Ошибка получения данных пользователя');
        }

        const userData = await response.json();
        console.log('Получены данные пользователя:', userData);
        return userData;
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        throw error;
    }
}

// Функция для получения текущего пользователя
async function getUser() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Токен отсутствует при попытке получить данные пользователя');
            return null;
        }

        console.log('Отправка запроса на получение данных пользователя');
        const profileUrl = getApiUrl(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
        console.log('URL запроса:', profileUrl);
        console.log('Используемый токен:', token.substring(0, 10) + '...');
        
        const response = await fetch(profileUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Статус ответа:', response.status);
        console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Текст ответа:', responseText);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log('Получен статус 401, очищаем данные авторизации');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return null;
            }
            console.error('Ошибка при получении данных пользователя:', responseText);
            throw new Error(responseText || 'Ошибка при получении данных пользователя');
        }

        let userData;
        try {
            userData = JSON.parse(responseText);
        } catch (e) {
            console.error('Ошибка при разборе JSON:', e);
            throw new Error('Неверный формат ответа от сервера');
        }

        console.log('Успешно получены данные пользователя:', userData);
        return userData;
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        throw error;
    }
}

// Функция для входа в систему
async function login(email, password) {
    try {
        console.log('Начало процесса входа');
        showLoading();
        
        const response = await fetch(getApiUrl('/api/token'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                'username': email,
                'password': password
            })
        });

        console.log('Получен ответ от сервера:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка при входе:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.detail || 'Ошибка при входе');
            } catch (e) {
                throw new Error(errorText || 'Ошибка при входе');
            }
        }

        const data = await response.json();
        console.log('Получены данные авторизации');
        
        if (!data.access_token) {
            console.error('Токен отсутствует в ответе сервера');
            throw new Error('Токен не получен от сервера');
        }

        // Сохраняем токен
        localStorage.setItem(TOKEN_KEY, data.access_token);
        console.log('Токен сохранен в localStorage');

        // Получаем данные пользователя
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('Не удалось получить данные пользователя после входа');
            }
            // Сохраняем данные пользователя
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            console.log('Данные пользователя сохранены в localStorage');
            
            // Закрываем модальное окно входа
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'none';
            }
            
            // Обновляем UI
            await updateAuthUI();
            // Обновляем навигацию (показываем админ-панель без перезагрузки)
            if (typeof checkAuthAndUpdateNav === 'function') {
                checkAuthAndUpdateNav();
            }
            return user;
        } catch (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            // Очищаем токен, так как он недействителен
            localStorage.removeItem(TOKEN_KEY);
            throw new Error('Не удалось получить данные пользователя после входа');
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        showAuthError(error.message);
        throw error;
    } finally {
        hideLoading();
    }
}

// Функция для выхода из системы
function logout() {
    console.log('Выполняется выход из системы');
    // Удаляем токен и данные пользователя
    removeToken();
    removeUser();
    // Перенаправляем на главную страницу
    window.location.href = './index.html';
}

// Инициализация обработчиков событий
document.addEventListener('DOMContentLoaded', function() {
    // Обработчик для кнопки выхода
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        console.log('Найден элемент кнопки выхода');
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Нажата кнопка выхода');
            logout();
        });
    } else {
        console.log('Элемент кнопки выхода не найден');
    }
});

// Функция для отображения индикатора загрузки
function showLoading() {
    console.log('Начало загрузки...');
}

// Функция для скрытия индикатора загрузки
function hideLoading() {
    console.log('Загрузка завершена');
}

// Функция для отображения ошибок
function showAuthError(message) {
    console.log('showAuthError вызван с:', message);
    try {
        // Если message — это JSON с detail, показываем detail
        let msg = message;
        try {
            const parsed = JSON.parse(msg);
            if (parsed.detail) msg = parsed.detail;
        } catch {}
        // Переводим стандартное сообщение на русский
        if (msg === 'Incorrect email or password') {
            msg = 'Неверный email или пароль';
        }
        const loginModal = document.getElementById('loginModal');
        // Ищем loginError только внутри loginModal
        const loginError = loginModal ? loginModal.querySelector('#loginError') : null;
        // Диагностика
        console.log('loginModal:', loginModal ? loginModal.outerHTML.slice(0, 300) + '...' : 'нет');
        console.log('loginError найден?', !!loginError, 'всего #loginError:', document.querySelectorAll('#loginError').length);
        console.log('loginError parent:', loginError && loginError.parentElement && loginError.parentElement.outerHTML);
        if (loginError) {
            if (loginModal && loginModal.style.display !== 'block') {
                loginModal.style.display = 'block';
            }
            loginError.textContent = msg;
            loginError.style.display = 'block';
            loginError.style.background = '#fff0f0';
            loginError.style.border = '1px solid #dc3545';
            loginError.style.padding = '8px';
            console.log('loginError innerText:', loginError.innerText, 'display:', loginError.style.display);
        } else {
            alert(msg);
        }
    } catch (e) {
        console.error('Ошибка внутри showAuthError:', e);
        alert(message);
    }
}

// Функция для отображения успешных сообщений
function showSuccess(message) {
    console.log('Успех:', message);
    alert(message);
} 