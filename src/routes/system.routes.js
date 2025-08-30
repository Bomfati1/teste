const express = require("express");
const { body } = require("express-validator");
const {
  createSystem,
  getAllSystems,
  getSystemById,
  updateSystem,
  deleteSystem,
} = require("../controllers/system.controller.js");

const router = express.Router();

const systemValidationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("O nome do sistema é obrigatório."),
];

router.route("/").post(systemValidationRules, createSystem).get(getAllSystems);

router
  .route("/:id")
  .get(getSystemById)
  .put(systemValidationRules, updateSystem)
  .delete(deleteSystem);

module.exports = router;
