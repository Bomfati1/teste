// src/controllers/user.controller.js
const Permission = require("../models/Permission");
const User = require("../models/User");
const mongoose = require("mongoose");
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
  console.log("Buscando usuários e suas permissões do MongoDB.");

  // 1. Busca todas as permissões, populando os detalhes do sistema
  const allPermissions = await Permission.find({})
    .populate("system", "name")
    .select("user system roles");

  // 2. Agrupa as permissões por ID de usuário para fácil acesso
  const permissionsMap = new Map();
  allPermissions.forEach((perm) => {
    const userId = perm.user.toString();
    if (!permissionsMap.has(userId)) {
      permissionsMap.set(userId, []);
    }
    permissionsMap.get(userId).push({
      system: perm.system,
      roles: perm.roles,
    });
  });

  // 3. Busca todos os usuários
  const users = await User.find({}, { __v: 0 }).lean(); // .lean() para objetos JS puros

  // 4. Combina os usuários com suas permissões
  const usersWithPermissions = users.map((user) => ({
    ...user,
    permissions: permissionsMap.get(user._id.toString()) || [], // Adiciona um array vazio se não houver permissões
  }));

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

  // 2. Pedimos ao Mongoose para encontrar um usuário com esse ID e deletá-lo.
  const user = await User.findByIdAndDelete(userId);

  // 3. Verificamos se um usuário foi realmente encontrado e deletado.
  if (!user) {
    // Se 'user' for nulo, significa que não encontramos um usuário com esse ID.
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  // 5. Se a deleção foi bem-sucedida, enviamos uma mensagem de sucesso.
  res.status(200).json({ message: "Usuário deletado com sucesso." });
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

  res.status(200).json(updatedUser);
});
