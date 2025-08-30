require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db.js");
const { connectRedis } = require("./src/config/redis.js");

const systemRoutes = require("./src/routes/system.routes.js");
const userRoutes = require("./src/routes/user.routes.js");
const permissionRoutes = require("./src/routes/permission.routes.js");

const app = express();
const port = process.env.PORT || 5000;

// Middleware para parsear JSON
app.use(express.json());

// Definimos uma rota base para nossos endpoints do sistema
app.use("/api/system", systemRoutes);
app.use("/api/user", userRoutes);
app.use("/api/permission", permissionRoutes);

// Middleware de tratamento de erros (deve ser o último)
const errorHandler = require("./src/middleware/errorHandler.js");
app.use(errorHandler);

// Função para iniciar o servidor
const start = async () => {
  try {
    // 1. Primeiro, tenta conectar ao banco de dados
    await connectDB(process.env.MONGODB_URI);
    console.log("Conectado ao MongoDB com sucesso.");

    // Tenta conectar ao Redis. Se a URI não for fornecida, a aplicação
    // continuará funcionando, mas sem o cache.
    if (process.env.REDIS_URL) {
      await connectRedis(process.env.REDIS_URL);
    } else {
      console.log("URI do Redis não fornecida. A aplicação rodará sem cache.");
    }

    // 2. Se a conexão for bem-sucedida, inicia o servidor Express
    app.listen(port, () => {
      console.log(`Servidor está rodando na porta ${port}...`);
    });
  } catch (error) {
    console.error("Falha ao iniciar o servidor:", error);
  }
};

// Inicia a aplicação
start();
