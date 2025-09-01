require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db.js");
const { connectRedis, isRedisAvailable } = require("./src/config/redis.js");
const customBodyParser = require("./src/middleware/customBodyParser.js");
const deleteHandler = require("./src/middleware/deleteHandler.js");
const { 
  createRateLimiter, 
  corsOptions, 
  helmetConfig, 
  basicSecurity, 
  validateIP, 
  sanitizeData 
} = require("./src/middleware/security.js");
const config = require("./config.js");

const systemRoutes = require("./src/routes/system.routes.js");
const userRoutes = require("./src/routes/user.routes.js");
const permissionRoutes = require("./src/routes/permission.routes.js");

const app = express();
const port = config.port;

// ========================================
// MIDDLEWARES DE SEGURANÇA
// ========================================

// Helmet - Headers de segurança
app.use(require('helmet')(helmetConfig));

// CORS - Controle de origens
app.use(require('cors')(corsOptions));

// Rate Limiting - Limita requisições por IP
const rateLimiter = createRateLimiter(
  config.security.rateLimit.max,
  config.security.rateLimit.windowMs
);
app.use(rateLimiter);

// Segurança básica
app.use(basicSecurity);

// Validação de IP
app.use(validateIP);

// Sanitização de dados
app.use(sanitizeData);

// ========================================
// MIDDLEWARES DE APLICAÇÃO
// ========================================

// Middleware customizado para parsear body (substitui o body-parser)
app.use(customBodyParser);

// Middleware específico para DELETE requests (mantemos para logs)
app.use(deleteHandler);

// ========================================
// ROTAS
// ========================================

// Rota de teste para verificar se o servidor está funcionando
app.get("/", (req, res) => {
  res.json({ 
    message: "API funcionando! 🚀",
    status: "online",
    timestamp: new Date().toISOString(),
    cache: isRedisAvailable() ? "enabled" : "disabled",
    environment: config.nodeEnv
  });
});

// Rota de health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    database: "connected",
    cache: isRedisAvailable() ? "connected" : "not available",
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: "1.0.0"
  });
});

// Definimos uma rota base para nossos endpoints do sistema
app.use("/api/system", systemRoutes);
app.use("/api/user", userRoutes);
app.use("/api/permission", permissionRoutes);

// ========================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ========================================

// Middleware de tratamento de erros (deve ser o último)
const errorHandler = require("./src/middleware/errorHandler.js");
app.use(errorHandler);

// ========================================
// FUNÇÃO DE INICIALIZAÇÃO
// ========================================

// Função para iniciar o servidor
const start = async () => {
  try {
    console.log("🚀 Iniciando a aplicação...");
    console.log(`🌍 Ambiente: ${config.nodeEnv}`);
    
    // 1. Primeiro, tenta conectar ao banco de dados
    console.log("📊 Conectando ao MongoDB...");
    console.log(`🔗 URI: ${config.mongodb.uri}`);
    await connectDB(config.mongodb.uri);
    console.log("✅ Conectado ao MongoDB com sucesso.");

    // 2. Tenta conectar ao Redis apenas se a URL estiver configurada
    const redisUrl = config.redis.url;
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
      console.log(`🛡️  Segurança: Ativa (Rate Limiting, Helmet, CORS)`);
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
