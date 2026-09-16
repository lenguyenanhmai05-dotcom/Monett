# 🚀 Monett Monorepo (NestJS + Expo React Native + MongoDB)

Dự án dạng **Monorepo** chuẩn hóa, tích hợp toàn diện cả Frontend (Web & Mobile) và Backend trong cùng một Git repository duy nhất.

---

## 📁 Cấu trúc Thư mục

```text
Monett/
├── apps/
│   ├── backend/                 # Backend REST API bằng NestJS + Mongoose (MongoDB)
│   │   ├── src/
│   │   └── .env                 # Cấu hình cổng PORT và MONGODB_URI
│   │
│   └── mobile-web/              # Frontend React Native (Expo) chạy đa nền tảng
│       ├── src/
│       │   ├── layouts/         # ResponsiveLayout (Sidebar trên Desktop, BottomTab trên Mobile)
│       │   └── screens/         # Màn hình (HomeScreen, ProfileScreen, Messages)
│       └── App.tsx
│
├── packages/
│   └── shared/                  # Package dùng chung Types & Interfaces giữa FE và BE
│       └── src/types/           # User, ApiResponse, Pagination...
│
├── docker-compose.yml           # Khởi chạy MongoDB Server + Mongo Express UI
├── package.json                 # Quản lý npm workspaces và scripts 1 chạm
└── README.md
```

---

## 🛠 Hướng dẫn Cài đặt & Khởi chạy

### Bước 1: Cài đặt thư viện cho toàn bộ dự án
Tại thư mục gốc `Monett/`, chỉ cần chạy 1 lệnh duy nhất:
```bash
npm install
```
*Lệnh này sẽ tự động tải thư viện cho cả Backend, Frontend và Shared package qua tính năng `npm workspaces`.*

---

### Bước 2: Cấu hình Cơ sở dữ liệu (MongoDB)
Bạn có thể chọn 1 trong 2 cách sau:

* **Cách 1: Dùng MongoDB Atlas (Miễn phí trên Cloud - Khuyên dùng khi máy nhẹ):**
  1. Tạo cụm MongoDB miễn phí trên [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
  2. Mở file [apps/backend/.env](file:///c:/Users/lengu/Downloads/Monett/apps/backend/.env) và dán link kết nối vào:
     ```env
     MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/monett?retryWrites=true&w=majority
     ```

* **Cách 2: Dùng Docker (Nếu máy đã cài Docker):**
  1. Mở terminal tại thư mục gốc và chạy:
     ```bash
     docker compose up -d
     ```
  2. Truy cập `http://localhost:8081` để mở giao diện quản lý dữ liệu **Mongo Express**.

---

### Bước 3: Chạy ứng dụng

| Mục đích | Lệnh chạy | Ghi chú |
| :--- | :--- | :--- |
| **Chạy đồng thời cả 2 (Backend + Mobile)** | `npm run dev` | Bật cả NestJS API lẫn Expo server |
| **Chỉ chạy Backend (NestJS)** | `npm run dev:backend` | API chạy tại: `http://localhost:3000` |
| **Chỉ chạy Frontend (Expo)** | `npm run dev:mobile` | Mở bảng điều khiển Expo |

#### Khi chạy Frontend (`npm run dev:mobile`):
* **Trên trình duyệt máy tính:** Nhấn phím `w` trên bàn phím để mở bản Web (`http://localhost:8081`). Giao diện sẽ tự động hiển thị thanh **Sidebar** bên trái.
* **Trên iPhone thật:** Mở app **Expo Go** trên iPhone và quét mã QR hiển thị ở terminal. Giao diện sẽ tự động hiển thị **Bottom Tab** dưới đáy.
* **Trên máy ảo Android:** Nhấn phím `a` trên bàn phím để tự động mở app trong Android Emulator.

---

## ✨ Điểm nổi bật của Dự án

1. **Giao diện Responsive thông minh:** Tự động thích ứng theo kích thước màn hình thiết bị (`useWindowDimensions()`). Không bao giờ bị lệch layout hay lỗi tràn viền.
2. **Dùng chung Types an toàn (`@monett/shared`):** Backend thay đổi kiểu dữ liệu người dùng hay dữ liệu trả về thì Frontend được cập nhật tự động.
3. **CORS sẵn sàng:** Backend đã được bật CORS đầy đủ để cho phép cả trình duyệt Web và điện thoại thật kết nối API không bị chặn.
