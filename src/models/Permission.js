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
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Índice composto para evitar duplicatas
permissionSchema.index({ user: 1, system: 1 }, { unique: true });

// ========================================
// MÉTODOS DE INSTÂNCIA (soft delete/restore)
// ========================================

// Método para soft delete
permissionSchema.methods.softDelete = async function(deletedBy = null) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return await this.save();
};

// Método para restaurar
permissionSchema.methods.restore = async function() {
  this.isActive = true;
  this.deletedAt = null;
  this.deletedBy = null;
  return await this.save();
};

// ========================================
// MÉTODOS ESTÁTICOS (queries customizadas)
// ========================================

// Buscar apenas permissões ativas (não deletadas)
permissionSchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: null });
};

// Buscar todas as permissões (incluindo deletadas)
permissionSchema.statics.findAll = function() {
  return this.find({});
};

// Buscar apenas permissões deletadas
permissionSchema.statics.findDeleted = function() {
  return this.find({ isActive: false, deletedAt: { $ne: null } });
};

// Buscar por ID incluindo deletados
permissionSchema.statics.findByIdIncludeDeleted = function(id) {
  return this.findById(id);
};

// Buscar por ID apenas ativos
permissionSchema.statics.findByIdActive = function(id) {
  return this.findOne({ _id: id, isActive: true, deletedAt: null });
};

module.exports = mongoose.model("Permission", permissionSchema);
