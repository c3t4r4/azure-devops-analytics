# Azure DevOps Dashboard

> **English:** [README.md](README.md)

Dashboard para monitorar organizações, projetos, pipelines, work items e repositórios no Azure DevOps. Inclui autenticação JWT, tema claro/escuro e cache em Redis para melhor performance.

## Stack

- **Backend**: .NET 10, ASP.NET Core, Entity Framework Core, Clean Architecture
- **Frontend**: Angular 21, Tailwind CSS, componentes inspirados em shadcn/ui
- **Banco de Dados**: PostgreSQL 17
- **Cache**: Redis 7
- **Containers**: Docker + Docker Compose

## Pré-requisitos

- Docker e Docker Compose
- Node.js 24+ (para desenvolvimento local do frontend)
- .NET SDK 10+ (para desenvolvimento local do backend)

## Como rodar localmente

### Opção A – Docker Compose (recomendado)

Todos os serviços sobem com hot reload (backend e frontend).

```bash
cd DashboardDevopsAzure
docker compose -f docker-compose.dev.yml up --build
```

Acesse:

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:5000
- **Swagger**: http://localhost:5000/swagger

### Opção B – Sem Docker (backend e frontend na máquina)

1. Suba apenas Postgres e Redis:

```bash
cd DashboardDevopsAzure
docker compose -f docker-compose.dev.yml up postgres redis -d
```

2. Backend (na raiz do repositório):

```bash
dotnet watch run --project backend/src/DashboardDevops.Api
```

3. Frontend (em outro terminal):

```bash
cd frontend
npm install
ng serve --proxy-config proxy.conf.json
```

O frontend usa `proxy.conf.json` para redirecionar chamadas à API para o backend em execução.

## Como publicar (produção)

1. Copie o exemplo de variáveis e ajuste para produção:

```bash
cp .env.example .env
```

Edite `.env` e defina valores seguros para:

- `POSTGRES_PASSWORD`
- `JWT__KEY` (ex.: `openssl rand -base64 64`)
- `AUTH__DEFAULTPASSWORD`
- `ENCRYPTION__KEY` (ex.: `openssl rand -base64 32`) para criptografar PATs no banco

2. Suba os serviços em modo produção:

```bash
docker compose up --build -d
```

- Frontend: porta **80**
- Backend: porta **5000**

## Testes

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

Ou, da raiz: `cd backend && dotnet test DashboardDevops.sln` e `cd frontend && npm test`.

## Lint

Script único que roda o lint do backend e do frontend (a partir da raiz do repositório):

```bash
chmod +x scripts/lint.sh   # apenas na primeira vez
./scripts/lint.sh
```

- **.NET**: `dotnet format` com `--verify-no-changes` no backend.
- **Angular**: `ng lint` (ESLint + Angular ESLint).

Para rodar só um deles:

```bash
dotnet format backend/DashboardDevops.sln --verify-no-changes
cd frontend && npm run lint
```

## Login

O dashboard exige autenticação. Na primeira execução um usuário **admin** é criado automaticamente.

- **Usuário**: `admin@configuracao.com.br`
- **Senha**: `admin123` (ou o valor de `AUTH__DEFAULTPASSWORD` no `.env`)

Configure `JWT__KEY` e `AUTH__DEFAULTPASSWORD` no `.env` em produção.

## Tema Claro/Escuro

Use o ícone de sol/lua no canto superior direito ou na tela de login para alternar entre tema claro e escuro. A preferência é salva no navegador.

## Configuração do Azure DevOps

1. Faça login e acesse `http://localhost:4200/organizations`
2. Clique em **Nova Organização**
3. Preencha:
   - **Nome**: nome da sua organização (ex: `minha-empresa`)
   - **URL**: `https://dev.azure.com/minha-empresa`
   - **PAT Token**: Personal Access Token com permissões de leitura em:
     - Work Items (Read)
     - Code (Read)
     - Build (Read)
     - Release (Read)

### Criar um PAT Token no Azure DevOps

1. Acesse `https://dev.azure.com/{sua-org}/_usersettings/tokens`
2. Clique em **New Token**
3. Defina as permissões necessárias (leitura em Work Items, Code, Build, Release)
4. Copie o token gerado

## Funcionalidades

| Tela             | Descrição                                             |
| ---------------- | ----------------------------------------------------- |
| **Dashboard**    | Resumo de todas as organizações com totais e status   |
| **Organizações** | Gerenciar conexões com Azure DevOps (CRUD com PAT)    |
| **Projetos**     | Grid de todos os projetos com busca e filtros         |
| **Pipelines**    | Status em tempo real de builds/releases (polling 30s) |
| **Work Items**   | Itens ativos com filtros por tipo, estado e busca     |
| **Repositórios** | Repos Git com branch padrão e links externos          |

## API Endpoints

```
POST   /api/auth/login                                          Login (body: { username, password })
GET    /api/organizations                                       Lista organizações (requer auth)
POST   /api/organizations                                       Adiciona organização
PUT    /api/organizations/{id}                                  Atualiza organização
DELETE /api/organizations/{id}                                  Remove organização
GET    /api/organizations/{org}/projects                        Lista projetos
GET    /api/organizations/{org}/projects/{proj}/pipelines       Lista pipelines
GET    /api/organizations/{org}/projects/{proj}/work-items       Lista work items
GET    /api/organizations/{org}/projects/{proj}/repositories    Lista repositórios
GET    /api/dashboard/summary                                   Resumo agregado
GET    /health                                                  Health check
GET    /swagger                                                 Documentação API
```

## Cache Redis

| Recurso      | TTL    |
| ------------ | ------ |
| Projetos     | 5 min  |
| Pipelines    | 30 seg |
| Work Items   | 2 min  |
| Repositórios | 5 min  |

## Segurança: senhas e criptografia de dados

### Senhas de usuários

- As senhas **nunca são armazenadas em texto puro** no banco.
- O backend usa **Argon2id** (via `Argon2Sharp`) com os parâmetros:
  - **Memória**: 64 MB (`WithMemorySizeKB(65536)`)
  - **Iterações**: 3 (`WithIterations(3)`)
  - **Paralelismo**: 4 (`WithParallelism(4)`)
  - **Salt aleatório** para cada hash (`WithRandomSalt()`).
- O hash é gerado em formato **PHC** (prefixado com `$argon2`), contendo todos os parâmetros necessários para verificação.
- Para compatibilidade com dados antigos, se o hash não começar com `$argon2`, é feita verificação com **BCrypt** (modo legado).

Em resumo: cada senha é derivada com Argon2id (memory-hard, resistente a ataques de força bruta em GPU/ASIC) e o banco recebe apenas o hash resultante, nunca a senha original.

### Dados de organização no banco (PAT/URL)

Os dados sensíveis das organizações (especialmente o **PAT Token** e a **URL** da organização) são criptografados em repouso na tabela de organizações:

- Serviço de criptografia: `AesEncryptionService`.
- Algoritmo: **AES-GCM** (modo autenticado) com:
  - Chave de **256 bits** (`KeySize = 32` bytes).
  - **Nonce** aleatório de 12 bytes por registro.
  - **Tag de autenticação** de 16 bytes.
- O valor armazenado no banco é:
  - Prefixado com `ENC:` e seguido de um **Base64** que contém `nonce + ciphertext + tag`.
- A chave é derivada da variável de ambiente **`ENCRYPTION__KEY`**:
  - Espera um valor Base64. Se o material de chave for menor que 32 bytes, é aplicado **SHA-256** para chegar aos 32 bytes.
  - Se o valor não for Base64 válido, é feito **SHA-256 da string em UTF‑8** e o resultado (32 bytes) vira a chave.
- Se `ENCRYPTION__KEY` **não estiver configurada**, o serviço loga um _warning_ e **não criptografa** (lê/grava em texto puro). Em produção, essa chave deve ser **obrigatoriamente configurada**.

Fluxo na camada de repositório (`OrganizationRepository`):

- Antes de gravar (`AddAsync`/`UpdateAsync`):
  - `PatToken` e `Url` passam por `EncryptIfNeeded`, que:
    - Detecta se o valor já está prefixado com `ENC:` (caso de migração / dados antigos).
    - Se já estiver, primeiro **descriptografa** e depois **criptografa novamente** (normalização).
    - Se não estiver, criptografa o texto puro com a chave atual.
- Ao ler (`GetAllAsync`, `GetByIdAsync`, `GetByNameAsync`):
  - `PatToken` e `Url` são sempre passados por `Decrypt`, retornando texto puro para o restante da aplicação.

Assim, o banco nunca guarda o PAT ou a URL em texto simples quando `ENCRYPTION__KEY` está configurada.

### Dados de organização no cache Redis

- O cache Redis é usado para **dados agregados de dashboard** (resumo, timeline, atualizações do dia, etc.), não para armazenar PATs.
- O serviço de cache (`RedisCacheService`) serializa os objetos em **JSON** com `System.Text.Json` e grava com `StringSetAsync`, respeitando os TTLs da tabela acima.
- Os dados presentes no cache são projeções como:
  - `DashboardSummary` (totais de orgs, pipelines, projetos, etc.).
  - `TimelineResponse` (linha do tempo de projetos/sprints).
  - `TodayUpdatesResponse` (itens atualizados no dia).
- Esses objetos **não incluem o PAT Token**, apenas informações operacionais/analíticas que já vêm **descriptografadas** da camada de domínio.
- Em caso de falha na leitura/escrita do cache, a aplicação faz _fallback_ para buscar os dados diretamente do Azure DevOps / banco.

Em produção, a proteção dos dados no Redis depende de:

- Não expor a instância de Redis publicamente.
- Autenticação/ACL do Redis.
- Rede privada/VNet entre os serviços.

Ou seja: **segredos** (PAT) são protegidos no banco via AES-GCM, enquanto o Redis guarda apenas projeções de leitura sem PAT.

## Estrutura do Projeto

```
DashboardDevopsAzure/
├── docker-compose.yml          # Produção
├── docker-compose.dev.yml      # Desenvolvimento (hot reload)
├── .env.example
├── scripts/
│   └── lint.sh                 # Lint .NET + Angular
├── backend/
│   ├── DashboardDevops.sln     # Solution .NET
│   ├── src/
│   │   ├── DashboardDevops.Api/          # Controllers, Program.cs, Swagger
│   │   ├── DashboardDevops.Application/  # Services, DTOs
│   │   ├── DashboardDevops.Domain/       # Entities, Interfaces, Models
│   │   └── DashboardDevops.Infrastructure/ # EF Core, Redis, Azure DevOps Client
│   └── tests/
│       └── DashboardDevops.Tests/        # Testes unitários (xUnit)
└── frontend/
    └── src/app/
        ├── core/               # Services, Models, Interceptors
        ├── features/           # Dashboard, Organizations, Projects, Pipelines, etc.
        └── shared/             # UI Components, Layout
```
