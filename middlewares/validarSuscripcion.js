const { pool } = require("../initDB");

module.exports = async function validarSuscripcion(req, res, next) {
  try {
    const adminId = req.usuario.owner || req.usuario.id;

    // Obtener la suscripción más reciente
    const { rows } = await pool.query(
      `SELECT plan, fecha_fin, estado
       FROM suscripciones
       WHERE usuario_id = $1
       ORDER BY fecha_inicio DESC
       LIMIT 1`,
      [adminId]
    );

    // Si no hay suscripción → solo lectura
    if (!rows.length) {
      req.modoLectura = true;
      return next();
    }

    const { fecha_fin, estado } = rows[0];
    const ahora = new Date();
    const vence = new Date(fecha_fin);

    // Si venció o está cancelada/inactiva → solo lectura
    if (vence < ahora || estado === "cancelado" || estado === "inactivo") {
      req.modoLectura = true;

      // Opcional: bloquear todas las empresas asociadas
      await pool.query(
        `UPDATE empresas
         SET estado = 'inactivo'
         WHERE owner = $1 AND estado = 'activo'`,
        [adminId]
      );

      // Opcional: bloquear auditores asociados
      await pool.query(
        `UPDATE usuarios
         SET estado = 'bloqueado'
         WHERE owner = $1 AND rol = 'usuario'`,
        [adminId]
      );

      return next();
    }

    // Suscripción activa → modo edición
    req.modoLectura = false;
    next();
  } catch (error) {
    next(error);
  }
};
