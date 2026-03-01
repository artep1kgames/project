import sqlite3

def add_image_url_column():
    try:
        # Подключаемся к базе данных
        conn = sqlite3.connect('app/events.db')
        cursor = conn.cursor()
        
        # Добавляем колонку image_url
        cursor.execute('ALTER TABLE events ADD COLUMN image_url TEXT;')
        
        # Сохраняем изменения
        conn.commit()
        print("Колонка image_url успешно добавлена")
        
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Колонка image_url уже существует")
        else:
            print(f"Ошибка: {e}")
    except Exception as e:
        print(f"Произошла ошибка: {e}")
    finally:
        # Закрываем соединение
        conn.close()

if __name__ == "__main__":
    add_image_url_column() 