// Функция для обновления навигации в зависимости от роли пользователя
function updateNavigation() {
    const user = JSON.parse(localStorage.getItem('user'));
    const adminLinks = document.querySelectorAll('.dropdown-content .admin-link');
    
    console.log('Текущий пользователь:', user);
    console.log('Найдено ссылок админ-панели:', adminLinks.length);
    console.log('Роль пользователя:', user?.role);
    console.log('Тип роли:', typeof user?.role);
    
    adminLinks.forEach(link => {
        console.log('Проверка роли:', user?.role);
        const userRole = user?.role?.toLowerCase();
        if (user && userRole === 'admin') {
            console.log('Показываем админ-панель');
            link.style.display = 'block';
        } else {
            console.log('Скрываем админ-панель');
            link.style.display = 'none';
        }
    });
}

// Функция для проверки авторизации и обновления навигации
function checkAuthAndUpdateNav() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user) {
        // Показываем элементы для авторизованных пользователей
        document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');
        
        // Обновляем имя пользователя
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(el => {
            el.textContent = user.full_name || user.username;
        });
        
        // Обновляем навигацию в зависимости от роли
        updateNavigation();
    } else {
        // Показываем элементы для гостей
        document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'block');
        
        // Скрываем админ-панель
        document.querySelectorAll('.admin-link').forEach(el => el.style.display = 'none');
    }
}

// Универсальный обработчик logout для всех страниц
function setupLogoutHandler() {
    // Поиск по id
    const logoutBtnById = document.getElementById('logout-button');
    if (logoutBtnById) {
        logoutBtnById.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof logout === 'function') {
                logout();
            } else if (typeof window.logout === 'function') {
                window.logout();
            } else {
                // fallback: чистим localStorage и редиректим
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = './index.html';
            }
        });
    }
    // Поиск по классу
    const logoutBtnByClass = document.querySelector('.logout-btn');
    if (logoutBtnByClass) {
        logoutBtnByClass.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof logout === 'function') {
                logout();
            } else if (typeof window.logout === 'function') {
                window.logout();
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = './index.html';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuthAndUpdateNav();
    setupLogoutHandler();
}); 