const express = require('express');
const router = express.Router();
const resultadosItemsController = require('../controllers/resultadosItemsController');
const verificarPermisos = require('../middlewares/verificarPermisos');
const { validarAuditoriaId } = require('../validators/auditoriasValidators');
const { validarCriterioId } = require('../validators/criteriosValidators');
const obtenerEmpresaResultadoItem = require('../middlewares/obtenerEmpresaResultadoItem');
const { validarActualizarResultado, validarActualizarObservaciones } = require('../validators/resultadosItemsValidators');
const validarEmpresaActiva = require('../middlewares/validarEmpresaActiva');
const modoSoloLectura = require('../middlewares/modoSoloLectura');

// Obtener resultados de evaluación por criterios
router.get('/:auditoriaId/:criterioId', 
    validarAuditoriaId,
    validarEmpresaActiva,
    modoSoloLectura,
    validarCriterioId,
    verificarPermisos("leer"),
    resultadosItemsController.obtenerResultadosItems
);

// Actualizar resultado
router.put('/:resultadoItemId/resultado', 
    obtenerEmpresaResultadoItem,
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("editar"),
    validarActualizarResultado,
    resultadosItemsController.actualizarResultado,
);

// Actualizar observaciones
router.put('/:resultadoItemId/observacion',
    obtenerEmpresaResultadoItem,
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("editar"),
    validarActualizarObservaciones,
    resultadosItemsController.actualizarObservaciones
);

module.exports = router;
