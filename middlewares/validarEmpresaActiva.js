const { throwForbiddenError } = require("../errors/throwHTTPErrors");

module.exports = function validarEmpresaActiva(req, res, next) {
  const empresa = req.empresa;

  if (!empresa) {
    throwForbiddenError("Empresa no encontrada o no asociada al recurso.");
  }

  // ❌ Empresa eliminada → bloqueo total
  if (empresa.estado === "eliminado") {
    throwForbiddenError("La empresa ha sido eliminada.");
  }

  // ⚠️ Empresa bloqueada → solo lectura
  if (empresa.estado === "bloqueado") {
    req.modoLectura = true;
  }

  // ✅ Empresa activa → no hace nada
  next();
};
