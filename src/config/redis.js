const { createClient } = require("redis");

let client = null;
let connectionAttempted = false;

const connectRedis = async (uri) => {
  // Se não há URI, não tenta conectar
  if (!uri || uri.trim() === '') {
    console.log("ℹ️  Redis não configurado. Aplicação rodará sem cache.");
    return null;
  }

  // Evita tentativas múltiplas de conexão
  if (connectionAttempted) {
    return client;
  }

  connectionAttempted = true;

  try {
    console.log("🔄 Tentando conectar ao Redis...");
    console.log(`🔗 URI do Redis: ${uri}`);
    
    client = createClient({ 
      url: uri,
      socket: {
        connectTimeout: 5000, // 5 segundos de timeout
        lazyConnect: true,
        reconnectStrategy: false // Desabilita reconexão automática
      }
    });

    client.on("error", (err) => {
      console.error("❌ Erro no Cliente Redis:", err.message);
      console.error("🔍 Detalhes do erro:", err.code, err.syscall, err.address, err.port);
      client = null;
    });
    
    client.on("connect", () => console.log("🔗 Conectando ao Redis..."));
    client.on("ready", () => console.log("✅ Cliente Redis pronto para uso."));
    client.on("end", () => {
      console.log("🔌 Conexão com o Redis foi fechada.");
      client = null;
    });

    await client.connect();
    console.log("🎉 Redis conectado com sucesso!");
    
    // Testa se o Redis está funcionando
    await client.ping();
    console.log("🏓 Redis respondeu ao ping!");
    
    return client;
    
  } catch (error) {
    console.error("💥 Falha ao conectar ao Redis:", error.message);
    console.error("🔍 Tipo de erro:", error.constructor.name);
    if (error.code) console.error("🔍 Código do erro:", error.code);
    console.log("ℹ️  A aplicação continuará funcionando sem cache.");
    client = null;
    return null;
  }
};

const getClient = () => {
  if (!client) {
    return null;
  }
  
  try {
    return client.isOpen ? client : null;
  } catch (error) {
    client = null;
    return null;
  }
};

// Função para verificar se o Redis está funcionando
const isRedisAvailable = () => {
  const client = getClient();
  return client !== null;
};

// Função para limpar o cliente Redis
const disconnectRedis = async () => {
  if (client && client.isOpen) {
    try {
      await client.quit();
      console.log("🔌 Redis desconectado.");
    } catch (error) {
      console.error("Erro ao desconectar Redis:", error.message);
    }
    client = null;
  }
  connectionAttempted = false;
};

// Função para testar o Redis
const testRedis = async () => {
  const client = getClient();
  if (!client) {
    console.log("❌ Redis não está disponível para teste");
    return false;
  }
  
  try {
    const result = await client.ping();
    console.log("🏓 Teste do Redis:", result);
    return result === 'PONG';
  } catch (error) {
    console.error("❌ Erro no teste do Redis:", error.message);
    return false;
  }
};

module.exports = { connectRedis, getClient, isRedisAvailable, disconnectRedis, testRedis };
