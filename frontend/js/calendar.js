// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('Инициализация календаря...');
    
    // Проверяем, что FullCalendar доступен
    if (typeof FullCalendar === 'undefined') {
        console.error('FullCalendar не загружен');
        document.getElementById('calendar').innerHTML = '<div class="error">Ошибка загрузки календаря</div>';
        return;
    }
    
    // Инициализация календаря
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        console.error('Элемент календаря не найден');
        return;
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ru',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        buttonText: {
            today: 'Сегодня',
            month: 'Месяц',
            week: 'Неделя',
            day: 'День',
            list: 'Список'
        },
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        events: async function(info, successCallback, failureCallback) {
            console.log('Загрузка мероприятий для периода:', info.startStr, 'до', info.endStr);
            try {
                // Форматируем даты в ISO формат без часового пояса
                const startDate = new Date(info.startStr).toISOString();
                const endDate = new Date(info.endStr).toISOString();
                
                const params = {
                    start_date: startDate,
                    end_date: endDate
                };
                
                const url = getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.BASE, params);
                console.log('Запрос мероприятий по URL:', url);
                
                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Ошибка при загрузке мероприятий: ${response.status}`);
                }

                const events = await response.json();
                const formattedEvents = events.map(event => ({
                    id: event.id,
                    title: event.title,
                    start: event.start_date,
                    end: event.end_date,
                    description: event.short_description,
                    location: event.location,
                    organizer: event.organizer ? 
                        `${event.organizer.full_name || event.organizer.username || event.organizer.email}` : 
                        'Не указан',
                    status: event.status
                }));

                console.log('Получено мероприятий:', formattedEvents.length);
                successCallback(formattedEvents);
            } catch (error) {
                console.error('Ошибка при загрузке мероприятий:', error);
                
                // Fallback: используем пустой массив если API недоступен
                console.log('Using fallback events for calendar...');
                successCallback([]);
                
                // Показываем ошибку пользователю
                const calendarContainer = document.querySelector('.calendar-container');
                if (calendarContainer) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.innerHTML = `
                        <div style="text-align: center; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; margin: 10px 0;">
                            <p>⚠️ Календарь работает в режиме офлайн (API недоступен)</p>
                            <p><a href="/test-api.html" target="_blank">Проверить статус API</a></p>
                        </div>
                    `;
                    calendarContainer.appendChild(errorDiv);
                    setTimeout(() => errorDiv.remove(), 10000);
                }
            }
        },
        select: function(info) {
            console.log('Выбрана дата:', info.startStr);
            const selectedDate = info.startStr;
            const dateElement = document.getElementById('selectedDate');
            if (dateElement) {
                dateElement.textContent = new Date(selectedDate).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }
            
            // Загрузка мероприятий на выбранный день
            loadDayEvents(selectedDate);
        },
        eventClick: function(info) {
            console.log('Клик по мероприятию:', info.event);
            if (info.event.url) {
                window.location.href = info.event.url;
            }
        },
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }
    });

    calendar.render();
    console.log('Календарь инициализирован');

    // Функция загрузки мероприятий на выбранный день
    async function loadDayEvents(date) {
        console.log('Загрузка мероприятий на дату:', date);
        const dayEventsEl = document.getElementById('dayEvents');
        if (!dayEventsEl) {
            console.error('Элемент для отображения мероприятий не найден');
            return;
        }

        try {
            // Преобразуем дату к формату YYYY-MM-DD
            const dayOnly = new Date(date).toISOString().slice(0, 10);
            const params = {
                start_date: `${dayOnly}T00:00:00`,
                end_date: `${dayOnly}T23:59:59`
            };
            
            const url = getApiUrl(API_CONFIG.ENDPOINTS.EVENTS.BASE, params);
            console.log('Запрос мероприятий по URL:', url);
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Ошибка загрузки мероприятий:', response.status, errorData);
                throw new Error(errorData.detail || 'Ошибка загрузки мероприятий');
            }
            
            const events = await response.json();
            console.log('Получено мероприятий:', events.length);
            
            if (events.length === 0) {
                dayEventsEl.innerHTML = '<p class="no-events">На этот день мероприятий не запланировано</p>';
                return;
            }

            dayEventsEl.innerHTML = events.map(event => `
                <div class="event-card">
                    <h3>${event.title}</h3>
                    <p class="event-time">
                        ${new Date(event.start_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - 
                        ${new Date(event.end_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p class="event-location">${event.location}</p>
                    <p class="event-description">${event.short_description || event.description}</p>
                    <a href="./events.html?id=${event.id}" class="btn btn-outline">Подробнее</a>
                </div>
            `).join('');
        } catch (error) {
            console.error('Ошибка при загрузке мероприятий:', error);
            dayEventsEl.innerHTML = '<p class="error">Ошибка при загрузке мероприятий</p>';
        }
    }

    // Обработчики кнопок навигации по месяцам
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            console.log('Переход к предыдущему месяцу');
            calendar.prev();
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            console.log('Переход к следующему месяцу');
            calendar.next();
        });
    }

    // Обновление заголовка при изменении месяца
    calendar.on('datesSet', function(dateInfo) {
        console.log('Изменение периода календаря:', dateInfo.view.type);
        const currentMonth = dateInfo.view.currentStart;
        const monthElement = document.getElementById('currentMonth');
        if (monthElement) {
            monthElement.textContent = currentMonth.toLocaleDateString('ru-RU', {
                month: 'long',
                year: 'numeric'
            });
        }
    });
}); 