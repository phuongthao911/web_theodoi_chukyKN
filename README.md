# 🌸 Web App Theo Dõi Chu Kỳ Kinh Nguyệt Cá Nhân

Ứng dụng web riêng tư, thông minh giúp theo dõi và dự báo chu kỳ kinh nguyệt cá nhân, được xây dựng trên nền tảng **Python Flask**, **SQLite** và giao diện **HTML/CSS/JS** hiện đại.

---

## ✨ Tính năng nổi bật

### 1. 🔒 Bảo mật & Riêng tư tuyệt đối
- **Băm mật khẩu `werkzeug.security`**: Mật khẩu cá nhân được băm mã hóa an toàn.
- **Màn hình Thiết lập & Màn hình Khóa (Lock Screen)**: Tự động khởi tạo mật khẩu lần đầu và khóa ứng dụng bảo vệ dữ liệu cá nhân.
- **Phiên làm việc mã hóa (Flask Session)**: Bảo vệ toàn bộ REST API endpoints.

### 2. 🎨 Giao diện 4 Màu Pastel + Dark Mode 🌙
- Chuyển đổi linh hoạt giữa 4 gam màu Pastel dịu mắt: **Hồng (Pink)**, **Xanh Dương (Blue)**, **Xanh Lá (Green)**, **Vàng (Yellow)**.
- **Chế độ Ban đêm (Dark Mode 🌙/☀️)** hỗ trợ dùng vào ban đêm không bị chói mắt.

### 3. 🧠 Thuật toán Thống kê & Dự báo Thông minh
- **Tính Trung vị (Median) 3–6 chu kỳ gần nhất**: Loại bỏ ảnh hưởng của các chu kỳ bất thường (stress, ốm...).
- **Dự báo dạng Khoảng ngày**: Hiển thị dải ngày dự kiến (±2 ngày, ví dụ `13/09 – 17/09`).
- **Cảnh báo chu kỳ bất thường**: Tự động phát hiện khi chu kỳ gần nhất lệch `> 7 ngày` so với median cá nhân.

### 4. 📊 Ghi chép Triệu chứng 1-5 & Heatmap Cả Năm
- **Thang điểm 1 - 5**: Đánh giá mức độ từng triệu chứng (*Đau bụng, Đau đầu, Mệt mỏi, Đầy hơi, Nổi mụn, Căng ngực*).
- **Yearly Contribution Heatmap (Phong cách GitHub)**: Quan sát nhịp độ 12 tháng trong năm qua sắc độ màu phân cấp 4 mức.

### 5. ✏️ Quản lý Lịch sử Chu kỳ
- Nút **Sửa (✏️)** và **Xóa (🗑️)** trực tiếp trên từng dòng lịch sử.

---

## 🌐 Hướng dẫn Deploy lên Render.com (Miễn phí)

1. **Đăng nhập vào [Render.com](https://render.com/)** (đăng nhập bằng tài khoản GitHub).
2. Nhấp vào nút **New +** ➔ Chọn **Web Service**.
3. Chọn **Build and deploy from a Git repository** ➔ Chọn repo `web_theodoi_chukyKN`.
4. Điền các thông tin cài đặt:
   - **Name**: `chu-ky-cua-toi` (hoặc tên tùy chọn)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. *(Tùy chọn)* Nếu muốn giữ nguyên dữ liệu khi ứng dụng tự khởi động lại:
   - Tại mục **Advanced** ➔ Tạo một **Persistent Disk** với Mount Path: `/var/data`.
   - Thêm Environment Variable: `DATA_DIR` = `/var/data`.
6. Nhấn **Create Web Service**. Sau khoảng 1-2 phút, ứng dụng của bạn sẽ hoạt động trực tuyến với link có dạng `https://ten-app.onrender.com`!

---

## 💻 Hướng dẫn Chạy Cục bộ (Local)

1. **Clone repository**:
   ```bash
   git clone https://github.com/phuongthao911/web_theodoi_chukyKN.git
   cd web_theodoi_chukyKN
   ```

2. **Cài đặt thư viện phụ thuộc**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Khởi chạy ứng dụng**:
   ```bash
   python app.py
   ```

4. **Truy cập ứng dụng**:
   Mở trình duyệt web bất kỳ và truy cập đường dẫn:
   👉 **`http://127.0.0.1:5000`**
