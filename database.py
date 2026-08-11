import sqlite3
import os

DB_NAME = os.path.join(os.path.dirname(__file__), 'period_tracker.db')

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Bảng lưu trữ chu kỳ kinh nguyệt
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cycles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date TEXT NOT NULL,
            end_date TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Bảng lưu trữ nhật ký triệu chứng hàng ngày
    # symptoms lưu dưới dạng mảng JSON hoặc chuỗi JSON: {"cramps": 3, "headache": 1, ...}
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            log_date TEXT UNIQUE NOT NULL,
            flow_level TEXT, -- light, medium, heavy, spotting
            mood TEXT, -- happy, sad, moody, anxious, calm, energetic
            symptoms TEXT, -- JSON string with symptom names and severity rating (1-5)
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Bảng cài đặt & mật khẩu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    
    # Cài đặt mặc định nếu chưa có
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'pink')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('dark_mode', 'false')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('avg_cycle_length', '28')")
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('avg_period_length', '5')")
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
