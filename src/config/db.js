const mongoose = require("mongoose");

const connectDB = (uri) => {
  if (!uri) {
    throw new Error(
      "A URI do MongoDB não foi fornecida. Verifique seu arquivo .env"
    );
  }
  return mongoose.connect(uri);
};

module.exports = connectDB;
