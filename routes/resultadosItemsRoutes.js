const express = require('express');
const router = express.Router();
const obtenerEmpresaAuditorias = require("../middlewares/obtenerEmpresaAuditorias");
const resultadosItemsController = require('../controllers/resultadosItemsController');
const verificarPermisos = require('../middlewares/verificarPermisos');
const { validarAuditoriaId } = require('../validators/auditoriasValidators');
const { validarCriterioId } = require('../validators/criteriosValidators');
const obtenerEmpresaResultadoItem = require('../middlewares/obtenerEmpresaResultadoItem');
const { validarActualizarResultado, validarActualizarObservaciones } = require('../validators/resultadosItemsValidators');

// Obtener resultados de evaluación por criterios
router.get('/:auditoriaId/:criterioId', 
    validarAuditoriaId,
    validarCriterioId,
    obtenerEmpresaAuditorias,
    verificarPermisos("leer"),
    resultadosItemsController.obtenerResultadosItems
);

// Actualizar resultado
router.put('/:resultadoItemId', 
    obtenerEmpresaResultadoItem,
    verificarPermisos("editar"),
    validarActualizarResultado,
    resultadosItemsController.actualizarResultado,
);

// Actualizar observaciones
router.put('/:resultadoItemId',
    obtenerEmpresaResultadoItem,
    verificarPermisos("editar"),
    validarActualizarObservaciones,
    resultadosItemsController.actualizarObservaciones
);

module.exports = router;
