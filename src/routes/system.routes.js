const express = require("express");
const { body } = require("express-validator");
const {
  createSystem,
  getAllSystems,
  getSystemById,
  updateSystem,
  deleteSystem,
  restoreSystem,
  getDeletedSystems,
} = require("../controllers/system.controller.js");

const router = express.Router();

const systemValidationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("O nome do sistema é obrigatório."),
];

router.route("/").post(systemValidationRules, createSystem).get(getAllSystems);

// Rota para listar sistemas deletados (para administradores)
router.get("/deleted", getDeletedSystems);

router
  .route("/:id")
  .get(getSystemById)
  .put(systemValidationRules, updateSystem)
  .delete(deleteSystem);

// Rota para deletar um sistema (soft delete)
router.delete("/:id", deleteSystem);

// Rota para restaurar um sistema deletado
router.patch("/:id/restore", restoreSystem);

module.exports = router;
