const router = require('express').Router();
const suscripcionesController = require("../controllers/suscripcionesController");

router.post('/confirmar-desbloqueo', suscripcionesController.confirmarDesbloqueo);

module.exports = router
