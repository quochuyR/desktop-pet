# 🏗️ Desktop Pet - Project Architecture & AI Guide

Tài liệu này đóng vai trò như một tấm bản đồ tư duy dành riêng cho AI (và cả Dev) để tra cứu nhanh cấu trúc của dự án Desktop Pet. Source code đã được **Refactor toàn diện** với mục tiêu Module hóa, áp dụng Clean Architecture, loại bỏ hoàn toàn các God Classes.

Nếu bạn là một AI Agent mới tiếp nhận dự án, **ĐỌC KỸ FILE NÀY TRƯỚC KHI CHỈNH SỬA CODE!**

---

## 1. 🖥️ Frontend (SvelteKit + TypeScript)

### 🎨 Rendering Pipeline (Thư mục `src/lib/renderer/`)
Trước đây, toàn bộ logic vẽ rùa nằm trong file khổng lồ `turtle.ts` (hơn 2300 dòng). Hiện tại đã được thiết kế lại theo dạng Orchestrator + Sub-Renderers:
- **`BaseRenderer.ts`**: Class cha định nghĩa các interface chung và giữ tham chiếu tới Canvas Context (`ctx`).
- **`TurtleRenderer.ts`**: Orchestrator chính, triệu gọi các bộ phận để vẽ thành hình. Thay vì chứa logic vẽ, nó chỉ quản lý state và gọi các lớp con.
- **`ShellRenderer.ts`**: Chuyên lo việc vẽ Mai rùa (có hoa văn).
- **`FaceRenderer.ts`**: Chuyên lo việc vẽ Khuôn mặt (Mắt, Miệng, Nước mắt, Mồ hôi...).
- **`LimbsRenderer.ts`**: Chuyên lo việc vẽ Chân, Tay, Đuôi rùa.
- **`AccessoryRenderer.ts`**: Quản lý việc vẽ Mũ, Kính, Phụ kiện.
- **`ParticleRenderer.ts`**: Quản lý hệ thống Particle (Pháo hoa, Sao, Bọt nước, Bụi...).

### ⚙️ Game Loop & Behaviors (Thư mục `src/lib/`)
Logic chuyển động trước đây gộp trong `physics.ts` (>1300 dòng) đã được tách bóc:
- **`state.svelte.ts`**: Sử dụng Svelte 5 Runes làm Global State (Quản lý tọa độ `petState`, trạng thái cửa sổ, độ phân giải).
- **`types.ts`**: Chứa các kiểu dữ liệu cốt lõi. Quan trọng nhất là `enum PetAction`, thay thế cho chuỗi Magic Strings, giúp chống lỗi Typo tuyệt đối.
- **`collision.ts`**: Quản lý logic tính toán va chạm (va chạm viền màn hình, va chạm nền tảng cửa sổ).
- **`behaviors/legacy.ts`**: Chứa toàn bộ các Action/State behavior cũ (Climbing, Falling, Dangling, v.v.). Đây là nơi tiếp theo sẽ được nâng cấp thành **State Machine** chuẩn.
- **`physics.ts`**: Chỉ còn giữ trách nhiệm Game Loop (60fps) và điều phối các hàm bên ngoài.

---

## 2. 🦀 Backend (Tauri + Rust)

Thư mục `src-tauri/src/` đã được tổ chức lại chặt chẽ theo chuẩn Domain-driven:

### 🎮 Tauri Commands (`src-tauri/src/commands/`)
File `commands.rs` (800 dòng) đã bị xóa bỏ hoàn toàn. Thay vào đó, API giao tiếp giữa Frontend và Backend được chia về từng domain cụ thể:
- **`pet.rs`**: Lấy chỉ số thú cưng (`get_pet_stats`), xử lý sự kiện click (`pet_clicked`).
- **`dev.rs`**: Theo dõi IDE, trạng thái dev (`get_dev_status`, `update_watch_path`).
- **`ai.rs`**: Kết nối Gemini AI để tạo lời khuyên (`get_ai_advice`).
- **`window.rs`**: Các lệnh điều khiển hệ thống cửa sổ Tauri (`move_window`, `toggle_click_through`, `get_all_monitors`).
- **`db.rs`**: CRUD thao tác SQLite từ frontend (`db_save_personality`, `db_get_app_usage`).
- **`config.rs`**: Quản lý Config (`get_config_info`).
- **`system.rs`**: API hệ thống cơ bản (Lấy tọa độ chuột vật lý).

### 🖥️ System & OS Bindings (`src-tauri/src/sys/`)
- **`win32.rs`**: Đây là khu vực cách ly (Quarantine Zone) dành riêng cho hệ điều hành Windows! Mọi lệnh gọi tới `user32.dll`, hook sự kiện màn hình, tìm ứng dụng đang mở, đều được nhốt vào đây. Tách biệt hoàn toàn code C-Bindings rủi ro ra khỏi logic Rust thuần.

### 💾 Core Modules (`src-tauri/src/`)
- **`db.rs`**: Lớp thao tác trực tiếp với cơ sở dữ liệu SQLite cục bộ (lưu trữ chỉ số rùa, sự kiện).
- **`dev_monitor.rs`**: Giám sát IDE, phát hiện app được Focus (VS Code, Cursor...).
- **`system_monitor.rs`**: Background Thread theo dõi và log lại những file đang bị thay đổi.
- **`ai_advisor.rs`**: Logic xử lý Context và gửi API call lên Google Gemini.

---

## 💡 AI Guidelines - Hướng dẫn Tái sử dụng Code

1. **Tránh God Classes**: Tuyệt đối không nhồi nhét logic mới vào `physics.ts` hoặc `TurtleRenderer.ts`. Hãy tạo module mới hoặc sub-renderer mới nếu tính năng lớn.
2. **Khi thêm tính năng Frontend liên quan vẽ đồ họa**: Tạo logic trong class `*Renderer.ts` tương ứng. Nếu là phụ kiện, update vào `AccessoryRenderer`. Nếu là hiệu ứng, cho vào `ParticleRenderer`.
3. **Khi thêm logic hoạt động rùa**: 
   - Khai báo state mới vào `enum PetAction` trong `types.ts`.
   - Update code vào hệ thống Behavior (hoặc State Machine sau này) thay vì viết chuỗi cứng.
4. **Khi thêm Tauri Command (Backend API)**:
   - Viết hàm xử lý vào module tương ứng trong `src-tauri/src/commands/` (ví dụ: lệnh về Window thì cho vào `window.rs`).
   - Mở file `src-tauri/src/main.rs`, thêm hàm vào mảng `tauri::generate_handler![...]`.
5. **Hook Windows API**: Nếu cần thêm các API tương tác phần cứng hoặc OS sâu, bỏ vào `src-tauri/src/sys/win32.rs` và chặn bằng flag `#[cfg(target_os = "windows")]`. 

> [!TIP]
> Hãy tìm kiếm các hàm tiện ích trong `src/lib/utils.ts` trước khi tự viết hàm xử lý Math hoặc UI riêng.
