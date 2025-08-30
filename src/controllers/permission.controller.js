const Permission = require("../models/Permission");
const User = require("../models/User");
const System = require("../models/System");
const asyncHandler = require("../middleware/asyncHandler");
const { validationResult } = require("express-validator");

/**
 * @desc    Cria ou atualiza as permissões de um usuário em um sistema
 * @route   POST /api/permission
 * @access  Private (a ser implementado)
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
      permissoesValidas: systemExists.availableRoles,
    });
  }

  // 4. Se tudo estiver válido, cria ou atualiza a permissão
  const permission = await Permission.findOneAndUpdate(
    { user: userId, system: systemId }, // Critério de busca
    { $set: { roles: roles } }, // Dados para atualizar/inserir
    { new: true, upsert: true, runValidators: true } // Opções
  )
    .populate("user", "name email")
    .populate("system", "name");

  res.status(201).json({ success: true, data: permission });
});
