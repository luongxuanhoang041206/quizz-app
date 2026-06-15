# Cấu trúc thư mục

## Tổng quan

```
quizz-app/
├── src/                    # Mã nguồn NestJS
├── test/                   # E2E tests
├── docs/                   # Tài liệu dự án (tiếng Việt)
├── postman/                # Postman workspace
├── .env.example            # Mẫu biến môi trường
├── package.json
├── pnpm-lock.yaml
├── nest-cli.json
├── tsconfig.json
└── README.md
```

## `src/` — chi tiết

```
src/
├── main.ts                 # Bootstrap: prefix /api, CORS, Swagger, ValidationPipe
├── app.module.ts           # Root module — import tất cả feature modules
├── app.controller.ts       # Health/root endpoint
├── app.service.ts
│
├── database/
│   └── database.module.ts  # Global Supabase client provider
│
├── common/
│   └── decorators/
│       └── current-user.decorator.ts   # @CurrentUser() — lấy user từ JWT
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts  # register, login, me
│   ├── auth.service.ts
│   ├── jwt.strategy.ts
│   ├── jwt-auth.guard.ts
│   └── dto/
│       ├── register.dto.ts
│       └── login.dto.ts
│
├── users/
│   ├── user.module.ts
│   ├── user.controller.ts  # profile, stats, badges, activity
│   ├── user.service.ts
│   ├── xp.service.ts       # Tính XP và level
│   ├── badge.service.ts    # Trao badge tự động
│   ├── activity.service.ts # Ghi activity log
│   ├── types.ts
│   └── dto/
│       ├── UpdateUserDto.ts
│       ├── query.dto.ts
│       ├── profile-response.dto.ts
│       ├── badge-response.dto.ts
│       ├── xp-history-response.dto.ts
│       ├── category-stats-response.dto.ts
│       ├── activity-log-response.dto.ts
│       └── recent-attempt-response.dto.ts
│
├── quizzes/
│   ├── quiz.module.ts
│   ├── quiz.controller.ts  # CRUD quiz, questions, answers
│   ├── quiz.service.ts
│   └── dto/
│       ├── create-quiz.dto.ts
│       ├── update-quiz.dto.ts
│       ├── create-question.dto.ts
│       ├── update-question.dto.ts
│       ├── update-answer.dto.ts
│       ├── query-quiz.dto.ts
│       ├── reorder-questions.dto.ts
│       └── toggleQuestion.dto.ts
│
├── attempts/
│   ├── attempts.module.ts
│   ├── attempts.controller.ts  # start, submit, get result
│   ├── attempts.service.ts
│   ├── entities/
│   │   └── attempt.entity.ts   # Type/interface (không phải TypeORM entity)
│   └── dto/
│       ├── create-attempt.dto.ts
│       ├── submit-attempt.dto.ts
│       └── update-attempt.dto.ts
│
├── social/
│   ├── social.module.ts
│   ├── social.controller.ts    # like, bookmark, comment
│   ├── social.service.ts
│   ├── entities/
│   │   ├── comment.entities.ts
│   │   └── bookmark.entities.ts
│   └── dto/
│       ├── create-comment.dto.ts
│       └── create-social.dto.ts
│
├── dashboard/
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts # GET /api/dashboard
│   ├── dashboard.service.ts
│   └── dto/
│
└── seeds/
    └── seed.ts             # Script seed dữ liệu mẫu (standalone, không phải Nest module)
```

## Trách nhiệm từng module

### `auth/`
Xác thực người dùng: đăng ký, đăng nhập, phát hành JWT, endpoint `/auth/me`.

### `users/`
Quản lý profile và gamification read-side:
- `UserService` — truy vấn profile, stats, badges, activity
- `XpService` — công thức XP/level (dùng bởi AttemptsService)
- `BadgeService` — kiểm tra và trao badge sau submit
- `ActivityService` — ghi log hoạt động

### `quizzes/`
CRUD quiz và nội dung:
- Tạo/sửa/xóa quiz (chỉ owner)
- Quản lý câu hỏi và đáp án
- Danh sách quiz public với filter/pagination
- Toggle visibility

### `attempts/`
Vòng đời làm bài quiz:
- Bắt đầu attempt (chỉ quiz public)
- Nộp đáp án, chấm điểm
- Kích hoạt pipeline XP → badge → activity

### `social/`
Tương tác xã hội trên quiz:
- Like/unlike (cập nhật `like_count`)
- Bookmark toggle
- Comment CRUD

### `dashboard/`
Thống kê tổng hợp: số users/quizzes/attempts, top quiz, top điểm.

### `database/`
Infrastructure: cung cấp `SUPABASE_CLIENT` cho toàn bộ app.

### `seeds/`
Script độc lập tạo dữ liệu mẫu qua `pg` — chạy bằng `pnpm seed`.

## Quy ước đặt tên

| Pattern | Ví dụ | Ý nghĩa |
|---------|-------|---------|
| `*.module.ts` | `auth.module.ts` | NestJS module definition |
| `*.controller.ts` | `quiz.controller.ts` | HTTP route handlers |
| `*.service.ts` | `attempts.service.ts` | Business logic |
| `*.dto.ts` | `create-quiz.dto.ts` | Request/response validation |
| `*.spec.ts` | `attempts.service.spec.ts` | Unit tests |
| `*.entity.ts` | `attempt.entity.ts` | Type/interface (không dùng TypeORM) |

## Thư mục khác

| Thư mục | Nội dung |
|---------|----------|
| `test/` | E2E test (`app.e2e-spec.ts`, `jest-e2e.json`) |
| `postman/` | Postman globals và resources |
| `docs/` | Tài liệu tiếng Việt |

## Tài liệu liên quan

- [Tính năng theo module](./tinh-nang.md)
- [API Reference](./api.md)
- [Hướng dẫn phát triển](./phat-trien.md)
