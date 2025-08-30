// src/validators/user.validator.js
const { body, validationResult } = require("express-validator");

// Define as regras de validação para a criação de um usuário
const userCreationRules = () => {
  return [
    // O nome não pode ser vazio e deve ter no mínimo 3 caracteres
    body("name")
      .trim()
      .isLength({ min: 3 })
      .withMessage("O nome precisa ter no mínimo 3 caracteres."),

    // O email deve ser um email válido
    body("email")
      .isEmail()
      .withMessage("Forneça um endereço de email válido.")
      .normalizeEmail(), // Padroniza o email para minúsculas
  ];
};

// Middleware que processa o resultado da validação
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next(); // Se não houver erros, prossegue para o controller
  }

  // Se houver erros, retorna uma resposta 400 com a lista de erros
  return res.status(400).json({ errors: errors.array() });
};

module.exports = {
  userCreationRules,
  validate,
};
