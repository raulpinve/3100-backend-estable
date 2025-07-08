const express = require("express");
const router = express.Router();

const { obtenerEmpresas,
  obtenerEmpresasDeUsuario,
  asignarActualizarRolEmpresa,
  eliminarAccesoEmpresa,
} = require("../controllers/usuarioEmpresaController");

// Obtener empresas
router.get("/empresas", obtenerEmpresas);

// Obtener empresa del usuario
router.get("/usuarios/:usuarioId/empresas", obtenerEmpresasDeUsuario);

// Actualizar rol del usuario
router.put("/usuarios/:usuarioId/empresas/:empresaId", asignarActualizarRolEmpresa);

// Eliminar el rol del usuario en la empresa
router.delete("/usuarios/:usuarioId/empresas/:empresaId", eliminarAccesoEmpresa);

module.exports = router;
