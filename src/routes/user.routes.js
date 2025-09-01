const express = require("express");
const {
  createUser,
  getAllUsers,
  getAllUsersIncludeDeleted,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  getDeletedUsers,
  getUserByIdIncludeDeleted,
} = require("../controllers/user.controller.js");
const { body } = require("express-validator");

const router = express.Router();

// Regras de validação e sanitização para criação e atualização de usuários
const userValidationRules = [
  body("name").notEmpty().withMessage("O nome é obrigatório.").trim().escape(),
  body("email")
    .isEmail()
    .withMessage("Forneça um endereço de e-mail válido.")
    .normalizeEmail(),
];

// Rota para listar usuários ativos (com cache Redis)
router.route("/").post(userValidationRules, createUser).get(getAllUsers);

// Rota para listar TODOS os usuários (incluindo deletados)
router.get("/all", getAllUsersIncludeDeleted);

router
  .route("/:id")
  .get(getUserById)
  .put(userValidationRules, updateUser)
  .delete(deleteUser);

// Rota para deletar um usuário (soft delete)
router.delete("/:id", deleteUser);

// Rota para restaurar um usuário deletado
router.patch("/:id/restore", restoreUser);

// Rota para listar usuários deletados (para administradores)
router.get("/deleted", getDeletedUsers);

// Rota para buscar um usuário pelo ID (incluindo deletados para debug)
router.get("/:id/debug", getUserByIdIncludeDeleted);

module.exports = router;
