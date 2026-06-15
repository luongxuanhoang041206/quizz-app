# API Reference

> **Nguồn chính xác nhất:** Swagger UI tại `http://localhost:3000/docs` khi server đang chạy.  
> OpenAPI JSON: `http://localhost:3000/docs-json`

**Base URL:** `http://localhost:3000/api`  
**Authentication:** Header `Authorization: Bearer <access_token>` cho các endpoint yêu cầu JWT.

---

## Auth

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/auth/register` | — | Đăng ký tài khoản mới |
| POST | `/auth/login` | — | Đăng nhập |
| GET | `/auth/me` | JWT | Thông tin user hiện tại |

### Register body
```json
{
  "email": "user@example.com",
  "username": "player1",
  "password": "password123"
}
```

---

## Users

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/users/:id/profile` | — | Profile cơ bản |
| PATCH | `/users/:id/update` | JWT | Cập nhật profile |
| GET | `/users/:id/quizzes` | — | Quiz do user tạo |
| GET | `/users/:id/attempts` | — | Lịch sử attempts |
| GET | `/users/:id/category-stats` | — | Thống kê theo category |
| GET | `/users/:id/xp-history` | — | Biểu đồ XP (`?period=day\|week\|month`) |
| GET | `/users/:id/recent-attempts` | — | Attempts gần đây (`?limit=&cursor=`) |
| GET | `/users/:id/badges` | — | Danh sách badge |
| GET | `/users/:id/activity` | — | Activity feed (`?limit=&cursor=`) |
| GET | `/users/:id/milestones` | — | XP, badge count, level |
| GET | `/users/:id/profile/full` | — | Profile tổng hợp (BFF) |

---

## Quizzes

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/quizzes` | — | Danh sách quiz public (search/filter/page) |
| POST | `/quizzes` | JWT | Tạo quiz |
| GET | `/quizzes/:id` | — | Chi tiết quiz + questions |
| PATCH | `/quizzes/:id` | JWT | Cập nhật quiz (owner) |
| DELETE | `/quizzes/:id` | JWT | Xóa quiz (owner) |
| POST | `/quizzes/:id/questions` | JWT | Thêm câu hỏi |
| PUT | `/quizzes/:id/questions/reorder` | JWT | Sắp xếp lại câu hỏi |
| PATCH | `/quizzes/:id/visibility` | JWT | Đổi public/private |
| PATCH | `/questions/:id` | JWT | Sửa câu hỏi |
| DELETE | `/questions/:id` | JWT | Xóa câu hỏi |
| PATCH | `/answers/:id` | JWT | Sửa đáp án |
| DELETE | `/answers/:id` | JWT | Xóa đáp án |

### Query params — `GET /quizzes`

| Param | Giá trị | Mô tả |
|-------|---------|-------|
| `search` | string | Tìm theo title/description |
| `category` | string | Lọc category |
| `difficulty` | easy, medium, hard | Lọc độ khó |
| `sort` | newest, oldest, title | Sắp xếp |
| `page` | number | Trang (mặc định 1) |
| `limit` | number | Số item/trang (mặc định 10) |

---

## Attempts

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/attempts` | JWT | Bắt đầu attempt |
| POST | `/attempts/:id/submit` | JWT | Nộp đáp án |
| GET | `/attempts/:id` | JWT | Xem kết quả |

### Start attempt body
```json
{ "quiz_id": "uuid-cua-quiz" }
```

### Submit body
```json
{
  "answers": [
    { "question_id": "uuid-cau-hoi", "selected_answer_id": 0 },
    { "question_id": "uuid-cau-hoi-2", "selected_answer_id": 2 }
  ]
}
```

> `selected_answer_id` là **index 0-based** của option trong danh sách câu hỏi.

---

## Social

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/quizzes/:id/like` | JWT | Toggle like |
| POST | `/quizzes/:id/bookmark` | JWT | Toggle bookmark |
| GET | `/quizzes/:id/comments` | — | Danh sách comment |
| POST | `/quizzes/:id/comments` | JWT | Thêm comment |
| DELETE | `/comments/:id` | JWT | Xóa comment (owner) |

### Add comment body
```json
{ "content": "Quiz hay quá!" }
```

---

## Dashboard

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/dashboard` | — | Thống kê tổng hợp |

---

## Ví dụ curl — flow hoàn chỉnh

### 1. Đăng ký

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","username":"demouser","password":"password123"}'
```

Lưu `access_token` từ response.

### 2. Tạo quiz

```bash
curl -X POST http://localhost:3000/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "title": "Quiz Demo",
    "description": "Quiz thử nghiệm",
    "difficulty": "easy",
    "questions": [
      {
        "content": "Thủ đô Việt Nam là gì?",
        "type": "SINGLE_CHOICE",
        "points": 10,
        "options": [
          { "text": "Hà Nội" },
          { "text": "TP.HCM" },
          { "text": "Đà Nẵng" }
        ],
        "correct_answer": { "index": 0 }
      }
    ]
  }'
```

### 3. Đặt public

```bash
curl -X PATCH http://localhost:3000/api/quizzes/<QUIZ_ID>/visibility \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"visibility": "public"}'
```

### 4. Làm bài và nộp

```bash
# Bắt đầu
curl -X POST http://localhost:3000/api/attempts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"quiz_id": "<QUIZ_ID>"}'

# Nộp bài
curl -X POST http://localhost:3000/api/attempts/<ATTEMPT_ID>/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "answers": [
      { "question_id": "<QUESTION_ID>", "selected_answer_id": 0 }
    ]
  }'
```

---

## Mã lỗi HTTP thường gặp

| Code | Ý nghĩa |
|------|---------|
| 400 | Validation lỗi hoặc lỗi database |
| 401 | Thiếu/sai JWT token |
| 403 | Không có quyền (vd: xóa comment người khác) |
| 404 | Không tìm thấy resource |
| 409 | Email/username đã tồn tại |

## Tài liệu liên quan

- [Tính năng chi tiết](./tinh-nang.md)
- [Cài đặt](./cai-dat.md)
- [Known issues](./known-issues.md) — các endpoint legacy/stub
