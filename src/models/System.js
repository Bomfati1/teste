const mongoose = require("mongoose");

const systemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O nome do sistema é obrigatório."],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Adiciona um campo para definir as permissões (papéis) disponíveis neste sistema.
    availableRoles: {
      type: [String],
      required: true,
      // Define os valores padrão para cada novo sistema criado.
      default: ["visualizar", "editar", "excluir"],
      // Garante que somente os valores nesta lista possam ser inseridos no array.
      enum: ["visualizar", "editar", "excluir"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("System", systemSchema);
