const System = require("../models/System");
const Permission = require("../models/Permission");
const asyncHandler = require("../middleware/asyncHandler");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// @desc    Criar um novo sistema
// @route   POST /api/system
exports.createSystem = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description } = req.body;

  const systemExists = await System.findOne({ name });
  if (systemExists) {
    return res
      .status(409)
      .json({ message: "Um sistema com este nome já existe." });
  }

  const system = await System.create({ name, description });
  res.status(201).json({ success: true, data: system });
});

// @desc    Listar todos os sistemas
// @route   GET /api/system
exports.getAllSystems = asyncHandler(async (req, res, next) => {
  const systems = await System.find({}, { __v: 0 });
  res.status(200).json({ success: true, count: systems.length, data: systems });
});

// @desc    Buscar um sistema por ID
// @route   GET /api/system/:id
exports.getSystemById = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de sistema inválido." });
  }

  const system = await System.findById(req.params.id, { __v: 0 });
  if (!system) {
    return res
      .status(404)
      .json({ message: `Sistema com ID ${req.params.id} não encontrado.` });
  }

  res.status(200).json({ success: true, data: system });
});

// @desc    Atualizar um sistema
// @route   PUT /api/system/:id
exports.updateSystem = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de sistema inválido." });
  }

  const system = await System.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select("-__v");

  if (!system) {
    return res
      .status(404)
      .json({ message: `Sistema com ID ${req.params.id} não encontrado.` });
  }

  res.status(200).json({ success: true, data: system });
});

// @desc    Deletar um sistema
// @route   DELETE /api/system/:id
exports.deleteSystem = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "ID de sistema inválido." });
  }

  const system = await System.findById(req.params.id);

  if (!system) {
    return res
      .status(404)
      .json({ message: `Sistema com ID ${req.params.id} não encontrado.` });
  }

  // Opcional: Verificar se o sistema está em uso em alguma permissão antes de deletar.
  const permissionsInUse = await Permission.findOne({ system: req.params.id });
  if (permissionsInUse) {
    return res.status(400).json({
      message:
        "Não é possível deletar o sistema, pois ele está associado a permissões de usuários.",
    });
  }

  await system.deleteOne();

  res.status(200).json({ success: true, data: {} });
});
