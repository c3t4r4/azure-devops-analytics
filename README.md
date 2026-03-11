# Azure DevOps Dashboard

Dashboard completo para monitorar projetos, pipelines, work items e repositórios das suas organizações Azure DevOps.

## Stack

- **Backend**: .NET 10, ASP.NET Core, Entity Framework Core, Clean Architecture
- **Frontend**: Angular, Tailwind CSS, componentes inspirados em shadcn/ui
- **Banco de Dados**: PostgreSQL 17
- **Cache**: Redis 7
- **Containers**: Docker + Docker Compose

## Início Rápido (Desenvolvimento)

### Pré-requisitos

- Docker e Docker Compose
- Node.js 22+ (para desenvolvimento local do frontend)
- .NET SDK 10+ (para desenvolvimento local do backend)

### 1. Subir com Docker Compose (recomendado)

```bash
# Clone e entre no diretório
cd DashboardDevopsAzure

# Suba os serviços em modo de desenvolvimento (com hot reload)
docker compose -f docker-compose.dev.yml up --build

# Acesse:
# Frontend: http://localhost:4200
# Backend API: http://localhost:5000
# Swagger: http://localhost:5000/swagger

# Login padrão (usuário admin criado na primeira execução):
# Usuário: admin
# Senha: admin123 (ou AUTH__DEFAULTPASSWORD do .env)
```

### 2. Rodar localmente (sem Docker)

**Backend:**
```bash
# Inicie PostgreSQL e Redis via Docker
docker compose -f docker-compose.dev.yml up postgres redis -d

# Rode o backend
cd backend
dotnet watch run --project src/DashboardDevops.Api
```

**Frontend:**
```bash
cd frontend
npm install
ng serve --proxy-config proxy.conf.json
```

## Login

O dashboard exige autenticação. Na primeira execução, um usuário **admin** é criado automaticamente.

- **Usuário**: `admin`
- **Senha**: `admin123` (ou o valor de `AUTH__DEFAULTPASSWORD` no `.env`)

Configure `JWT__KEY` e `AUTH__DEFAULTPASSWORD` no `.env` para produção.

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

| Tela | Descrição |
|------|-----------|
| **Dashboard** | Resumo de todas as organizações com totais e status |
| **Organizações** | Gerenciar conexões com Azure DevOps (CRUD com PAT) |
| **Projetos** | Grid de todos os projetos com busca e filtros |
| **Pipelines** | Status em tempo real de builds/releases (polling 30s) |
| **Work Items** | Itens ativos com filtros por tipo, estado e busca |
| **Repositórios** | Repos Git com branch padrão e links externos |

## API Endpoints

```
POST   /api/auth/login                                          Login (body: { username, password })
GET    /api/organizations                                       Lista organizações (requer auth)
POST   /api/organizations                                       Adiciona organização
PUT    /api/organizations/{id}                                  Atualiza organização
DELETE /api/organizations/{id}                                  Remove organização
GET    /api/organizations/{org}/projects                        Lista projetos
GET    /api/organizations/{org}/projects/{proj}/pipelines       Lista pipelines
GET    /api/organizations/{org}/projects/{proj}/work-items      Lista work items
GET    /api/organizations/{org}/projects/{proj}/repositories    Lista repositórios
GET    /api/dashboard/summary                                   Resumo agregado
GET    /health                                                  Health check
GET    /swagger                                                 Documentação API
```

## Cache Redis

| Recurso | TTL |
|---------|-----|
| Projetos | 5 min |
| Pipelines | 30 seg |
| Work Items | 2 min |
| Repositórios | 5 min |

## Produção

```bash
# Copie e edite as variáveis de ambiente
cp .env.example .env
# Edite .env com senhas seguras

# Suba em modo produção
docker compose up --build -d
```

## Estrutura do Projeto

```
DashboardDevopsAzure/
├── docker-compose.yml          # Produção
├── docker-compose.dev.yml      # Desenvolvimento (hot reload)
├── .env.example
├── backend/
│   ├── src/
│   │   ├── DashboardDevops.Api/          # Controllers, Program.cs, Swagger
│   │   ├── DashboardDevops.Application/  # MediatR Handlers, DTOs
│   │   ├── DashboardDevops.Domain/       # Entities, Interfaces, Models
│   │   └── DashboardDevops.Infrastructure/ # EF Core, Redis, Azure DevOps Client
└── frontend/
    └── src/app/
        ├── core/               # Services, Models, Interceptors
        ├── features/           # Dashboard, Organizations, Projects, Pipelines, etc.
        └── shared/             # UI Components, Layout
```
