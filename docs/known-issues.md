# Known Issues

Danh sách các inconsistency và hạn chế đã phát hiện trong codebase. Hữu ích cho developer frontend và người maintain backend.

---

## 1. BadgeService — sai tên bảng

**File:** `src/users/badge.service.ts`

Service đọc badge đã nhận từ bảng `user-badges` (có dấu gạch ngang), trong khi:
- Seed script insert vào `user_badges` (underscore)
- `UserService.getUserBadges()` đọc từ `user_badges`

**Ảnh hưởng:** `checkAndAwardBadges()` có thể không nhận diện badge đã có → trao badge trùng hoặc fail silently.

**Workaround:** Sửa query thành `user_badges` trong `badge.service.ts`.

---

## 2. Badge condition types không đồng nhất

| Nguồn | condition_type values |
|-------|----------------------|
| Seed script (`seed.ts`) | `quiz_count`, `score_streak`, `total_xp`, `perfect_score` |
| BadgeService (runtime) | `quizz_count`, `streak`, `xp`, `perfect` |

**Ảnh hưởng:** Badge seed từ script sẽ **không bao giờ** được trao tự động vì `condition_type` không khớp logic runtime.

**Workaround:** Thống nhất một bộ giá trị ở cả seed và BadgeService.

---

## 3. Field level không đồng nhất

| Nguồn | Field name |
|-------|-----------|
| Seed script | `user_level` |
| AttemptsService (update) | `level` |
| UserService.getMilestones() | `user_level` |

**Ảnh hưởng:** Sau submit quiz, level có thể không cập nhật đúng field mà frontend đọc.

---

## 4. XP history — param `period` chưa filter

**Endpoint:** `GET /api/users/:id/xp-history?period=day|week|month`

Controller nhận param `period` nhưng `UserService.getXpHistory()` chưa dùng để lọc dữ liệu theo khoảng thời gian — trả về tất cả logs grouped by date.

**Ảnh hưởng:** Frontend filter theo period sẽ không hoạt động đúng.

---

## 5. Legacy stub routes — Attempts

**File:** `src/attempts/attempts.controller.ts`

Các route scaffold còn sót, **không có auth guard**:

| Method | Route | Trạng thái |
|--------|-------|-----------|
| GET | `/api/attempts` | Stub placeholder |
| PATCH | `/api/attempts/:id` | Stub placeholder |
| DELETE | `/api/attempts/:id` | Stub placeholder |

**Khuyến nghị:** Xóa hoặc implement đầy đủ. Không dùng trong production.

---

## 6. Legacy stub routes — Social

**File:** `src/social/social.controller.ts`

Các route scaffold:

| Method | Route | Trạng thái |
|--------|-------|-----------|
| POST | `/api` | Placeholder |
| GET | `/api` | Placeholder (2 handler trùng `@Get()`) |
| DELETE | `/api/:id` | Placeholder |

**Ảnh hưởng:** Có thể gây conflict routing với các route khác.

---

## 7. Level formula khác giữa seed và runtime

| Nguồn | Công thức |
|-------|-----------|
| Seed | `user_level = floor(total_xp / 500) + 1`, `next_level_xp = 500` |
| XpService (runtime) | Mỗi level L cần `L × 1000` XP |

**Ảnh hưởng:** Dữ liệu seed không phản ánh đúng logic level runtime.

---

## 8. CORS hardcoded

**File:** `src/main.ts`

CORS chỉ cho phép `http://localhost:3001`. Deploy production hoặc dev trên port khác cần sửa code.

---

## 9. Không có `.env` validation

App không validate biến môi trường khi khởi động. Thiếu `SUPABASE_URL` hoặc `JWT_SECRET` sẽ fail ở runtime thay vì báo lỗi rõ ràng lúc boot.

---

## 10. User update — chưa kiểm tra ownership

**Endpoint:** `PATCH /api/users/:id/update`

Yêu cầu JWT nhưng chưa verify `user.id === :id` — user có thể sửa profile người khác nếu biết UUID.

---

## Báo cáo issue mới

Khi phát hiện bug hoặc inconsistency mới, ghi vào file này hoặc tạo GitHub issue với:
- File liên quan
- Hành vi mong đợi vs thực tế
- Steps to reproduce

## Tài liệu liên quan

- [Gamification](./gamification.md)
- [Database schema](./database.md)
- [Hướng dẫn phát triển](./phat-trien.md)
