// src/controllers/user.controller.js
const Permission = require("../models/Permission");
const User = require("../models/User");
const mongoose = require("mongoose");
const { getClient } = require("../config/redis"); // 1. Importamos o cliente Redis
const { validationResult } = require("express-validator");

const asyncHandler = require("../middleware/asyncHandler");

// Função para cadastrar um novo usuário
exports.createUser = asyncHandler(async (req, res, next) => {
  // Executa a validação definida nas rotas
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Se houver erros, retorna 400 com a lista de erros
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email } = req.body; // Permissões agora são gerenciadas em /api/permission

  // Verifica se o usuário já existe pelo email
  const userExists = await User.findOne({ email });
  if (userExists) {
    // Retorna 409 Conflict, que é mais específico para recursos duplicados.
    return res.status(409).json({ message: "Este email já está em uso." });
  }

  const newUser = new User({ name, email });
  await newUser.save();
  console.log("User saved:", newUser);

  res.status(201).json(newUser);
});

/**
 * @desc    Listar todos os usuários ativos
 * @route   GET /api/user
 */
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const cacheKey = "users:all_with_permissions";
  
  // Tenta buscar do cache primeiro
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedData));
    }
  }
  
  // Cache MISS - busca do banco usando método customizado
  res.setHeader("X-Cache", "MISS");

  const users = await User.findActive()
    .populate({
      path: 'permissions',
      match: { isActive: true, deletedAt: null },
      populate: {
        path: 'system',
        select: 'name availableRoles',
        match: { isActive: true, deletedAt: null }
      }
    })
    .select("-__v");

  const response = {
    success: true,
    count: users.length,
    data: users,
  };
  
  // Salva no cache
  if (redisClient && redisClient.isReady) {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 300 });
  }

  res.status(200).json(response);
});

/**
 * @desc    Listar todos os usuários (incluindo deletados)
 * @route   GET /api/user/all
 */
exports.getAllUsersIncludeDeleted = asyncHandler(async (req, res, next) => {
  const cacheKey = "users:all_with_permissions_include_deleted";
  
  // Tenta buscar do cache primeiro
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedData));
    }
  }
  
  // Cache MISS - busca do banco usando método customizado
  res.setHeader("X-Cache", "MISS");

  const users = await User.findAll()
    .populate({
      path: 'permissions',
      populate: {
        path: 'system',
        select: 'name availableRoles'
      }
    })
    .select("-__v");

  const response = {
    success: true,
    count: users.length,
    data: users,
  };
  
  // Salva no cache
  if (redisClient && redisClient.isReady) {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 300 });
  }

  res.status(200).json(response);
});

// Função para deletar um usuário pelo ID (soft delete)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  // 1. Pegamos o ID que foi enviado na URL da requisição.
  const userId = req.params.id;

  // Valida se o ID é um ObjectId válido do MongoDB para consistência
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  // Usar uma transação para garantir que ou o usuário e suas permissões são deletados, ou nada é.
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Busca o usuário para verificar se existe
    const user = await User.findById(userId, { session });

    // 3. Verificamos se um usuário foi realmente encontrado
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // 4. Soft delete do usuário
    await user.softDelete(req.user?._id); // req.user._id se você tiver autenticação

    // 5. Soft delete das permissões associadas a este usuário
    const permissions = await Permission.find({ user: userId }, { session });
    for (const permission of permissions) {
      await permission.softDelete(req.user?._id);
    }

    // 6. Invalida o cache de listagem de usuários
    const redisClient = getClient();
    if (redisClient && redisClient.isReady) {
      await redisClient.del("users:all_with_permissions");
      await redisClient.del("permissions:all");
      console.log("Cache de usuários invalidado devido à deleção.");
    }

    await session.commitTransaction();
    session.endSession();

    // 7. Se a deleção foi bem-sucedida, enviamos uma mensagem de sucesso.
    res
      .status(200)
      .json({ 
        message: "Usuário e suas permissões deletados com sucesso.",
        data: {
          id: user._id,
          deletedAt: user.deletedAt,
          isActive: user.isActive
        }
      });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error); // Passa o erro para o middleware de erro global
  }
});

// Função para restaurar um usuário deletado
exports.restoreUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  // Busca incluindo usuários deletados
  const user = await User.findById(userId).setOptions({ includeDeleted: true });

  if (!user) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  if (user.isActive) {
    return res.status(400).json({ message: "Este usuário já está ativo." });
  }

  // Restaura o usuário
  await user.restore();

  // Invalida cache
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    await redisClient.del("users:all_with_permissions");
    console.log("Cache de usuários invalidado devido à restauração.");
  }

  res.status(200).json({ 
    success: true,
    message: "Usuário restaurado com sucesso.",
    data: user
  });
});

// Função para listar usuários deletados (para administradores)
exports.getDeletedUsers = asyncHandler(async (req, res, next) => {
  const deletedUsers = await User.find({})
    .setOptions({ includeDeleted: true })
    .where({ isActive: false })
    .select("-__v");

  res.status(200).json({
    success: true,
    count: deletedUsers.length,
    data: deletedUsers,
  });
});

/**
 * @desc    Buscar usuário por ID (apenas ativos)
 * @route   GET /api/user/:id
 */
exports.getUserById = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  const user = await User.findByIdActive(req.params.id)
    .populate({
      path: 'permissions',
      match: { isActive: true, deletedAt: null },
      populate: {
        path: 'system',
        select: 'name availableRoles',
        match: { isActive: true, deletedAt: null }
      }
    })
    .select("-__v");

  if (!user) {
    // Verifica se o usuário existe mas está deletado
    const deletedUser = await User.findByIdIncludeDeleted(req.params.id);
    if (deletedUser && !deletedUser.isActive) {
      return res.status(404).json({ 
        message: `Usuário com ID ${req.params.id} foi deletado.`,
        deletedAt: deletedUser.deletedAt,
        deletedBy: deletedUser.deletedBy
      });
    }
    return res.status(404).json({ message: `Usuário com ID ${req.params.id} não encontrado.` });
  }

  res.status(200).json({ success: true, data: user });
});

/**
 * @desc    Buscar usuário por ID (incluindo deletados) - para debug
 * @route   GET /api/user/:id/debug
 */
exports.getUserByIdIncludeDeleted = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  const user = await User.findByIdIncludeDeleted(req.params.id)
    .populate({
      path: 'permissions',
      populate: {
        path: 'system',
        select: 'name availableRoles'
      }
    })
    .select("-__v");

  if (!user) {
    return res.status(404).json({ message: `Usuário com ID ${req.params.id} não encontrado.` });
  }

  res.status(200).json({ 
    success: true, 
    data: user,
    debug: {
      isActive: user.isActive,
      deletedAt: user.deletedAt,
      deletedBy: user.deletedBy
    }
  });
});

// Função para atualizar um usuário pelo ID
exports.updateUser = asyncHandler(async (req, res, next) => {
  // Executa a validação definida nas rotas
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, email } = req.body; // Permissões agora são gerenciadas em /api/permission

  // Valida se o ID é um ObjectId válido do MongoDB
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  // Verifica se o novo email já está em uso por OUTRO usuário
  if (email) {
    const userWithEmail = await User.findOne({ email });
    // Se encontrou um usuário com o email, e o ID desse usuário é diferente do que estamos atualizando
    if (userWithEmail && userWithEmail._id.toString() !== id) {
      // Retorna 409 Conflict para indicar um conflito de recurso (email duplicado).
      return res
        .status(409)
        .json({ message: "Este email já está em uso por outro usuário." });
    }
  }

  // Constrói o objeto de atualização dinamicamente para permitir updates parciais
  const updateFields = {};
  if (name) updateFields.name = name;
  if (email) updateFields.email = email;

  // Encontra e atualiza o usuário. { new: true } retorna o documento atualizado.
  const updatedUser = await User.findByIdAndUpdate(
    id,
    updateFields, // 2. Passa apenas os campos que foram enviados
    { new: true, runValidators: true } // Opções para retornar o doc atualizado e rodar validadores
  ).select("-__v"); // Remove o campo __v da resposta

  if (!updatedUser) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  // Invalida o cache de listagem de usuários se dados relevantes (nome, email) foram alterados
  const redisClient = getClient();
  if (redisClient && redisClient.isReady && (name || email)) {
    await redisClient.del("users:all_with_permissions");
    console.log("Cache de usuários invalidado devido à atualização.");
  }

  res.status(200).json(updatedUser);
});
