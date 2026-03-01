// Получаем ID мероприятия из URL
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

// Функция для перенаправления на страницу входа
function redirectToLogin() {
    window.location.href = './index.html';
}

// Функция для отображения ошибок
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// Функция для отображения успешных сообщений
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// Функция для проверки авторизации
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Функция для получения текущего пользователя
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Функция для удаления токена
function removeToken() {
    localStorage.removeItem('token');
}

// Функция для удаления данных пользователя
function removeUser() {
    localStorage.removeItem('user');
}

// Функция для получения заголовков с токеном авторизации
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    console.log('Токен из localStorage:', token ? 'Токен найден' : 'Токен отсутствует');
    
    if (!token) {
        console.warn('Токен авторизации отсутствует');
        return {
            'Content-Type': 'application/json'
        };
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    
    console.log('Сформированные заголовки:', headers);
    return headers;
}

// Функция для форматирования даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Функция для отображения статуса мероприятия
function getStatusDisplay(status) {
    const statusMap = {
        'pending': 'На модерации',
        'approved': 'Одобрено',
        'rejected': 'Отклонено',
        'published': 'Опубликовано',
        'PENDING': 'На модерации',
        'APPROVED': 'Одобрено',
        'REJECTED': 'Отклонено',
        'PUBLISHED': 'Опубликовано'
    };
    return statusMap[status] || status;
}

// Функция для отображения типа мероприятия
function getEventTypeDisplay(type) {
    const typeMap = {
        'free': 'Бесплатно',
        'paid': 'Платно',
        'FREE': 'Бесплатно',
        'PAID': 'Платно'
    };
    return typeMap[type] || type;
}

// Функция для получения отображаемого названия категории
function getCategoryDisplay(category) {
    // Если категория уже содержит русское название в description, используем его
    if (category.description && category.description !== category.name) {
        return category.description;
    }
    
    // Иначе переводим по коду
    const categoryTranslations = {
        'CONFERENCE': 'Конференция',
        'SEMINAR': 'Семинар',
        'WORKSHOP': 'Мастер-класс',
        'EXHIBITION': 'Выставка',
        'CONCERT': 'Концерт',
        'FESTIVAL': 'Фестиваль',
        'SPORTS': 'Спортивное мероприятие',
        'OTHER': 'Другое'
    };
    return categoryTranslations[category.name] || category.name;
}

// Тестовая функция для проверки подключения к API
async function testApiConnection() {
    try {
        console.log('Тестируем подключение к API...');
        const response = await fetch('/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Тестовый запрос успешен:', response.status);
        const data = await response.text();
        console.log('Ответ сервера:', data);
        
        // Дополнительный тест - запрос к эндпоинту событий
        console.log('Тестируем эндпоинт событий...');
        const eventsResponse = await fetch('/events/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Запрос к событиям успешен:', eventsResponse.status);
        
        return true;
    } catch (error) {
        console.error('Ошибка тестового запроса:', error);
        console.error('Детали ошибки:', error.message);
        return false;
    }
}

// Функция для загрузки данных мероприятия
async function loadEventDetails() {
    try {
        console.log('Начинаем загрузку деталей мероприятия...');
        console.log('eventId:', eventId);
        
        if (!eventId) {
            console.error('ID мероприятия не указан в URL');
            showError('ID мероприятия не указан');
            return;
        }

        const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.DETAIL, { id: eventId });
        console.log('API URL:', apiUrl);
        
        const headers = getAuthHeaders();
        console.log('Заголовки запроса:', headers);
        
        console.log('Отправляем fetch запрос к:', apiUrl);
        const response = await fetch(apiUrl, {
            headers: headers
        });

        console.log('Статус ответа:', response.status);
        console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
        console.log('Content-Type ответа:', response.headers.get('content-type'));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка HTTP:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        console.log('Пытаемся парсить JSON ответ...');
        
        // Клонируем ответ для диагностики
        const responseClone = response.clone();
        const responseText = await responseClone.text();
        console.log('Сырой текст ответа:', responseText);
        
        let event;
        try {
            event = await response.json();
            console.log('JSON успешно распарсен');
        } catch (jsonError) {
            console.error('Ошибка при парсинге JSON:', jsonError);
            console.error('Текст ответа, который не удалось распарсить:', responseText);
            throw new Error(`Ошибка при обработке ответа сервера: ${jsonError.message}`);
        }
        
        console.log('Полученные данные мероприятия:', event);
        displayEventDetails(event);
    } catch (error) {
        console.error('Error loading event details:', error);
        console.error('Stack trace:', error.stack);
        console.error('Тип ошибки:', error.constructor.name);
        console.error('Сообщение ошибки:', error.message);
        // Обработка 404
        if (error.message && error.message.includes('404')) {
            showError('Мероприятие не найдено. Сейчас вы будете перенаправлены на список мероприятий.');
            setTimeout(() => {
                window.location.href = 'events.html';
            }, 2000);
        } else {
            showError(`Ошибка загрузки деталей мероприятия: ${error.message}`);
        }
    }
}

// Функция для отображения деталей мероприятия
function displayEventDetails(event) {
    // Получаем данные текущего пользователя
    const currentUser = getCurrentUser();
    const isParticipating = event.participants && event.participants.some(p => p.user_id === currentUser.id);
    const isOrganizer = event.organizer_id === currentUser.id;
    
    // Заполняем основную информацию
    document.getElementById('eventTitle').textContent = event.title;
    document.getElementById('eventDescription').textContent = event.full_description || event.short_description;
    document.getElementById('eventLocation').textContent = event.location;
    document.getElementById('eventDate').textContent = `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`;
    document.getElementById('eventParticipants').textContent = `${event.current_participants || 0}/${event.max_participants} участников`;
    document.getElementById('eventType').textContent = getEventTypeDisplay(event.event_type);
    document.getElementById('eventOrganizer').textContent = event.organizer ? event.organizer.full_name : 'Не указан';
    
    // Отображаем статус
    const statusElement = document.getElementById('eventStatus');
    statusElement.textContent = getStatusDisplay(event.status);
    statusElement.className = `event-status status-${event.status}`;

    // Отображаем изображение
    const imageElement = document.getElementById('eventImage');
    if (event.image_url) {
        imageElement.src = event.image_url;
    } else {
        imageElement.src = '../images/default-event.jpg';
    }

    // Отображаем категории
    const categoriesElement = document.getElementById('eventCategories');
    if (event.categories && event.categories.length > 0) {
        categoriesElement.innerHTML = event.categories
            .map(category => `<span class="category-tag">${getCategoryDisplay(category)}</span>`)
            .join('');
    } else {
        categoriesElement.innerHTML = '<p>Категории не указаны</p>';
    }

    // Добавляем кнопки действий
    const actionsDiv = document.getElementById('eventActions');
    actionsDiv.innerHTML = '';

    // Если пользователь админ
    if (currentUser.role === 'admin') {
        // Если он организатор — редактировать и удалить
        if (isOrganizer) {
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-primary';
            editButton.textContent = 'Редактировать';
            editButton.onclick = () => editEvent(event.id);
            actionsDiv.appendChild(editButton);
        }
        // Кнопка удалить всегда доступна админу
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger';
        deleteButton.textContent = 'Удалить';
        deleteButton.onclick = () => deleteEvent(event.id);
        actionsDiv.appendChild(deleteButton);
        return;
    }

    // Показываем кнопки только организатору и участникам
    if (isOrganizer || isParticipating) {
        if (isOrganizer) {
            // Для организатора — только статус, без кнопки редактирования
            const participationStatus = document.createElement('div');
            participationStatus.className = 'participation-status organizer';
            participationStatus.innerHTML = '<i class="fas fa-crown"></i> Вы организатор этого мероприятия';
            actionsDiv.appendChild(participationStatus);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger';
            deleteButton.textContent = 'Удалить';
            deleteButton.onclick = () => deleteEvent(event.id);
            actionsDiv.appendChild(deleteButton);
        } else if (isParticipating) {
            // Если пользователь участвует, показываем статус и кнопку отмены
            const participationStatus = document.createElement('div');
            participationStatus.className = 'participation-status participant';
            participationStatus.innerHTML = '<i class="fas fa-check-circle"></i> Вы участвуете в этом мероприятии';
            actionsDiv.appendChild(participationStatus);
            
            const cancelButton = document.createElement('button');
            cancelButton.className = 'btn btn-warning btn-small';
            cancelButton.textContent = 'Отменить участие';
            cancelButton.onclick = () => {
                if (confirm('Вы уверены, что хотите отменить участие в этом мероприятии?')) {
                    cancelParticipation(event.id);
                }
            };
            actionsDiv.appendChild(cancelButton);
        }
    } else {
        // Если мероприятие полное, показываем надпись "Нет мест"
        if ((event.current_participants || 0) >= event.max_participants) {
            const noSeats = document.createElement('div');
            noSeats.className = 'no-seats-message';
            noSeats.textContent = 'Нет мест';
            actionsDiv.appendChild(noSeats);
        } else {
            // Если пользователь не участвует и не является организатором, показываем кнопку участия
            const participateButton = document.createElement('button');
            participateButton.className = 'btn btn-primary';
            participateButton.textContent = event.ticket_price && event.ticket_price > 0 ? 'Купить билет' : 'Я пойду';
            participateButton.onclick = () => (event.ticket_price && event.ticket_price > 0) ? buyTicket(event.id) : participate(event.id);
            actionsDiv.appendChild(participateButton);
        }
    }
}

// Функция для участия в мероприятии
async function participate(eventId) {
    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.PARTICIPATE, { id: eventId }), {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_id: eventId,
                ticket_purchased: false
            })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            if (response.status === 400 && errorData.detail === "Already participating in this event") {
                showError('Вы уже участвуете в этом мероприятии');
            } else {
                throw new Error(errorData.detail || 'Не удалось записаться на мероприятие');
            }
            return;
        }

        showSuccess('Вы успешно записались на мероприятие!');
        
        // Добавляем небольшую задержку перед обновлением
        console.log('Ждем 1 секунду перед обновлением...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateEventActions(); // Обновляем только кнопки действий
    } catch (error) {
        console.error('Error participating in event:', error);
        showError(error.message || 'Ошибка при записи на мероприятие');
    }
}

// Функция для покупки билета
async function buyTicket(eventId) {
    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.PARTICIPATE, { id: eventId }), {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_id: eventId,
                ticket_purchased: true
            })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            if (response.status === 400 && errorData.detail === "Already participating in this event") {
                showError('Вы уже купили билет на это мероприятие');
            } else {
                throw new Error(errorData.detail || 'Не удалось купить билет');
            }
            return;
        }

        showSuccess('Билет успешно куплен!');
        
        // Добавляем небольшую задержку перед обновлением
        console.log('Ждем 1 секунду перед обновлением...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateEventActions(); // Обновляем только кнопки действий
    } catch (error) {
        console.error('Error buying ticket:', error);
        showError(error.message || 'Ошибка при покупке билета');
    }
}

// Функция для отмены участия в мероприятии
async function cancelParticipation(eventId) {
    try {
        console.log('Начинаем отмену участия для мероприятия ID:', eventId);
        const url = getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.CANCEL_PARTICIPATION, { id: eventId });
        console.log('URL для отмены участия:', url);
        
        const headers = getAuthHeaders();
        console.log('Заголовки для отмены участия:', headers);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: headers
        });

        console.log('Статус ответа отмены участия:', response.status);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            console.error('Ошибка отмены участия:', errorData);
            throw new Error(errorData.detail || 'Не удалось отменить участие');
        }

        showSuccess('Участие в мероприятии отменено!');
        
        // Добавляем небольшую задержку перед обновлением
        console.log('Ждем 1 секунду перед обновлением...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateEventActions(); // Обновляем только кнопки действий
    } catch (error) {
        console.error('Error cancelling participation:', error);
        showError(error.message || 'Ошибка при отмене участия');
    }
}

// Функция для редактирования мероприятия
function editEvent(eventId) {
    window.location.href = `edit-event.html?id=${eventId}`;
}

// Функция для удаления мероприятия
function deleteEvent(eventId) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');

    confirmModal.style.display = 'block';

    confirmDeleteBtn.onclick = async () => {
        try {
            const currentUser = getCurrentUser();
            let url, options;
            if (currentUser.role === 'admin') {
                url = getApiUrl(`/api/admin/events/${eventId}`);
                options = {
                    method: 'DELETE',
                    headers: {
                        ...API_CONFIG.HEADERS,
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                };
            } else {
                url = getApiUrl(`/api/events/${eventId}`);
                options = {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                };
            }
            const response = await fetch(url, options);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                throw new Error(errorData.detail || 'Failed to delete event');
            }

            showSuccess('Мероприятие успешно удалено!');
            window.location.href = 'events.html'; // Перенаправляем на страницу мероприятий
        } catch (error) {
            console.error('Error deleting event:', error);
            showError(error.message || 'Ошибка при удалении мероприятия');
        } finally {
            confirmModal.style.display = 'none';
        }
    };

    cancelDeleteBtn.onclick = () => {
        confirmModal.style.display = 'none';
    };

    // Закрытие модального окна при клике вне его содержимого
    window.onclick = (event) => {
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    };
}

// Функция для обновления только кнопок действий
async function updateEventActions() {
    try {
        console.log('Обновляем только кнопки действий...');
        const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.DETAIL, { id: eventId });
        
        const response = await fetch(apiUrl, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            console.error('Ошибка при обновлении действий:', response.status);
            return;
        }

        const event = await response.json();
        
        // Получаем данные текущего пользователя
        const currentUser = getCurrentUser();
        const isParticipating = event.participants && event.participants.some(p => p.user_id === currentUser.id);
        const isOrganizer = event.organizer_id === currentUser.id;
        
        // Обновляем только кнопки действий
        const actionsDiv = document.getElementById('eventActions');
        actionsDiv.innerHTML = '';

        if (isOrganizer || isParticipating) {
            if (isOrganizer) {
                // Для организатора — только статус, без кнопки редактирования
                const participationStatus = document.createElement('div');
                participationStatus.className = 'participation-status organizer';
                participationStatus.innerHTML = '<i class="fas fa-crown"></i> Вы организатор этого мероприятия';
                actionsDiv.appendChild(participationStatus);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-danger';
                deleteButton.textContent = 'Удалить';
                deleteButton.onclick = () => deleteEvent(event.id);
                actionsDiv.appendChild(deleteButton);
            } else if (isParticipating) {
                // Если пользователь участвует, показываем статус и кнопку отмены
                const participationStatus = document.createElement('div');
                participationStatus.className = 'participation-status participant';
                participationStatus.innerHTML = '<i class="fas fa-check-circle"></i> Вы участвуете в этом мероприятии';
                actionsDiv.appendChild(participationStatus);
                
                const cancelButton = document.createElement('button');
                cancelButton.className = 'btn btn-warning btn-small';
                cancelButton.textContent = 'Отменить участие';
                cancelButton.onclick = () => {
                    if (confirm('Вы уверены, что хотите отменить участие в этом мероприятии?')) {
                        cancelParticipation(event.id);
                    }
                };
                actionsDiv.appendChild(cancelButton);
            }
        } else {
            // Если мероприятие полное, показываем надпись "Нет мест"
            if ((event.current_participants || 0) >= event.max_participants) {
                const noSeats = document.createElement('div');
                noSeats.className = 'no-seats-message';
                noSeats.textContent = 'Нет мест';
                actionsDiv.appendChild(noSeats);
            } else {
                // Если пользователь не участвует и не является организатором, показываем кнопку участия
                const participateButton = document.createElement('button');
                participateButton.className = 'btn btn-primary';
                participateButton.textContent = event.ticket_price && event.ticket_price > 0 ? 'Купить билет' : 'Я пойду';
                participateButton.onclick = () => (event.ticket_price && event.ticket_price > 0) ? buyTicket(event.id) : participate(event.id);
                actionsDiv.appendChild(participateButton);
            }
        }
        
        console.log('Кнопки действий обновлены');
    } catch (error) {
        console.error('Ошибка при обновлении действий:', error);
    }
}

// Загружаем детали мероприятия при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM загружен, начинаем инициализацию страницы события');
    console.log('URL параметры:', window.location.search);
    console.log('eventId из URL:', eventId);
    
    // Проверяем авторизацию
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('Токен авторизации:', token ? 'Найден' : 'Отсутствует');
    console.log('Данные пользователя:', user ? 'Найдены' : 'Отсутствуют');
    
    if (!token || !user) {
        console.error('Пользователь не авторизован');
        showError('Необходимо авторизоваться для просмотра деталей мероприятия');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Сначала тестируем подключение к API
    const apiConnected = await testApiConnection();
    if (!apiConnected) {
        console.error('Не удалось подключиться к API');
        showError('Не удалось подключиться к серверу. Проверьте, что бэкенд запущен.');
        return;
    }
    
    if (!eventId) {
        console.error('ID мероприятия не указан в URL');
        showError('ID мероприятия не указан');
        return;
    }
    
    console.log('Запускаем загрузку деталей мероприятия для ID:', eventId);
    loadEventDetails();
}); 