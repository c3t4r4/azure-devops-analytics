# Azure DevOps Dashboard

> **Português:** [README.br.md](README.br.md)

Dashboard to monitor organizations, projects, pipelines, work items, and repositories in Azure DevOps. Includes JWT authentication, light/dark theme, and Redis cache for better performance.

## Stack

- **Backend**: .NET 10, ASP.NET Core, Entity Framework Core, Clean Architecture
- **Frontend**: Angular 21, Tailwind CSS, components inspired by shadcn/ui
- **Database**: PostgreSQL 17
- **Cache**: Redis 7
- **Containers**: Docker + Docker Compose

## Prerequisites

- Docker and Docker Compose
- Node.js 24+ (for local frontend development)
- .NET SDK 10+ (for local backend development)

## How to run locally

### Option A – Docker Compose (recommended)

All services start with hot reload (backend and frontend).

```bash
cd DashboardDevopsAzure
docker compose -f docker-compose.dev.yml up --build
```

Access:

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:5000
- **Swagger**: http://localhost:5000/swagger

### Option B – Without Docker (backend and frontend on host)

1. Start only Postgres and Redis:

```bash
cd DashboardDevopsAzure
docker compose -f docker-compose.dev.yml up postgres redis -d
```

2. Backend (from repository root):

```bash
dotnet watch run --project backend/src/DashboardDevops.Api
```

3. Frontend (in another terminal):

```bash
cd frontend
npm install
ng serve --proxy-config proxy.conf.json
```

The frontend uses `proxy.conf.json` to forward API calls to the running backend.

## How to deploy (production)

1. Copy the example env file and adjust for production:

```bash
cp .env.example .env
```

Edit `.env` and set secure values for:

- `POSTGRES_PASSWORD`
- `JWT__KEY` (e.g. `openssl rand -base64 64`)
- `AUTH__DEFAULTPASSWORD`
- `ENCRYPTION__KEY` (e.g. `openssl rand -base64 32`) to encrypt PATs in the database

2. Start services in production mode:

```bash
docker compose up --build -d
```

- Frontend: port **80**
- Backend: port **5000**

## Tests

**Backend (.NET):**

```bash
cd backend
dotnet test DashboardDevops.sln
```

**Frontend (Angular/Vitest):**

```bash
cd frontend
npm test
```

Or from root: `cd backend && dotnet test DashboardDevops.sln` and `cd frontend && npm test`.

## Lint

Single script that runs backend and frontend lint (from repository root):

```bash
chmod +x scripts/lint.sh   # only the first time
./scripts/lint.sh
```

- **.NET**: `dotnet format` with `--verify-no-changes` in the backend.
- **Angular**: `ng lint` (ESLint + Angular ESLint).

To run only one:

```bash
dotnet format backend/DashboardDevops.sln --verify-no-changes
cd frontend && npm run lint
```

## Login

The dashboard requires authentication. On first run, an **admin** user is created automatically.

- **Username**: `admin@configuracao.com.br`
- **Password**: `admin123` (or the value of `AUTH__DEFAULTPASSWORD` in `.env`)

Configure `JWT__KEY` and `AUTH__DEFAULTPASSWORD` in `.env` for production.

## Light/Dark theme

Use the sun/moon icon in the top-right corner or on the login screen to switch between light and dark theme. The preference is saved in the browser.

## Azure DevOps configuration

1. Log in and go to `http://localhost:4200/organizations`
2. Click **New Organization**
3. Fill in:
   - **Name**: your organization name (e.g. `my-company`)
   - **URL**: `https://dev.azure.com/my-company`
   - **PAT Token**: Personal Access Token with read permissions for:
     - Work Items (Read)
     - Code (Read)
     - Build (Read)
     - Release (Read)

### Creating a PAT token in Azure DevOps

1. Go to `https://dev.azure.com/{your-org}/_usersettings/tokens`
2. Click **New Token**
3. Set the required permissions (read for Work Items, Code, Build, Release)
4. Copy the generated token

## Features

| Screen            | Description                                          |
| ----------------- | ---------------------------------------------------- |
| **Dashboard**     | Summary of all organizations with totals and status  |
| **Organizations** | Manage Azure DevOps connections (CRUD with PAT)      |
| **Projects**      | Grid of all projects with search and filters         |
| **Pipelines**     | Real-time build/release status (30s polling)         |
| **Work Items**    | Active items with filters by type, state, and search |
| **Repositories**  | Git repos with default branch and external links     |

## API endpoints

```
POST   /api/auth/login                                          Login (body: { username, password })
GET    /api/organizations                                       List organizations (requires auth)
POST   /api/organizations                                       Add organization
PUT    /api/organizations/{id}                                  Update organization
DELETE /api/organizations/{id}                                  Remove organization
GET    /api/organizations/{org}/projects                        List projects
GET    /api/organizations/{org}/projects/{proj}/pipelines       List pipelines
GET    /api/organizations/{org}/projects/{proj}/work-items      List work items
GET    /api/organizations/{org}/projects/{proj}/repositories   List repositories
GET    /api/dashboard/summary                                   Aggregated summary
GET    /health                                                  Health check
GET    /swagger                                                 API documentation
```

## Redis cache

| Resource     | TTL    |
| ------------ | ------ |
| Projects     | 5 min  |
| Pipelines    | 30 sec |
| Work Items   | 2 min  |
| Repositories | 5 min  |

## Security: passwords and data encryption

### User passwords

- Passwords are **never stored in plain text** in the database.
- The backend uses **Argon2id** (via `Argon2Sharp`) with:
  - **Memory**: 64 MB (`WithMemorySizeKB(65536)`)
  - **Iterations**: 3 (`WithIterations(3)`)
  - **Parallelism**: 4 (`WithParallelism(4)`)
  - **Random salt** per hash (`WithRandomSalt()`).
- The hash is stored in **PHC** format (prefixed with `$argon2`), including all parameters needed for verification.
- For compatibility with legacy data, if the hash does not start with `$argon2`, verification falls back to **BCrypt** (legacy mode).

In short: each password is derived with Argon2id (memory-hard, resistant to GPU/ASIC brute-force), and the database stores only the resulting hash, never the original password.

### Organization data in the database (PAT/URL)

Sensitive organization data (especially the **PAT Token** and organization **URL**) is encrypted at rest in the organizations table:

- Encryption service: `AesEncryptionService`.
- Algorithm: **AES-GCM** (authenticated mode) with:
  - **256-bit** key (`KeySize = 32` bytes).
  - **Nonce**: random 12 bytes per record.
  - **Authentication tag**: 16 bytes.
- Stored value format:
  - Prefixed with `ENC:` followed by **Base64** of `nonce + ciphertext + tag`.
- The key is derived from the **`ENCRYPTION__KEY`** environment variable:
  - Expects a Base64 value. If the key material is shorter than 32 bytes, **SHA-256** is applied to obtain 32 bytes.
  - If the value is not valid Base64, **SHA-256 of the UTF-8 string** is used and the result (32 bytes) becomes the key.
- If **`ENCRYPTION__KEY`** is **not set**, the service logs a warning and **does not encrypt** (reads/writes plain text). In production, this key **must** be set.

Flow in the repository layer (`OrganizationRepository`):

- Before write (`AddAsync`/`UpdateAsync`):
  - `PatToken` and `Url` go through `EncryptIfNeeded`, which:
    - Detects if the value is already prefixed with `ENC:` (migration / legacy data).
    - If so, **decrypts** first, then **re-encrypts** (normalization).
    - Otherwise, encrypts the plain value with the current key.
- On read (`GetAllAsync`, `GetByIdAsync`, `GetByNameAsync`):
  - `PatToken` and `Url` are always passed through `Decrypt`, returning plain text to the rest of the application.

Thus, the database never stores the PAT or URL in plain text when `ENCRYPTION__KEY` is set.

### Organization data in Redis cache

- Redis cache is used for **aggregated dashboard data** (summary, timeline, today’s updates, etc.), not for storing PATs.
- The cache service (`RedisCacheService`) serializes objects as **JSON** with `System.Text.Json` and writes with `StringSetAsync`, respecting the TTLs in the table above.
- Cached data includes projections such as:
  - `DashboardSummary` (totals for orgs, pipelines, projects, etc.).
  - `TimelineResponse` (project/sprint timeline).
  - `TodayUpdatesResponse` (items updated today).
- These objects **do not include the PAT token**, only operational/analytical information that is already **decrypted** from the domain layer.
- If cache read/write fails, the application falls back to fetching data directly from Azure DevOps / database.

In production, Redis data protection depends on:

- Not exposing the Redis instance publicly.
- Redis authentication/ACL.
- Private network/VNet between services.

So: **secrets** (PAT) are protected in the database via AES-GCM, while Redis holds only read-only projections without PAT.

## Project structure

```
DashboardDevopsAzure/
├── docker-compose.yml          # Production
├── docker-compose.dev.yml      # Development (hot reload)
├── .env.example
├── README.md                   # Portuguese
├── README.en.md                # English
├── scripts/
│   └── lint.sh                 # .NET + Angular lint
├── backend/
│   ├── DashboardDevops.sln     # .NET solution
│   ├── src/
│   │   ├── DashboardDevops.Api/          # Controllers, Program.cs, Swagger
│   │   ├── DashboardDevops.Application/  # Services, DTOs
│   │   ├── DashboardDevops.Domain/       # Entities, Interfaces, Models
│   │   └── DashboardDevops.Infrastructure/ # EF Core, Redis, Azure DevOps client
│   └── tests/
│       └── DashboardDevops.Tests/        # Unit tests (xUnit)
└── frontend/
    └── src/app/
        ├── core/               # Services, Models, Interceptors
        ├── features/           # Dashboard, Organizations, Projects, Pipelines, etc.
        └── shared/             # UI components, layout
```
