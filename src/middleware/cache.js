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

module.exports = cache;
