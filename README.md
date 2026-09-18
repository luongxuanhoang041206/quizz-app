# Quizz App

Backend-first quiz platform built with NestJS and Supabase, with gamification, live sessions, leaderboards, and blockchain-backed achievement rewards.

## What this project does

- Create and manage quizzes
- Track quiz attempts and scoring
- Reward users with XP, streaks, and profile stats
- Support live quiz sessions and leaderboard ranking
- Issue achievement rewards as Cardano NFTs

## Tech stack

- NestJS + TypeScript
- Supabase PostgreSQL
- JWT authentication
- Cardano + Lucid + Blockfrost
- Aiken smart contract
- Pinata IPFS
- Jest for testing

## Architecture

- API layer: NestJS modules for auth, users, quizzes, attempts, sessions, reward, and challenges
- Database: Supabase
- Blockchain: Cardano integration for achievement minting
- Smart contract: Aiken validator for authorized NFT minting

## Phân tích cấu trúc

- `src/` chứa toàn bộ backend API, chia theo module rõ ràng: auth, quiz, attempt, session, user, reward, challenge, dashboard.
- `blockchain/` chứa logic mint NFT, metadata, và contract Cardano/Aiken.
- `docs/` lưu hướng dẫn, tài liệu kiến trúc, và ghi chú phát triển.
- `test/` dùng cho kiểm thử e2e và các tác vụ validation.

## Key flows

1. User creates or joins a quiz
2. Backend stores quiz data and attempts in Supabase
3. Answers are graded and score/XP are updated
4. Eligible users can claim achievement rewards
5. Reward system mints a Cardano NFT via backend-managed transaction flow

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm run start:dev
```

## Main modules

- `src/auth`
- `src/quizzes`
- `src/attempts`
- `src/sessions`
- `src/leaderboard`
- `src/reward`
- `src/challenges`
- `src/dashboard`
- `blockchain/src`
- `blockchain/contracts/quiz-achievement`

## Notes

- This repo is backend-focused; there is no separate frontend app here.
- The blockchain reward flow is implemented for Cardano achievement NFTs.
- The project is designed as a full-stack backend prototype with real reward logic and validation.

## License

UNLICENSED
