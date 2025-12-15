const itemEvaluacionController = require('../controllers/itemEvaluacionController');
const express = require('express');
const { validarCrearItem, validarItemId, validarActualizarItem } = require('../validators/itemEvaluacionValidators');
const { validarCriterioId } = require('../validators/criteriosValidators');
const verificarPermisosEstandares = require("../middlewares/verificarPermisosEstandares");
const modoSoloLectura = require('../middlewares/modoSoloLectura');
const router = express.Router();

// Aplica el modo solo lectura
router.use(modoSoloLectura);

// Crear item
router.post('/', 
    verificarPermisosEstandares,
    validarCrearItem, 
    itemEvaluacionController.crearItem
);

// Obtener items por criterio
router.get('/:criterioId/criterio', 
    verificarPermisosEstandares,
    validarCriterioId, 
    itemEvaluacionController.obtenerItems
);

// Obtener item por ID
router.get('/:itemId', 
    verificarPermisosEstandares,
    validarItemId, 
    itemEvaluacionController.obtenerItemPorId
);

// Actualizar item
router.put('/:itemId', 
    verificarPermisosEstandares,
    validarItemId, 
    validarActualizarItem, 
    itemEvaluacionController.actualizarItem
);

// Eliminar item
router.delete('/:itemId', 
    verificarPermisosEstandares,
    validarItemId, 
    itemEvaluacionController.eliminarItem
);

module.exports = router;
