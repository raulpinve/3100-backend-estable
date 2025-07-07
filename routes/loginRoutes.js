const router = require('express').Router();
const loginController  = require("../controllers/loginController");
const { validateSignup, validateLogin } = require('../validators/loginValidators');

// Registrar usuario
router.post("/signup", validateSignup, loginController.signUp);

// Iniciar sesión 
router.post("/login", validateLogin, loginController.login);

// Validar token
router.get('/validar-token', loginController.validarToken, loginController.obtenerUsuario)

// Verificar email
router.get('/:token/verificar-email', loginController.verificarEmail)

module.exports = router
