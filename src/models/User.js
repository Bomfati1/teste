// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O nome é obrigatório."],
      trim: true,
      maxlength: [50, "O nome não pode ter mais de 50 caracteres."],
    },
    email: {
      type: String,
      required: [true, "O email é obrigatório."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Por favor, adicione um email válido.",
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

// Campo virtual para permissões do usuário
userSchema.virtual('permissions', {
  ref: 'Permission',
  localField: '_id',
  foreignField: 'user',
  justOne: false
});

// Configuração para incluir campos virtuais no JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// ========================================
// MÉTODOS DE INSTÂNCIA (soft delete/restore)
// ========================================

// Método para soft delete
userSchema.methods.softDelete = async function(deletedBy = null) {
  this.isActive = false;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return await this.save();
};

// Método para restaurar
userSchema.methods.restore = async function() {
  this.isActive = true;
  this.deletedAt = null;
  this.deletedBy = null;
  return await this.save();
};

// ========================================
// MÉTODOS ESTÁTICOS (queries customizadas)
// ========================================

// Buscar apenas usuários ativos (não deletados)
userSchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: null });
};

// Buscar todos os usuários (incluindo deletados)
userSchema.statics.findAll = function() {
  return this.find({});
};

// Buscar apenas usuários deletados
userSchema.statics.findDeleted = function() {
  return this.find({ isActive: false, deletedAt: { $ne: null } });
};

// Buscar por ID incluindo deletados
userSchema.statics.findByIdIncludeDeleted = function(id) {
  return this.findById(id);
};

// Buscar por ID apenas ativos
userSchema.statics.findByIdActive = function(id) {
  return this.findOne({ _id: id, isActive: true, deletedAt: null });
};

module.exports = mongoose.model("User", userSchema);
