// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O nome é obrigatório."],
    },
    email: {
      type: String,
      required: [true, "O email é obrigatório."],
      unique: true, // Garante que não haverá dois usuários com o mesmo email
      lowercase: true, // Salva o email sempre em minúsculas
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
