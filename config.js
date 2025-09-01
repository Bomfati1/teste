// ========================================
// CONFIGURAÇÃO DA APLICAÇÃO
// ========================================

module.exports = {
  // Configurações do servidor
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/teste',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    options: {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    }
  },
  
  // Segurança
  security: {
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }
  }
};
