import { Pool } from 'pg';
import { faker } from '@faker-js/faker';
import { randomUUID, createHash } from 'crypto';
import 'dotenv/config';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DB_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false, requestCert: false },
});

// ─── Enums (phải khớp với DB) ────────────────────────────────────────────────
// quiz_category enum — giữ GENERAL làm default, thêm các giá trị thật nếu DB có
const QUIZ_CATEGORIES = ['MATH', 'SCIENCE', 'HISTORY', 'GEOGRAPHY', 'LITERATURE', 'TECHNOLOGY', 'SPORTS', 'MUSIC', 'ART', 'GENERAL'] as const;
// difficulty_level enum
const DIFFICULTY_LEVELS = ['EASY', 'MEDIUM', 'HARD'] as const;
// quiz_visibility enum
const QUIZ_VISIBILITIES = ['public', 'private'] as const;
// question type enum — chỉ dùng giá trị mà DB chấp nhận
const QUESTION_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_TEXT'] as const;
// attempt_status enum
const ATTEMPT_STATUSES = ['in_progress', 'submitted'] as const;
// badge rarity — check constraint
const BADGE_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;

type AnyRow = Record<string, unknown>;

const id = () => randomUUID();
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

function generateUnique<T>(used: Set<T>, gen: () => T, maxTries = 10_000): T {
  let v = gen();
  let tries = 0;
  while (used.has(v) && tries++ < maxTries) v = gen();
  used.add(v);
  return v;
}

// ─── bulkInsert ──────────────────────────────────────────────────────────────
// pgArrayCols: tên các column kiểu text[] / uuid[] — cần format {a,b,c}
// Còn lại nếu là object/array → JSON.stringify cho jsonb
const PG_ARRAY_COLS = new Set(['tags']); // text[] columns trong schema

function toPgArray(arr: unknown[]): string {
  // escape từng phần tử: wrap trong double-quotes nếu chứa ký tự đặc biệt
  const escaped = arr.map((v) => {
    const s = String(v ?? '');
    return /[{},"\\\s]/.test(s) ? `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : s;
  });
  return `{${escaped.join(',')}}`;
}

async function bulkInsert(table: string, columns: string[], rows: AnyRow[]) {
  if (!rows.length) return;

  const values: unknown[] = [];
  const tuples = rows.map((r, i) => {
    const start = i * columns.length;
    const ph = columns.map((_, j) => `$${start + j + 1}`).join(', ');
    columns.forEach((c) => {
      let v = r[c];
      if (v !== null && v !== undefined && !(v instanceof Date)) {
        if (PG_ARRAY_COLS.has(c) && Array.isArray(v)) {
          // text[] — PostgreSQL array literal
          v = toPgArray(v);
        } else if (typeof v === 'object') {
          // jsonb — JSON string
          v = JSON.stringify(v);
        }
      }
      values.push(v === undefined ? null : v);
    });
    return `(${ph})`;
  });

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${tuples.join(',\n')} ON CONFLICT DO NOTHING;`;
  await pool.query(sql, values);
}

async function fetchExistingSet(table: string, column: string): Promise<Set<string>> {
  const res = await pool.query(`SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL`);
  return new Set(res.rows.map((r) => String(r[column])));
}

// ─── Generators ──────────────────────────────────────────────────────────────

function genCategories(n: number, existingNames: Set<string>, existingSlugs: Set<string>) {
  const nameUsed = new Set(existingNames);
  const slugUsed = new Set(existingSlugs);
  return Array.from({ length: n }, (_, i) => {
    const name = generateUnique(nameUsed, () => faker.word.words(2).replace(/[^a-zA-Z0-9 ]/g, '').trim() || `Category ${i}`);
    const slug = generateUnique(slugUsed, () => name.toLowerCase().replace(/\s+/g, '-'));
    return { id: id(), name, slug, icon_url: faker.image.url(), color_hex: faker.color.rgb({ format: 'hex' }), created_at: new Date() };
  });
}

function genTags(n: number, existingNames: Set<string>, existingSlugs: Set<string>) {
  const nameUsed = new Set(existingNames);
  const slugUsed = new Set(existingSlugs);
  return Array.from({ length: n }, (_, i) => {
    const name = generateUnique(nameUsed, () => (faker.word.noun() || `tag-${i}`).toLowerCase());
    const slug = generateUnique(slugUsed, () => name.replace(/[^a-z0-9]+/g, '-'));
    return { id: id(), name, slug, created_at: new Date() };
  });
}

function genUsers(n: number, existingEmails: Set<string>, existingUsernames: Set<string>) {
  const emails = new Set(existingEmails);
  const usernames = new Set(existingUsernames);
  return Array.from({ length: n }, () => {
    const email = generateUnique(emails, () => faker.internet.email().toLowerCase());
    const username = generateUnique(usernames, () => faker.internet.username().toLowerCase());
    const total_xp = faker.number.int({ min: 0, max: 5000 });
    const user_level = Math.floor(total_xp / 500) + 1;
    const current_level_xp = total_xp % 500;
    const next_level_xp = 500; // giản dị: mỗi level cần 500 xp
    return {
      id: id(),
      email,
      username,
      password_hash: hash(faker.internet.password({ length: 10 })),
      avatar_url: faker.image.avatar(),
      bio: faker.lorem.sentence(),
      created_at: new Date(),
      updated_at: new Date(),
      total_xp,
      user_level,
      current_level_xp,
      next_level_xp,
    };
  });
}

function genBadges(n: number, existingKeys: Set<string>) {
  const keys = new Set(existingKeys);
  return Array.from({ length: n }, () => {
    const key = generateUnique(keys, () => faker.helpers.slugify(faker.lorem.words(3)).toLowerCase());
    return {
      id: id(),
      key,
      name: faker.lorem.words(2),
      description: faker.lorem.sentence(),
      icon_url: faker.image.url(),
      rarity: pick(BADGE_RARITIES),
      condition_type: pick(['quiz_count', 'score_streak', 'total_xp', 'perfect_score'] as const),
      condition_value: faker.number.int({ min: 1, max: 50 }),
      xp_reward: faker.number.int({ min: 0, max: 500 }),
      is_active: true,
      created_at: new Date(),
    };
  });
}

function genQuizzes(n: number, userIds: string[], categoryIds: string[], tagRows: AnyRow[]) {
  return Array.from({ length: n }, () => {
    const category_id = Math.random() < 0.8 ? pick(categoryIds) : null;

    // quizzes.tags là text[] — lưu slug dưới dạng mảng JS, bulkInsert sẽ JSON.stringify
    // Nhưng text[] trong pg cần format đặc biệt — dùng pg array literal thay vì JSON
    const tagSlugs: string[] = Math.random() < 0.8
      ? faker.helpers.arrayElements(tagRows, faker.number.int({ min: 1, max: 4 })).map((t) => t.slug as string)
      : [];

    return {
      id: id(),
      creator_id: pick(userIds),
      title: faker.lorem.sentence({ min: 3, max: 7 }),
      description: faker.lorem.paragraph(),
      thumbnail_url: faker.image.url(),
      // FIX: dùng enum value thật thay vì hardcode 'GENERAL'
      category: pick(QUIZ_CATEGORIES),
      difficulty: pick(DIFFICULTY_LEVELS),
      // FIX: tags là text[] — cần truyền JS array, pg driver tự convert nếu column type là _text
      tags: tagSlugs,
      visibility: pick(QUIZ_VISIBILITIES),
      play_count: faker.number.int({ min: 0, max: 500 }),
      like_count: faker.number.int({ min: 0, max: 200 }),
      created_at: faker.date.past({ years: 1 }),
      updated_at: new Date(),
      category_id,
    };
  });
}

function genQuestions(quizzes: AnyRow[]) {
  const rows: AnyRow[] = [];
  for (const qz of quizzes) {
    const num = faker.number.int({ min: 3, max: 8 });
    for (let i = 0; i < num; i++) {
      const type = pick(QUESTION_TYPES);

      if (type === 'SINGLE_CHOICE') {
        // 1 đáp án đúng duy nhất
        const count = faker.number.int({ min: 3, max: 5 });
        const options = Array.from({ length: count }, () => faker.lorem.sentence());
        const correctIndex = faker.number.int({ min: 0, max: count - 1 });
        rows.push({
          id: id(), quiz_id: qz.id,
          question_text: faker.lorem.sentence() + '?',
          type, points: faker.number.int({ min: 1, max: 5 }),
          explanation: faker.lorem.sentence(),
          options,
          correct_answer: { index: correctIndex, value: options[correctIndex] },
          order_index: i, created_at: new Date(), updated_at: new Date(),
        });

      } else if (type === 'MULTIPLE_CHOICE') {
        // nhiều đáp án đúng
        const count = faker.number.int({ min: 4, max: 6 });
        const options = Array.from({ length: count }, () => faker.lorem.sentence());
        const correctCount = faker.number.int({ min: 2, max: Math.floor(count / 2) + 1 });
        const correctIndices = faker.helpers.arrayElements(
          Array.from({ length: count }, (_, k) => k), correctCount
        );
        rows.push({
          id: id(), quiz_id: qz.id,
          question_text: faker.lorem.sentence() + '?',
          type, points: faker.number.int({ min: 2, max: 5 }),
          explanation: faker.lorem.sentence(),
          options,
          correct_answer: { indices: correctIndices, values: correctIndices.map((k) => options[k]) },
          order_index: i, created_at: new Date(), updated_at: new Date(),
        });

      } else if (type === 'TRUE_FALSE') {
        const correct = faker.datatype.boolean();
        rows.push({
          id: id(), quiz_id: qz.id,
          question_text: faker.lorem.sentence() + '?',
          type, points: 1,
          explanation: faker.lorem.sentence(),
          options: ['true', 'false'],
          correct_answer: { answer: correct },
          order_index: i, created_at: new Date(), updated_at: new Date(),
        });

      } else if (type === 'FILL_BLANK') {
        // câu hỏi điền vào chỗ trống — options rỗng, correct_answer là string
        rows.push({
          id: id(), quiz_id: qz.id,
          question_text: `${faker.lorem.words(3)} ___ ${faker.lorem.words(3)}?`,
          type, points: faker.number.int({ min: 1, max: 3 }),
          explanation: faker.lorem.sentence(),
          options: [],
          correct_answer: { answer: faker.lorem.word() },
          order_index: i, created_at: new Date(), updated_at: new Date(),
        });

      } else {
        // SHORT_TEXT — câu trả lời ngắn tự do
        rows.push({
          id: id(), quiz_id: qz.id,
          question_text: faker.lorem.sentence() + '?',
          type, points: faker.number.int({ min: 1, max: 5 }),
          explanation: faker.lorem.sentence(),
          options: [],
          correct_answer: { answer: faker.lorem.words(faker.number.int({ min: 1, max: 4 })) },
          order_index: i, created_at: new Date(), updated_at: new Date(),
        });
      }
    }
  }
  return rows;
}

function genQuizTags(quizzes: AnyRow[], tags: AnyRow[]) {
  const seen = new Set<string>();
  const rows: AnyRow[] = [];
  for (const q of quizzes) {
    const picked = faker.helpers.arrayElements(tags, faker.number.int({ min: 0, max: Math.min(4, tags.length) }));
    for (const t of picked) {
      const key = `${q.id}|${t.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ quiz_id: q.id, tag_id: t.id });
    }
  }
  return rows;
}

function genAttempts(quizzes: AnyRow[], users: AnyRow[]) {
  const rows: AnyRow[] = [];
  for (const q of quizzes) {
    const count = faker.number.int({ min: 0, max: 5 });
    for (let i = 0; i < count; i++) {
      const status = pick(ATTEMPT_STATUSES);
      const submitted_at = status === 'submitted' ? faker.date.recent({ days: 30 }) : null;
      // FIX: answers là jsonb array — truyền JS array, bulkInsert stringify
      rows.push({
        id: id(),
        user_id: pick(users).id,
        quiz_id: q.id,
        answers: [], // sẽ được stringify thành '[]'
        score: status === 'submitted' ? faker.number.float({ min: 0, max: 100, fractionDigits: 2 }) : 0,
        total_points: status === 'submitted' ? faker.number.int({ min: 0, max: 50 }) : 0,
        status,
        started_at: faker.date.recent({ days: 60 }),
        submitted_at,
      });
    }
  }
  return rows;
}

function genComments(quizzes: AnyRow[], users: AnyRow[]) {
  const rows: AnyRow[] = [];
  for (const q of quizzes) {
    const count = faker.number.int({ min: 0, max: 5 });
    for (let i = 0; i < count; i++) {
      // FIX: content check constraint: 1–1000 chars
      const content = faker.lorem.sentence().slice(0, 1000) || 'Nice quiz!';
      rows.push({
        id: id(),
        user_id: pick(users).id,
        quiz_id: q.id,
        content,
        created_at: faker.date.past({ years: 1 }),
        updated_at: new Date(),
      });
    }
  }
  return rows;
}

function genLikes(quizzes: AnyRow[], users: AnyRow[]) {
  const rows: AnyRow[] = [];
  // FIX: likes có thể bị duplicate (user_id, quiz_id) nếu DB có unique constraint
  const seen = new Set<string>();
  for (const q of quizzes) {
    const picked = faker.helpers.arrayElements(users, faker.number.int({ min: 0, max: Math.min(10, users.length) }));
    for (const u of picked) {
      const key = `${u.id}|${q.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ id: id(), user_id: u.id, quiz_id: q.id, created_at: faker.date.past({ years: 1 }) });
    }
  }
  return rows;
}

function genBookmarks(quizzes: AnyRow[], users: AnyRow[]) {
  const rows: AnyRow[] = [];
  // FIX: dedup tương tự likes
  const seen = new Set<string>();
  for (const q of quizzes) {
    if (Math.random() < 0.2) continue;
    const picked = faker.helpers.arrayElements(users, faker.number.int({ min: 0, max: Math.min(5, users.length) }));
    for (const u of picked) {
      const key = `${u.id}|${q.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ id: id(), user_id: u.id, quiz_id: q.id, created_at: faker.date.past({ years: 1 }) });
    }
  }
  return rows;
}

function genUserBadges(users: AnyRow[], badges: AnyRow[]) {
  const rows: AnyRow[] = [];
  // FIX: dedup (user_id, badge_id) để tránh lỗi nếu DB có unique constraint
  const seen = new Set<string>();
  for (const u of users) {
    const count = faker.number.int({ min: 0, max: 3 });
    const picked = faker.helpers.arrayElements(badges, count);
    for (const b of picked) {
      const key = `${u.id}|${b.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ id: id(), user_id: u.id, badge_id: b.id, earned_at: faker.date.past({ years: 1 }) });
    }
  }
  return rows;
}

function genUserCategoryStats(users: AnyRow[], categories: AnyRow[]) {
  // FIX: primary key (user_id, category_id) — dedup bắt buộc
  const seen = new Set<string>();
  const rows: AnyRow[] = [];
  for (const u of users) {
    // Mỗi user có stats ở 1–3 category ngẫu nhiên
    const count = faker.number.int({ min: 1, max: Math.min(3, categories.length) });
    const picked = faker.helpers.arrayElements(categories, count);
    for (const c of picked) {
      const key = `${u.id}|${c.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const total_attempts = faker.number.int({ min: 0, max: 20 });
      const total_questions = total_attempts * faker.number.int({ min: 3, max: 8 });
      const correct_answers = faker.number.int({ min: 0, max: total_questions });
      rows.push({
        user_id: u.id,
        category_id: c.id,
        total_attempts,
        correct_answers,
        total_questions,
        total_xp_earned: faker.number.int({ min: 0, max: 1000 }),
        last_played_at: total_attempts > 0 ? faker.date.recent({ days: 60 }) : null,
      });
    }
  }
  return rows;
}

function genUserXpLogs(users: AnyRow[], quizzes: AnyRow[], badges: AnyRow[]) {
  const rows: AnyRow[] = [];
  const sourceTypes = ['quiz_attempt', 'badge_earned', 'daily_bonus'] as const;
  for (const u of users) {
    const count = faker.number.int({ min: 0, max: 5 });
    for (let i = 0; i < count; i++) {
      const source_type = pick(sourceTypes);
      let source_id: string | null = null;
      if (source_type === 'quiz_attempt') source_id = pick(quizzes).id as string;
      else if (source_type === 'badge_earned') source_id = pick(badges).id as string;
      rows.push({
        id: id(),
        user_id: u.id,
        xp_amount: faker.number.int({ min: 5, max: 500 }),
        source_type,
        source_id,
        earned_at: faker.date.past({ years: 1 }),
      });
    }
  }
  return rows;
}

function genActivityLogs(users: AnyRow[], quizzes: AnyRow[]) {
  const rows: AnyRow[] = [];
  const types = ['login', 'quiz_created', 'quiz_played', 'badge_earned', 'level_up'] as const;
  for (const u of users) {
    const count = faker.number.int({ min: 0, max: 4 });
    for (let i = 0; i < count; i++) {
      const type = pick(types);
      // FIX: metadata là jsonb — truyền object thật thay vì {}
      const metadata: Record<string, unknown> = {};
      if (type === 'quiz_played') metadata.quiz_id = pick(quizzes).id;
      if (type === 'level_up') metadata.new_level = faker.number.int({ min: 2, max: 10 });
      rows.push({
        id: id(),
        user_id: u.id,
        type,
        metadata, // sẽ được stringify bởi bulkInsert
        created_at: faker.date.past({ years: 1 }),
      });
    }
  }
  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Starting seed...');

  const counts = {
    categories: Number(process.env.SEED_CATEGORIES) || 8,
    tags:       Number(process.env.SEED_TAGS)       || 30,
    users:      Number(process.env.SEED_USERS)      || 100,
    badges:     Number(process.env.SEED_BADGES)     || 20,
    quizzes:    Number(process.env.SEED_QUIZZES)    || 80,
  };

  try {
    await pool.connect();
    const issues: string[] = [];

    if (String(process.env.TRUNCATE_BEFORE).toLowerCase() === 'true') {
      const order = [
        'public.questions',  'public.quiz_tags',     'public.attempts',
        'public.comments',   'public.likes',          'public.bookmarks',
        'public.user_badges','public.user_category_stats','public.user_xp_logs',
        'public.activity_logs','public.quizzes',      'public.tags',
        'public.badges',     'public.categories',     'public.users',
      ];
      console.log('Truncating tables…');
      await pool.query(`TRUNCATE TABLE ${order.join(', ')} RESTART IDENTITY CASCADE`);
    }

    // Fetch existing unique values
    const [existCatNames, existCatSlugs, existTagNames, existTagSlugs, existEmails, existUsernames, existBadgeKeys] = await Promise.all([
      fetchExistingSet('public.categories', 'name'),
      fetchExistingSet('public.categories', 'slug'),
      fetchExistingSet('public.tags', 'name'),
      fetchExistingSet('public.tags', 'slug'),
      fetchExistingSet('public.users', 'email'),
      fetchExistingSet('public.users', 'username'),
      fetchExistingSet('public.badges', 'key'),
    ]);

    const categories = genCategories(counts.categories, existCatNames, existCatSlugs);
    await bulkInsert('public.categories', ['id', 'name', 'slug', 'icon_url', 'color_hex', 'created_at'], categories);
    console.log(`✓ categories: ${categories.length}`);

    const tags = genTags(counts.tags, existTagNames, existTagSlugs);
    await bulkInsert('public.tags', ['id', 'name', 'slug', 'created_at'], tags);
    console.log(`✓ tags: ${tags.length}`);

    const users = genUsers(counts.users, existEmails, existUsernames);
    await bulkInsert('public.users', [
      'id', 'email', 'username', 'password_hash', 'avatar_url', 'bio',
      'created_at', 'updated_at', 'total_xp', 'user_level', 'current_level_xp', 'next_level_xp',
    ], users);
    console.log(`✓ users: ${users.length}`);

    const badges = genBadges(counts.badges, existBadgeKeys);
    await bulkInsert('public.badges', [
      'id', 'key', 'name', 'description', 'icon_url', 'rarity',
      'condition_type', 'condition_value', 'xp_reward', 'is_active', 'created_at',
    ], badges);
    console.log(`✓ badges: ${badges.length}`);

    const quizzes = genQuizzes(counts.quizzes, users.map((u) => u.id as string), categories.map((c) => c.id as string), tags);
    await bulkInsert('public.quizzes', [
      'id', 'creator_id', 'title', 'description', 'thumbnail_url',
      'category', 'difficulty', 'tags', 'visibility',
      'play_count', 'like_count', 'created_at', 'updated_at', 'category_id',
    ], quizzes);
    console.log(`✓ quizzes: ${quizzes.length}`);

    const questions = genQuestions(quizzes);
    await bulkInsert('public.questions', [
      'id', 'quiz_id', 'question_text', 'type', 'points', 'explanation',
      'options', 'correct_answer', 'order_index', 'created_at', 'updated_at',
    ], questions);
    console.log(`✓ questions: ${questions.length}`);

    const quizTags = genQuizTags(quizzes, tags);
    await bulkInsert('public.quiz_tags', ['quiz_id', 'tag_id'], quizTags);
    console.log(`✓ quiz_tags: ${quizTags.length}`);

    const attempts = genAttempts(quizzes, users);
    await bulkInsert('public.attempts', [
      'id', 'user_id', 'quiz_id', 'answers', 'score', 'total_points',
      'status', 'started_at', 'submitted_at',
    ], attempts);
    console.log(`✓ attempts: ${attempts.length}`);

    const comments = genComments(quizzes, users);
    await bulkInsert('public.comments', ['id', 'user_id', 'quiz_id', 'content', 'created_at', 'updated_at'], comments);
    console.log(`✓ comments: ${comments.length}`);

    const likes = genLikes(quizzes, users);
    await bulkInsert('public.likes', ['id', 'user_id', 'quiz_id', 'created_at'], likes);
    console.log(`✓ likes: ${likes.length}`);

    const bookmarks = genBookmarks(quizzes, users);
    await bulkInsert('public.bookmarks', ['id', 'user_id', 'quiz_id', 'created_at'], bookmarks);
    console.log(`✓ bookmarks: ${bookmarks.length}`);

    const userBadges = genUserBadges(users, badges);
    await bulkInsert('public.user_badges', ['id', 'user_id', 'badge_id', 'earned_at'], userBadges);
    console.log(`✓ user_badges: ${userBadges.length}`);

    const userCategoryStats = genUserCategoryStats(users, categories);
    await bulkInsert('public.user_category_stats', [
      'user_id', 'category_id', 'total_attempts', 'correct_answers',
      'total_questions', 'total_xp_earned', 'last_played_at',
    ], userCategoryStats);
    console.log(`✓ user_category_stats: ${userCategoryStats.length}`);

    const xpLogs = genUserXpLogs(users, quizzes, badges);
    await bulkInsert('public.user_xp_logs', ['id', 'user_id', 'xp_amount', 'source_type', 'source_id', 'earned_at'], xpLogs);
    console.log(`✓ user_xp_logs: ${xpLogs.length}`);

    const activities = genActivityLogs(users, quizzes);
    await bulkInsert('public.activity_logs', ['id', 'user_id', 'type', 'metadata', 'created_at'], activities);
    console.log(`✓ activity_logs: ${activities.length}`);

    console.log('\nSeeding complete.');
    if (issues.length) {
      console.warn('Issues:');
      issues.forEach((p) => console.warn('  -', p));
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();