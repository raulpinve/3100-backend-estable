// validarAccesoPorRecurso.js
module.exports = function(resourceTable, resourceEmpresaIdField) {
  return async function(req, res, next) {
    try {
      const adminId = req.usuario.owner || req.usuario.id;

      // 1️⃣ Validar suscripción
      const { rows: sub } = await pool.query(
        `SELECT plan, fecha_fin, estado
         FROM suscripciones
         WHERE usuario_id = $1
         ORDER BY fecha_inicio DESC
         LIMIT 1`,
        [adminId]
      );

      let modoLectura = false;
      if (!sub.length || sub[0].estado !== "activo" || new Date(sub[0].fecha_fin) < new Date()) {
        modoLectura = true;
      }

      // 2️⃣ Obtener la empresa a partir del recurso
      const { rows: recurso } = await pool.query(
        `SELECT ${resourceEmpresaIdField} as empresa_id FROM ${resourceTable} WHERE id = $1`,
        [req.params.id] // suponiendo que el recurso tiene id en params
      );

      if (!recurso.length) return res.status(404).json({ error: "Recurso no encontrado" });

      const empresaId = recurso[0].empresa_id;

      const { rows: empresa } = await pool.query(
        `SELECT estado FROM empresas WHERE id = $1`,
        [empresaId]
      );

      if (!empresa.length) return res.status(404).json({ error: "Empresa asociada no encontrada" });

      if (empresa[0].estado === "inactivo") {
        modoLectura = true;
      }

      // 3️⃣ Validar estado del usuario
      if (req.usuario.estado === "bloqueado") {
        modoLectura = true;
      }

      req.modoLectura = modoLectura;
      next();
    } catch (err) {
      next(err);
    }
  };
};
