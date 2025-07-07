const router = require('express').Router()
const parseForm = require('../controllers/parseFormController');
const perfilController = require("../controllers/perfilController")
const { validateEmail, validarActualizarPassword, validateActualizarPerfil, validarUsuarioId } = require('../validators/perfilValidators')

// Actualizar e-mail
router.put("/email", validateEmail, perfilController.actualizarEmail);

// Obtener perfil 
router.get("/:usuarioId", validarUsuarioId, perfilController.obtenerPerfil)

// Enviar e-mail de verificación
router.post("/verificar-email", perfilController.enviarCorreoConfirmacion);

// Actualiza la contraseña
router.put('/password', validarActualizarPassword, perfilController.actualizarPassword);

// Editar perfil
router.put('/perfil', validateActualizarPerfil, perfilController.editarPerfil);

// Editar avatar
router.put("/avatar", parseForm(), perfilController.actualizarAvatar);

// Eliminar avatar
router.delete("/avatar", perfilController.eliminarAvatar);

module.exports = router;