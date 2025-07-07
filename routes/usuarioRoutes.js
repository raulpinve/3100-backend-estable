const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { validarActualizarUsuario, validarCrearUsuario } = require("../validators/usuarioValidators");
const verificarPermisosSuperadministradores = require("../middlewares/verificarPermisosSuperadministradores");

// Crear usuario 
router.post("/",
  validarCrearUsuario,
  verificarPermisosSuperadministradores,
  usuarioController.crearUsuario
);

// Obtener todos los usuarios
router.get("/",
  verificarPermisosSuperadministradores,
  usuarioController.obtenerUsuarios
);

// Obtener un usuario por ID
router.get("/:usuarioId",
  verificarPermisosSuperadministradores,
  usuarioController.obtenerUsuario
);

// Actualizar usuario
router.put("/:usuarioId",
  validarActualizarUsuario,
  verificarPermisosSuperadministradores,
  usuarioController.actualizarUsuario
);

// Eliminar usuario (borrado lógico)
router.delete("/:usuarioId",
  verificarPermisosSuperadministradores,
  usuarioController.eliminarUsuario
);

module.exports = router;
