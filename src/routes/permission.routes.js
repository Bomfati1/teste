const express = require("express");
const {
  // Supondo que você implementou a função createOrUpdatePermission no seu controller
  // como sugerido na resposta anterior.
  createOrUpdatePermission,
} = require("../controllers/permission.controller.js");
const { body } = require("express-validator");

const router = express.Router();

// Regras de validação para criar ou atualizar uma permissão.
// Note que os campos no body devem ser 'userId' e 'systemId' para corresponder
// ao JSON que você quer enviar.
const permissionRules = [
  body("userId")
    .isMongoId()
    .withMessage("O ID do usuário (userId) é inválido."),
  body("systemId")
    .isMongoId()
    .withMessage("O ID do sistema (systemId) é inválido."),
  body("roles")
    .isArray({ min: 1 })
    .withMessage("O campo 'roles' deve ser um array com pelo menos uma função.")
    .custom((roles) => {
      if (
        !roles.every((role) => typeof role === "string" && role.trim() !== "")
      ) {
        throw new Error(
          "Todas as funções (roles) devem ser strings não vazias."
        );
      }
      return true;
    }),
];

// Rota para criar ou atualizar uma permissão
// POST /api/permission
router.post("/", permissionRules, createOrUpdatePermission);

module.exports = router;
