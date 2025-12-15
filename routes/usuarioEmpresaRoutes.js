const express = require("express");
const router = express.Router();
const { validarUsuarioId } = require("../validators/perfilValidators");
const modoSoloLectura = require("../middlewares/modoSoloLectura");
const { obtenerEmpresas,
  obtenerEmpresasDeUsuario,
  asignarActualizarRolEmpresa,
  eliminarAccesoEmpresa,
} = require("../controllers/usuarioEmpresaController");

// Aplica el modo solo lectura
router.use(modoSoloLectura);

// Obtener empresas
router.get("/empresas", obtenerEmpresas);

// Obtener empresa del usuario
router.get("/usuarios/:usuarioId/empresas",
  validarUsuarioId,
  obtenerEmpresasDeUsuario
);

// Actualizar rol del usuario
router.put("/usuarios/:usuarioId/empresas/:empresaId", asignarActualizarRolEmpresa);

// Eliminar el rol del usuario en la empresa
router.delete("/usuarios/:usuarioId/empresas/:empresaId", eliminarAccesoEmpresa);

module.exports = router;
