const express = require("express");
const {
  createOrUpdatePermission,
  getAllPermissions,
  deletePermission,
  restorePermission,
  getDeletedPermissions,
} = require("../controllers/permission.controller.js");
const { body, param } = require("express-validator");
const cache = require("../middleware/cache.js");

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

// Validação para IDs de permissão
const permissionIdValidation = [
  param("id").isMongoId().withMessage("ID de permissão inválido."),
];

// Rota para criar ou atualizar uma permissão
// POST /api/permission
router.post("/", permissionRules, createOrUpdatePermission);

// Rota para listar todas as permissões (SEM middleware de cache externo)
router.get("/", getAllPermissions);

// Rota para listar permissões deletadas (para administradores)
router.get("/deleted", getDeletedPermissions);

// Rota para deletar uma permissão (soft delete)
// DELETE /api/permission/:id
router.delete("/:id", permissionIdValidation, deletePermission);

// Rota para restaurar uma permissão deletada
// PATCH /api/permission/:id/restore
router.patch("/:id/restore", permissionIdValidation, restorePermission);

module.exports = router;
