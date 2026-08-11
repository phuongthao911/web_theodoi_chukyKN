import sqlite3
import os

# Đường dẫn đĩa lưu trữ (gắn đĩa cố định trên Render hoặc local)
DATA_DIR = os.environ.get('DATA_DIR', os.path.dirname(__file__))
os.makedirs(DATA_DIR, exist_ok=True)
DB_NAME = os.path.join(DATA_DIR, 'period_tracker.db')

def get_db():
    conn = sqlite3.connect(DB_NAME, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Bảng người dùng (Hỗ trợ Đăng ký/Đăng nhập dùng nhiều thiết bị: ĐT + PC)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Bảng lưu trữ chu kỳ kinh nguyệt (gắn theo user_id)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cycles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    # Bảng lưu trữ nhật ký triệu chứng hàng ngày (gắn theo user_id)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            log_date TEXT NOT NULL,
            flow_level TEXT,
            mood TEXT,
            symptoms TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, log_date)
        )
    ''')
    
    # Bảng cài đặt riêng theo user_id
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            PRIMARY KEY (user_id, key),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database multi-user schema initialized successfully at:", DB_NAME)
