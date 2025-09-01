const { getClient } = require("../config/redis");

// Middleware factory para criar um middleware de cache com TTL (Time To Live) customizável
const cache = (durationInSeconds) => {
  return async (req, res, next) => {
    const redisClient = getClient();

    // Se o Redis não estiver disponível, simplesmente pula o cache e continua
    if (!redisClient) {
      return next();
    }

    // Chave de cache única baseada na URL original da requisição
    const key = `__express__${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redisClient.get(key);

      if (cachedResponse) {
        // Cache HIT: Encontrou no cache
        console.log(`Cache HIT para a chave: ${key}`);
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.send(cachedResponse);
      }

      // Cache MISS: Não encontrou no cache
      console.log(`Cache MISS para a chave: ${key}`);
      res.setHeader("X-Cache", "MISS");

      // Guarda a função original res.send para chamá-la depois
      const originalSend = res.send;

      // Sobrescreve res.send para interceptar a resposta que vem do controller
      res.send = (body) => {
        // Apenas faz cache de respostas de sucesso (status 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Armazenando no cache a chave: ${key}`);
          redisClient.setEx(key, durationInSeconds, body);
        }
        return originalSend.call(res, body);
      };

      next();
    } catch (error) {
      console.error("Erro no middleware de cache:", error);
      next(); // Em caso de erro no Redis, continua sem cache
    }
  };
};

/**
 * Invalida todos os caches relacionados de forma eficiente
 * @param {Object} redisClient - Cliente Redis
 * @param {Array} cacheKeys - Array de chaves de cache para invalidar
 * @param {string} reason - Motivo da invalidação (para logs)
 */
exports.invalidateCaches = async (redisClient, cacheKeys = [], reason = "alteração") => {
  if (!redisClient || !redisClient.isReady) {
    console.log("Redis não disponível para invalidação de cache.");
    return;
  }

  try {
    // Invalida caches específicos
    if (cacheKeys.length > 0) {
      await Promise.all(cacheKeys.map(key => redisClient.del(key)));
    }

    // Sempre invalida caches principais que podem ser afetados
    const mainCaches = [
      "users:all_with_permissions",
      "permissions:all", 
      "systems:all"
    ];

    await Promise.all(mainCaches.map(key => redisClient.del(key)));
    
    console.log(`Caches invalidados devido à ${reason}.`);
  } catch (error) {
    console.error("Erro ao invalidar caches:", error);
  }
};

/**
 * Invalida cache específico de uma entidade
 * @param {Object} redisClient - Cliente Redis
 * @param {string} entityType - Tipo da entidade (user, system, permission)
 * @param {string} entityId - ID da entidade
 * @param {string} reason - Motivo da invalidação
 */
exports.invalidateEntityCache = async (redisClient, entityType, entityId, reason = "alteração") => {
  if (!redisClient || !redisClient.isReady) {
    return;
  }

  try {
    const cacheKeys = [
      `${entityType}:${entityId}`,
      `${entityType}s:all`
    ];

    // Adiciona caches específicos baseado no tipo
    if (entityType === 'user') {
      cacheKeys.push("users:all_with_permissions");
    } else if (entityType === 'permission') {
      cacheKeys.push("users:all_with_permissions");
      cacheKeys.push("permissions:all");
    } else if (entityType === 'system') {
      cacheKeys.push("systems:all");
    }

    await Promise.all(cacheKeys.map(key => redisClient.del(key)));
    console.log(`Cache de ${entityType} invalidado devido à ${reason}.`);
  } catch (error) {
    console.error(`Erro ao invalidar cache de ${entityType}:`, error);
  }
};

module.exports = cache;
