const mongoose = require("mongoose");

const connectDB = (uri) => {
  if (!uri) {
    throw new Error(
      "A URI do MongoDB não foi fornecida. Verifique seu arquivo .env"
    );
  }
  // O Mongoose gerencia o pool de conexões.
  // A função `connect` retorna uma promessa que podemos usar
  // no `server.js` para garantir que o servidor só inicie
  // após a conexão com o banco de dados ser estabelecida.
  return mongoose.connect(uri);
};

module.exports = connectDB;
