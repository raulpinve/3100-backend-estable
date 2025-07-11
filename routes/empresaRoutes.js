const router = require('express').Router()
const { validarCrearEmpresa, validarActualizarEmpresa, validarEmpresaId } = require("../validators/empresaValidators") 
const empresasController = require("../controllers/empresasController");
const { throwForbiddenError } = require('../errors/throwHTTPErrors');
const obtenerEmpresaId = require('../middlewares/obtenerEmpresa');
const verificarPermisos = require('../middlewares/verificarPermisos');

// Crear empresa
router.post("/", 
    validarCrearEmpresa, 
    (req, res, next) => {
        try {
            // Solo superadministradores pueden crear empresas
            const {rol} = req.usuario;
        
            if(rol !== "administrador"){
                throwForbiddenError("No estás autorizado para realizar esta acción.")
            }
            return next();
        } catch (error) {
            next(error)        
        }
    }, empresasController.crearEmpresa
);

// Obtener todas las empresas
router.get("/todas", empresasController.obtenerTodasLasEmpresas)

// Obtener empresa
router.get("/:empresaId", 
    validarEmpresaId,
    // Consulta el id de la empresa para realizar la verificación de permisos en el siguiente middleware
    obtenerEmpresaId, 
    verificarPermisos("leer"),
    empresasController.obtenerEmpresa
);

// Obtener empresas
router.get("/", empresasController.obtenerEmpresas);

// Actualizar empresa
router.put("/:empresaId", 
    validarEmpresaId, 
    validarActualizarEmpresa, 
    obtenerEmpresaId,
    (req, res, next) => {
        try {
            // Solo superadministradores pueden crear empresas
            const {rol} = req.usuario;
        
            if(rol !== "administrador"){
                throwForbiddenError("No estás autorizado para realizar esta acción.")
            }
            return next();
        } catch (error) {
            next(error)        
        }
    },
    empresasController.actualizarEmpresa
);

// Eliminar empresa
router.delete("/:empresaId", 
    validarEmpresaId, 
    obtenerEmpresaId,
    (req, res, next) => {
        try {
            // Solo superadministradores pueden crear empresas
            const {rol} = req.usuario;
        
            if(rol !== "administrador"){
                throwForbiddenError("No estás autorizado para realizar esta acción.")
            }
            return next();
        } catch (error) {
            next(error)        
        }
    },
    empresasController.eliminarEmpresa
);

module.exports = router