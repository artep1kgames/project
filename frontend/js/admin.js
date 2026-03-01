// Проверка прав доступа
async function checkAdminAccess() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = './index.html';
        return;
    }

    try {
        const user = await getCurrentUser();
        if (user.role !== 'admin') {
            window.location.href = './index.html';
        }
    } catch (error) {
        console.error('Ошибка при проверке прав доступа:', error);
        window.location.href = './index.html';
    }
}

// Инициализация админ-панели
document.addEventListener('DOMContentLoaded', function() {
    initAdminPanel();
});

// Инициализация админ-панели
async function initAdminPanel() {
    try {
        // Проверяем авторизацию
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Получаем информацию о пользователе
        const user = await getCurrentUser();
        if (user.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }

        // Отображаем имя пользователя
        const usernameElement = document.querySelector('.username');
        if (usernameElement) {
            usernameElement.textContent = user.full_name || user.username;
        }

        // Инициализируем навигацию по вкладкам
        initTabNavigation();
        
        // Загружаем данные для всех вкладок
        await Promise.all([
            loadUsers(),
            loadEvents()
        ]);
    } catch (error) {
        console.error('Ошибка при инициализации админ-панели:', error);
        showError('Не удалось загрузить данные');
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {
        console.log('Начинаем загрузку пользователей...');
        const url = getApiUrl(API_CONFIG.ENDPOINTS.USERS.LIST);
        console.log('URL для загрузки пользователей:', url);

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка сервера:', response.status, errorText);
            throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
        }

        const users = await response.json();
        console.log('Получены пользователи:', users);

        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            console.error('Элемент usersTableBody не найден');
            return;
        }

        tbody.innerHTML = '';

        if (!Array.isArray(users)) {
            console.error('Полученные данные не являются массивом:', users);
            throw new Error('Неверный формат данных пользователей');
        }

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.full_name || user.username}</td>
                <td>${user.email}</td>
                <td>${getRoleDisplay(user.role)}</td>
                <td class="actions">
                    <button class="btn-icon edit" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        console.log('Пользователи успешно загружены');
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        showError('Не удалось загрузить список пользователей');
    }
}

// Функция для отображения роли на русском языке
function getRoleDisplay(role) {
    const roles = {
        'visitor': 'Посетитель',
        'organizer': 'Организатор',
        'admin': 'Администратор'
    };
    return roles[role] || role;
}

// Загрузка мероприятий
async function loadEvents() {
    try {
        const response = await fetch(getApiUrl('/api/admin/events'), {
            headers: {
                ...API_CONFIG.HEADERS,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при загрузке мероприятий');
        }

        const events = await response.json();
        console.log('События для админки:', events);
        const tbody = document.getElementById('eventsTableBody');
        if (!tbody) {
            console.error('Элемент eventsTableBody не найден');
            return;
        }

        tbody.innerHTML = '';

        events.forEach(event => {
            // Форматируем дату
            let formattedDate = 'Не указана';
            if (event.start_date) {
                const startDate = new Date(event.start_date);
                if (!isNaN(startDate)) {
                    formattedDate = startDate.toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }

            // Получаем информацию об организаторе
            let organizerName = 'Не указан';
            if (event.organizer && typeof event.organizer === 'object') {
                organizerName = event.organizer.full_name || event.organizer.username || event.organizer.email || 'Не указан';
            }

            // Получаем тип мероприятия
            const eventType = event.event_type || 'Не указан';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${event.id}</td>
                <td>${event.title}</td>
                <td>${formattedDate}</td>
                <td>${organizerName}</td>
                <td>${eventType}</td>
                <td>${getEventStatus(event.status)}</td>
                <td class="actions">
                    <button class="btn-icon view" onclick="viewEventDetails(${event.id})" title="Просмотр">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon edit" onclick="editEvent(${event.id})" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${event.status === 'PENDING' ? `
                        <button class="btn-icon approve" onclick="approveEvent(${event.id})" title="Одобрить">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-icon reject" onclick="rejectEvent(${event.id})" title="Отклонить">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon delete" onclick="deleteEvent(${event.id})" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        console.log('Мероприятия загружены:', events);
    } catch (error) {
        console.error('Ошибка при загрузке мероприятий:', error);
        showError('Не удалось загрузить список мероприятий');
    }
}

// Функция для получения текстового представления статуса
function getEventStatus(status) {
    const statusMap = {
        'PENDING': 'На рассмотрении',
        'APPROVED': 'Одобрено',
        'REJECTED': 'Отклонено'
    };
    return statusMap[status] || status;
}

// Инициализация навигации по вкладкам
function initTabNavigation() {
    const tabButtons = document.querySelectorAll('.admin-nav-item');
    const tabContents = document.querySelectorAll('.admin-tab');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Убираем активный класс у всех кнопок и вкладок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Добавляем активный класс выбранной кнопке
            button.classList.add('active');

            // Показываем соответствующую вкладку
            const tabId = `${button.dataset.tab}-tab`;
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}

// Функции для работы с модальными окнами
function showAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showAddEventModal() {
    const modal = document.getElementById('addEventModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Функции для закрытия модальных окон
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Функции для отображения уведомлений
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    document.querySelector('.admin-content').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;
    document.querySelector('.admin-content').prepend(successDiv);
    setTimeout(() => successDiv.remove(), 5000);
}

// Функции для работы с мероприятиями
async function approveEvent(eventId) {
    try {
        const response = await fetch(`/api/admin/events/${eventId}/approve`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Ошибка при одобрении мероприятия');
        showSuccess('Мероприятие одобрено');
        await loadEvents();
    } catch (error) {
        console.error(error);
        showError(error.message);
    }
}

async function rejectEvent(eventId) {
    try {
        const reason = prompt('Укажите причину отклонения:');
        if (!reason) return;
        const response = await fetch(`/api/admin/events/${eventId}/reject?reason=${encodeURIComponent(reason)}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Ошибка при отклонении мероприятия');
        showSuccess('Мероприятие отклонено');
        await loadEvents();
    } catch (error) {
        console.error(error);
        showError(error.message);
    }
}

// Публикация мероприятия
async function publishEvent(eventId) {
    if (!confirm('Вы уверены, что хотите опубликовать это мероприятие?')) {
        return;
    }

    try {
        const response = await fetch(getApiUrl(`/api/admin/events/${eventId}/publish`), {
            method: 'POST',
            headers: {
                ...API_CONFIG.HEADERS,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при публикации мероприятия');
        }

        showSuccess('Мероприятие успешно опубликовано');
        loadEvents(); // Перезагружаем список мероприятий
    } catch (error) {
        console.error('Ошибка при публикации мероприятия:', error);
        showError('Не удалось опубликовать мероприятие');
    }
}

// Удаление мероприятия
async function deleteEvent(eventId) {
    if (!confirm('Вы уверены, что хотите удалить это мероприятие? Это действие нельзя отменить.')) {
        return;
    }

    try {
        const response = await fetch(getApiUrl(`/api/admin/events/${eventId}`), {
            method: 'DELETE',
            headers: {
                ...API_CONFIG.HEADERS,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при удалении мероприятия');
        }

        showSuccess('Мероприятие успешно удалено');
        loadEvents(); // Перезагружаем список мероприятий
    } catch (error) {
        console.error('Ошибка при удалении мероприятия:', error);
        showError('Не удалось удалить мероприятие');
    }
}

// Добавление пользователя
async function addUser() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USERS.CREATE), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                username,
                email,
                password,
                role: role.toLowerCase(),
                full_name: username
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Ошибка при добавлении пользователя');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        modal.hide();
        await loadUsers();
        showSuccess('Пользователь успешно добавлен');
    } catch (error) {
        console.error('Ошибка при добавлении пользователя:', error);
        showError(error.message || 'Не удалось добавить пользователя');
    }
}

// Добавление мероприятия
async function addEvent() {
    try {
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const location = document.getElementById('eventLocation').value;
    const description = document.getElementById('eventDescription').value;
        const eventType = document.getElementById('eventType').value;

        if (!title || !date || !location || !description || !eventType) {
            showError('Пожалуйста, заполните все поля');
            return;
        }

        const eventData = {
            title,
            start_date: date,
            location,
            description,
            event_type: eventType
        };

        const response = await fetch(getApiUrl('/api/admin/events'), {
            method: 'POST',
            headers: {
                ...API_CONFIG.HEADERS,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Ошибка при создании мероприятия');
        }

        showSuccess('Мероприятие успешно создано');
        closeModal('addEventModal');
        await loadEvents();
    } catch (error) {
        console.error('Ошибка при создании мероприятия:', error);
        showError(error.message || 'Не удалось создать мероприятие');
    }
}

// Удаление пользователя
async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USERS.DELETE, { id: userId }), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Ошибка при удалении пользователя');
        }

        await loadUsers();
        showSuccess('Пользователь успешно удален');
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        showError(error.message || 'Не удалось удалить пользователя');
    }
}

// Редактирование пользователя
async function editUser(userId) {
    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USERS.DETAIL, { id: userId }), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Не удалось загрузить данные пользователя');
        }

        const user = await response.json();
        
        // Заполняем форму редактирования
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editRole').value = user.role;
        document.getElementById('editFullName').value = user.full_name || '';

        // Показываем модальное окно
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        showError('Не удалось загрузить данные пользователя');
    }
}

// Сохранение изменений пользователя
async function saveUserChanges() {
    const userId = document.getElementById('editUserId').value;
    const userData = {
        username: document.getElementById('editUsername').value,
        email: document.getElementById('editEmail').value,
        role: document.getElementById('editRole').value,
        full_name: document.getElementById('editFullName').value
    };

    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.USERS.UPDATE, { id: userId }), {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error('Не удалось обновить данные пользователя');
        }

        closeModal('editUserModal');
        loadUsers();
        showSuccess('Данные пользователя успешно обновлены');
    } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        showError('Не удалось обновить данные пользователя');
    }
}

// Редактирование мероприятия
async function editEvent(eventId) {
    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.DETAIL, { id: eventId }), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Не удалось загрузить данные мероприятия');
        }

        const event = await response.json();
        
        // Заполняем форму редактирования
        document.getElementById('editEventId').value = event.id;
        document.getElementById('editEventTitle').value = event.title;
        document.getElementById('editEventDescription').value = event.description;
        document.getElementById('editEventType').value = event.event_type;
        document.getElementById('editEventStartDate').value = event.start_date.split('T')[0];
        document.getElementById('editEventStartTime').value = event.start_date.split('T')[1].substring(0, 5);
        document.getElementById('editEventEndDate').value = event.end_date.split('T')[0];
        document.getElementById('editEventEndTime').value = event.end_date.split('T')[1].substring(0, 5);
        document.getElementById('editEventLocation').value = event.location;
        document.getElementById('editEventMaxParticipants').value = event.max_participants;
        document.getElementById('editEventIsPaid').checked = event.is_paid;
        document.getElementById('editEventPrice').value = event.price || '';

        // Показываем модальное окно
        const modal = document.getElementById('editEventModal');
        if (modal) {
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных мероприятия:', error);
        showError('Не удалось загрузить данные мероприятия');
    }
}

// Сохранение изменений мероприятия
async function saveEventChanges() {
    const eventId = document.getElementById('editEventId').value;
    const startDate = document.getElementById('editEventStartDate').value;
    const startTime = document.getElementById('editEventStartTime').value;
    const endDate = document.getElementById('editEventEndDate').value;
    const endTime = document.getElementById('editEventEndTime').value;

    const eventData = {
        title: document.getElementById('editEventTitle').value,
        description: document.getElementById('editEventDescription').value,
        event_type: document.getElementById('editEventType').value,
        start_date: `${startDate}T${startTime}:00`,
        end_date: `${endDate}T${endTime}:00`,
        location: document.getElementById('editEventLocation').value,
        max_participants: parseInt(document.getElementById('editEventMaxParticipants').value),
        is_paid: document.getElementById('editEventIsPaid').checked,
        price: document.getElementById('editEventIsPaid').checked ? 
            parseFloat(document.getElementById('editEventPrice').value) : null
    };

    try {
        const response = await fetch(getApiUrl(`/api/admin/events/${eventId}`), {
            method: 'PUT',
            headers: {
                ...API_CONFIG.HEADERS,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            throw new Error('Не удалось обновить данные мероприятия');
        }

        closeModal('editEventModal');
        loadEvents();
        showSuccess('Данные мероприятия успешно обновлены');
    } catch (error) {
        console.error('Ошибка при обновлении мероприятия:', error);
        showError('Не удалось обновить данные мероприятия');
    }
}

// Просмотр деталей мероприятия
async function viewEventDetails(eventId) {
    try {
        const response = await fetch(`/api/admin/events/${eventId}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Ошибка при загрузке мероприятия');
        const event = await response.json();
        console.log('Полученные данные мероприятия:', event); // Для отладки

        const modal = document.getElementById('eventDetailsModal');
        const title = document.getElementById('eventDetailsTitle');
        const description = document.getElementById('eventDetailsDescription');
        const type = document.getElementById('eventDetailsType');
        const date = document.getElementById('eventDetailsDate');
        const location = document.getElementById('eventDetailsLocation');
        const participants = document.getElementById('eventDetailsParticipants');
        const organizer = document.getElementById('eventDetailsOrganizer');
        const status = document.getElementById('eventDetailsStatus');
        const eventImage = document.getElementById('eventDetailsImage');

        // Форматируем дату
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);
        const formattedDate = `${startDate.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })} - ${endDate.toLocaleString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        })}`;

        title.textContent = event.title;
        description.textContent = event.description;
        type.textContent = event.event_type || 'Не указан';
        date.textContent = formattedDate;
        location.textContent = event.location;
        participants.textContent = `${event.current_participants || 0}/${event.max_participants}`;
        organizer.textContent = event.organizer ? 
            `${event.organizer.full_name || event.organizer.username || event.organizer.email}` : 
            'Не указан';
        status.textContent = getEventStatus(event.status);

        // Обновляем изображение
        if (event.images && event.images.length > 0) {
            console.log('Найдены изображения:', event.images); // Для отладки
            eventImage.src = event.images[0].url;
            eventImage.alt = event.title;
            eventImage.style.display = 'block';
        } else {
            console.log('Изображения не найдены, используем изображение по умолчанию'); // Для отладки
            eventImage.src = '../images/default-event.jpg';
            eventImage.alt = 'Изображение по умолчанию';
            eventImage.style.display = 'block';
        }

        modal.style.display = 'block';
    } catch (error) {
        console.error(error);
        showError(error.message);
    }
}

// Функция для отображения изображения
function getEventImage(event) {
    if (event.images && event.images.length > 0) {
        return event.images[0].url;
    }
    return '../images/default-event.jpg';
}

// Удаление всех опубликованных мероприятий
async function deletePublishedEvents() {
    if (!confirm('Вы уверены, что хотите удалить все опубликованные мероприятия? Это действие нельзя отменить.')) {
        return;
    }

    try {
        const response = await fetch(getApiUrl('/api/admin/events/published'), {
            method: 'DELETE',
            headers: {
                ...API_CONFIG.HEADERS,
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при удалении мероприятий');
        }

        const result = await response.json();
        showSuccess(result.message);
        loadEvents(); // Перезагружаем список мероприятий
    } catch (error) {
        console.error('Ошибка при удалении мероприятий:', error);
        showError('Не удалось удалить мероприятия');
    }
}