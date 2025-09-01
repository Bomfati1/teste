const System = require("../models/System");
const Permission = require("../models/Permission");
const asyncHandler = require("../middleware/asyncHandler");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { getClient } = require("../config/redis");

// @desc    Criar um novo sistema
// @route   POST /api/system
exports.createSystem = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description } = req.body;

  const systemExists = await System.findOne({ name });
  if (systemExists) {
    return res
      .status(409)
      .json({ message: "Um sistema com este nome já existe." });
  }

  const system = await System.create({ name, description });
  
  // Invalida o cache de sistemas
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    await redisClient.del("systems:all");
    console.log("Cache de sistemas invalidado devido à criação.");
  }
  
  res.status(201).json({ success: true, data: system });
});

// @desc    Listar todos os sistemas
// @route   GET /api/system
exports.getAllSystems = asyncHandler(async (req, res, next) => {
  const cacheKey = "systems:all";
  
  // Tenta buscar do cache primeiro
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Cache HIT para sistemas.");
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedData));
    }
  }
  
  // Cache MISS - busca do banco
  console.log("Cache MISS. Buscando sistemas do MongoDB.");
  res.setHeader("X-Cache", "MISS");
  
  const systems = await System.find({}, { __v: 0 });
  const response = { success: true, count: systems.length, data: systems };
  
  // Salva no cache
  if (redisClient && redisClient.isReady) {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 300 });
    console.log("Resultado da listagem de sistemas salvo no cache.");
  }
  
  res.status(200).json(response);
});

// @desc    Buscar um sistema por ID
// @route   GET /api/system/:id
exports.getSystemById = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de sistema inválido." });
  }

  const cacheKey = `system:${req.params.id}`;
  
  // Tenta buscar do cache primeiro
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Cache HIT para sistema por ID.");
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedData));
    }
  }
  
  // Cache MISS - busca do banco
  console.log("Cache MISS. Buscando sistema por ID do MongoDB.");
  res.setHeader("X-Cache", "MISS");

  const system = await System.findById(req.params.id, { __v: 0 });
  if (!system) {
    return res
      .status(404)
      .json({ message: `Sistema com ID ${req.params.id} não encontrado.` });
  }

  const response = { success: true, data: system };
  
  // Salva no cache
  if (redisClient && redisClient.isReady) {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 300 });
    console.log("Sistema salvo no cache.");
  }

  res.status(200).json(response);
});

// @desc    Atualizar um sistema
// @route   PUT /api/system/:id
exports.updateSystem = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de sistema inválido." });
  }

  const system = await System.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select("-__v");

  if (!system) {
    return res
      .status(404)
      .json({ message: `Sistema com ID ${req.params.id} não encontrado.` });
  }

  // Invalida o cache de sistemas
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    await redisClient.del("systems:all");
    await redisClient.del(`system:${req.params.id}`);
    console.log("Cache de sistemas invalidado devido à atualização.");
  }

  res.status(200).json({ success: true, data: system });
});

// @desc    Deletar um sistema (soft delete)
// @route   DELETE /api/system/:id
exports.deleteSystem = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de sistema inválido." });
  }

  const system = await System.findById(req.params.id);

  if (!system) {
    return res.status(404).json({ 
      message: `Sistema com ID ${req.params.id} não encontrado.` 
    });
  }

  // Opcional: Verificar se o sistema está em uso em alguma permissão antes de deletar.
  const permissionsInUse = await Permission.findOne({ system: req.params.id });
  if (permissionsInUse) {
    return res.status(400).json({
      message:
        "Não é possível deletar o sistema, pois ele está associado a permissões de usuários.",
    });
  }

  // Soft delete do sistema
  await system.softDelete(req.user?._id); // req.user._id se você tiver autenticação

  // Invalida o cache de sistemas
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    await redisClient.del("systems:all");
    await redisClient.del(`system:${req.params.id}`);
    console.log("Cache de sistemas invalidado devido à deleção.");
  }

  res.status(200).json({ 
    success: true, 
    message: "Sistema deletado com sucesso.",
    data: {
      id: system._id,
      deletedAt: system.deletedAt,
      isActive: system.isActive
    }
  });
});

// @desc    Restaurar um sistema deletado
// @route   PATCH /api/system/:id/restore
exports.restoreSystem = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de sistema inválido." });
  }

  // Busca incluindo sistemas deletados
  const system = await System.findById(req.params.id).setOptions({ includeDeleted: true });

  if (!system) {
    return res.status(404).json({ 
      message: `Sistema com ID ${req.params.id} não encontrado.` 
    });
  }

  if (system.isActive) {
    return res.status(400).json({ 
      message: "Este sistema já está ativo." 
    });
  }

  // Restaura o sistema
  await system.restore();

  // Invalida cache
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    await redisClient.del("systems:all");
    await redisClient.del(`system:${req.params.id}`);
    console.log("Cache de sistemas invalidado devido à restauração.");
  }

  res.status(200).json({ 
    success: true, 
    message: "Sistema restaurado com sucesso.",
    data: system
  });
});

// @desc    Listar sistemas deletados (para administradores)
// @route   GET /api/system/deleted
exports.getDeletedSystems = asyncHandler(async (req, res, next) => {
  const deletedSystems = await System.find({})
    .setOptions({ includeDeleted: true })
    .where({ isActive: false })
    .select("-__v");

  res.status(200).json({
    success: true,
    count: deletedSystems.length,
    data: deletedSystems,
  });
});
