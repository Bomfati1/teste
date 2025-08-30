const Permission = require("../models/Permission");
const User = require("../models/User");
const System = require("../models/System");
const asyncHandler = require("../middleware/asyncHandler");
const { validationResult } = require("express-validator");
const { redisClient } = require("../config/redis");

/**
 * @desc    Cria ou atualiza as permissões de um usuário em um sistema
 * @route   POST /api/permission
 */
exports.createOrUpdatePermission = asyncHandler(async (req, res, next) => {
  // 1. Executa a validação de formato definida nas rotas (se o ID é válido, etc.)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, systemId, roles } = req.body;

  // 2. Verifica se o usuário e o sistema realmente existem no banco
  const [userExists, systemExists] = await Promise.all([
    User.findById(userId),
    System.findById(systemId),
  ]);

  if (!userExists) {
    return res
      .status(404)
      .json({ message: `Usuário com ID ${userId} não encontrado.` });
  }

  if (!systemExists) {
    return res
      .status(404)
      .json({ message: `Sistema com ID ${systemId} não encontrado.` });
  }

  // 3. Valida se os papéis (roles) enviados na requisição são válidos para este sistema
  const invalidRoles = roles.filter(
    (role) => !systemExists.availableRoles.includes(role)
  );

  if (invalidRoles.length > 0) {
    return res.status(400).json({
      message: `As seguintes permissões são inválidas para este sistema: ${invalidRoles.join(
        ", "
      )}.`,
      availableRoles: systemExists.availableRoles,
    });
  }

  // 4. Se tudo estiver válido, cria ou atualiza a permissão
  // Usamos rawResult: true para saber se o documento foi criado ou atualizado
  const result = await Permission.findOneAndUpdate(
    { user: userId, system: systemId }, // Critério de busca
    { $set: { roles: roles } }, // Dados para atualizar/inserir
    { new: true, upsert: true, runValidators: true, rawResult: true } // Opções
  );

  // 5. Invalida o cache de listagem de usuários, pois as permissões mudaram
  if (redisClient && redisClient.isReady) {
    await redisClient.del("users:all_with_permissions");
    console.log(
      "Cache de usuários invalidado devido à alteração de permissões."
    );
  }

  // 6. Popula o resultado para uma resposta mais rica, de forma mais eficiente
  // Chamamos .populate() diretamente no documento retornado pelo findOneAndUpdate,
  // evitando uma nova consulta ao banco de dados.
  const permission = await result.value.populate([
    { path: "user", select: "name email" },
    { path: "system", select: "name" },
  ]);

  // 7. Determina o status code e a mensagem corretos (201 para criado, 200 para atualizado)
  const wasCreated = result.lastErrorObject.upserted;
  const statusCode = wasCreated ? 201 : 200;
  const message = wasCreated
    ? "Permissão criada com sucesso."
    : "Permissão atualizada com sucesso.";

  res.status(statusCode).json({ success: true, message, data: permission });
});

// @desc    Listar todas as permissões
// @route   GET /api/permission
exports.getAllPermissions = asyncHandler(async (req, res, next) => {
  const permissions = await Permission.find({})
    .populate("user", "name email")
    .populate("system", "name")
    .select("-__v");

  res.status(200).json({
    success: true,
    count: permissions.length,
    data: permissions,
  });
});
