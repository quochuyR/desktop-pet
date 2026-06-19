# Classic Agent AI Architecture (BDI + GOAP + Utility AI + Memory + RL)

> [!NOTE]
> Tài liệu này mô tả **kiến trúc bộ não AI**. Để xem bản đồ cấu trúc thư mục và các thành phần source code thực tế (Frontend Rendering, Backend Rust), vui lòng tham khảo: 👉 [AI_ARCHITECTURE_GUIDE.md](file:///c:/ProgramLibrary/desktop/desktop-pet/AI_ARCHITECTURE_GUIDE.md)

Tài liệu này ghi lại kiến trúc bộ não tự trị của chú Rùa Dev sau khi nâng cấp lên hệ thống tác tử (Agent) cổ điển, hoạt động hoàn toàn cục bộ (offline) không cần LLM.

---

## 1. Tổng quan kiến trúc (Architecture Overview)

```
Sensors (Tauri Events / Svelte Stores)
   ↓
World Model (Trạng thái thế giới hiện tại)
   ↓
Beliefs (Quy nạp niềm tin từ trạng thái thô)
   ↓
Goals (Mục tiêu có thể chọn)
   ↓
Utility Scoring (Utility AI chấm điểm chọn Goal tối ưu nhất)
   ↓
Planner (GOAP A* tìm chuỗi hành động để đạt Goal)
   ↓
Action Queue (Hàng đợi hành động thực thi bởi physics)
   ↓
Reinforcement Learning (Q-learning cập nhật phần thưởng từ tương tác người dùng)
```

---

## 2. Các cấu phần chi tiết (Core Components)

### 2.1 World Model & Beliefs (Mô hình thế giới & Niềm tin)
* **World Model**: Lưu trữ các dữ liệu thô về thế giới xung quanh rùa và hành vi của người dùng (từ Sensors gửi lên).
* **Beliefs Engine**: Sử dụng hệ luật quy nạp từ dữ liệu thô ra các phán đoán/niềm tin (Beliefs). Ví dụ:
  * Vừa build thất bại liên tiếp + commit ít ⇒ `UserFrustrated` (Người dùng đang bực bội).
  * Làm việc liên tục > 1.5 giờ chưa nghỉ ⇒ `UserTired` (Người dùng đang mệt mỏi).
  * Năng lượng của rùa xuống dưới 30% ⇒ `PetTired` (Rùa đang mệt).

### 2.2 Desires / Goals (Mục tiêu của Rùa)
Hệ thống quản lý danh sách các mục tiêu Rùa muốn đạt được:
* `GOAL_REST`: Rùa muốn ngủ để hồi sức.
* `GOAL_COMFORT_USER`: Rùa muốn an ủi người dùng khi phát hiện họ bực bội.
* `GOAL_HEALTHY_USER`: Rùa muốn nhắc nhở người dùng nghỉ ngơi (Break Time).
* `GOAL_EXPLORE`: Rùa đi tuần tra xung quanh màn hình.
* `GOAL_PLAY`: Rùa muốn nhảy múa, đòi click chơi cùng.

### 2.3 Utility AI (Đánh giá độ ưu tiên)
Thay vì dùng cây quyết định (Behavior Tree) cứng nhắc, **Utility AI** sử dụng các đường cong toán học (Utility Curves) chấm điểm động cho từng mục tiêu:
* Điểm mục tiêu nghỉ ngơi tỷ lệ nghịch với `energy` của rùa.
* Điểm mục tiêu nhắc break tăng vọt khi thời gian làm việc liên tục của người dùng tăng lên.
* Mục tiêu có điểm Utility cao nhất sẽ được chọn làm **Active Goal**.

### 2.4 GOAP Planner (Lập kế hoạch hành động)
* **Goal-Oriented Action Planning (GOAP)** tự động tìm đường đi từ trạng thái hiện tại đến Goal.
* Mỗi Action có:
  * **Preconditions**: Các trạng thái bắt buộc phải có để thực hiện hành động.
  * **Effects**: Trạng thái thay đổi sau khi thực hiện hành động.
  * **Cost**: Độ khó/tiêu hao thể lực của hành động.
* Sử dụng thuật toán tìm đường **A\*** để tính ra chuỗi hành động tối ưu nhất (chuỗi có tổng Cost nhỏ nhất).

### 2.5 Reinforcement Learning (Q-Learning học thói quen chủ nhân)
* Tích hợp thuật toán **Q-Learning** chạy local dựa trên bảng `Q-Table`.
* **State (Trạng thái)**: `(thời gian làm việc, mức độ tương tác của user)`
* **Action (Hành động)**: `(RemindBreakNow, DoNothing)`
* **Reward (Phần thưởng)**:
  * Nếu nhắc nhở mà User bấm tắt ngay lập tức (skip break): Phạt `-10`.
  * Nếu nhắc nhở mà User thực sự nghỉ ngơi (chạy hết overlay): Thưởng `+20`.
  * Nếu làm phiền lúc User đang tập trung cao độ (gõ phím liên tục): Phạt `-5`.
* Rùa sẽ học cách chọn thời điểm tối ưu nhất để nhắc break hoặc trêu đùa dựa trên phản hồi thực tế của bạn.

### 2.6 Memory System (Trí nhớ & Nhận diện thói quen)
* Ghi lại lịch sử hoạt động vào SQLite nhận thức (`pet.db`), liên kết theo Session làm việc (Episodic Memory).
* Nhận diện thói quen sinh hoạt: giờ làm việc thường xuyên, công cụ hay dùng, mức độ tập trung trung bình theo thời gian trong ngày.

---

## 3. SQLite Cognitive Database (Cơ sở dữ liệu nhận thức SQLite)

Từ Phase 1, toàn bộ bộ nhớ nhận thức và lịch sử học tập được chuyển từ LocalStorage sang **SQLite** cục bộ để tránh mất mát dữ liệu khi xóa cache trình duyệt:

### 3.1 Cấu trúc các bảng nhận thức
* **`sessions`**: Lưu trữ các phiên làm việc (`id`, `start_time`, `end_time`, `primary_activity`). Một phiên làm việc được khởi động khi phát hiện công cụ lập trình hoạt động và tự động đóng sau 30 phút nhàn rỗi (idle).
* **`event_log`**: Lưu trữ mọi hành vi gõ code, build, và lỗi phát sinh trong hệ thống. Đã liên kết trực tiếp với cột `session_id` để phục vụ khai phá chuỗi ký ức.
* **`personality`**: Lưu trữ 3 chỉ số nhân cách thích nghi:
  * `friendly` (thân thiện)
  * `helpful` (giúp ích)
  * `funny` (hài hước)
* **`agent_kv`**: Lưu trữ cặp khóa-giá trị động cho Q-Table học máy và lịch sử dài hạn.

### 3.2 Sự tiến hóa nhân cách (Dynamic Personality)
Nhân cách của Rùa Dev tự động biến đổi dựa trên hành động thực tế của chủ nhân:
* **Tương tác click**: Rùa tăng `friendly` (+1) và `funny` (+1.5).
* **Hoàn thành nhắc nhở nghỉ ngơi (Break Time)**: Rùa tăng `friendly` (+2) và `helpful` (+1) (cảm giác công sức có ích).
* **Tắt nhắc nhở nghỉ ngơi sớm (Skip)**: Rùa giảm `friendly` (-1) nhưng tăng `helpful` (+3) để cố gắng tối ưu thời gian nhắc nhở tiếp theo.
* Chỉ số tính cách được lưu trữ trực tiếp vào SQLite và sẽ thay đổi cách Rùa hành xử (Utility AI weights).
