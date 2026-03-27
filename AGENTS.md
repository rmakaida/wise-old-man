# AGENTS.md — Project Guide for AI Agents

## Environment

- **OS**: Windows 11 Pro
- **Shell used by agent tools**: bash (Git Bash / WSL-compatible paths)
- **Working directory**: `c:\Dz\wise-old-man` (use forward slashes in commands: `c:/Dz/wise-old-man`)
- **Node.js**: >=16.14.0 required
- **npm**: >=8.3.1 required
- **Docker Desktop** must be running before starting dev server or tests

---

## Repository Structure

This is a monorepo with three independent packages — each has its own `package.json` and must be set up separately:

```
wise-old-man/
├── server/       # Node.js/Express backend (TypeScript, Prisma, BullMQ)
├── app/          # Next.js 14 frontend (React 18, TanStack Query, Tailwind)
├── client-js/    # Published JS/TS client library (@wise-old-man/utils)
└── docs/         # API documentation
```

There is no root-level `npm install` — install dependencies in each package individually.

---

## Server (Backend)

### Setup

```bash
cd server
cp .env.example .env   # fill in values if needed (defaults work for local dev)
npm install
```

`.env` defaults (already in `.env.example`):
- DB: `postgresql://postgres:postgres@localhost:5432/wise-old-man_LOCAL`
- Redis: `localhost:6379`, password `redis`

### Running (dev)

Requires Docker running. This command starts Docker containers (Postgres + Redis), runs Prisma migrations, then starts the dev server with hot-reload:

```bash
cd server
npm run dev
```

The script `scripts/run-dev.sh` does:
1. `docker-compose up --build -d` (starts Postgres on 5432, Redis on 6379, PGAdmin on 54321)
2. `prisma migrate dev`
3. `ts-node-dev --poll --exit-child --respawn --transpile-only src/entrypoints/dev.server.ts`

### Building

```bash
cd server
npm run build   # rm -rf dist/, prisma generate, tsc
```

### Prisma

```bash
cd server
npx prisma generate          # regenerate client after schema changes
npx prisma migrate dev       # apply migrations (dev DB)
npx prisma migrate reset     # reset dev DB (destroys data)
npx prisma studio            # visual DB browser at localhost:5555
```

After any change to `prisma/schema.prisma`, always run `npx prisma generate`.

---

## App (Frontend)

### Setup & Running

```bash
cd app
npm install
npm run dev   # Next.js dev server, default port 3000
```

Build for production:

```bash
npm run build
npm run start
```

---

## Client-JS Library

```bash
cd client-js
npm install
npm run build   # runs rollup + tsc; requires server prisma generate first
```

> `prebuild` automatically runs `cd ../server && npm run prisma:generate`.

---

## Testing (Server only)

All tests live in `server/__tests__/`.

### Prerequisites

Docker must be running. Tests use a separate test database:
`postgresql://postgres:postgres@localhost:5432/wise-old-man_TEST`

### Running tests

```bash
cd server

# Run ALL tests (starts Docker, resets test DB, runs everything)
npm test

# Run a single test file by name (without extension)
npm test -- players          # runs __tests__/suites/integration/players.test.ts
npm test -- players i        # force integration suite
npm test -- experience u     # force unit suite

# CI mode (skips docker setup, assumes DB is ready)
npm test -- ci
```

The script `scripts/run-tests.sh`:
- Sets `NODE_ENV=test`, `TZ=UTC`
- Runs `prisma migrate reset --force` on test DB before each run
- Uses `jest --verbose --runInBand` (sequential execution, important for DB isolation)

### Test structure

```
server/__tests__/
├── suites/
│   ├── integration/   # HTTP-level tests using supertest
│   └── unit/          # Pure logic tests (no DB/HTTP)
├── data/hiscores/     # Mock hiscores JSON files
└── utils.ts           # resetDatabase(), registerHiscoresMock(), readFile(), etc.
```

### Writing tests

Follow the pattern in `__tests__/suites/integration/players.test.ts`:

```typescript
import supertest from 'supertest';
import APIInstance from '../../../src/api';
import { resetDatabase } from '../../utils';

const api = supertest(new APIInstance().init().express);

beforeAll(async () => { await resetDatabase(); });
afterAll(async () => { /* cleanup redis/prisma if needed */ });

describe('Goals API', () => {
  it('POST /players/:username/goals - creates goal', async () => {
    const res = await api.post('/players/testplayer/goals').send({ ... });
    expect(res.status).toBe(201);
  });
});
```

- Use `axios-mock-adapter` to mock Jagex Hiscores responses
- Spy on event handlers with `jest.spyOn(..., 'handler')`
- Call `jest.resetAllMocks()` in `beforeEach`
- Use `resetDatabase()` from `utils.ts` to clear DB state between tests

---

## Coding Guidelines

### General

- **TypeScript strict mode** — no `any` unless unavoidable
- **Zod** for all input validation at route boundaries
- **`@attio/fetchable`** (`AsyncResult`, `complete`, `errored`, `isErrored`) for typed error handling in services — do not throw exceptions from services, return `errored(...)` instead
- **Prisma** for all DB access — no raw SQL unless using `prisma.$queryRaw` for complex aggregations
- `BigInt` for XP/kill count values (can exceed `Number.MAX_SAFE_INTEGER`); serialize as `string` in JSON responses

### API Module Pattern

Each new module goes in `server/src/api/modules/{name}/` with:

```
{name}.router.ts    # Express router: route definitions + Zod validation
{name}.utils.ts     # Pure helper functions
services/
  CreateXService.ts
  FetchXService.ts
  ...
```

Register the router in the main API entry (follow how existing modules are registered).

### Services

- One file per service, named `VerbNounService.ts`
- Export a single async function (not a class)
- Return `AsyncResult<SuccessType, ErrorType>` from `@attio/fetchable`
- Import `prisma` from `../../../../prisma` (singleton)

### Jobs

Jobs live in `server/src/jobs/handlers/`. File naming: `verb-noun.job.ts`.

1. Create handler implementing `JobHandler<PayloadType>`
2. Add `JobType` enum entry in `src/jobs/index.ts` (or wherever the enum is defined)
3. Register in `src/jobs/jobs.config.ts` with handler and optional cron schedule

### Events

Events live in `server/src/api/events/`. To add a new event:
1. Add event type to `EventType` enum
2. Create handler in `events/handlers/your-event.event.ts`
3. Register in the events index

### Discord Notifications

- Add new event type to `DiscordBotEventType` enum in `src/services/discord.service.ts`
- Add payload type to `DiscordBotEventPayloadMap`
- Create a new job handler in `src/jobs/handlers/dispatch-*-discord-event.job.ts`
- Trigger via `jobManager.add({ type: JobType.DISPATCH_..., payload: ... })`

### Frontend (App)

- Pages use **Next.js App Router** (`app/src/app/`)
- Prefer **Server Components** for data fetching; use client components only when interactivity is needed
- Data fetching: TanStack Query for client-side, direct service calls for server components
- UI: Radix UI primitives + Tailwind CSS; follow existing component patterns in `app/src/components/`
- Charts: `recharts` (already a dependency)
- API calls go through `app/src/services/wiseoldman.ts` — add new methods there

### Naming conventions

| Thing | Convention |
|---|---|
| Files | `camelCase.ts` for modules, `PascalCase.ts` for services/classes/components |
| DB models | `PascalCase` in Prisma schema |
| Job types | `SCREAMING_SNAKE_CASE` |
| API routes | `/kebab-case/:param` |
| React components | `PascalCase` |
| Hooks | `useCamelCase` |

---

## Documentation

- API endpoint docs live in `docs/`
- When adding a new endpoint, document request body, response shape, and error cases
- No JSDoc comments needed on internal service functions — keep code self-documenting through types and naming
- Add comments only where business logic is non-obvious (e.g., OSRS-specific XP thresholds)

---

## Common Pitfalls

- **BigInt in JSON**: `JSON.stringify` does not handle `BigInt` — convert to `string` or `Number` before sending in responses
- **Prisma after schema change**: always run `npx prisma generate` from `server/` before running or building
- **Tests are sequential** (`--runInBand`) — do not rely on test parallelism
- **Windows paths**: agent tools use bash; always use forward slashes (`c:/Dz/...`) not backslashes
- **Docker required**: dev server and integration tests both need Docker Desktop running
- **Test DB is separate**: test DB name ends in `_TEST`, dev DB ends in `_LOCAL` — never mix them
