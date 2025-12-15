const router = require('express').Router();
const parseForm = require("../controllers/parseFormController");
const firmasControllers = require("../controllers/firmasControllers");
const modoSoloLectura = require('../middlewares/modoSoloLectura');

// Aplica el modo solo lectura
router.use(modoSoloLectura);

// Crear firma
router.post("/", parseForm(), firmasControllers.crearFirma);

// Obtener firma
router.get("/", firmasControllers.obtenerFirma);

// Eliminar firma
router.delete("/", firmasControllers.eliminarFirma);

module.exports = router
