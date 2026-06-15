# Công nghệ sử dụng

## Stack tổng quan

| Lớp | Công nghệ | Phiên bản (chính) |
|-----|-----------|-------------------|
| Runtime | Node.js | 18+ |
| Framework | NestJS | 11.x |
| HTTP server | Express (`@nestjs/platform-express`) | — |
| Ngôn ngữ | TypeScript | 5.7 |
| Database | PostgreSQL qua Supabase | — |
| DB client | `@supabase/supabase-js` | 2.x |
| Authentication | JWT + Passport + bcrypt | — |
| Validation | class-validator, class-transformer | — |
| API docs | Swagger / OpenAPI (`@nestjs/swagger`) | — |
| Testing | Jest + Supertest | — |
| Seed data | `pg` + `@faker-js/faker` | — |
| Package manager | pnpm | — |

## Kiến trúc ứng dụng

```mermaid
flowchart TB
    subgraph bootstrap [Bootstrap - main.ts]
        Prefix["Global prefix /api"]
        Pipe["ValidationPipe"]
        Swagger["Swagger /docs"]
        CORS["CORS localhost:3001"]
    end

    subgraph modules [Feature Modules]
        AuthM[AuthModule]
        UserM[UserModule]
        QuizM[QuizModule]
        AttemptM[AttemptsModule]
        SocialM[SocialModule]
        DashM[DashboardModule]
    end

    subgraph infra [Infrastructure]
        ConfigM[ConfigModule global]
        DBM[DatabaseModule global]
        Supa["SUPABASE_CLIENT"]
    end

    bootstrap --> modules
    modules --> DBM
    DBM --> Supa
    Supa --> PG[(PostgreSQL)]
    AttemptM --> UserM
```

## Pattern dữ liệu

Dự án **không dùng ORM** (TypeORM, Prisma, Sequelize). Thay vào đó:

1. `DatabaseModule` đăng ký global provider `SUPABASE_CLIENT`
2. Mỗi service inject client và truy vấn trực tiếp:

```typescript
this.supabase.from('users').select('id, email, username').eq('id', userId).single();
```

**Lý do phù hợp với dự án này:**
- Schema đã tồn tại trên Supabase/PostgreSQL
- Truy vấn đơn giản, không cần migration layer phức tạp
- Service role key cho phép backend bypass RLS khi cần

**Seed script** (`src/seeds/seed.ts`) dùng `pg` Pool trực tiếp với `DATABASE_URL` — tách biệt với runtime Supabase client.

## Module graph

```
AppModule
├── ConfigModule.forRoot({ isGlobal: true })
├── DatabaseModule          → SUPABASE_CLIENT (global)
├── AuthModule              → JwtModule, PassportModule, JwtStrategy
├── UserModule              → UserService, XpService, BadgeService, ActivityService
├── QuizModule              → QuizService
├── AttemptsModule          → imports UserModule
├── SocialModule            → SocialService
└── DashboardModule         → DashboardService
```

## Authentication flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant DB

    Client->>AuthController: POST /api/auth/login
    AuthController->>AuthService: login(dto)
    AuthService->>DB: SELECT users WHERE email
    AuthService->>AuthService: bcrypt.compare(password)
    AuthService->>AuthService: jwt.sign({ sub, email })
    AuthService-->>Client: { access_token, user }

    Client->>AuthController: GET /api/auth/me (Bearer token)
    AuthController->>AuthService: getMe(userId)
    AuthService->>DB: SELECT user profile
    AuthService-->>Client: user object
```

- JWT payload: `{ sub: userId, email }`
- Guard: `JwtAuthGuard` + decorator `@CurrentUser()` để lấy `{ id, email }`
- Token hết hạn mặc định: `7d` (cấu hình qua `JWT_EXPIRES_IN`)

## Validation & API docs

- **ValidationPipe** global: `whitelist`, `forbidNonWhitelisted`, `transform`
- DTO dùng decorator `class-validator` (`@IsEmail`, `@IsString`, `@IsOptional`, ...)
- Swagger tự generate từ decorator `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`

## Công cụ phát triển

| Công cụ | Mục đích |
|---------|----------|
| ESLint + Prettier | Lint và format code |
| Jest | Unit test (`*.spec.ts`) và E2E (`test/`) |
| Nest CLI | `nest build`, `nest start --watch` |
| Postman | Thư mục `postman/` chứa workspace globals |

## Tài liệu liên quan

- [Cấu trúc thư mục](./cau-truc-thu-muc.md)
- [Cài đặt](./cai-dat.md)
- [Hướng dẫn phát triển](./phat-trien.md)
