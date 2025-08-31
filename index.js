require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db.js");
const { connectRedis, isRedisAvailable } = require("./src/config/redis.js");

const systemRoutes = require("./src/routes/system.routes.js");
const userRoutes = require("./src/routes/user.routes.js");
const permissionRoutes = require("./src/routes/permission.routes.js");

const app = express();
const port = process.env.PORT || 5000;

// Middleware para parsear JSON
app.use(express.json());

// Rota de teste para verificar se o servidor está funcionando
app.get("/", (req, res) => {
  res.json({ 
    message: "API funcionando! 🚀",
    status: "online",
    timestamp: new Date().toISOString(),
    cache: isRedisAvailable() ? "enabled" : "disabled"
  });
});

// Rota de health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    database: "connected",
    cache: isRedisAvailable() ? "connected" : "not available",
    uptime: process.uptime()
  });
});

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
    console.log("🚀 Iniciando a aplicação...");
    
    // 1. Primeiro, tenta conectar ao banco de dados
    console.log("📊 Conectando ao MongoDB...");
    await connectDB(process.env.MONGODB_URI);
    console.log("✅ Conectado ao MongoDB com sucesso.");

    // 2. Tenta conectar ao Redis apenas se a URL estiver configurada
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && redisUrl.trim() !== '') {
      console.log("🔴 Conectando ao Redis...");
      await connectRedis(redisUrl);
    } else {
      console.log("ℹ️  REDIS_URL não configurada. A aplicação rodará sem cache.");
    }

    // 3. Se tudo estiver ok, inicia o servidor Express
    app.listen(port, () => {
      console.log("🎉 Servidor iniciado com sucesso!");
      console.log(`🌐 Servidor rodando em: http://localhost:${port}`);
      console.log(`📋 Health check: http://localhost:${port}/health`);
      console.log(`🔴 Cache Redis: ${isRedisAvailable() ? 'Ativo' : 'Inativo'}`);
      console.log("✨ API pronta para receber requisições!");
    });
    
  } catch (error) {
    console.error("💥 Erro ao iniciar o servidor:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1); // Encerra a aplicação em caso de erro crítico
  }
};

// Inicia a aplicação
start();
