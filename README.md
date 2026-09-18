# Quizz App

Quizz App is a NestJS-based quiz platform with gamification, live quiz sessions, user profiles, and blockchain-backed NFT achievements. The repository currently contains the backend API and blockchain integration layer; there is no separate frontend application checked into this codebase.

## Overview

This project combines traditional quiz functionality with a reward system built around Cardano and Aiken. Users can create and publish quizzes, take attempts, earn XP, and unlock achievement rewards when they meet score thresholds. The backend stores app data in Supabase PostgreSQL and uses JWT-based authentication for protected routes.

The blockchain layer is implemented through:

- Cardano integration via Lucid and Blockfrost
- Pinata for IPFS media upload
- Aiken smart contract for minting a single achievement NFT with backend authorization
- CIP-25 metadata for on-chain NFT metadata

The project is therefore a backend-first application for quiz delivery, progression, and blockchain-based reward minting.

## Features

### Quiz Platform

- Public quiz listing, search, filtering, and pagination
- Quiz creation, update, deletion, and ownership checks
- Question and answer management for multiple choice, true/false, and text-based question types
- Quiz submission and automatic scoring
- XP and level progression based on attempt results
- User profile, activity feed, recent attempts, and category statistics
- Social features such as likes, comments, bookmarks, and activity logs
- Session-based live quiz flow with join codes and leaderboard tracking
- Challenge system with requirements and reward definitions, including eligibility checks

### Blockchain

- Cardano wallet lookup and asset ownership verification via `CardanoService`
- Achievement NFT mint flow from backend to user wallet
- CIP-25 metadata attached to minted assets
- Pinata-based metadata and reward image storage on IPFS
- Aiken validator contract enforcing a backend signature and single-NFT mint rule
- Reward ownership checks through on-chain asset validation

Status: implemented in source, but not fully production-hardened or deployment-automated.

## Architecture

```mermaid
flowchart TD
    User[User / Quiz Player] --> Frontend[Frontend app: not present in this repo]
    User --> API[REST API: NestJS]
    API --> Auth[AuthModule / JWT]
    API --> Quiz[QuizModule]
    API --> Attempt[AttemptsModule]
    API --> Session[SessionsModule / LeaderboardModule]
    API --> UserMod[UserModule]
    API --> Reward[RewardModule]
    API --> Challenge[ChallengeModule]
    API --> Blockchain[Blockchain integration: Cardano + Pinata]
    API --> Supabase[(Supabase PostgreSQL)]
    Blockchain --> Blockfrost[Blockfrost API]
    Blockchain --> Pinata[Pinata IPFS]
    Blockchain --> Aiken[Aiken validator: mint_achievement]
```

## System Flow

### Quiz Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as NestJS API
    participant DB as Supabase
    participant G as GradingService

    U->>API: POST /quizzes
    API->>DB: Insert quiz + questions + answers
    U->>API: POST /attempts
    API->>DB: Create attempt with status in_progress
    U->>API: POST /attempts/:id/submit
    API->>DB: Load questions and correct answers
    API->>G: Grade submitted answers
    G-->>API: score, correctness, points
    API->>DB: Update attempt, award XP, insert activity log
    API-->>U: Result payload + XP summary
```

### Achievement / Blockchain Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as NestJS API
    participant DB as Supabase
    participant C as CardanoService
    participant B as Blockfrost
    participant P as Pinata

    U->>API: Complete quiz above threshold
    API->>DB: Create achievement record with PENDING status
    U->>API: POST /achievement/claim
    API->>DB: Load reward + wallet address
    API->>P: Upload reward media / metadata if needed
    API->>C: buildAchievementClaimTx(wallet, assetName, metadata)
    C->>B: Build and submit mint transaction
    B-->>C: Transaction hash / asset info
    C-->>API: Claim response
    API->>DB: Update achievement status to SUCCESS
    API-->>U: tx hash and asset metadata
```

## Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Backend | NestJS 11, TypeScript, Express | API server, validation, guards, Swagger |
| Auth | JWT, Passport, bcrypt | User auth, identity, password hashing |
| Database | Supabase PostgreSQL, `@supabase/supabase-js`, `pg` | App persistence and relational data |
| Blockchain | Cardano, Lucid, Blockfrost, Aiken | Minting and verification of reward NFTs |
| IPFS / metadata | Pinata SDK | Upload reward images / metadata |
| Smart contract | Aiken / Plutus v3 | Achievement mint policy |
| Testing | Jest, Supertest, ts-jest | Unit and e2e validation |
| Tooling | pnpm, ESLint, Prettier, Nest CLI | Dependency management and code quality |

## Project Structure

```text
quizz-app/
├── .env.example
├── .gitignore
├── .prettierrc
├── eslint.config.mjs
├── nest-cli.json
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.build.json
├── README.md
├── PHASE3_IMPLEMENTATION.md
├── docs/
│   ├── README.md
│   ├── api.md
│   ├── cai-dat.md
│   ├── cong-nghe.md
│   ├── cau-truc-thu-muc.md
│   ├── database.md
│   ├── gamification.md
│   ├── gioi-thieu.md
│   ├── known-issues.md
│   ├── live-quiz-frontend-hand-off.md
│   ├── phat-trien.md
│   └── tinh-nang.md
├── blockchain/
│   ├── assets/
│   ├── contracts/
│   │   └── quiz-achievement/
│   │       ├── README.md
│   │       ├── aiken.toml
│   │       ├── plutus.json
│   │       ├── validators/
│   │       │   └── mint_achievement.ak
│   │       └── build/
│   └── src/
│       ├── achievement/
│       ├── cardano/
│       ├── common/
│       └── pinata/
├── postman/
│   └── globals/
│       └── workspace.globals.yaml
├── src/
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   ├── attempts/
│   ├── auth/
│   ├── challenges/
│   ├── common/
│   ├── dashboard/
│   ├── database/
│   ├── leaderboard/
│   ├── quiz-grading/
│   ├── quizzes/
│   ├── reward/
│   ├── seeds/
│   ├── sessions/
│   ├── social/
│   ├── users/
│   └── main.ts
├── test/
│   └── app.e2e-spec.ts
└── .env
```

## Core Implementation

### Authentication

Authentication is implemented with NestJS JWT + Passport.

Relevant files:

- `src/auth/auth.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/jwt.strategy.ts`
- `src/auth/jwt-auth.guard.ts`
- `src/auth/auth.module.ts`

The flow is:

1. User registers or logs in with email and password.
2. `AuthService` checks the `users` table in Supabase.
3. Passwords are hashed with `bcrypt` during registration and compared during login.
4. A JWT payload contains `sub`, `email`, `username`, and `role`.
5. Protected endpoints use `JwtAuthGuard` and `CurrentUser` to resolve the authenticated user.

### Quiz Engine

The quiz engine is implemented in `src/quizzes/quiz.service.ts` and exposed via `src/quizzes/quiz.controller.ts`.

Key behaviors:

- `getPublicQuizzes` supports search, category, difficulty, sorting, and pagination.
- `createQuiz` inserts a quiz and associated questions/answers.
- Questions can store multiple choice, text, and true/false structures with `correct_answer` metadata.
- Quiz detail queries fetch related question data and user creator info.
- Deletion also removes dependent session and question/answer records.

### Attempt and Grading Flow

The grading pipeline is split across:

- `src/attempts/attempts.service.ts`
- `src/quiz-grading/quiz-grading.service.ts`

When a user submits answers:

1. The backend loads the in-progress attempt and its associated questions.
2. It validates selected answer indexes.
3. `QuizGradingService` compares submitted answers to `correct_answer` and computes correctness.
4. The score is saved to the `attempts` table.
5. XP, streaks, and activity logs are updated in the `users` table.
6. If the quiz is configured as NFT-enabled and the score threshold is met, an achievement record is queued in `achievement` as `PENDING`.

The repository uses a threshold of 80% to determine NFT eligibility, enforced in `AttemptsService` and `finishQuiz` in `LeaderboardService`.

### User Progression and Gamification

User progression is powered by:

- `src/users/xp.service.ts`
- `src/users/activity.service.ts`
- `src/users/user.service.ts`
- `src/leaderboard/leaderboard.service.ts`

The code updates:

- `total_xp`
- `level`
- `current_level_xp`
- `next_level_xp`
- `current_streak`
- `best_streak`
- `total_quizzes_played`
- `correct_answers`
- `perfect_scores`
- `total_play_time`

The app also records XP logs and activity feed records in Supabase.

### Live Sessions

Live quiz sessions are implemented in:

- `src/sessions/sessions.service.ts`
- `src/sessions/sessions.controller.ts`
- `src/leaderboard/leaderboard.service.ts`

The session flow allows:

- host creation of a quiz session
- code-based join flow
- status transitions from waiting to playing to finished
- leaderboard updates by session and user
- result aggregation and completion checks

Important note: the live session logic exists, but the code also contains some partial/inconsistent patterns (for example, `finished` detection and session answer update behavior). The repo documents this as an area that is still evolving.

### Challenge System

The challenge system is implemented in `src/challenges/challenge.service.ts` and `src/challenges/challenge.controller.ts`.

It supports:

- challenge creation and lifecycle states (`DRAFT`, `SCHEDULED`, `ACTIVE`, `CLOSED`, `CANCELLED`)
- challenge requirements based on Cardano asset ownership
- reward definitions with tiers and config validation
- public and private challenge queries
- eligibility evaluation against a user wallet
- start-of-challenge check with max-participant logic

This is a backend-driven NFT gating model: users must own specific assets before they can enter or complete a challenge.

## Data Model

```mermaid
erDiagram
    USERS ||--o{ QUIZZES : creates
    USERS ||--o{ ATTEMPTS : submits
    USERS ||--o{ ACHIEVEMENT : owns
    USERS ||--o{ ACTIVITY_LOGS : generates
    USERS ||--o{ USER_XP_LOGS : receives

    QUIZZES ||--o{ QUESTIONS : contains
    QUIZZES ||--o{ ATTEMPTS : receives
    QUIZZES ||--o{ QUIZ_SESSIONS : has

    QUESTIONS ||--o{ ANSWERS : has

    QUIZ_SESSIONS ||--o{ LEADERBOARD : tracks
    QUIZ_SESSIONS ||--o{ SESSION_ANSWERS : records

    REWARD ||--o{ ACHIEVEMENT : is_claimed_for
```

The repository commonly uses the following entities:

- `users`
- `quizzes`
- `questions`
- `answers`
- `attempts`
- `quiz_sessions`
- `leaderboard`
- `session_answers`
- `achievement`
- `reward`
- `activity_logs`
- `user_xp_logs`
- `user_category_stats`

The schema is mostly inferred from code and documentation rather than checked-in migrations, which means the database layer is managed through Supabase and runtime calls rather than committed migration files in this repo.

## Blockchain Design

This repository is not a CKB codebase; the active blockchain implementation is Cardano-based. The relevant code is in `blockchain/src/cardano/cardano.service.ts` and the Aiken contract in `blockchain/contracts/quiz-achievement`.

### Why blockchain is used

The app uses blockchain to make achievement rewards verifiable and portable. A user can complete a qualifying quiz, claim an achievement, and receive a Cardano NFT whose identity and metadata are tied to the reward and the quiz result.

### Cardano implementation

The backend:

- reads wallet addresses from the `users` table
- builds a mint transaction with `Lucid`
- submits the transaction via Blockfrost
- attaches CIP-25 metadata for the NFT
- uses a backend seed phrase and `addSignerKey` to sign the transaction

The main service is `CardanoService`.

It sets up:

- `Lucid` using `Blockfrost` and the configured Cardano network
- a minting policy derived from the Aiken validator
- a policy ID computed with `mintingPolicyToId`
- a transaction that mints exactly one asset for the user

### Aiken validator

The smart contract is located at:

- `blockchain/contracts/quiz-achievement/validators/mint_achievement.ak`

The validator logic enforces:

- the backend public key hash must be in the transaction signatories
- exactly one NFT must be minted
- the asset name must be non-empty
- the mint quantity must be exactly `1`

This is the key policy contract used by `CardanoService` to build the claim transaction.

### On-chain and off-chain data

Off-chain data:

- reward metadata in the `reward` table
- user wallet addresses in `users.wallet_address`
- achievement status and tx metadata in `achievement`
- IPFS metadata uploaded through Pinata

On-chain data:

- minted Cardano asset under the computed policy ID
- asset name derived deterministically from quiz and user identifiers
- CIP-25 metadata including name, image, and description

### Claim flow

The claim flow is implemented in `blockchain/src/achievement/achievement.service.ts`.

It:

1. loads the achievement record and checks it is `PENDING`
2. verifies the user has a wallet address configured
3. loads the reward metadata
4. derives a deterministic asset name using SHA-256 over the quiz and user identifiers
5. builds a mint transaction through `CardanoService`
6. updates the achievement row to `SUCCESS` with `tx_hash`, `policy_id`, `asset_name`, and `ipfs_cid`

This is a clear example of a backend-controlled minting process with app-level validation before on-chain submission.

Status: this flow is present and coherent in code, but there are no deployment scripts or on-chain addresses committed to the repo.

## Getting Started

### Prerequisites

- Node.js and pnpm
- Access to a Supabase project with PostgreSQL enabled
- Cardano Blockfrost project credentials
- Pinata JWT for IPFS upload
- A valid Cardano wallet seed phrase for the backend signer

### Installation

```bash
pnpm install
```

### Environment Variables

The project uses a root `.env` file. A template is provided in `.env.example`.

Required variables discovered in the codebase:

```env
# Supabase runtime
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-jwt-secret-at-least-32-chars
JWT_EXPIRES_IN=7d

# API
PORT=3000

# Supabase/Postgres seed utility
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres

# Seed script options
SEED_CATEGORIES=8
SEED_TAGS=30
SEED_USERS=100
SEED_BADGES=20
SEED_QUIZZES=80
TRUNCATE_BEFORE=false

# Cardano / blockchain
BLOCKFROST_API_URL=https://cardano-preprod.blockfrost.io/api/v0
BLOCKFROST_PROJECT_ID=your-project-id
BACKEND_SEED_PHRASE=your-cardano-seed-phrase

# IPFS / metadata
PINATA_JWT=your-pinata-jwt
```

> Do not commit real keys or wallet secrets. The repository includes a real `.env` file in the workspace, but the README intentionally shows placeholders only.

### Run Development Environment

From `package.json`:

```bash
pnpm run start:dev
```

Production build:

```bash
pnpm run build
pnpm run start:prod
```

Tests:

```bash
pnpm run test
pnpm run test:e2e
```

Seed script:

```bash
pnpm run seed
```

Swagger UI is exposed at:

```text
http://localhost:3000/docs
```

## API

The backend exposes REST endpoints through NestJS with a global prefix of `api` in `src/main.ts`. Swagger is available at `/docs`.

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Users

- `GET /api/users/:id/profile`
- `PATCH /api/users/:id/update`
- `GET /api/users/:id/quizzes`
- `GET /api/users/:id/attempts`
- `GET /api/users/:id/category-stats`
- `GET /api/users/:id/xp-history`
- `GET /api/users/:id/recent-attempts`
- `GET /api/users/:id/badges`
- `GET /api/users/:id/activity`
- `GET /api/users/:id/milestones`
- `GET /api/users/:id/profile/full`

### Quizzes

- `GET /api/quizzes`
- `POST /api/quizzes`
- `GET /api/quizzes/:id`
- `PATCH /api/quizzes/:id`
- `DELETE /api/quizzes/:id`
- `POST /api/quizzes/:id/questions`
- `PUT /api/quizzes/:id/questions/reorder`
- `PATCH /api/quizzes/:id/visibility`

### Attempts and Ranking

- `POST /api/attempts`
- `POST /api/attempts/:id/submit`
- `GET /api/attempts/:id`
- `POST /api/quizzes/:quizId/sessions`
- `GET /api/quizzes/:quizId/sessions`
- `GET /api/sessions/:code/join`
- `PATCH /api/sessions/:id/status`
- `GET /api/sessions/:id/status`
- `POST /api/sessions/:id/submit`
- `POST /api/sessions/:id/finish`
- `GET /api/sessions/:id/leaderboard`

### Rewards and Achievements

- `POST /api/reward`
- `GET /api/:rewardId/ownership`
- `GET /api/achievement/me`
- `POST /api/achievement/claim`
- `GET /api/achievements/health`

### Challenges

- `POST /api/challenges`
- `GET /api/challenges`
- `GET /api/challenges/mine`
- `GET /api/challenges/:challengeId`
- `PATCH /api/challenges/:challengeId`
- `DELETE /api/challenges/:challengeId`
- `POST /api/challenges/:challengeId/publish`
- `POST /api/challenges/:challengeId/cancel`
- `GET /api/challenges/:challengeId/eligibility`
- `POST /api/challenges/:challengeId/start`

## Smart Contract / Script

The repository includes an Aiken validator under `blockchain/contracts/quiz-achievement`.

Contract file:

- `blockchain/contracts/quiz-achievement/validators/mint_achievement.ak`

Key implementation details:

- language: Aiken
- Plutus version: v3
- validator name: `mint_achievement`
- parameters: `backend_pkh: VerificationKeyHash`
- logic: require backend signature + exactly one NFT mint with a non-empty asset name and amount `1`

Build and test commands:

```bash
cd blockchain/contracts/quiz-achievement
aiken build
aiken check
```

The Cardano service references the same backend key hash and computes a policy ID that matches the validator behavior.

## Security Considerations

The implementation shows a few important security considerations:

- JWT auth is used for protected endpoints, but the backend does not appear to provide a full RBAC layer beyond role checks in some modules.
- Supabase service keys are used server-side and are not meant for client exposure.
- User wallet addresses are read from the database and not accepted directly from client DTOs in the main reward flow.
- Duplicate challenge requirements and start attempts are handled via conflict checks and uniqueness detection.
- Minting is protected by backend signature verification in the Aiken validator.
- Private key and wallet seed handling exists in the server environment and should be protected with strong secret management.

The repo does not show a formal production secret rotation or deployment hardening process.

## Testing

The project uses Jest for backend tests and Supertest for e2e coverage.

Commands from `package.json`:

```bash
pnpm run test
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e
```

The repository also includes multiple `*.spec.ts` unit tests under `src/` and `blockchain/src/`, including:

- auth
- attempts
- challenges
- dashboard
- quiz
- reward
- social
- sessions
- Cardano service tests
- achievement service tests

The contract folder also includes Aiken tests in `validators/mint_achievement_test.ak` and can be run with:

```bash
cd blockchain/contracts/quiz-achievement
aiken check
```

## Deployment

Deployment instructions are currently not provided in this repository.

The repo does not contain:

- Dockerfiles
- Kubernetes manifests
- Terraform files
- GitHub Actions deployment workflows
- production environment deployment scripts

> Deployment is currently a manual or external process and is not represented in source control here.

## Roadmap

### Completed

- NestJS backend scaffold and modules
- Supabase integration and JWT auth
- Quiz CRUD and grading
- XP, streaks, and activity system
- Session and leaderboard flow
- Reward and achievement flow
- Cardano API integration via Blockfrost and Lucid
- Aiken validation for single-NFT achievement minting

### In Progress

- Live session finalization and consistency improvements
- Challenge reward verification and eligibility flow
- Contract deployment and environment automation
- Documentation cleanup across legacy and current APIs

### Planned

- Frontend application integration
- Production deployment pipeline
- Contract deployment to a chosen Cardano network
- More complete migration management for Supabase schema
- Additional wallet UX and transaction status monitoring

## Demo

- Live Demo: TBD
- Demo Video: TBD
- CKB Explorer: TBD
- Cardano Explorer: TBD

The repository does not include any deployed URLs or public explorer links.

## CKB Course Relevance

This repository currently demonstrates Cardano/Aiken-based asset minting rather than a CKB implementation. The relevant concepts are still valuable for a blockchain-oriented course because they show:

- backend validation before minting
- asset ownership checks
- NFT metadata handling
- smart contract enforcement of mint rules
- off-chain and on-chain separation

However, this code is not a CKB project. If the course specifically targets CKB, this repo should be treated as a Cardano-based reference implementation rather than a CKB solution.

## Limitations

- There is no separate frontend in this repository.
- Database schema is not committed as migration files; it is managed in Supabase.
- Some code paths appear partially implemented or unfinished, especially around live sessions and finalization logic.
- The project depends on environment secrets such as `SUPABASE_SERVICE_KEY`, `BLOCKFROST_PROJECT_ID`, `BACKEND_SEED_PHRASE`, and `PINATA_JWT`.
- The repo does not include deployment manifests, production configuration, or a controlled contract deployment process.
- The naming and route conventions are mixed across modules, suggesting an evolving codebase rather than a fully finalized API design.

## License

License: UNLICENSED

## Summary

Quizz App is a backend-first quiz platform with gamification and blockchain reward minting. The current implementation is centered on NestJS, Supabase, and Cardano/Aiken. It is a practical example of integrating an application backend with blockchain-based achievement delivery, though it still contains incomplete or evolving areas around deployment, front-end delivery, and some live-session logic.
