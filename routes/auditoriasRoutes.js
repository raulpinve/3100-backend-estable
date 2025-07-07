const router = require("express").Router();
const auditoriasController = require("../controllers/auditoriasController");
const parseForm = require("../controllers/parseFormController");
const obtenerEmpresaId = require("../middlewares/obtenerEmpresa");
const obtenerEmpresaAuditorias = require("../middlewares/obtenerEmpresaAuditorias");
const verificarPermisos = require("../middlewares/verificarPermisos");
const { validarAuditoriaId, validarCrearAuditoria, validarEditarAuditoria} = require("../validators/auditoriasValidators");
const { validarCriterioId } = require("../validators/criteriosValidators");
const { validarEmpresaId } = require("../validators/empresaValidators");
const { validarCrearFirma, validarFirmaId } = require("../validators/firmaValidators");

// Agregar firma
router.post("/:auditoriaId/firmas", 
    validarAuditoriaId, 
    obtenerEmpresaAuditorias,
    verificarPermisos("crear"),
    parseForm(), 
    validarCrearFirma, 
    auditoriasController.agregarFirma
)

// Obtener firmas 
router.get("/:auditoriaId/firmas", 
    validarAuditoriaId, 
    obtenerEmpresaAuditorias,
    verificarPermisos("leer"),
    auditoriasController.obtenerFirmas
)
// Eliminar firma
router.delete("/firmas/:firmaId/:auditoriaId", 
    validarFirmaId, 
    validarAuditoriaId, 
    obtenerEmpresaAuditorias,
    verificarPermisos("eliminar"),
    auditoriasController.quitarFirma
)

// Crear auditoría
router.post("/", 
    validarCrearAuditoria, 
    obtenerEmpresaId,
    verificarPermisos("crear"),
    auditoriasController.crearAuditoria
);

// Obtener resultados de la auditoria por criterio -> Nueva ruta, 
// cambiada antes era busqueda por servicio
router.get("/:auditoriaId/criterios/:criterioId/resultados", 
    validarAuditoriaId, 
    obtenerEmpresaAuditorias,
    verificarPermisos("leer"),
    validarCriterioId, 
    auditoriasController.obtenerResultadosAuditoriaPorCriterio
);

// Obtener auditorías por empresa
router.get("/:empresaId/empresa",
    validarEmpresaId,
    obtenerEmpresaId,
    verificarPermisos("leer"),
    auditoriasController.obtenerAuditoriasPorEmpresa
);

// Obtener auditoría por ID
router.get("/:auditoriaId", 
    validarAuditoriaId, 
    obtenerEmpresaAuditorias,
    verificarPermisos("leer"),
    auditoriasController.obtenerAuditoria
);

// Agregar criterios auditoría -> Ruta antes era de servicio, ahora es por criterio
router.post("/:auditoriaId/criterios", 
    validarAuditoriaId, 
    obtenerEmpresaAuditorias,
    verificarPermisos("crear"),
    auditoriasController.agregarCriteriosAuditoria
);

// Eliminar criterios auditoría -> Ruta antes era de servicio, ahora es por criterio
router.delete("/:auditoriaId/criterios", 
    validarAuditoriaId, 
    obtenerEmpresaAuditorias,
    verificarPermisos("eliminar"),
    auditoriasController.eliminarCriteriosAuditoria
);

// Descargar consolidado de auditoría
router.get("/:auditoriaId/consolidado/download", 
    validarAuditoriaId,
    obtenerEmpresaAuditorias,
    verificarPermisos("leer"),
    auditoriasController.descargarConsolidado
)

// Obtener consolidado de auditoría
router.get("/:auditoriaId/consolidado", 
    validarAuditoriaId, 
    obtenerEmpresaAuditorias,
    verificarPermisos("leer"),
    auditoriasController.obtenerConsolidadoAuditoria
)

// Actualizar auditoría
router.put("/:auditoriaId",
    validarAuditoriaId,
    obtenerEmpresaAuditorias,
    verificarPermisos("editar"),
    validarEditarAuditoria,
    auditoriasController.actualizarAuditoria
)

// Eliminar auditoría
router.delete("/:auditoriaId",
    validarAuditoriaId,
    obtenerEmpresaAuditorias,
    verificarPermisos("eliminar"),
    auditoriasController.eliminarAuditoria
)

module.exports = router;

