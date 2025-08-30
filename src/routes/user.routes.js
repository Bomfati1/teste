const express = require("express");
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller.js");
const { body } = require("express-validator");

const router = express.Router();

// Regras de validação e sanitização para criação e atualização de usuários
const userValidationRules = [
  body("name").notEmpty().withMessage("O nome é obrigatório.").trim().escape(),
  body("email")
    .isEmail()
    .withMessage("Forneça um endereço de e-mail válido.")
    .normalizeEmail(), // Garante um formato padrão para o email (ex: remove pontos no gmail)
];

router.route("/").post(userValidationRules, createUser).get(getAllUsers);

router
  .route("/:id")
  .get(getUserById)
  .put(userValidationRules, updateUser)
  .delete(deleteUser);

module.exports = router;
