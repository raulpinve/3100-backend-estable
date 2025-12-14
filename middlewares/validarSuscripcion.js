const { pool } = require("../initDB");

  module.exports = async function validarSuscripcion(req, res, next) {
    try {
      const adminId = req.usuario.owner || req.usuario.id;

      // Obtener la suscripción activa más reciente que aún no haya vencido
      const { rows } = await pool.query(
        `SELECT plan, fecha_fin, estado
        FROM suscripciones
        WHERE usuario_id = $1
          AND estado = 'activo'
          AND fecha_fin >= NOW()
        ORDER BY fecha_fin DESC
        LIMIT 1`,
        [adminId]
      );

      // Si no hay suscripción vigente → modo lectura
      if (!rows.length) {
        req.modoLectura = true;
        return next();
      }

      const { fecha_fin, estado } = rows[0];
      const ahora = new Date();
      const vence = new Date(fecha_fin);

      // Si venció o está cancelada/inactiva → modo lectura
      if (vence < ahora || estado === "cancelado" || estado === "inactivo") {
        req.modoLectura = true;

        // Bloquear empresas activas solo si realmente están activas
        await pool.query(
          `UPDATE empresas
          SET estado = 'inactivo'
          WHERE owner = $1 AND estado = 'activo'`,
          [adminId]
        );

        // Bloquear auditores activos solo si su estado es activo
        await pool.query(
          `UPDATE usuarios
          SET estado = 'bloqueado'
          WHERE owner = $1 AND rol = 'usuario' AND estado = 'activo'`,
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
