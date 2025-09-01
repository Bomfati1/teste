const mongoose = require("mongoose");

const systemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O nome do sistema é obrigatório."],
      trim: true,
      maxlength: [100, "O nome não pode ter mais de 100 caracteres."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "A descrição não pode ter mais de 500 caracteres."],
    },
    availableRoles: {
      type: [String],
      default: ["visualizar", "editar", "excluir"],
      validate: [
        (val) => val.length > 0,
        "O sistema deve ter pelo menos um papel disponível.",
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

// ========================================
// REFERÊNCIAS VIRTUAIS
// ========================================

// Campo virtual para permissões do sistema
systemSchema.virtual('permissions', {
  ref: 'Permission',
  localField: '_id',
  foreignField: 'system',
  justOne: false
});

// Configuração para incluir campos virtuais no JSON
systemSchema.set('toJSON', { virtuals: true });
systemSchema.set('toObject', { virtuals: true });

// ========================================
// MÉTODOS DE INSTÂNCIA (soft delete/restore)
// ========================================

// Método para soft delete
systemSchema.methods.softDelete = async function(deletedBy = null) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return await this.save();
};

// Método para restaurar
systemSchema.methods.restore = async function() {
  this.isActive = true;
  this.deletedAt = null;
  this.deletedBy = null;
  return await this.save();
};

// ========================================
// MÉTODOS ESTÁTICOS (queries customizadas)
// ========================================

// Buscar apenas sistemas ativos (não deletados)
systemSchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: null });
};

// Buscar todos os sistemas (incluindo deletados)
systemSchema.statics.findAll = function() {
  return this.find({});
};

// Buscar apenas sistemas deletados
systemSchema.statics.findDeleted = function() {
  return this.find({ isActive: false, deletedAt: { $ne: null } });
};

// Buscar por ID incluindo deletados
systemSchema.statics.findByIdIncludeDeleted = function(id) {
  return this.findById(id);
};

// Buscar por ID apenas ativos
systemSchema.statics.findByIdActive = function(id) {
  return this.findOne({ _id: id, isActive: true, deletedAt: null });
};

module.exports = mongoose.model("System", systemSchema);
