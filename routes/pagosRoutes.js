const router = require('express').Router();
const pagosController = require("../controllers/pagosController");

router.post('/crear-referencia', pagosController.crearReferenciaCompra);

router.post('/wompi-webhook', pagosController.webhook);

module.exports = router
