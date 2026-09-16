# 🗺️ BẢN ĐỒ KIẾN TRÚC & LỘ TRÌNH PHÁT TRIỂN MONETT

Tài liệu này ghi nhớ toàn bộ định hướng kiến trúc, phân chia nhiệm vụ hệ thống và lộ trình triển khai tính năng cho ứng dụng **Monett** (Nhật Ký Ảnh & Quản Lý Chi Tiêu Thông Thái).

---

## 🏛️ 1. Kiến Trúc Hệ Thống Tổng Thể (Fullstack Monorepo)

```
                       ┌────────────────────────────────────────┐
                       │  📱 FRONTEND: Expo React Native (Web)  │
                       │             (Port 8081)                │
                       └──────────────────┬─────────────────────┘
                                          │
                     HTTP / REST API (JWT)│ Firebase SDK (Auth / Upload)
                                          │
            ┌─────────────────────────────┴─────────────────────────────┐
            ▼                                                           ▼
┌───────────────────────┐                                   ┌───────────────────────┐
│  🚀 BACKEND: NestJS   │                                   │  🔥 FIREBASE SERVICES │
│      (Port 3000)      │                                   │                       │
├───────────────────────┤                                   ├───────────────────────┤
│ • Auth & User Guard   │                                   │ • Firebase Storage    │
│ • Transaction Manager │                                   │   (Lưu trữ album ảnh) │
│ • Budget & Cashflow   │                                   │ • FCM Push Notify     │
│ • Streak & Gamify XP  │                                   │   (Nhắc giữ streak)   │
└───────────┬───────────┘                                   │ • Google Sign-In      │
            │ Mongoose ODM                                  └───────────────────────┘
            ▼
┌───────────────────────┐
│ 🍃 MongoDB Atlas DB   │
│ (Dữ liệu tài chính)   │
└───────────────────────┘
```

### 1.1. Frontend (`apps/mobile-web` — Port 8081)
- **Giao diện**: Thiết kế chuẩn nhận diện Monett (Tone xanh lục bảo `#047857`, chú ếch thám hiểm, chế độ toàn màn hình desktop + mobile responsive).
- **Song ngữ**: Nút chuyển đổi viên thuốc với cờ Việt Nam `VI 🇻🇳` & Anh `EN 🇬🇧`.
- **Nhiệm vụ**: Render UI trực quan, chụp ảnh khoảnh khắc và tương tác người dùng.

### 1.2. Backend (`apps/backend` — Port 3000)
- **Nhiệm vụ**: Đảm nhận toàn bộ nghiệp vụ cốt lõi, bảo mật token JWT, xác thực dữ liệu qua ValidationPipe, lưu trữ số liệu tài chính vào MongoDB Atlas.

---

## 🔥 2. Vai Trò Tích Hợp Firebase trong Monett

Khi bắt tay vào giai đoạn kết nối tính năng, Firebase sẽ đảm nhận **3 vai trò đắt giá**:

### 2.1. 📸 Firebase Storage — Lưu trữ ảnh khoảnh khắc & Hóa đơn
- **Mục tiêu**: Người dùng chụp ảnh bữa ăn, ly cà phê, hóa đơn khi bấm `[ 📷 Ghi chép nhanh ]` hoặc `[ 📷 Ghi Khoảnh Khắc Ngay ]`.
- **Quy trình hoạt động**:
  1. Frontend chụp/chọn ảnh từ thiết bị ➔ Tải trực tiếp lên **Firebase Storage**.
  2. Firebase Storage cấp lại đường dẫn tải ảnh an toàn (`imageUrl`).
  3. Frontend gửi `imageUrl` kèm số tiền, danh mục, ngày giờ về **NestJS API** để lưu vào **MongoDB**.
  4. *Lợi ích*: Giữ MongoDB luôn gọn nhẹ, truy vấn nhanh và tiết kiệm tài nguyên.

### 2.2. 🔔 Firebase Cloud Messaging (FCM) — Bắn thông báo nhắc giữ Streak
- **Mục tiêu**: Hiện thực hóa tính năng **"Lời Nhắc Thân Thương - Monett Chibi Frog"**.
- **Quy trình hoạt động**:
  - Hàng ngày, nếu người dùng chưa ghi nhận khoảnh khắc trước **21:30**, FCM tự động gửi thông báo đẩy đến điện thoại/trình duyệt:
    > *"Hôm nay bạn chưa ghi nhận khoảnh khắc cà phê chiều, hãy chụp ảnh trước 23:00 để giữ chuỗi 18 ngày bừng cháy nhé! ☕✨"*

### 2.3. 🔑 Firebase Authentication — Đăng nhập Google 1 chạm
- **Mục tiêu**: Kích hoạt nút **"Continue with Google"** trên màn hình đăng nhập.
- **Quy trình hoạt động**: Người dùng đăng nhập bằng tài khoản Google chỉ với 1 click, tự động đồng bộ tên và avatar chú ếch đại diện vào hệ thống.

---

## 📋 3. Lộ Trình Triển Khai Tính Năng (Checklist)

### ✅ Giai đoạn 1: Khởi tạo & Định hình Giao diện (Đã Hoàn Thành)
- [x] Thiết lập Monorepo (Shared Types, NestJS Backend, Expo React Native Web).
- [x] Phân hệ Đăng ký / Đăng nhập (Mongoose bcrypt hash, cấp JWT Token).
- [x] Thiết kế giao diện AuthScreen bám sát mockup, avatar ếch Lvl 12, bỏ chữ bảo mật SSL.
- [x] Thiết kế Dashboard toàn màn hình rộng rãi:
  - Thẻ 1: Thông tin cá nhân & Slogan tài chính tương tác.
  - Thẻ 2: Thiết lập Dòng tiền thu nhập & Hạn mức an toàn 60%.
  - Thẻ 3: Chuỗi 18 ngày Streak rực rỡ + Ma trận 30 ngày.
  - Thẻ 4: Lời nhắc thân thương Monett Chibi Frog.
  - Thẻ 5: Hệ thống Gamification cấp độ 4 và 4 huy hiệu thành tựu.
- [x] Bộ nút chuyển đổi ngôn ngữ chuẩn lá cờ SVG `VI 🇻🇳` và `EN 🇬🇧`.

### ⏳ Giai đoạn 2: Danh Mục Chi Tiêu & Phương Thức Thanh Toán (Module Tiếp Theo)
- [ ] Backend: Schema `Category` (Ăn uống 🍜, Cà phê ☕, Mua sắm 🛍️, Di chuyển 🚗, Lương 💰...) tự động seed dữ liệu mặc định hệ thống (`userId: null, isDefault: true`).
- [ ] Backend: Schema `PaymentMethod` (Tiền mặt 💵, Thẻ ngân hàng 💳, Ví MoMo 📱...).
- [ ] Frontend: Giao diện chọn và quản lý danh mục chi tiêu.

### ⏳ Giai đoạn 3: Popup Ghi Chép Nhanh & Tải Ảnh Khoảnh Khắc (Quick Capture Modal)
- [ ] Tích hợp `expo-image-picker` để chụp ảnh hoặc chọn ảnh hóa đơn từ thư viện.
- [ ] Kết nối dịch vụ lưu trữ ảnh (Firebase Storage) để lấy URL ảnh.
- [ ] Backend: Schema `Transaction` (type: EXPENSE | INCOME, amount, categoryId, paymentMethodId, imageUrl, note, date).
- [ ] Lưu giao dịch thành công và tự động cộng điểm kinh nghiệm (XP) cho người dùng.

### ⏳ Giai đoạn 4: Động Hóa Dữ Liệu Dashboard & Streak
- [ ] Kết nối số tiền lương, hạn mức chi tiêu thực tế từ MongoDB lên Dashboard.
- [ ] Thuật toán đếm chuỗi Streak tự động theo ngày thực tế.
- [ ] Mở khóa huy hiệu tự động khi đủ điều kiện (ví dụ: chụp đủ 50 ảnh ➔ Mở khóa *Nhiếp Ảnh Gia Ví Tiền*).

### ⏳ Giai đoạn 5: Lịch Ảnh Chi Tiêu (Moments Journal) & Thống Kê
- [ ] Tab 2: Lịch ảnh chi tiêu dạng Grid/Calendar trực quan.
- [ ] Tab 3: Thống kê & Phân tích cơ cấu dòng tiền (Biểu đồ tròn, biểu đồ cột).
