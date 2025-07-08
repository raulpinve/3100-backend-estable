const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { validarActualizarUsuario, validarCrearUsuario } = require("../validators/usuarioValidators");
const verificarPermisosAdministradores = require("../middlewares/verificarPermisosAdministradores");
const { validarUsuarioId } = require("../validators/perfilValidators");

// Crear usuario 
router.post("/",
  validarCrearUsuario,
  verificarPermisosAdministradores,
  usuarioController.crearUsuario
);

// Obtener todos los usuarios
router.get("/",
  verificarPermisosAdministradores,
  usuarioController.obtenerUsuarios
);

// Obtener un usuario por ID
router.get("/:usuarioId",
  validarUsuarioId,
  verificarPermisosAdministradores,
  usuarioController.obtenerUsuario
);

// Actualizar usuario
router.put("/:usuarioId",
  validarUsuarioId,
  validarActualizarUsuario,
  verificarPermisosAdministradores,
  usuarioController.actualizarUsuario
);

// Eliminar usuario (borrado lógico)
router.delete("/:usuarioId",
  validarUsuarioId,
  verificarPermisosAdministradores,
  usuarioController.eliminarUsuario
);

module.exports = router;
