const Permission = require("../models/Permission");
const User = require("../models/User");
const System = require("../models/System");
const asyncHandler = require("../middleware/asyncHandler");
const { validationResult } = require("express-validator");
const { getClient } = require("../config/redis");

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
  // Primeiro verifica se já existe uma permissão para este usuário e sistema
  let permission = await Permission.findOne({ user: userId, system: systemId });
  let wasCreated = false;

  if (permission) {
    // Atualiza a permissão existente
    permission.roles = roles;
    await permission.save();
  } else {
    // Cria uma nova permissão
    permission = await Permission.create({ user: userId, system: systemId, roles });
    wasCreated = true;
  }

  // 5. Invalida todos os caches relacionados
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    // Invalida cache de usuários
    await redisClient.del("users:all_with_permissions");
    // Invalida cache de permissões
    await redisClient.del("permissions:all");
    // Invalida cache de sistemas (pois pode afetar permissões)
    await redisClient.del("systems:all");
    console.log(
      "Caches invalidados devido à alteração de permissões."
    );
  }

  // 6. Popula o resultado para uma resposta mais rica
  await permission.populate([
    { path: "user", select: "name email" },
    { path: "system", select: "name" },
  ]);

  // 7. Determina o status code e a mensagem corretos
  const statusCode = wasCreated ? 201 : 200;
  const message = wasCreated
    ? "Permissão criada com sucesso."
    : "Permissão atualizada com sucesso.";

  res.status(statusCode).json({ success: true, message, data: permission });
});

// @desc    Listar todas as permissões
// @route   GET /api/permission
exports.getAllPermissions = asyncHandler(async (req, res, next) => {
  const cacheKey = "permissions:all";
  
  // Tenta buscar do cache primeiro
  const redisClient = getClient();
  if (redisClient && redisClient.isReady) {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Cache HIT para permissões.");
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedData));
    }
  }
  
  // Cache MISS - busca do banco
  console.log("Cache MISS. Buscando permissões do MongoDB.");
  res.setHeader("X-Cache", "MISS");

  const permissions = await Permission.find({})
    .populate("user", "name email")
    .populate("system", "name")
    .select("-__v");

  const response = {
    success: true,
    count: permissions.length,
    data: permissions,
  };
  
  // Salva no cache
  if (redisClient && redisClient.isReady) {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 300 });
    console.log("Resultado da listagem de permissões salvo no cache.");
  }

  res.status(200).json(response);
});
