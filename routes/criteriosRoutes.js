const express = require("express");
const router = express.Router();
const criteriosController = require("../controllers/criteriosController");
const {
    validarCrearCriterio,
    validarActualizarCriterio,
    validarCriterioId
} = require("../validators/criteriosValidators");

const { validarGrupoId } = require("../validators/gruposValidators");
const verificarPermisosEstandares = require("../middlewares/verificarPermisosEstandares");

// Crear criterio
router.post("/", 
    verificarPermisosEstandares,
    validarCrearCriterio, 
    criteriosController.crearCriterio
);

// Obtener criterio por grupo ID
router.get("/:grupoId/grupos", 
    validarGrupoId, 
    verificarPermisosEstandares,
    criteriosController.obtenerCriterios
);

// Obtener criterios por ID
router.get("/:criterioId", 
    validarCriterioId, 
    verificarPermisosEstandares,
    criteriosController.obtenerCriterioPorId
);

// Actualizar criterio
router.put("/:criterioId", 
    verificarPermisosEstandares,
    validarCriterioId, 
    validarActualizarCriterio, 
    criteriosController.actualizarCriterio
);

// Eliminar criterio
router.delete("/:criterioId", 
    validarCriterioId, 
    verificarPermisosEstandares,
    criteriosController.eliminarCriterio
);

module.exports = router;
