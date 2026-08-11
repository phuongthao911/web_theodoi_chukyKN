import os
import json
import statistics
from functools import wraps
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db, init_db, DATA_DIR

app = Flask(__name__)

# Tự động tạo và quản lý Secret Key an toàn
SECRET_FILE = os.path.join(DATA_DIR, 'secret_key.txt')
if os.path.exists(SECRET_FILE):
    with open(SECRET_FILE, 'r') as f:
        app.secret_key = f.read().strip()
else:
    random_key = os.environ.get('SECRET_KEY', os.urandom(24).hex())
    with open(SECRET_FILE, 'w') as f:
        f.write(random_key)
    app.secret_key = random_key

# Khởi tạo Database
init_db()

# Decorator kiểm tra Đăng nhập
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Yêu cầu đăng nhập'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Hàm lấy cài đặt của user hiện tại
def get_user_settings(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM user_settings WHERE user_id = ?", (user_id,))
    settings = {row['key']: row['value'] for row in cursor.fetchall()}
    conn.close()
    return settings

# Hàm hỗ trợ tính toán Thống kê & Trung vị (Median) cho user
def calculate_user_cycle_stats(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cycles WHERE user_id = ? ORDER BY start_date ASC", (user_id,))
    cycles = [dict(row) for row in cursor.fetchall()]
    
    settings = get_user_settings(user_id)
    conn.close()

    default_cycle_len = int(settings.get('avg_cycle_length', 28))
    default_period_len = int(settings.get('avg_period_length', 5))

    if not cycles:
        return {
            'median_cycle_length': default_cycle_len,
            'avg_period_length': default_period_len,
            'total_cycles': 0,
            'last_cycle_start': None,
            'next_period_start_min': None,
            'next_period_start_max': None,
            'next_period_center': None,
            'ovulation_date': None,
            'fertile_window_start': None,
            'fertile_window_end': None,
            'is_irregular': False,
            'irregular_message': None,
            'cycles_data': []
        }

    cycle_lengths = []
    period_lengths = []

    for i in range(len(cycles)):
        if cycles[i]['end_date']:
            start = datetime.strptime(cycles[i]['start_date'], '%Y-%m-%d')
            end = datetime.strptime(cycles[i]['end_date'], '%Y-%m-%d')
            p_len = (end - start).days + 1
            if 1 <= p_len <= 20:
                period_lengths.append(p_len)

        if i > 0:
            prev_start = datetime.strptime(cycles[i-1]['start_date'], '%Y-%m-%d')
            curr_start = datetime.strptime(cycles[i]['start_date'], '%Y-%m-%d')
            c_len = (curr_start - prev_start).days
            if 15 <= c_len <= 60:
                cycle_lengths.append(c_len)

    recent_cycle_lengths = cycle_lengths[-6:] if len(cycle_lengths) >= 6 else cycle_lengths
    
    if recent_cycle_lengths:
        median_c_len = round(statistics.median(recent_cycle_lengths))
    else:
        median_c_len = default_cycle_len

    avg_p_len = round(statistics.mean(period_lengths)) if period_lengths else default_period_len

    is_irregular = False
    irregular_msg = None
    if len(recent_cycle_lengths) >= 2:
        latest_c_len = recent_cycle_lengths[-1]
        diff = abs(latest_c_len - median_c_len)
        if diff > 7:
            is_irregular = True
            if latest_c_len > median_c_len:
                irregular_msg = f"Chu kỳ gần nhất ({latest_c_len} ngày) dài hơn {diff} ngày so với trung vị thường lệ ({median_c_len} ngày)."
            else:
                irregular_msg = f"Chu kỳ gần nhất ({latest_c_len} ngày) ngắn hơn {diff} ngày so với trung vị thường lệ ({median_c_len} ngày)."

    last_cycle = cycles[-1]
    last_start = datetime.strptime(last_cycle['start_date'], '%Y-%m-%d')

    next_center = last_start + timedelta(days=median_c_len)
    next_min = next_center - timedelta(days=2)
    next_max = next_center + timedelta(days=2)

    ovulation_date = next_center - timedelta(days=14)
    fertile_start = ovulation_date - timedelta(days=5)
    fertile_end = ovulation_date + timedelta(days=1)

    return {
        'median_cycle_length': median_c_len,
        'avg_period_length': avg_p_len,
        'total_cycles': len(cycles),
        'last_cycle_start': last_cycle['start_date'],
        'next_period_center': next_center.strftime('%Y-%m-%d'),
        'next_period_start_min': next_min.strftime('%Y-%m-%d'),
        'next_period_start_max': next_max.strftime('%Y-%m-%d'),
        'ovulation_date': ovulation_date.strftime('%Y-%m-%d'),
        'fertile_window_start': fertile_start.strftime('%Y-%m-%d'),
        'fertile_window_end': fertile_end.strftime('%Y-%m-%d'),
        'is_irregular': is_irregular,
        'irregular_message': irregular_msg,
        'cycles_data': cycles
    }

# Route render HTML
@app.route('/')
def index():
    return render_template('index.html')

# --- AUTH API ENDPOINTS ---
@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    user_id = session.get('user_id')
    username = session.get('username')
    return jsonify({
        'is_logged_in': bool(user_id),
        'username': username if user_id else None
    })

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or len(username) < 3:
        return jsonify({'error': 'Tên đăng nhập phải từ 3 ký tự trở lên'}), 400
    if not password or len(password) < 4:
        return jsonify({'error': 'Mật khẩu phải từ 4 ký tự trở lên'}), 400

    hashed_pw = generate_password_hash(password)

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hashed_pw))
        conn.commit()
        user_id = cursor.lastrowid

        # Thiết lập cài đặt mặc định cho user
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, 'theme', 'pink')", (user_id,))
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, 'dark_mode', 'false')", (user_id,))
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, 'avg_cycle_length', '28')", (user_id,))
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, 'avg_period_length', '5')", (user_id,))
        conn.commit()
        conn.close()

        session['user_id'] = user_id
        session['username'] = username
        return jsonify({'message': 'Đăng ký tài khoản thành công', 'username': username}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Tên đăng nhập này đã tồn tại'}), 400

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Vui lòng nhập tên đăng nhập và mật khẩu'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({'message': 'Đăng nhập thành công', 'username': user['username']})
    else:
        return jsonify({'error': 'Tên đăng nhập hoặc mật khẩu không chính xác'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({'message': 'Đã đăng xuất'})

@app.route('/api/auth/change-password', methods=['POST'])
@login_required
def change_password():
    user_id = session['user_id']
    data = request.get_json()
    old_pw = data.get('old_password', '')
    new_pw = data.get('new_password', '')

    if not new_pw or len(new_pw) < 4:
        return jsonify({'error': 'Mật khẩu mới phải từ 4 ký tự trở lên'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    if not user or not check_password_hash(user['password_hash'], old_pw):
        conn.close()
        return jsonify({'error': 'Mật khẩu hiện tại không đúng'}), 400

    hashed_new = generate_password_hash(new_pw)
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hashed_new, user_id))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Đổi mật khẩu thành công'})

# --- DATA API ENDPOINTS (Dữ liệu theo user_id) ---
@app.route('/api/cycles', methods=['GET'])
@login_required
def get_cycles():
    user_id = session['user_id']
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cycles WHERE user_id = ? ORDER BY start_date DESC", (user_id,))
    cycles = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(cycles)

@app.route('/api/cycles', methods=['POST'])
@login_required
def add_cycle():
    user_id = session['user_id']
    data = request.get_json()
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    notes = data.get('notes', '')

    if not start_date:
        return jsonify({'error': 'Ngày bắt đầu là bắt buộc'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO cycles (user_id, start_date, end_date, notes) VALUES (?, ?, ?, ?)",
        (user_id, start_date, end_date if end_date else None, notes)
    )
    conn.commit()
    cycle_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Thêm kỳ kinh thành công', 'id': cycle_id}), 201

@app.route('/api/cycles/<int:cycle_id>', methods=['PUT'])
@login_required
def update_cycle(cycle_id):
    user_id = session['user_id']
    data = request.get_json()
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    notes = data.get('notes', '')

    if not start_date:
        return jsonify({'error': 'Ngày bắt đầu là bắt buộc'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE cycles SET start_date = ?, end_date = ?, notes = ? WHERE id = ? AND user_id = ?",
        (start_date, end_date if end_date else None, notes, cycle_id, user_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Cập nhật kỳ kinh thành công'})

@app.route('/api/cycles/<int:cycle_id>', methods=['DELETE'])
@login_required
def delete_cycle(cycle_id):
    user_id = session['user_id']
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cycles WHERE id = ? AND user_id = ?", (cycle_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Xóa kỳ kinh thành công'})

@app.route('/api/logs', methods=['GET'])
@login_required
def get_logs():
    user_id = session['user_id']
    date_str = request.args.get('date')
    month_str = request.args.get('month')
    year_str = request.args.get('year')
    
    conn = get_db()
    cursor = conn.cursor()
    
    if date_str:
        cursor.execute("SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?", (user_id, date_str))
        log = cursor.fetchone()
        conn.close()
        if log:
            res = dict(log)
            res['symptoms'] = json.loads(res['symptoms']) if res['symptoms'] else {}
            return jsonify(res)
        return jsonify(None)
    elif month_str:
        cursor.execute("SELECT * FROM daily_logs WHERE user_id = ? AND log_date LIKE ?", (user_id, f"{month_str}%"))
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        for l in logs:
            l['symptoms'] = json.loads(l['symptoms']) if l['symptoms'] else {}
        return jsonify(logs)
    elif year_str:
        cursor.execute("SELECT * FROM daily_logs WHERE user_id = ? AND log_date LIKE ?", (user_id, f"{year_str}%"))
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        for l in logs:
            l['symptoms'] = json.loads(l['symptoms']) if l['symptoms'] else {}
        return jsonify(logs)
    else:
        cursor.execute("SELECT * FROM daily_logs WHERE user_id = ? ORDER BY log_date DESC", (user_id,))
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        for l in logs:
            l['symptoms'] = json.loads(l['symptoms']) if l['symptoms'] else {}
        return jsonify(logs)

@app.route('/api/logs', methods=['POST'])
@login_required
def save_log():
    user_id = session['user_id']
    data = request.get_json()
    log_date = data.get('log_date')
    flow_level = data.get('flow_level', '')
    mood = data.get('mood', '')
    symptoms = data.get('symptoms', {})
    notes = data.get('notes', '')

    if not log_date:
        return jsonify({'error': 'Ngày ghi chép là bắt buộc'}), 400

    symptoms_json = json.dumps(symptoms)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO daily_logs (user_id, log_date, flow_level, mood, symptoms, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, log_date) DO UPDATE SET
            flow_level = excluded.flow_level,
            mood = excluded.mood,
            symptoms = excluded.symptoms,
            notes = excluded.notes
    ''', (user_id, log_date, flow_level, mood, symptoms_json, notes))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Lưu nhật ký thành công'})

@app.route('/api/summary', methods=['GET'])
@login_required
def get_summary():
    user_id = session['user_id']
    stats = calculate_user_cycle_stats(user_id)
    return jsonify(stats)

@app.route('/api/settings', methods=['GET'])
@login_required
def get_settings():
    user_id = session['user_id']
    settings = get_user_settings(user_id)
    return jsonify(settings)

@app.route('/api/settings', methods=['POST'])
@login_required
def update_settings():
    user_id = session['user_id']
    data = request.get_json()
    conn = get_db()
    cursor = conn.cursor()
    for k, v in data.items():
        cursor.execute("INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = ?", (user_id, k, str(v), str(v)))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Cập nhật cài đặt thành công'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
