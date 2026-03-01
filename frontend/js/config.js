const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000'
        : window.location.hostname === 'kyrsach-0x7m.onrender.com'
        ? 'https://kyrsach-0x7m.onrender.com'
        : '',
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/token',
            REGISTER: '/api/register',
            PROFILE: '/api/me',
            LOGOUT: '/api/logout'
        },
        EVENTS: {
            BASE: '/api/events/',
            DETAIL: '/api/events/{id}',
            MODERATION: '/api/events/moderation',
            MODERATE: '/api/events/moderate',
            CREATE: '/api/events',
            UPDATE: '/api/events/{id}',
            DELETE: '/api/events/{id}',
            JOIN: '/api/events/{id}/participate',
            LEAVE: '/api/events/{id}/participate',
            PARTICIPATE: '/api/events/{id}/participate',
            CANCEL_PARTICIPATION: '/api/events/{id}/participate'
        },
        CATEGORIES: {
            BASE: '/api/categories/',
            DETAIL: '/api/categories/{id}',
            CREATE: '/api/categories',
            UPDATE: '/api/categories/{id}',
            DELETE: '/api/categories/{id}'
        },
        USERS: {
            BASE: '/api/users',
            PROFILE: '/api/me',
            UPDATE: '/api/users/update'
        }
    },
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    METHODS: {
        EVENTS: {
            LIST: 'GET',
            DETAIL: 'GET',
            CREATE: 'POST',
            UPDATE: 'PUT',
            DELETE: 'DELETE',
            REGISTER: 'POST'
        },
        CATEGORIES: {
            LIST: 'GET',
            DETAIL: 'GET',
            CREATE: 'POST',
            UPDATE: 'PUT',
            DELETE: 'DELETE'
        }
    }
};

// Функция для получения полного URL эндпоинта
function getApiUrl(endpoint, params = {}) {
    console.log('getApiUrl вызвана с параметрами:', { endpoint, params });
    
    // Убедимся, что endpoint начинается с '/'
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }
    
    let url = API_CONFIG.BASE_URL + endpoint;
    console.log('Базовый URL:', url);
    
    // Создаем множество для отслеживания использованных параметров
    const usedParams = new Set();
    
    // Заменяем параметры в URL
    Object.keys(params).forEach(key => {
        const oldUrl = url;
        url = url.replace(`{${key}}`, params[key]);
        if (oldUrl !== url) {
            console.log(`Заменен параметр {${key}} на ${params[key]}`);
            usedParams.add(key);
        }
    });
    
    // Добавляем параметры запроса, если они есть (только те, которые не были использованы в URL)
    const queryParams = Object.entries(params)
        .filter(([key]) => !usedParams.has(key))
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    
    if (queryParams) {
        url += (url.includes('?') ? '&' : '?') + queryParams;
        console.log('Добавлены параметры запроса:', queryParams);
    }
    
    console.log('Итоговый API URL:', url);
    return url;
}

// Экспортируем конфигурацию и вспомогательные функции
window.API_CONFIG = API_CONFIG;
window.getApiUrl = getApiUrl; 