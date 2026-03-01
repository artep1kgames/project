// Функция для получения информации о текущем пользователе
async function getUser() {
    try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.PROFILE), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Если токен недействителен, перенаправляем на главную
                localStorage.removeItem('token');
                window.location.href = './index.html';
                return null;
            }
            throw new Error('Failed to get user info');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting user info:', error);
        showError('Ошибка при загрузке информации о пользователе');
        return null;
    }
}

// Функция для загрузки информации о пользователе
async function loadUserInfo() {
    try {
        const user = await getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Обновляем информацию о пользователе
        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        const userRoleElement = document.getElementById('userRole');

        if (userNameElement) userNameElement.textContent = user.full_name || user.username;
        if (userEmailElement) userEmailElement.textContent = user.email;
        if (userRoleElement) {
            console.log('Original role:', user.role);
            console.log('Role type:', typeof user.role);
            console.log('Role after toLowerCase:', user.role.toLowerCase());
            
            const roleDisplay = {
                'admin': 'Администратор',
                'system administrator': 'Системный администратор',
                'system_administrator': 'Системный администратор',
                'organizer': 'Организатор',
                'visitor': 'Посетитель'
            };
            
            const normalizedRole = user.role.toLowerCase().trim();
            console.log('Normalized role:', normalizedRole);
            console.log('Mapped role:', roleDisplay[normalizedRole]);
            
            userRoleElement.textContent = roleDisplay[normalizedRole] || user.role;
        }

        // Показываем секцию мероприятий организатора, если пользователь - организатор
        if (user.role.toLowerCase() === 'organizer') {
            const organizerSection = document.querySelector('.organizer-only');
            if (organizerSection) {
                organizerSection.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        showError('Ошибка при загрузке информации о пользователе');
    }
}

// Функция для загрузки предстоящих мероприятий
async function loadUpcomingEvents() {
    try {
        const user = await getUser();
        if (!user) return;
        const response = await fetch(getApiUrl('/api/me/upcoming-events'), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to load upcoming events');
        }

        const events = await response.json();
        const container = document.getElementById('upcomingEvents');
        if (container) {
            displayEvents(events, 'upcomingEvents');
        } else {
            console.warn('Container for upcoming events not found');
        }
    } catch (error) {
        console.error('Error loading upcoming events:', error);
        const container = document.getElementById('upcomingEvents');
        if (container) {
            container.innerHTML = '<p>Ошибка при загрузке предстоящих мероприятий</p>';
        }
    }
}

// Функция для загрузки прошедших мероприятий
async function loadPastEvents() {
    try {
        const user = await getUser();
        if (!user) return;
        const response = await fetch(getApiUrl('/api/me/past-events'), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to load past events');
        }

        const events = await response.json();
        const container = document.getElementById('pastEvents');
        if (container) {
            displayEvents(events, 'pastEvents');
        } else {
            console.warn('Container for past events not found');
        }
    } catch (error) {
        console.error('Error loading past events:', error);
        const container = document.getElementById('pastEvents');
        if (container) {
            container.innerHTML = '<p>Ошибка при загрузке прошедших мероприятий</p>';
        }
    }
}

// Функция для загрузки мероприятий организатора
async function loadOrganizerEvents() {
    const user = await getUser();
    if (!user || user.role !== 'organizer') {
        const organizerSection = document.querySelector('.organizer-only');
        if (organizerSection) {
            organizerSection.style.display = 'none';
        }
        return;
    }

    try {
        const response = await fetch(getApiUrl('/api/me/events'), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to load organizer events');
        }

        const events = await response.json();
        const container = document.getElementById('myEvents');
        if (container) {
            displayEvents(events, 'myEvents');
        } else {
            console.warn('Container for organizer events not found');
        }
    } catch (error) {
        console.error('Error loading organizer events:', error);
        const container = document.getElementById('myEvents');
        if (container) {
            container.innerHTML = '<p>Ошибка при загрузке ваших мероприятий</p>';
        }
    }
}

// Функция для отображения мероприятий
function displayEvents(events, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    events.forEach(event => {
        // Категории
        let categoryTags = '';
        if (Array.isArray(event.categories) && event.categories.length > 0) {
            categoryTags = event.categories
                .map(cat => `<span class="category-tag">${getCategoryDisplay(cat)}</span>`)
                .join('');
        }

        const startDate = new Date(event.start_date);
        const formattedDate = startDate.toLocaleString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Оплата
        const paymentType = event.ticket_price && event.ticket_price > 0 ? 'PAID' : 'FREE';
        const paymentTypeDisplay = getPaymentTypeDisplay(paymentType);
        const paymentClass = paymentType === 'PAID' ? 'payment-paid' : 'payment-free';

        // Статус
        const statusClass = `status-${event.status && event.status.toLowerCase()}`;
        const statusDisplay = {
            'PENDING': 'На модерации',
            'APPROVED': 'Одобрено',
            'REJECTED': 'Отклонено',
            'PUBLISHED': 'Опубликовано'
        }[event.status] || event.status;

        // Участие
        const currentUser = getUser();
        const isParticipating = event.participants && event.participants.some(p => p.user_id === currentUser.id);
        const isOrganizer = event.organizer_id === currentUser.id;
        let participationStatus = '';
        if (isOrganizer) {
            participationStatus = '<span class="participation-badge organizer"><i class="fas fa-crown"></i> Организатор</span>';
        } else if (isParticipating) {
            participationStatus = '<span class="participation-badge participant"><i class="fas fa-check-circle"></i> Участвую</span>';
        }

        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        eventCard.innerHTML = `
            <div class="event-image">
                <img src="${event.image_url || '/images/notification-icon.svg'}" alt="${event.title}" onerror="this.src='/images/notification-icon.svg'">
            </div>
            <div class="event-content">
                <h3>${event.title}</h3>
                <p class="event-date">
                    <i class="fas fa-calendar"></i>
                    ${formattedDate}
                </p>
                <p class="event-description">${event.short_description || event.description}</p>
                ${categoryTags ? `<div class="categories-list">${categoryTags}</div>` : ''}
                ${participationStatus ? `<div class="participation-status">${participationStatus}</div>` : ''}
                <div class="event-footer">
                    <div class="event-meta">
                        <span class="event-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${event.location}
                        </span>
                        <span class="event-participants">
                            <i class="fas fa-users"></i>
                            ${event.current_participants || 0}/${event.max_participants}
                        </span>
                        <span class="event-payment ${paymentClass}">
                            <i class="fas ${paymentType === 'PAID' ? 'fa-ticket-alt' : 'fa-gift'}"></i>
                            ${paymentTypeDisplay}
                            ${paymentType === 'PAID' && event.ticket_price ? ` (${event.ticket_price} ₽)` : ''}
                        </span>
                    </div>
                    <div class="event-status ${statusClass}">${statusDisplay}</div>
                </div>
                <div class="event-actions">
                    <a href="event.html?id=${event.id}" class="btn btn-primary"><i class="fas fa-eye"></i> Подробнее</a>
                </div>
            </div>
        `;
        container.appendChild(eventCard);
    });
}

// Функция для определения класса статуса мероприятия
function getEventStatusClass(event) {
    const now = new Date();
    const startDate = new Date(event.start_date);
    
    if (event.status === 'cancelled') {
        return 'status-cancelled';
    } else if (startDate > now) {
        return 'status-upcoming';
    } else {
        return 'status-past';
    }
}

// Функция для получения текста статуса мероприятия
function getEventStatusText(event) {
    const now = new Date();
    const startDate = new Date(event.start_date);
    
    if (event.status === 'cancelled') {
        return 'Отменено';
    } else if (startDate > now) {
        return 'Предстоящее';
    } else {
        return 'Прошедшее';
    }
}

// Функция для редактирования мероприятия
async function editEvent(eventId) {
    window.location.href = `event-edit.html?id=${eventId}`;
}

// Функция для удаления мероприятия
async function deleteEvent(eventId) {
    if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) {
        return;
    }

    try {
        const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.EVENTS.DELETE}/${eventId}`), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to delete event');
        }

        // Перезагружаем страницу после успешного удаления
        window.location.reload();
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Ошибка при удалении мероприятия');
    }
}

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const user = await getUser();
        if (!user) {
            window.location.href = './index.html';
            return;
        }

        // Загружаем информацию о пользователе
        await loadUserInfo();
        
        // Загружаем список мероприятий пользователя
        await loadUserEvents();
    } catch (error) {
        console.error('Error initializing profile page:', error);
        showError('Ошибка при загрузке профиля');
    }
});

// Функция для загрузки мероприятий пользователя
async function loadUserEvents() {
    try {
        const user = await getUser();
        if (!user) return;

        // Загружаем предстоящие мероприятия
        await loadUpcomingEvents();
        
        // Загружаем прошедшие мероприятия
        await loadPastEvents();
        
        // Если пользователь организатор, загружаем его мероприятия
        if (user.role === 'organizer') {
            await loadOrganizerEvents();
        }
    } catch (error) {
        console.error('Error loading user events:', error);
        showError('Ошибка при загрузке мероприятий');
    }
}

// Функция отображения мероприятий пользователя
function displayUserEvents(events) {
    const eventsList = document.getElementById('userEventsList');
    if (!eventsList) return;

    if (events.length === 0) {
        eventsList.innerHTML = '<div class="col-12"><p>У вас пока нет зарегистрированных мероприятий</p></div>';
        return;
    }

    eventsList.innerHTML = events.map(event => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100">
                ${event.image_url ? `<img src="${event.image_url}" class="card-img-top" alt="${event.title}">` : ''}
                <div class="card-body">
                    <h5 class="card-title">${event.title}</h5>
                    <p class="card-text">${event.description}</p>
                    <p class="card-text">
                        <small class="text-muted">
                            Дата: ${new Date(event.date).toLocaleString()}<br>
                            Место: ${event.location}<br>
                            ${event.is_paid ? `Стоимость: ${event.ticket_price} ₽` : 'Бесплатно'}
                        </small>
                    </p>
                    <button class="btn btn-primary" onclick="showEventDetails(${event.id})">Подробнее</button>
                    <button class="btn btn-danger" onclick="cancelRegistration(${event.id})">Отменить регистрацию</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Функция отображения деталей мероприятия
async function showEventDetails(eventId) {
    try {
        showLoading();
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.DETAIL, { id: eventId }), {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Не удалось загрузить информацию о мероприятии');
        }

        const event = await response.json();
        
        // Заполняем модальное окно данными
        document.getElementById('eventTitle').textContent = event.title;
        document.getElementById('eventDescription').textContent = event.description;
        document.getElementById('eventFullDescription').textContent = event.full_description;
        document.getElementById('eventDate').textContent = new Date(event.date).toLocaleString();
        document.getElementById('eventLocation').textContent = event.location;
        document.getElementById('eventOrganizer').textContent = event.organizer.full_name;
        document.getElementById('eventParticipants').textContent = 
            `${event.current_participants}/${event.max_participants}`;
        document.getElementById('eventPrice').textContent = 
            event.is_paid ? `${event.ticket_price} ₽` : 'Бесплатно';
        
        if (event.image_url) {
            document.getElementById('eventImage').src = event.image_url;
            document.getElementById('eventImage').style.display = 'block';
        } else {
            document.getElementById('eventImage').style.display = 'none';
        }

        // Показываем модальное окно
        const eventDetailsModal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
        eventDetailsModal.show();
    } catch (error) {
        console.error('Ошибка при загрузке деталей мероприятия:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Функция отмены регистрации на мероприятие
async function cancelRegistration(eventId) {
    if (!confirm('Вы уверены, что хотите отменить регистрацию на это мероприятие?')) {
        return;
    }

    try {
        showLoading();
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.CANCEL_REGISTRATION, { id: eventId }), {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Ошибка при отмене регистрации');
        }

        showSuccess('Регистрация на мероприятие отменена');
        await loadUserEvents(); // Перезагружаем список мероприятий
    } catch (error) {
        console.error('Ошибка при отмене регистрации:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Функция отображения модального окна редактирования профиля
async function showEditProfileModal() {
    try {
        const user = await getUser();
        if (user) {
            document.getElementById('editFullName').value = user.username || '';
            document.getElementById('editEmail').value = user.email || '';
        }
        const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading user data:', error);
        showError('Ошибка при загрузке данных пользователя');
    }
}

// Функция сохранения изменений профиля
async function saveProfileChanges() {
    const fullName = document.getElementById('editFullName').value;
    const email = document.getElementById('editEmail').value;
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!fullName || !email) {
        showError('Пожалуйста, заполните все обязательные поля');
        return;
    }

    if (newPassword && newPassword !== confirmPassword) {
        showError('Новые пароли не совпадают');
        return;
    }

    try {
        const updateData = {
            username: fullName,
            email: email
        };

        if (newPassword) {
            updateData.current_password = currentPassword;
            updateData.new_password = newPassword;
        }

        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.AUTH.PROFILE), {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        showSuccess('Профиль успешно обновлен');
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();
        await loadUserInfo();
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('Ошибка при обновлении профиля');
    }
}

// Вспомогательные функции
function showSuccess(message) {
    // Здесь можно добавить отображение успешного сообщения
    alert(message);
}

function showError(message) {
    // Здесь можно добавить отображение сообщения об ошибке
    alert(message);
}

function showLoading() {
    // Здесь можно добавить отображение индикатора загрузки
    alert('Загрузка...');
}

function hideLoading() {
    // Здесь можно добавить скрытие индикатора загрузки
    alert('Загрузка завершена');
}

// Добавить getCategoryDisplay и getPaymentTypeDisplay, если их нет
function getCategoryDisplay(category) {
    if (category.description && category.description !== category.name) {
        return category.description;
    }
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

function getPaymentTypeDisplay(paymentType) {
    const paymentTypes = {
        'FREE': 'Бесплатно',
        'PAID': 'Платно'
    };
    return paymentTypes[paymentType] || paymentType;
} 