# API de Gerenciamento de Usuários e Permissões

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.x-brightgreen.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red.svg)](https://redis.io/)

API robusta para cadastrar sistemas, gerenciar usuários e associar permissões, construída com foco em segurança, performance e boas práticas de desenvolvimento.

## 🎯 Funcionalidades Principais

- **Gerenciamento de Sistemas**: Cadastre os sistemas que farão parte do ecossistema (ex: "Sistema de Atendimento", "Sistema de RH").
- **Gerenciamento de Usuários**: Crie, liste, atualize e busque usuários.
- **Gerenciamento de Permissões**: Associe usuários a sistemas com funções específicas (ex: `admin", "user", "read", "write`).
- **Soft Delete**: Usuários e permissões não são apagados permanentemente. Eles são desativados, permitindo recuperação e mantendo o histórico.
- **Restauração de Dados**: Endpoints para restaurar usuários que foram desativados.
- **Cache de Alta Performance**: Uso de Redis para cachear requisições frequentes (listagens), com invalidação automática em operações de escrita (`create`, `update`, `delete`).
- **Segurança Integrada**: Proteção contra vulnerabilidades comuns da web (veja a seção de Segurança).

## 🧱 Arquitetura e Padrões

O projeto foi desenvolvido seguindo padrões que garantem manutenibilidade e escalabilidade:

- **Modelagem com Mongoose**:

  - `System`: `{ name, availableRoles, isActive, ... }`
  - `User`: `{ name, email, isActive, deletedAt, deletedBy, ... }`
  - `Permission`: `{ user: ObjectId, system: ObjectId, roles: [String], isActive, ... }`
    > **Observação**: O schema `Permission` possui um índice único em `{ user, system }` para evitar duplicidade.

- **Padrão Soft Delete**: Todos os modelos principais implementam a exclusão lógica com os campos `isActive`, `deletedAt` e `deletedBy`.
- **Abstração de Consultas**: Métodos estáticos nos modelos Mongoose (ex: `User.findActive()`, `User.findByIdIncludeDeleted()`) simplificam a lógica nos controllers.
- **Transações com MongoDB**: Operações críticas, como a exclusão de um usuário e suas permissões, são envolvidas em transações para garantir a integridade dos dados (atomicidade).
- **Cache-Aside Pattern**: A aplicação primeiro consulta o Redis. Se os dados não estiverem lá (cache miss), busca no MongoDB e os armazena no Redis para futuras requisições.
- **Middlewares Centralizados**: Lógicas de segurança, validação, tratamento de erros e parsing são modularizadas em middlewares.

## 🛠️ Tecnologias

- **Backend**: Node.js, Express.js
- **Banco de Dados**: MongoDB com Mongoose
- **Cache**: Redis
- **Segurança**: Helmet, CORS, Express Rate Limit
- **Validação**: Express Validator
- **Variáveis de Ambiente**: Dotenv

## 🛡️ Segurança

A aplicação já vem com uma camada de segurança configurada:

- **Helmet**: Adiciona headers de segurança HTTP para proteger contra ataques como XSS e clickjacking.
- **CORS**: Controla quais origens externas podem acessar a API.
- **Rate Limiting**: Limita o número de requisições por IP para mitigar ataques de força bruta e DoS.
- **Validação de Input**: Usa `express-validator` para validar e sanitizar os dados de entrada nas rotas.
- **Error Handling**: Um middleware global captura erros de forma consistente, evitando o vazamento de stack traces.

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos

- Node.js (v18 ou superior)
- Docker (recomendado para rodar o DB e o Cache)

### 2. Instalação

Clone o repositório e instale as dependências:

```bash
git clone <url-do-seu-repositorio>
cd <nome-do-repositorio>
npm install
```

### 3. Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto e adicione as seguintes variáveis:

```env
# Configurações da Aplicação
PORT=5000
NODE_ENV=development

# URI de conexão do MongoDB
MONGO_URI=mongodb://localhost:27017/permissions_db

# URL de conexão do Redis (se não for fornecida, a aplicação funcionará sem cache)
REDIS_URL=redis://127.0.0.1:6379
```

### 4. Iniciar Banco de Dados e Cache com Docker

A forma mais fácil de subir o MongoDB e o Redis é usando Docker Compose. Crie um arquivo `docker-compose.yml` na raiz:

```yaml
version: "3.8"
services:
  mongo:
    image: mongo:6
    container_name: mongo_db
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
  redis:
    image: redis:7-alpine
    container_name: redis_cache
    ports:
      - "6379:6379"
volumes:
  mongo-data:
```

E inicie os serviços:

```bash
docker compose up -d
```

### 5. Iniciar a Aplicação

Para rodar em modo de desenvolvimento com hot-reload:

```bash
npm run dev
```

A API estará disponível em `http://localhost:5000`.

## 🌐 Endpoints Principais

A base para as rotas é `/api`.

### Health Check

- `GET /`: Status geral da API.
- `GET /health`: Detalhes de saúde dos serviços (DB, Cache).

### Usuários (`/user`)

- `GET /`: Lista todos os usuários **ativos**. (Cacheado)
- `GET /all`: Lista **todos** os usuários, incluindo os desativados. (Cacheado)
- `GET /deleted`: Lista apenas os usuários desativados.
- `POST /`: Cria um novo usuário.
- `GET /:id`: Busca um usuário ativo pelo ID.
- `GET /:id/debug`: Busca um usuário pelo ID, independentemente do status.
- `PUT /:id`: Atualiza os dados de um usuário.
- `DELETE /:id`: Desativa um usuário (Soft Delete).
- `POST /:id/restore`: Restaura um usuário desativado.

### Sistemas (`/system`)

- `POST /`: Cria um novo sistema.
- `GET /`: Lista todos os sistemas.

### Permissões (`/permission`)

- `POST /`: Cria ou atualiza uma permissão (upsert).
- `GET /`: Lista todas as permissões.
- `DELETE /:id`: Remove uma permissão (Soft Delete).

> **Nota sobre o Cache**: Rotas de listagem que são cacheadas retornam um header `X-Cache: HIT` ou `X-Cache: MISS` para fácil depuração.

## 🔮 Próximas Melhorias

- **Autenticação e Autorização**: Implementar JWT para proteger as rotas e definir níveis de acesso (ex: apenas administradores podem restaurar usuários).
- **Testes Automatizados**: Expandir a cobertura de testes (unitários e de integração) usando Jest e Supertest.
- **Logging Avançado**: Integrar um logger como Winston ou Pino para registrar logs de forma estruturada.
- **Documentação da API**: Gerar documentação interativa com Swagger/OpenAPI.
