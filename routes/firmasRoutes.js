const router = require('express').Router();
const parseForm = require("../controllers/parseFormController");
const firmasControllers = require("../controllers/firmasControllers");

/** Firmas */
// Crear firma
router.post("/", parseForm(), firmasControllers.crearFirma);

// Obtener firma
router.get("/", firmasControllers.obtenerFirma);

// Eliminar firma
router.delete("/", firmasControllers.eliminarFirma);

module.exports = router
