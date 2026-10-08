# 📜 MONETT PROJECT RULES & GUIDELINES

Tài liệu quy tắc và hướng dẫn phát triển cho dự án **Monett** (Nhật Ký Ảnh & Quản Lý Chi Tiêu Thông Thái). Toàn bộ lập trình viên và AI Agent khi làm việc trên repository này **bắt buộc tuân thủ** các nguyên tắc dưới đây.

---

## 🏛️ 1. Cấu Trúc Tổng Quan (Monorepo Architecture)

Dự án được cấu hình dạng **npm workspaces** gồm 3 phần chính:

```text
Monett/
├── apps/
│   ├── backend/                 # NestJS REST API + Mongoose ODM (Port 3000)
│   └── mobile-web/              # Expo React Native đa nền tảng Web & Mobile (Port 8081)
├── packages/
│   └── shared/                  # Package chia sẻ Types & DTOs (@monett/shared)
├── package.json                 # Quản lý scripts và npm workspaces
└── docker-compose.yml           # Khởi chạy Local MongoDB & Mongo Express
```

---

## 🔗 2. Quy Tắc Đồng Bộ Kiểu Dữ Liệu (`@monett/shared`)

> [!IMPORTANT]
> **Tuyệt đối không viết trùng lặp kiểu dữ liệu riêng rẽ ở Frontend hoặc Backend.**

1. **Vị trí định nghĩa:**
   - Mọi DTO, Interface, Enum dùng chung (như `IUser`, `ITransaction`, `IMoment`, `IBudget`, `ApiResponse`, `Analytics...`) phải được đặt tại [`packages/shared/src/types/`](file:///d:/GitHub/Monett/packages/shared/src/types).
   - Export tập trung tại [`packages/shared/src/index.ts`](file:///d:/GitHub/Monett/packages/shared/src/index.ts).
2. **Quy trình khi thay đổi Types:**
   - Sau khi thêm hoặc sửa kiểu dữ liệu trong `packages/shared`, chạy lệnh:
     ```bash
     npm run build:shared
     ```
   - Điều này đảm bảo thư mục `dist/` của package được cập nhật, tránh lỗi TypeScript biên dịch sai ở Backend hoặc Frontend.

---

## 🚀 3. Quy Tắc Backend (`apps/backend`)

1. **Cổng chạy & Định tuyến:**
   - Cổng mặc định: `3000` (`process.env.PORT || 3000`).
   - Mọi controller nghiệp vụ đặt tiền tố chuẩn REST API (ví dụ: `/api/auth`, `/api/transactions`, `/api/moments`, `/api/analytics`, `/api/health`).
2. **Cơ chế Kết nối Cơ sở Dữ liệu (MongoDB Atlas & Fallback):**
   - Kết nối MongoDB được quản lý tại [`apps/backend/src/app.module.ts`](file:///d:/GitHub/Monett/apps/backend/src/app.module.ts).
   - Hệ thống tự động kiểm tra MongoDB Atlas (`serverSelectionTimeoutMS: 3500`). Nếu Cloud không phản hồi hoặc mất mạng, hệ thống **tự động fallback sang Local MongoDB** (`mongodb://localhost:27017/monett`).
   - Giữ nguyên cơ chế này để đảm bảo ứng dụng luôn chạy mượt mà ngay cả khi offline hoặc rớt mạng.
3. **CORS & Bảo Mật:**
   - `app.enableCors({ origin: true, credentials: true })` được bật để chấp nhận kết nối từ Web Browser (`http://localhost:8081`), Mobile Expo Go qua mạng LAN (`10.x.x.x`), và Cloud Tunnel (`ngrok`, `trycloudflare`).
   - Sử dụng `ValidationPipe({ whitelist: true, transform: true })` trên toàn bộ DTO request đầu vào.
4. **Xử lý Tệp Tĩnh & Upload Ảnh:**
   - Tệp tĩnh được lưu tại thư mục `uploads/` và phục vụ qua endpoint `/uploads/` bằng `ServeStaticModule`.
   - Với ảnh khoảnh khắc và hóa đơn quy mô lớn, ưu tiên tích hợp Firebase Storage theo lộ trình kiến trúc.

---

## 📱 4. Quy Tắc Frontend (`apps/mobile-web`)

1. **Tính Tương Thích Đa Nền Tảng (Cross-Platform):**
   - Ứng dụng hỗ trợ cả **Web Browser** và **Native Mobile (iOS / Android qua Expo Go)**.
   - Thư mục màn hình được chia tách rõ ràng:
     - [`src/screens/web/`](file:///d:/GitHub/Monett/apps/mobile-web/src/screens/web): Giao diện tối ưu cho màn hình rộng Desktop (có Sidebar điều hướng).
     - [`src/screens/mobile/`](file:///d:/GitHub/Monett/apps/mobile-web/src/screens/mobile): Giao diện tối ưu cho điện thoại di động (Bottom Navigation Tab, thao tác vuốt chạm).
   - Luôn sử dụng `useWindowDimensions()` hoặc SafeArea context để đảm bảo không bị tràn viền hay lệch giao diện trên thiết bị có tai thỏ / Dynamic Island.
2. **Phân Giải Địa Chỉ API Động (`getBaseUrl()`):**
   > [!WARNING]
   > **Không bao giờ hardcode `http://localhost:3000`** trực tiếp trong các components hoặc hooks!
   - Thiết bị điện thoại thật (khi test qua Expo Go) không thể gọi trực tiếp `localhost` của máy tính.
   - Luôn gọi qua các hàm tiện ích trong [`src/services/api.ts`](file:///d:/GitHub/Monett/apps/mobile-web/src/services/api.ts):
     - `getBaseUrl()`: Tự động phát hiện Web (`localhost`), Mobile Native (`hostUri` qua Expo LAN IP), hoặc Cloud Tunnel (`ngrok`).
     - `normalizeAvatarUrl(url)`: Chuyển đổi đường dẫn ảnh đại diện tương thích với môi trường hiện tại.
3. **Bộ Nhận Diện Thương Hiệu & UI/UX:**
   - **Màu chủ đạo:** Xanh lục bảo ngọc (`#047857` / Emerald Green).
   - **Mascot:** Chú ếch thám hiểm tài chính (Chibi Frog) và hệ thống Gamification (cấp độ XP, chuỗi Streak rực rỡ).
   - **Đa ngôn ngữ (i18n):** Luôn hỗ trợ song ngữ Tiếng Việt (`VI 🇻🇳`) và Tiếng Anh (`EN 🇬🇧`) thông qua [`LanguageContext`](file:///d:/GitHub/Monett/apps/mobile-web/src/contexts/LanguageContext.tsx).

---

## ⚙️ 5. Quy Chuẩn Biến Môi Trường (Environment Variables)

- Biến môi trường Backend: Nằm tại [`apps/backend/.env`](file:///d:/GitHub/Monett/apps/backend/.env) (tham khảo template tại `.env.example`).
- Biến môi trường Frontend: Bắt đầu bằng tiền tố `EXPO_PUBLIC_` (ví dụ: `EXPO_PUBLIC_API_URL`) để Expo có thể inject vào bundle runtime.
- **Không bao giờ** commit thông tin nhạy cảm (Private Keys, Mật khẩu MongoDB thật, Firebase Secret Tokens) lên Git.

---

## 🛠️ 6. Bảng Lệnh Thường Dùng (Command Cheat Sheet)

| Tác vụ | Lệnh (chạy tại thư mục gốc `Monett/`) | Mô tả |
| :--- | :--- | :--- |
| **Cài đặt thư viện** | `npm install` | Cài đặt cho toàn bộ workspace |
| **Chạy toàn bộ (Dev)** | `npm run dev` | Chạy song song cả NestJS Backend và Expo Web/Mobile |
| **Chạy riêng Backend** | `npm run dev:backend` | Bật NestJS API Server tại `http://localhost:3000` |
| **Chạy riêng Frontend** | `npm run dev:mobile` | Bật Expo Dev Server tại `http://localhost:8081` |
| **Chạy Frontend Tunnel** | `npm run dev:mobile:tunnel` | Mở tunnel ngrok để test trên điện thoại khác mạng Wifi |
| **Build Shared Types** | `npm run build:shared` | Biên dịch TypeScript cho package `@monett/shared` |
| **Build Backend** | `npm run build:backend` | Biên dịch NestJS cho môi trường production |
| **Dọn dẹp build** | `npm run clean` | Xóa các thư mục build tạm thời trong workspaces |
