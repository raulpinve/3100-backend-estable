const gruposController = require('../controllers/gruposController');
const express = require('express');
const { validarCrearGrupo, validarGrupoId, validarActualizarGrupo } = require('../validators/gruposValidators');
const router = express.Router();
const verificarPermisosEstandares = require("../middlewares/verificarPermisosEstandares");

// Crear grupo
router.post('/', 
    verificarPermisosEstandares,
    validarCrearGrupo, 
    gruposController.crearGrupo
);

// Obtener grupos
router.get('/', 
    verificarPermisosEstandares,
    gruposController.obtenerGrupos
);

// Obtener grupo por id
router.get('/:grupoId', 
    verificarPermisosEstandares,
    validarGrupoId, 
    gruposController.obtenerGrupoPorId
);

// Actualizar grupo
router.put('/:grupoId',
    verificarPermisosEstandares,
    validarGrupoId,
    validarActualizarGrupo,
    gruposController.actualizarGrupo
);

// Eliminar grupo
router.delete('/:grupoId', 
    verificarPermisosEstandares,
    validarGrupoId, 
    gruposController.eliminarGrupo
);

module.exports = router;
