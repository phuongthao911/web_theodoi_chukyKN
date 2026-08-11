# Kế hoạch triển khai: Web App Theo Dõi Chu Kỳ Kinh Nguyệt Cá Nhân (Đầy đủ & Hoàn thiện)

Dự án này tạo ứng dụng web (Flask + SQLite + HTML/CSS/JS) giúp theo dõi chu kỳ kinh nguyệt cá nhân riêng tư, bảo mật bằng mật khẩu băm, tính toán dự báo chuẩn xác, theo dõi triệu chứng chuyên sâu và giao diện Pastel hiện đại hỗ trợ Dark Mode.

## Các điểm tinh chỉnh & tính năng nâng cao

1. **Bảo mật chuyên sâu (Security Architecture)**:
   - **Băm mật khẩu**: Sử dụng `werkzeug.security` (`generate_password_hash`, `check_password_hash`) sẵn có trong Flask, tuyệt đối **không lưu mật khẩu dạng plaintext**.
   - **Màn hình Thiết lập Mật khẩu Lần đầu (First-Time Setup Screen)**: Tự động phát hiện khi khởi chạy ứng dụng lần đầu (chưa có mật khẩu trong DB) để yêu cầu người dùng tự đặt mật khẩu riêng, tách biệt với màn hình Khóa (Lock Screen) truy cập thông thường.
   - **Khoá session bí mật (Secret Key)**: Tự động sinh ngẫu nhiên `app.secret_key` an toàn và lưu cục bộ.
   - Tất cả các API `/api/*` đều được bảo vệ bởi Flask `session`. Nút Đăng xuất & Đổi mật khẩu trong phần Cài đặt.

2. **Giao diện 4 Màu Pastel + Chế độ Ban Đêm (Dark Mode 🌙)**:
   - Cho phép chọn 4 màu Pastel: Hồng (Pink), Xanh dương (Blue), Xanh lá (Green), Vàng (Yellow).
   - Tích hợp công tắc bật/tắt Dark Mode 🌙 dịu mắt khi dùng buổi tối.

3. **Cảnh báo chu kỳ bất thường (Irregular Cycle Insight)**:
   - Tự động phát hiện nếu 1 chu kỳ lệch trên **> 7 ngày** so với median cá nhân.
   - Hiển thị thông báo nhẹ nhàng: *"Chu kỳ này dài/ngắn hơn hẳn so với thói quen của bạn"* (chỉ nêu dữ kiện thống kê, không chẩn đoán y khoa).

4. **Thuật toán dự đoán thông minh**:
   - Sử dụng **Trung vị (Median)** của 3-6 chu kỳ gần nhất để loại bỏ outlier.
   - Hiển thị **dự đoán khoảng ngày** (ví dụ: `13/09 – 17/09`, dải ±2 ngày).

5. **Ghi chép triệu chứng theo Thang điểm (1 - 5)**:
   - Đánh giá mức độ nặng/nhẹ của từng triệu chứng (ví dụ: Đau bụng mức 3/5, Mệt mỏi mức 4/5) thay vì tick Có/Không đơn thuần.

6. **Biểu đồ Heatmap dạng Năm (GitHub-style Contribution Heatmap)**:
   - Chế độ xem Heatmap cả năm (365 ngày) với sắc độ màu đậm nhạt theo lượng máu/mức độ triệu chứng.

7. **Chỉnh sửa/Xóa chu kỳ trên UI**:
   - Nút **Sửa (✏️)** và **Xóa (🗑️)** trực tiếp trên từng mục lịch sử.

---

## Cấu trúc tệp tin triển khai

- [NEW] [database.py](file:///c:/Users/ThaoMP/Documents/Codex/ChuKy_KN/database.py): SQLite helper hỗ trợ lưu thông tin hash mật khẩu (`werkzeug.security`), nhật ký triệu chứng 1-5 điểm, cài đặt theme & dark mode.
- [NEW] [app.py](file:///c:/Users/ThaoMP/Documents/Codex/ChuKy_KN/app.py): Flask Backend sinh `secret_key` tự động, kiểm tra First-Time Setup vs Login Session, thuật toán Median 3-6 chu kỳ, phát hiện lệch >7 ngày, API heatmap 12 tháng.
- [NEW] [templates/index.html](file:///c:/Users/ThaoMP/Documents/Codex/ChuKy_KN/templates/index.html): Giao diện Lock Screen, First-Time Setup Modal, Calendar View, Heatmap View, Modal Rating 1-5, Dark Mode Toggle, Thẻ cảnh báo lệch chu kỳ, Nút Sửa/Xóa.
- [NEW] [static/css/style.css](file:///c:/Users/ThaoMP/Documents/Codex/ChuKy_KN/static/css/style.css): Dynamic CSS Variables hỗ trợ 4 Theme Pastel + Dark Mode, Styling Heatmap, First-Time Setup UI, Lock Screen.
- [NEW] [static/js/app.js](file:///c:/Users/ThaoMP/Documents/Codex/ChuKy_KN/static/js/app.js): Xử lý Setup/Login Auth flow, Switch View (Calendar / Heatmap), Dark mode toggle, Rating controls, Chart.js, Edit/Delete modal.

---

## Kế hoạch kiểm thử & Xác minh

1. **Kiểm thử Luồng Mật Khẩu Lần Đầu**: Chạy app khi DB mới -> Màn hình "Thiết lập mật khẩu lần đầu" tự xuất hiện -> Đặt mật khẩu -> Kiểm tra mật khẩu được lưu dạng Hash mã hóa trong DB -> Đăng nhập thành công.
2. **Kiểm thử Đăng nhập & API Security**: Đăng xuất -> Mở lại trang -> Xuất hiện Lock Screen -> Nhập đúng/sai mật khẩu -> Xác minh các API bị chặn nếu chưa login.
3. **Kiểm thử Chức năng & Giao diện**: Test 4 Pastel themes + Dark Mode, Cảnh báo chu kỳ lệch >7 ngày, Rating triệu chứng 1-5, Heatmap năm và Sửa/Xóa chu kỳ.
