# Hướng dẫn phát triển

Tài liệu này dành cho developer làm việc trên codebase Quizz App.

## Quy ước code

### Module structure

Mỗi feature module theo pattern NestJS chuẩn:

```
feature/
├── feature.module.ts      # imports, controllers, providers, exports
├── feature.controller.ts  # HTTP routes
├── feature.service.ts     # Business logic
└── dto/                   # Request validation
```

### DTO & Validation

- DTO dùng `class-validator` decorators
- Global `ValidationPipe` đã bật `whitelist` + `forbidNonWhitelisted` — field không khai báo trong DTO sẽ bị reject
- Dùng `@nestjs/swagger` decorators (`@ApiProperty`, `@ApiTags`) để document API

```typescript
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### Authentication

Protected routes dùng:

```typescript
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
someEndpoint(@CurrentUser() user: AuthUser) {
  // user.id, user.email
}
```

### Database access

Inject Supabase client:

```typescript
constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

async findUser(id: string) {
  const { data, error } = await this.supabase
    .from('users')
    .select('id, email, username')
    .eq('id', id)
    .single();

  if (error) throw new BadRequestException(error.message);
  return data;
}
```

**Không** thêm TypeORM/Prisma — giữ pattern Supabase query builder.

### Global config

| Setting | File | Giá trị |
|---------|------|--------|
| API prefix | `main.ts` | `/api` |
| Swagger | `main.ts` | `/docs` |
| CORS origin | `main.ts` | `http://localhost:3001` |
| ConfigModule | `app.module.ts` | `isGlobal: true` |

---

## Thêm endpoint mới

1. Tạo/sửa DTO trong `dto/`
2. Thêm method trong `*.service.ts`
3. Thêm route trong `*.controller.ts` với Swagger decorators
4. Nếu cần auth: `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth('JWT-auth')`
5. Kiểm tra trên Swagger UI

## Thêm module mới

```bash
nest generate module feature-name
nest generate controller feature-name
nest generate service feature-name
```

Import module mới vào `app.module.ts`.

---

## Chạy & debug

```bash
# Dev với hot reload
pnpm start:dev

# Debug mode
pnpm start:debug

# Build
pnpm build
```

Server mặc định port `3000`. Swagger tại `/docs`.

---

## Testing

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov

# E2E
pnpm test:e2e
```

Unit test files: `src/**/*.spec.ts`  
E2E test: `test/app.e2e-spec.ts`

---

## Lint & format

```bash
pnpm lint      # ESLint + auto fix
pnpm format    # Prettier
```

Chạy lint trước khi commit.

---

## Seed data

```bash
pnpm seed
```

Dùng khi cần dữ liệu mẫu để test. Xem [Cài đặt](./cai-dat.md) cho biến môi trường seed.

---

## Postman

Thư mục `postman/` chứa workspace globals. Import vào Postman để test API nhanh mà không cần viết curl.

---

## Checklist trước khi merge

- [ ] Code compile: `pnpm build`
- [ ] Lint pass: `pnpm lint`
- [ ] Tests pass: `pnpm test`
- [ ] Swagger decorators đã thêm cho endpoint mới
- [ ] DTO validation đầy đủ
- [ ] Không commit `.env` hoặc secret

---

## Tài liệu liên quan

- [Cấu trúc thư mục](./cau-truc-thu-muc.md)
- [Công nghệ](./cong-nghe.md)
- [Known issues](./known-issues.md)
- [API Reference](./api.md)
