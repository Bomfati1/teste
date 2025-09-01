const Permission = require("../models/Permission");
const User = require("../models/User");
const System = require("../models/System");
const asyncHandler = require("../middleware/asyncHandler");
const { validationResult } = require("express-validator");
const { getClient } = require("../config/redis");
const mongoose = require("mongoose");

/**
 * @desc    Cria ou atualiza as permissões de um usuário em um sistema
 * @route   POST /api/permission
 */
exports.createOrUpdatePermission = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, systemId, roles } = req.body;

  // Verifica se o usuário e o sistema existem (apenas ativos)
  const [userExists, systemExists] = await Promise.all([
    User.findByIdActive(userId),
    System.findByIdActive(systemId),
  ]);

  if (!userExists) {
    return res.status(404).json({ message: `Usuário ativo com ID ${userId} não encontrado.` });
  }

  if (!systemExists) {
    return res.status(404).json({ message: `Sistema ativo com ID ${systemId} não encontrado.` });
  }

  // Valida se os papéis são válidos para este sistema
  const invalidRoles = roles.filter(role => !systemExists.availableRoles.includes(role));
  if (invalidRoles.length > 0) {
    return res.status(400).json({
      message: `As seguintes permissões são inválidas: ${invalidRoles.join(", ")}.`,
      availableRoles: systemExists.availableRoles,
    });
  }

  // Cria ou atualiza a permissão (busca incluindo deletadas para evitar duplicatas)
  let permission = await Permission.findOne({ user: userId, system: systemId });
  let wasCreated = false;

  if (permission) {
    permission.roles = roles;
    await permission.save();
  } else {
    permission = await Permission.create({ user: userId, system: systemId, roles });
    wasCreated = true;
  }

  // Invalida caches
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    await redisClient.del("users:all_with_permissions");
    await redisClient.del("permissions:all");
    await redisClient.del("systems:all");
  }

  // Popula o resultado
  await permission.populate([
    { path: "user", select: "name email" },
    { path: "system", select: "name" },
  ]);

  const statusCode = wasCreated ? 201 : 200;
  const message = wasCreated ? "Permissão criada com sucesso." : "Permissão atualizada com sucesso.";

  res.status(statusCode).json({ success: true, message, data: permission });
});

/**
 * @desc    Listar todas as permissões ativas
 * @route   GET /api/permission
 */
exports.getAllPermissions = asyncHandler(async (req, res, next) => {
  console.log('🔍 GET /api/permission - Iniciando...');
  
  const cacheKey = "permissions:all";
  
  // Tenta buscar do cache primeiro
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    console.log('📡 Redis disponível, verificando cache...');
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache HIT - retornando dados do cache');
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedData));
    }
  }
  
  // Cache MISS - busca do banco usando método customizado
  console.log('❌ Cache MISS - buscando do banco...');
  res.setHeader("X-Cache", "MISS");

  console.log('🔍 Executando Permission.findActive()...');
  const permissions = await Permission.findActive()
    .populate("user", "name email")
    .populate("system", "name")
    .select("-__v");

  console.log(`📊 Permissões encontradas: ${permissions.length}`);
  
  if (permissions.length > 0) {
    permissions.forEach((perm, index) => {
      console.log(`  ${index + 1}. ID: ${perm._id}, User: ${perm.user?.name}, System: ${perm.system?.name}`);
    });
  }

  const response = {
    success: true,
    count: permissions.length,
    data: permissions,
  };
  
  // Salva no cache
  if (redisClient && redisClient.isReady) {
    console.log('💾 Salvando no cache Redis...');
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 300 });
    console.log('✅ Cache salvo com sucesso');
  }

  console.log('📤 Enviando resposta...');
  res.status(200).json(response);
});

/**
 * @desc    Deletar uma permissão (soft delete)
 * @route   DELETE /api/permission/:id
 */
exports.deletePermission = asyncHandler(async (req, res, next) => {
  console.log("🗑️  DELETE PERMISSION - Iniciando...");
  
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de permissão inválido." });
  }

  // Busca a permissão incluindo deletadas para verificar se existe
  const permission = await Permission.findByIdIncludeDeleted(req.params.id);
  
  if (!permission) {
    console.log("❌ Permissão não encontrada");
    return res.status(404).json({ message: `Permissão com ID ${req.params.id} não encontrada.` });
  }

  if (!permission.isActive) {
    console.log("❌ Permissão já está deletada");
    return res.status(400).json({ message: "Esta permissão já está deletada." });
  }

  console.log("✅ Permissão encontrada, fazendo soft delete...");
  
  // Soft delete da permissão
  await permission.softDelete();

  console.log("✅ Soft delete realizado, invalidando caches...");
  
  // Invalida caches
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    await redisClient.del("users:all_with_permissions");
    await redisClient.del("permissions:all");
    await redisClient.del("systems:all");
    await redisClient.del(`permission:${req.params.id}`);
  }

  console.log("✅ Resposta sendo enviada...");
  
  res.status(200).json({ 
    success: true, 
    message: "Permissão deletada com sucesso.",
    data: {
      id: permission._id,
      deletedAt: permission.deletedAt,
      isActive: permission.isActive
    }
  });
});

/**
 * @desc    Restaurar uma permissão deletada
 * @route   PATCH /api/permission/:id/restore
 */
exports.restorePermission = asyncHandler(async (req, res, next) => {
  console.log("🔄 RESTORE PERMISSION - Iniciando...");
  
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de permissão inválido." });
  }

  // Busca incluindo permissões deletadas
  const permission = await Permission.findByIdIncludeDeleted(req.params.id);
  
  if (!permission) {
    console.log("❌ Permissão não encontrada");
    return res.status(404).json({ message: `Permissão com ID ${req.params.id} não encontrada.` });
  }

  if (permission.isActive) {
    console.log("❌ Permissão já está ativa");
    return res.status(400).json({ message: "Esta permissão já está ativa." });
  }

  console.log("✅ Permissão encontrada, restaurando...");
  
  // Restaura a permissão
  await permission.restore();

  console.log("✅ Permissão restaurada, invalidando caches...");

  // Invalida caches
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    await redisClient.del("users:all_with_permissions");
    await redisClient.del("permissions:all");
    await redisClient.del("systems:all");
    await redisClient.del(`permission:${req.params.id}`);
  }

  console.log("✅ Resposta sendo enviada...");

  res.status(200).json({ 
    success: true, 
    message: "Permissão restaurada com sucesso.",
    data: permission
  });
});

/**
 * @desc    Listar permissões deletadas
 * @route   GET /api/permission/deleted
 */
exports.getDeletedPermissions = asyncHandler(async (req, res, next) => {
  console.log("🔍 GET DELETED PERMISSIONS - Iniciando...");
  
  try {
    // Busca permissões deletadas usando método customizado
    const deletedPermissions = await Permission.findDeleted();
    console.log(`🗑️  Permissões deletadas encontradas: ${deletedPermissions.length}`);
    
    // Log detalhado para debug
    deletedPermissions.forEach((permission, index) => {
      console.log(`  ${index + 1}. ID: ${permission._id}, isActive: ${permission.isActive}, deletedAt: ${permission.deletedAt}`);
    });

    res.status(200).json({
      success: true,
      count: deletedPermissions.length,
      data: deletedPermissions,
      debug: {
        totalFound: deletedPermissions.length,
        deletedFound: deletedPermissions.length
      }
    });
    
  } catch (error) {
    console.error("❌ Erro ao buscar permissões deletadas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao buscar permissões deletadas",
      error: error.message
    });
  }
});
