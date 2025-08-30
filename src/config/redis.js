const { createClient } = require("redis");

let client;

const connectRedis = async (uri) => {
  if (!uri) {
    console.warn("URI do Redis não fornecida. A aplicação rodará sem cache.");
    return null;
  }

  if (client && client.isOpen) {
    return client;
  }

  client = createClient({ url: uri });

  client.on("error", (err) => console.error("Erro no Cliente Redis:", err));
  client.on("connect", () => console.log("Conectando ao Redis..."));
  client.on("ready", () => console.log("Cliente Redis pronto para uso."));
  client.on("end", () => console.log("Conexão com o Redis foi fechada."));

  try {
    await client.connect();
    return client;
  } catch (error) {
    console.error("Falha ao conectar ao Redis:", error);
    client = null; // Reseta o cliente em caso de falha
    return null;
  }
};

const getClient = () => {
  return client && client.isOpen ? client : null;
};

module.exports = { connectRedis, getClient };
