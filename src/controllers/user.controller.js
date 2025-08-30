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

// Função para listar todos os usuários
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const cacheKey = "users:all_with_permissions"; // Chave única para este cache

  // 2. Tenta buscar os dados do cache primeiro
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Cache HIT para usuários.");
      res.setHeader("X-Cache", "HIT"); // Adiciona o header
      return res.status(200).json(JSON.parse(cachedData));
    }
  }

  // 3. Se não encontrou no cache (MISS), busca do banco de dados
  console.log("Cache MISS. Buscando usuários e suas permissões do MongoDB.");
  res.setHeader("X-Cache", "MISS"); // Adiciona o header

  // Lógica Otimizada com Aggregation Pipeline do MongoDB
  const usersWithPermissions = await User.aggregate([
    {
      $lookup: {
        from: "permissions", // O nome da coleção de permissões
        localField: "_id",
        foreignField: "user",
        as: "permissions",
      },
    },
    {
      $unwind: {
        path: "$permissions",
        preserveNullAndEmptyArrays: true, // Mantém usuários mesmo que não tenham permissões
      },
    },
    {
      $lookup: {
        from: "systems", // O nome da coleção de sistemas
        localField: "permissions.system",
        foreignField: "_id",
        as: "permissions.system",
      },
    },
    {
      $unwind: {
        path: "$permissions.system",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        email: { $first: "$email" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        permissions: {
          $push: {
            $cond: [
              { $ifNull: ["$permissions._id", false] },
              {
                system: "$permissions.system",
                roles: "$permissions.roles",
                _id: "$permissions._id",
              },
              "$$REMOVE",
            ],
          },
        },
      },
    },
    { $sort: { name: 1 } },
  ]);

  // 4. Salva o resultado no cache antes de enviar a resposta
  if (redisClient && redisClient.isReady) {
    // Define um TTL (Time To Live) de 5 minutos (300 segundos)
    await redisClient.set(cacheKey, JSON.stringify(usersWithPermissions), {
      EX: 300,
    });
    console.log("Resultado da listagem de usuários salvo no cache.");
  }

  res.status(200).json(usersWithPermissions);
});

// Função para deletar um usuário pelo ID
exports.deleteUser = asyncHandler(async (req, res, next) => {
  // 1. Pegamos o ID que foi enviado na URL da requisição.
  const userId = req.params.id;

  // Valida se o ID é um ObjectId válido do MongoDB para consistência
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  // Usar uma transação para garantir que ou o usuário e suas permissões são deletados, ou nada é.
  // Nota: Transações no MongoDB requerem um replica set.
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Pedimos ao Mongoose para encontrar um usuário com esse ID e deletá-lo.
    const user = await User.findByIdAndDelete(userId, { session });

    // 3. Verificamos se um usuário foi realmente encontrado e deletado.
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // 4. Deleta as permissões associadas a este usuário para manter a integridade dos dados.
    await Permission.deleteMany({ user: userId }, { session });

    // 5. Invalida o cache de listagem de usuários
    const redisClient = getClient();
    if (redisClient && redisClient.isReady) {
      await redisClient.del("users:all_with_permissions");
      console.log("Cache de usuários invalidado devido à deleção.");
    }

    await session.commitTransaction();
    session.endSession();

    // 6. Se a deleção foi bem-sucedida, enviamos uma mensagem de sucesso.
    res
      .status(200)
      .json({ message: "Usuário e suas permissões deletados com sucesso." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error); // Passa o erro para o middleware de erro global
  }
});

// Função para buscar um usuário pelo ID
exports.getUserById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Valida se o ID é um ObjectId válido do MongoDB
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de usuário inválido." });
  }

  const user = await User.findById(id, { __v: 0 });

  if (!user) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  res.status(200).json(user);
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
