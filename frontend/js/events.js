// Получаем элементы страницы
const eventsContainer = document.getElementById('eventsContainer');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const createEventBtn = document.getElementById('createEventBtn');

// Глобальные переменные
let events = [];
let categories = [];
let currentUser = null;

// Функция для получения текущего пользователя
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Функция для проверки авторизации
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Функция для перенаправления на страницу входа
function redirectToLogin() {
    window.location.href = './index.html';
}

// Функция для удаления токена
function removeToken() {
    localStorage.removeItem('token');
}

// Функция для удаления данных пользователя
function removeUser() {
    localStorage.removeItem('user');
}

// Получаем элементы
const createEventModal = document.getElementById('createEventModal');
const createEventForm = document.getElementById('createEventForm');

// Функция загрузки категорий
async function loadCategories() {
    try {
        console.log('Loading categories...');
        const categoriesUrl = getApiUrl(API_CONFIG.ENDPOINTS.CATEGORIES.BASE); // Используем константу
        console.log('Fetching categories from:', categoriesUrl);
        
        const response = await fetch(categoriesUrl, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Categories data:', data);
        
        if (data.categories) {
            categories = data.categories;
        } else {
            categories = data; // Fallback для старого формата
        }
        
        console.log('Categories loaded:', categories);
        displayCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
        
        // Fallback: используем статические категории если API недоступен
        console.log('Using fallback categories...');
        categories = [
            {"id": 1, "name": "CONFERENCE", "description": "Конференция"},
            {"id": 2, "name": "SEMINAR", "description": "Семинар"},
            {"id": 3, "name": "WORKSHOP", "description": "Мастер-класс"},
            {"id": 4, "name": "EXHIBITION", "description": "Выставка"},
            {"id": 5, "name": "CONCERT", "description": "Концерт"},
            {"id": 6, "name": "FESTIVAL", "description": "Фестиваль"},
            {"id": 7, "name": "SPORTS", "description": "Спортивное мероприятие"},
            {"id": 8, "name": "OTHER", "description": "Другое"}
        ];
        
        displayCategories();
        
        // Показываем сообщение об ошибке пользователю
        const categoriesContainer = document.getElementById('categoriesContainer');
        if (categoriesContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = '<p>⚠️ Используются локальные категории (API недоступен)</p>';
            categoriesContainer.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }
}

// Открытие модального окна создания мероприятия
if (createEventBtn) {
    createEventBtn.onclick = async () => {
        if (!isAuthenticated()) {
            alert('Пожалуйста, войдите в систему для создания мероприятия');
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'block';
            }
            return;
        }

        try {
            const user = await getCurrentUser();
            if (user.role !== 'organizer' && user.role !== 'admin') {
                alert('Только организаторы и администраторы могут создавать мероприятия');
                return;
            }

            if (createEventModal) {
                createEventModal.style.display = 'block';
            }
        } catch (error) {
            console.error('Ошибка при проверке прав доступа:', error);
            showError('Ошибка при проверке прав доступа');
        }
    }
}

// Закрытие модальных окон
const closeButtons = document.getElementsByClassName('close');
if (closeButtons) {
    Array.from(closeButtons).forEach(btn => {
        btn.onclick = function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
}

// Обработчик отправки формы создания мероприятия
document.getElementById('createEventForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Form submission started');

    try {
        const isPaid = document.getElementById('isPaidEvent').checked;
        const price = isPaid ? parseFloat(document.getElementById('eventPrice').value) : 0;
        
        if (isPaid && (!price || price <= 0)) {
            throw new Error('Для платного мероприятия необходимо указать стоимость');
        }

        // Получаем тип мероприятия
        const eventType = document.getElementById('eventType').value;
        if (!eventType) {
            throw new Error('Необходимо выбрать тип мероприятия');
        }

        const eventData = {
            title: document.getElementById('eventTitle').value,
            short_description: document.getElementById('eventShortDescription').value,
            full_description: document.getElementById('eventFullDescription').value,
            location: document.getElementById('eventLocation').value,
            start_date: document.getElementById('eventStartDate').value,
            end_date: document.getElementById('eventEndDate').value,
            max_participants: parseInt(document.getElementById('eventMaxParticipants').value),
            event_type: isPaid ? 'paid' : 'free',  // Тип оплаты (FREE/PAID)
            ticket_price: price,
            status: 'PENDING'
        };

        // Находим ID категории по типу мероприятия
        let category_ids = [];
        
        // Получаем все категории для поиска ID по названию
        const categoriesResponse = await fetch('/api/categories/', {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });
        
        if (categoriesResponse.ok) {
            const categories = await categoriesResponse.json();
            const eventTypeCategory = categories.find(cat => cat.name === eventType);
            
            if (eventTypeCategory) {
                category_ids = [eventTypeCategory.id];
                console.log(`Found category ID for ${eventType}: ${eventTypeCategory.id}`);
            } else {
                console.warn(`Category not found for event type: ${eventType}`);
            }
        }

        const eventPayload = {
            ...eventData,
            category_ids
        };

        console.log('Submitting event data:', eventPayload);
        const createdEvent = await createEvent(eventPayload);
        console.log('Event created:', createdEvent);

        // Закрываем модальное окно
        const modal = document.getElementById('createEventModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Показываем сообщение об успехе
        showSuccess('Мероприятие успешно создано и отправлено на модерацию');
        
        // Обновляем список мероприятий
        await loadEvents();

    } catch (error) {
        console.error('Error in form submission:', error);
        showError(error.message);
    }
});

// Функция фильтрации мероприятий
function filterEvents() {
    // Проверяем существование элементов
    if (!searchInput || !typeFilter) {
        console.warn('Элементы фильтрации не найдены');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase();
    const selectedType = typeFilter.value;
    const eventCards = document.querySelectorAll('.event-card');

    eventCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.event-description').textContent.toLowerCase();
        const eventCategories = card.dataset.categories ? JSON.parse(card.dataset.categories) : [];

        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
        
        // Для фильтрации по категории сравниваем с кодами категорий
        let matchesType = true;
        if (selectedType) {
            // Сравниваем с кодом категории (например, "CONFERENCE", "SEMINAR")
            matchesType = eventCategories.includes(selectedType);
        }

        card.style.display = matchesSearch && matchesType ? 'block' : 'none';
    });
}

// Обработчики событий для фильтрации
if (searchInput) {
    searchInput.addEventListener('input', filterEvents);
} else {
    console.warn('Элемент поиска не найден');
}

if (typeFilter) {
    typeFilter.addEventListener('change', filterEvents);
} else {
    console.warn('Элемент фильтра категорий не найден');
}

// Функция для форматирования даты
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
}

// Функция для получения заголовков с токеном авторизации
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
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
    }
}

// Функция загрузки мероприятий
async function loadEvents() {
    try {
        console.log('Loading events...');
        showLoading('eventsContainer');

        const searchParams = new URLSearchParams(window.location.search);
        const params = {
            search: searchParams.get('search') || searchInput.value,
            category: searchParams.get('category') || typeFilter.value,
        };

        const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.BASE, params);
        console.log('Fetching events from:', apiUrl);

        const response = await fetch(apiUrl, {
            headers: getAuthHeaders(),
        });

        console.log('Events response status:', response.status);

        if (!response.ok) {
            throw new Error('Failed to load events');
        }

        const data = await response.json();
        console.log('Events data:', data);
        
        if (data.events) {
            events = data.events;
        } else {
            events = data; // Fallback для старого формата
        }
        
        console.log('Events loaded:', events);
        displayEvents();
    } catch (error) {
        console.error('Error loading events:', error);
        
        // Fallback: используем пустой массив если API недоступен
        console.log('Using fallback events...');
        events = [];
        
        displayEvents();
        
        // Показываем сообщение об ошибке пользователю
        const eventsContainer = document.getElementById('eventsContainer');
        if (eventsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3>⚠️ API недоступен</h3>
                    <p>Не удалось загрузить мероприятия с сервера.</p>
                    <p>Возможные причины:</p>
                    <ul style="text-align: left; display: inline-block;">
                        <li>Сервер временно недоступен</li>
                        <li>Проблемы с сетью</li>
                        <li>Бэкенд не развернут на хостинге</li>
                    </ul>
                    <p><a href="/debug-api.html" target="_blank">Проверить статус API</a></p>
                </div>
            `;
            eventsContainer.appendChild(errorDiv);
        }
    } finally {
        hideLoading('eventsContainer');
    }
}

// Функция для отображения списка мероприятий
function displayEvents() {
    if (!events) return;
    
    // Фильтруем только одобренные мероприятия (без учета регистра)
    const approvedEvents = events.filter(event => (event.status || '').toLowerCase() === 'approved');
    console.log('Approved events:', approvedEvents);
    
    const eventsContainer = document.getElementById('eventsContainer');
    if (!eventsContainer) return;
    
    if (approvedEvents.length === 0) {
        eventsContainer.innerHTML = '<p class="no-events">Нет доступных мероприятий</p>';
        return;
    }
    
    const eventsHTML = approvedEvents.map(event => {
        // Исправляем вложенность категорий
        let categories = event.categories;
        if (Array.isArray(categories) && categories.length === 1 && Array.isArray(categories[0])) {
            categories = categories[0];
        }
        // Формируем теги категорий
        let categoryTags = '';
        if (Array.isArray(categories) && categories.length > 0) {
            categoryTags = categories.map(cat => `<span class="category-tag">${getCategoryDisplay(cat)}</span>`).join('');
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
        }[event.status && event.status.toUpperCase()] || event.status;

        // Участие
        const currentUser = getCurrentUser();
        const isParticipating = event.participants && currentUser && event.participants.some(p => p.user_id === currentUser.id);
        const isOrganizer = currentUser && event.organizer_id === currentUser.id;
        let participationStatus = '';
        if (isOrganizer) {
            participationStatus = '<span class="participation-badge organizer"><i class="fas fa-crown"></i> Организатор</span>';
        } else if (isParticipating) {
            participationStatus = '<span class="participation-badge participant"><i class="fas fa-check-circle"></i> Участвую</span>';
        }

        // Для фильтрации по категориям (используем коды)
        const categoryCodes = Array.isArray(categories) ? categories.map(cat => cat.name) : [];

        return `
            <div class="event-card" data-categories='${JSON.stringify(categoryCodes)}'>
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
            </div>
        `;
    }).join('');
    
    eventsContainer.innerHTML = eventsHTML;
}

// Функция для получения отображаемого названия типа мероприятия
function getEventTypeDisplay(type) {
    const types = {
        'CONFERENCE': 'Конференция',
        'SEMINAR': 'Семинар',
        'WORKSHOP': 'Мастер-класс',
        'EXHIBITION': 'Выставка',
        'CONCERT': 'Концерт',
        'FESTIVAL': 'Фестиваль',
        'SPORTS': 'Спортивное мероприятие',
        'OTHER': 'Другое'
    };
    return types[type] || type;
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

// Функция для получения отображаемого названия типа оплаты
function getPaymentTypeDisplay(paymentType) {
    const paymentTypes = {
        'FREE': 'Бесплатно',
        'PAID': 'Платно'
    };
    return paymentTypes[paymentType] || paymentType;
}

// Функция для просмотра деталей мероприятия
function viewEvent(eventId) {
    window.location.href = `event.html?id=${eventId}`;
}

// Функция для отображения модального окна с деталями мероприятия
function showEventModal(event) {
    const modal = document.getElementById('eventModal');
    if (!modal) return;

    const title = document.getElementById('modalEventTitle');
    const details = document.getElementById('modalEventDetails');

    if (title) title.textContent = event.title;
    if (details) {
        // Получаем русские названия категорий
        const categoryNames = event.categories && event.categories.length > 0 
            ? event.categories.map(cat => getCategoryDisplay(cat)).join(', ')
            : 'Без категории';
            
        // Определяем тип оплаты
        const paymentType = event.ticket_price && event.ticket_price > 0 ? 'PAID' : 'FREE';
        const paymentTypeDisplay = getPaymentTypeDisplay(paymentType);
            
        details.innerHTML = `
            <p><strong>Описание:</strong> ${event.full_description || event.short_description}</p>
            <p><strong>Место:</strong> ${event.location}</p>
            <p><strong>Дата начала:</strong> ${formatDate(event.start_date)}</p>
            <p><strong>Дата окончания:</strong> ${formatDate(event.end_date)}</p>
            <p><strong>Максимальное количество участников:</strong> ${event.max_participants}</p>
            <p><strong>Текущее количество участников:</strong> ${event.current_participants || 0}</p>
            <p><strong>Тип мероприятия:</strong> ${getEventTypeDisplay(event.event_type)}</p>
            <p><strong>Тип оплаты:</strong> ${paymentTypeDisplay}</p>
            <p><strong>Категории:</strong> ${categoryNames}</p>
            ${event.ticket_price ? `<p><strong>Стоимость билета:</strong> ${event.ticket_price} ₽</p>` : ''}
        `;
    }

    modal.style.display = 'block';
}

// Функция для регистрации на мероприятие
async function registerForEvent(eventId) {
    try {
        // Проверяем авторизацию
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }

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
            if (response.status === 401) {
                removeToken();
                removeUser();
                redirectToLogin();
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to register for event');
        }

        showSuccess('Вы успешно зарегистрировались на мероприятие');
        loadEvents(); // Перезагружаем список мероприятий
    } catch (error) {
        console.error('Error registering for event:', error);
        showError(error.message || 'Ошибка при регистрации на мероприятие');
    }
}

// Функция для отмены участия в мероприятии
async function cancelEventParticipation(eventId) {
    try {
        // Проверяем авторизацию
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }

        // Запрашиваем подтверждение
        if (!confirm('Вы уверены, что хотите отменить участие в этом мероприятии?')) {
            return;
        }

        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.CANCEL_PARTICIPATION, { id: eventId }), {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            if (response.status === 401) {
                removeToken();
                removeUser();
                redirectToLogin();
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to cancel participation');
        }

        showSuccess('Участие в мероприятии отменено');
        loadEvents(); // Перезагружаем список мероприятий
    } catch (error) {
        console.error('Error cancelling participation:', error);
        showError(error.message || 'Ошибка при отмене участия');
    }
}

// Функция для показа модального окна входа
function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'block';
    }
}

// Функция для настройки поиска
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const eventCards = document.querySelectorAll('.event-card');
        
        eventCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('.event-description').textContent.toLowerCase();
            const location = card.querySelector('.event-location').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || 
                description.includes(searchTerm) || 
                location.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Функция для фильтрации мероприятий
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-buttons .btn');
    if (!filterButtons.length) return;

    filterButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const filter = button.dataset.filter;
            
            // Обновляем активную кнопку
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            try {
                showLoading();
                const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.LIST) + `?filter=${filter}`, {
                    headers: getAuthHeaders()
                });

                if (!response.ok) {
                    throw new Error('Ошибка фильтрации');
                }

                const events = await response.json();
                displayEvents(events);
            } catch (error) {
                showError(error.message);
            } finally {
                hideLoading();
            }
        });
    });
}

// Вспомогательная функция для debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Вспомогательные функции
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация обработчика для платного мероприятия
    const isPaidCheckbox = document.getElementById('isPaidEvent');
    if (isPaidCheckbox) {
        isPaidCheckbox.addEventListener('change', handlePaidEventChange);
    }

    // Остальная инициализация...
    loadEvents();
    setupSearch();
    setupFilters();
});

function handlePaidEventChange() {
    const priceGroup = document.getElementById('priceGroup');
    const priceInput = document.getElementById('eventPrice');
    
    if (priceGroup && priceInput) {
        if (this.checked) {
            priceGroup.style.display = 'block';
            priceInput.required = true;
        } else {
            priceGroup.style.display = 'none';
            priceInput.required = false;
            priceInput.value = '';
        }
    }
}

function showCreateEventModal() {
    const modal = document.getElementById('createEventModal');
    if (!modal) return;

    // Очищаем форму
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        // Скрываем поле стоимости при загрузке формы
        const priceGroup = document.getElementById('priceGroup');
        const priceInput = document.getElementById('eventPrice');
        if (priceGroup && priceInput) {
            priceGroup.style.display = 'none';
            priceInput.required = false;
        }
        // Скрываем поле пользовательского типа
        const customTypeGroup = document.getElementById('customTypeGroup');
        if (customTypeGroup) {
            customTypeGroup.style.display = 'none';
        }
    }

    // Показываем модальное окно
    modal.style.display = 'block';
}

// Функция для проверки доступных методов
async function checkAllowedMethods() {
    try {
        const url = getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.CREATE);
        console.log('Checking allowed methods for URL:', url);
        
        const response = await fetch(url, {
            method: 'OPTIONS',
            headers: getAuthHeaders()
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const allowedMethods = response.headers.get('Allow');
        console.log('Allowed methods:', allowedMethods);
        
        return allowedMethods;
    } catch (error) {
        console.error('Error checking allowed methods:', error);
        return null;
    }
}

// Функция для создания нового мероприятия
async function createEvent(eventData) {
    try {
        // Устанавливаем статус PENDING для модерации
        eventData.status = 'pending';
        
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.CREATE + '/'), {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const text = await response.text();
            let errorText = '';
            try {
                errorText = JSON.parse(text).detail;
            } catch {
                errorText = text;
            }
            throw new Error(errorText || 'Ошибка при создании мероприятия');
        }

        const event = await response.json();
        showSuccess('Мероприятие создано и отправлено на модерацию');
        return event;
    } catch (error) {
        console.error('Ошибка при создании мероприятия:', error);
        showError(error.message);
        throw error;
    }
}

// Функция валидации данных мероприятия
function validateEventData(data) {
    const errors = [];

    // Проверка обязательных полей
    if (!data.title?.trim()) {
        errors.push('Название мероприятия обязательно');
    } else if (data.title.length < 3) {
        errors.push('Название должно содержать минимум 3 символа');
    } else if (data.title.length > 100) {
        errors.push('Название не должно превышать 100 символов');
    }

    if (!data.short_description?.trim()) {
        errors.push('Краткое описание обязательно');
    } else if (data.short_description.length < 10) {
        errors.push('Краткое описание должно содержать минимум 10 символов');
    } else if (data.short_description.length > 200) {
        errors.push('Краткое описание не должно превышать 200 символов');
    }

    if (!data.full_description?.trim()) {
        errors.push('Полное описание обязательно');
    } else if (data.full_description.length < 50) {
        errors.push('Полное описание должно содержать минимум 50 символов');
    }

    if (!data.location?.trim()) {
        errors.push('Место проведения обязательно');
    }

    if (!data.start_date) {
        errors.push('Дата начала обязательна');
    }

    if (!data.end_date) {
        errors.push('Дата окончания обязательна');
    }

    if (!data.max_participants) {
        errors.push('Максимальное количество участников обязательно');
    }

    if (!data.event_type) {
        errors.push('Тип мероприятия обязателен');
    }

    return errors;
}

// Функция обработки ошибок API
function handleApiError(error) {
    let errorMessage = 'Произошла ошибка при создании мероприятия';
    
    if (error.message) {
        errorMessage = error.message;
    }

    // Показываем ошибку в модальном окне
    const errorDiv = document.getElementById('createEventError');
    if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
        
        // Скрываем ошибку через 5 секунд
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        // Если элемент для ошибки не найден, показываем alert
        alert(errorMessage);
    }
} 

// Функция для форматирования даты в формат YYYY-MM-DDThh:mm
function formatDateTimeForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Функция для валидации формата даты
function validateDateTimeFormat(input) {
    const value = input.value;
    const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    
    if (!pattern.test(value)) {
        input.setCustomValidity('Неверный формат даты и времени');
        return false;
    }
    
    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Проверка корректности даты
    const date = new Date(year, month - 1, day, hours, minutes);
    if (date.getFullYear() !== year || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day ||
        date.getHours() !== hours ||
        date.getMinutes() !== minutes) {
        input.setCustomValidity('Некорректная дата или время');
        return false;
    }
    
    input.setCustomValidity('');
    return true;
}

// Функция для установки минимальной даты (текущая дата)
function setMinDateTime() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (!startDateInput || !endDateInput) return;
    
    // Получаем текущую дату и время
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16); // Формат: YYYY-MM-DDTHH:mm
    
    // Устанавливаем минимальную дату и время
    startDateInput.min = formattedDate;
    endDateInput.min = formattedDate;
    
    // Обновляем минимальную дату окончания при изменении даты начала
    startDateInput.addEventListener('change', () => {
        endDateInput.min = startDateInput.value;
    });
}

// Функция для валидации дат
function validateDates() {
    const startDateInput = document.getElementById('eventStartDate');
    const endDateInput = document.getElementById('eventEndDate');
    
    if (!startDateInput || !endDateInput) return;
    
    // Проверяем формат обеих дат
    const startValid = validateDateTimeFormat(startDateInput);
    const endValid = validateDateTimeFormat(endDateInput);
    
    if (!startValid || !endValid) return;
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    if (endDate <= startDate) {
        endDateInput.setCustomValidity('Дата окончания должна быть позже даты начала');
    } else {
        endDateInput.setCustomValidity('');
    }
}

// Добавляем обработчики событий при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const startDateInput = document.getElementById('eventStartDate');
    const endDateInput = document.getElementById('eventEndDate');
    
    if (startDateInput && endDateInput) {
        setMinDateTime();
        
        // Добавляем обработчики для валидации при вводе
        startDateInput.addEventListener('input', function() {
            validateDateTimeFormat(this);
            validateDates();
        });
        
        endDateInput.addEventListener('input', function() {
            validateDateTimeFormat(this);
            validateDates();
        });
        
        // Обработчики изменения даты
        startDateInput.addEventListener('change', function() {
            if (validateDateTimeFormat(this)) {
                endDateInput.min = this.value;
                validateDates();
            }
        });
        
        endDateInput.addEventListener('change', validateDates);
    }
});

// Функция для проверки и отображения кнопки создания мероприятия
async function checkAndShowCreateButton() {
    try {
        console.log('Проверка прав доступа для кнопки создания мероприятия');
        const user = await getCurrentUser();
        console.log('Полученные данные пользователя:', user);
        
        if (user) {
            console.log('Роль пользователя:', user.role);
            if (user.role === 'organizer' || user.role === 'admin') {
                console.log('Показываем кнопку создания мероприятия');
                createEventBtn.style.display = 'block';
            } else {
                console.log('Скрываем кнопку создания мероприятия - недостаточно прав');
                createEventBtn.style.display = 'none';
            }
        } else {
            console.log('Пользователь не авторизован');
            createEventBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка при проверке прав доступа:', error);
        createEventBtn.style.display = 'none';
    }
}

// Вызываем функцию при загрузке страницы и после авторизации
document.addEventListener('DOMContentLoaded', checkAndShowCreateButton);
window.addEventListener('authStateChanged', checkAndShowCreateButton);

// Инициализация загрузки мероприятий при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    loadCategories();
});

// Обновляем список мероприятий при изменении состояния авторизации
window.addEventListener('authStateChanged', function() {
    loadEvents();
});

// Функция для отображения категорий
function displayCategories() {
    const categoryFilter = document.getElementById('typeFilter');
    if (categoryFilter && categories) {
        const options = categories.map(category => {
            const displayName = category.description || getCategoryDisplay(category);
            return `<option value="${category.name}">${displayName}</option>`;
        });
        
        categoryFilter.innerHTML = '<option value="">Все категории</option>' + options.join('');
    }
} 