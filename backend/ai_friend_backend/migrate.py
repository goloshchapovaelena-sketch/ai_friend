#!/usr/bin/env python3
"""
Скрипт для ручного запуска миграций базы данных.
Используйте для инициализации БД перед запуском приложения.

Использование:
    python migrate.py
"""

import asyncio
import sys
import os

# Добавляем backend в PYTHONPATH
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.abspath(current_dir)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.database import engine, Base


async def migrate():
    """Создание всех таблиц в базе данных"""
    print("🔄 Подключение к базе данных...")
    
    async with engine.begin() as conn:
        print("📦 Создание таблиц...")
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Миграции успешно выполнены!")
    print("📊 Таблицы созданы в базе данных.")


if __name__ == "__main__":
    try:
        asyncio.run(migrate())
    except Exception as e:
        print(f"❌ Ошибка выполнения миграций: {e}")
        sys.exit(1)
