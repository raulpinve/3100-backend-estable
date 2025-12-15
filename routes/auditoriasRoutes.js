const router = require("express").Router();
const auditoriasController = require("../controllers/auditoriasController");
const parseForm = require("../controllers/parseFormController");
const modoSoloLectura = require("../middlewares/modoSoloLectura");
const obtenerEmpresaId = require("../middlewares/obtenerEmpresa");
const validarEmpresaActiva = require("../middlewares/validarEmpresaActiva");
const verificarPermisos = require("../middlewares/verificarPermisos");
const { validarAuditoriaId, validarCrearAuditoria, validarEditarAuditoria} = require("../validators/auditoriasValidators");
const { validarCriterioId } = require("../validators/criteriosValidators");
const { validarEmpresaId } = require("../validators/empresaValidators");
const { validarCrearFirma, validarFirmaId } = require("../validators/firmaValidators");

// Agregar firma usuario registrado
router.post("/:auditoriaId/firmas/usuario-registrado", 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("crear"),
    validarCrearFirma, 
    auditoriasController.agregarFirmaUsuarioRegistrado
)

// Agregar firma usuario sin registrar
router.post("/:auditoriaId/firmas/usuario-sin-registro", 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("crear"),
    parseForm(), 
    validarCrearFirma, 
    auditoriasController.agregarFirmaUsuarioSinRegistrar
)

// Obtener firmas 
router.get("/:auditoriaId/firmas", 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("leer"),
    auditoriasController.obtenerFirmas
)
// Eliminar firma
router.delete("/firmas/:firmaId/:auditoriaId", 
    validarFirmaId, 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("eliminar"),
    auditoriasController.quitarFirma
)

// Crear auditoría
router.post("/", 
    validarCrearAuditoria, 
    obtenerEmpresaId,
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("crear"),
    auditoriasController.crearAuditoria
);

// Obtener resultados de la auditoria por criterio 
router.get("/:auditoriaId/criterios/:criterioId/resultados", 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("leer"),
    validarCriterioId, 
    auditoriasController.obtenerResultadosAuditoriaPorCriterio
);

// Obtener auditorías por empresa
router.get("/:empresaId/empresa",
    validarEmpresaId,
    validarEmpresaActiva,
    modoSoloLectura,
    obtenerEmpresaId,
    verificarPermisos("leer"),
    auditoriasController.obtenerAuditoriasPorEmpresa
);

// Obtener auditoría por ID
router.get("/:auditoriaId", 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("leer"),
    auditoriasController.obtenerAuditoria
);

// Agregar criterios auditoría 
router.post("/:auditoriaId/criterios", 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("crear"),
    auditoriasController.agregarCriteriosAuditoria
);

// Eliminar criterios auditoría 
router.delete("/:auditoriaId/criterios", 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("eliminar"),
    auditoriasController.eliminarCriteriosAuditoria
);

// Descargar consolidado de auditoría
router.get("/:auditoriaId/consolidado/download", 
    validarAuditoriaId,
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("leer"),
    auditoriasController.descargarConsolidado
)

// Obtener consolidado de auditoría
router.get("/:auditoriaId/consolidado", 
    validarAuditoriaId, 
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("leer"),
    auditoriasController.obtenerConsolidadoAuditoria
)

// Actualizar auditoría
router.put("/:auditoriaId",
    validarAuditoriaId,
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("editar"),
    validarEditarAuditoria,
    auditoriasController.actualizarAuditoria
)

// Eliminar auditoría
router.delete("/:auditoriaId",
    validarAuditoriaId,
    validarEmpresaActiva,
    modoSoloLectura,
    verificarPermisos("eliminar"),
    auditoriasController.eliminarAuditoria
)

module.exports = router;

