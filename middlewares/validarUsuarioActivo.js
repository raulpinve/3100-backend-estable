// middlewares/validarUsuarioActivo.js
const { throwForbiddenError } = require("../errors/throwHTTPErrors");

module.exports = function validarUsuarioActivo(req, res, next) {
  const usuario = req.usuario;

  if (!usuario) {
    throwForbiddenError("Usuario no autenticado.");
  }

  // ❌ Usuario eliminado → bloqueo total
  if (usuario.estado === "eliminado") {
    throwForbiddenError("No tienes permisos para realizar esta acción.");
  }

  // ⚠️ Usuario bloqueado → solo lectura
  if (usuario.estado === "bloqueado") {
    req.modoLectura = true;
  }

  // ✅ Usuario activo → no hace nada
  next();
};