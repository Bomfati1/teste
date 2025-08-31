// config.example.js - Copie este arquivo para config.js e ajuste as configurações

module.exports = {
  // Configurações do MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/seu_banco"
  },
  
  // Configurações do Redis (opcional)
  redis: {
    url: process.env.REDIS_URL || null, // Se null, a aplicação rodará sem cache
    enabled: !!process.env.REDIS_URL
  },
  
  // Configurações do servidor
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || "development"
  }
};
