# Cài đặt & chạy dự án

## Yêu cầu hệ thống

| Yêu cầu | Phiên bản tối thiểu |
|---------|---------------------|
| Node.js | 18+ |
| pnpm | 8+ (hoặc npm/yarn nếu thích) |
| Supabase project | Có schema PostgreSQL đã tạo |
| Postgres (cho seed) | Tùy chọn — chỉ cần khi chạy `pnpm seed` |

## Bước 1: Clone và cài dependencies

```bash
git clone <repo-url>
cd quizz-app
pnpm install
```

## Bước 2: Cấu hình biến môi trường

Sao chép file mẫu:

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với giá trị thực:

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `SUPABASE_URL` | Có | URL project Supabase (Settings → API) |
| `SUPABASE_SERVICE_KEY` | Có | **Service role key** — chỉ dùng backend, không expose ra client |
| `JWT_SECRET` | Có | Chuỗi bí mật ký JWT (nên ≥ 32 ký tự) |
| `JWT_EXPIRES_IN` | Không | Thời hạn token, mặc định `7d` |
| `PORT` | Không | Cổng server, mặc định `3000` |
| `DATABASE_URL` | Seed only | Connection string Postgres trực tiếp |

> **Lưu ý bảo mật:** Không commit file `.env`. `SUPABASE_SERVICE_KEY` có quyền admin — chỉ dùng trên server.

## Bước 3: Chạy development server

```bash
pnpm start:dev
```

Server khởi động tại:

| URL | Mô tả |
|-----|-------|
| `http://localhost:3000/api` | API base path |
| `http://localhost:3000/docs` | Swagger UI |
| `http://localhost:3000/docs-json` | OpenAPI JSON |

### CORS

API cho phép origin `http://localhost:3001` (frontend dev). Nếu frontend chạy port khác, cần sửa trong `src/main.ts`.

## Bước 4: Seed dữ liệu mẫu (tùy chọn)

```bash
pnpm seed
```

Script `src/seeds/seed.ts` dùng `DATABASE_URL` để kết nối Postgres trực tiếp.

### Biến môi trường seed

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `SEED_CATEGORIES` | 8 | Số category |
| `SEED_TAGS` | 30 | Số tag |
| `SEED_USERS` | 100 | Số user |
| `SEED_BADGES` | 20 | Số badge |
| `SEED_QUIZZES` | 80 | Số quiz |
| `TRUNCATE_BEFORE` | false | `true` = xóa toàn bộ dữ liệu trước khi seed |

Ví dụ seed với ít dữ liệu hơn:

```bash
SEED_USERS=10 SEED_QUIZZES=5 pnpm seed
```

Xóa dữ liệu cũ trước khi seed:

```bash
TRUNCATE_BEFORE=true pnpm seed
```

## Scripts có sẵn

| Script | Lệnh | Mô tả |
|--------|------|-------|
| `start:dev` | `nest start --watch` | Dev mode với hot reload |
| `start` | `nest start` | Chạy một lần |
| `start:prod` | `node dist/main` | Production (sau build) |
| `build` | `nest build` | Compile TypeScript → `dist/` |
| `seed` | `ts-node src/seeds/seed.ts` | Seed dữ liệu mẫu |
| `test` | `jest` | Unit tests |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | E2E tests |
| `lint` | `eslint ... --fix` | Lint code |
| `format` | `prettier --write` | Format code |

## Production build

```bash
pnpm build
pnpm start:prod
```

Đảm bảo biến môi trường (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `PORT`) được set trên server production.

## Kiểm tra nhanh API

```bash
# Health check (root)
curl http://localhost:3000/api

# Đăng ký
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Xem Swagger
start http://localhost:3000/docs   # Windows
```

## Postman

Thư mục `postman/` chứa workspace globals. Import vào Postman để test nhanh các endpoint.

## Troubleshooting

| Vấn đề | Nguyên nhân có thể | Giải pháp |
|--------|-------------------|-----------|
| `SUPABASE_URL is undefined` | Thiếu `.env` | Tạo `.env` từ `.env.example` |
| `Invalid API key` | Sai service key | Kiểm tra key trong Supabase Dashboard |
| Seed fail connection | Sai `DATABASE_URL` | Kiểm tra connection string Postgres |
| CORS error từ frontend | Origin không khớp | Sửa `enableCors` trong `main.ts` |
| 401 Unauthorized | Token hết hạn hoặc sai | Đăng nhập lại, gửi header `Authorization: Bearer <token>` |

## Tài liệu liên quan

- [API Reference](./api.md)
- [Database schema](./database.md)
- [Hướng dẫn phát triển](./phat-trien.md)
