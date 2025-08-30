const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "O ID do usuário é obrigatório."],
    },
    system: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "System",
      required: [true, "O ID do sistema é obrigatório."],
    },
    roles: {
      type: [String],
      required: true,
      validate: [
        (val) => val.length > 0,
        "O campo roles não pode ser um array vazio.",
      ],
    },
  },
  { timestamps: true }
);

// Cria um índice composto para garantir que um usuário só possa ter uma
// entrada de permissão por sistema, evitando duplicatas.
permissionSchema.index({ user: 1, system: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);
