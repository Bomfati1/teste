# Backend de Permissões

🎯 Objetivo

Pequena aplicação backend para cadastrar sistemas, cadastrar usuários e associar permissões (funções) entre eles.

## ✅ Funcionalidades

- Cadastrar sistemas (ex: Sistema de Atendimento, Sistema de RH)
- Cadastrar usuários (nome, email)
- Associar um usuário a um sistema com uma ou mais funções (ex: `visualizar`, `editar`, `excluir`)
- Listar todos os usuários com suas permissões por sistema
- Editar ou remover permissões de um usuário

## 🧱 Modelagem (MongoDB / Mongoose)

- systems: { name }
- users: { name, email }
- permissions: { user: ObjectId, system: ObjectId, roles: [String] }

> Observação: o schema `Permission` possui um índice único em `{ user, system }` para evitar duplicidade.

## 🛠 Tecnologias

- Node.js (v16+ recomendado)
- Express.js
- MongoDB com Mongoose
- Redis (opcional, usado como cache para endpoints de permissões)
- dotenv para variáveis de ambiente

## Estrutura principal

- `index.js` - ponto de entrada
- `src/config` - configuração de DB e Redis
- `src/models` - modelos Mongoose (`User`, `System`, `Permission`)
- `src/controllers` - lógica das rotas
- `src/routes` - rotas Express

## Endpoints principais

- POST /api/system - criar sistema { name }
- GET /api/system - listar sistemas

- POST /api/user - criar usuário { name, email }
- GET /api/user - listar usuários

- POST /api/permission - criar/atualizar permissão (upsert)
  - body: { userId, systemId, roles: ["visualizar"] }
- GET /api/permission - listar todas as permissões (raw)
- GET /api/permission/report - (outras opções: relatório agrupado) — retorna permissões
- POST /api/permission/:id - atualizar roles por id (compatibilidade)
- DELETE /api/permission/:id - remover permissão

> As rotas e formatos exatos podem ser conferidos nos arquivos `src/routes/*` e `src/controllers/*`.

## Como rodar (local)

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente (crie um arquivo `.env` na raiz):

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/nome_do_banco
# Opcional: URL do Redis, ex: redis://localhost:6379
REDIS_URL=redis://127.0.0.1:6379
```

3. Inicie o MongoDB (local) e o Redis (opcional). Duas opções para o Redis:

- Rodar localmente (instalação do Redis) ou
- Usar Docker (recomendado para testes):

```bash
# Inicia um container Redis
docker run -d --name teste-redis -p 6379:6379 redis:7-alpine
```

4. Inicie a aplicação:

```bash
npm start
# ou, se o script "start" não estiver configurado no package.json:
node index.js
```

5. Teste endpoints (exemplo):

```bash
curl -X POST http://localhost:5000/api/user -H "Content-Type: application/json" -d '{"name":"João","email":"joao@example.com"}'
```

## Observações sobre Redis e cache

- O projeto tem suporte a Redis (cliente em `src/config/redis.js`).
- Redis é usado como cache para alguns endpoints de permissões (ex.: `permissions_report` e `permissions_raw`).
- Se Redis não estiver disponível, a aplicação fará fallback ao MongoDB sem falhar.
- TTLs usados por padrão: `permissions_report` = 300s, `permissions_raw` = 60s — você pode ajustar no controller.

## Docker (opcional)

Se preferir, crie um `docker-compose.yml` simples para subir MongoDB + Redis para desenvolvimento.

Exemplo mínimo:

```yaml
version: "3.8"
services:
  mongo:
    image: mongo:6
    ports:
      - 27017:27017
    volumes:
      - mongo-data:/data/db
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
volumes:
  mongo-data:
```

Rode:

```bash
docker compose up -d
```

A aplicação pode então usar `MONGO_URI=mongodb://localhost:27017/nome_do_banco` e `REDIS_URL=redis://127.0.0.1:6379`.

## Testes e validações rápidas

- Tente criar permissões com roles inválidos (ex: `administrador`) — o Mongoose deve retornar erro de validação (enum) e a API devolve uma mensagem clara.
- Tente buscar `/api/permission` duas vezes e observe no backend os logs `cache MISS` / `cache HIT` e o header `X-Cache` na resposta.

## Manutenção e próximas melhorias

- Adicionar autenticação (ex: JWT) caso o backend seja exposto publicamente.
- Adicionar validações mais robustas (ex.: sanitização, rate limiting).
- Adicionar testes automatizados (Jest / Supertest).
