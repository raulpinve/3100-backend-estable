const { pool } = require("../initDB");

module.exports = async function validarSuscripcion(req, res, next) {
    try {
      const adminId = req.usuario.owner || req.usuario.id;

      // Valor por defecto: modo lectura
      req.modoLectura = true;

      // Buscar la suscripción más reciente
      const { rows } = await pool.query(
        `SELECT estado, fecha_fin, plan
          FROM suscripciones 
          WHERE usuario_id = $1 AND estado = 'activo'
          ORDER BY fecha_inicio DESC
          LIMIT 1`,
        [adminId]
      );

      // No hay suscripción → lectura
      if (!rows.length) {
        return next(); // Sigue con modoLectura (true)
      }

      const { estado, fecha_fin } = rows[0];
      const ahora = new Date();
      const vence = new Date(fecha_fin);

      // Suscripción no activa o vencida → lectura
      if (estado !== "activo" || vence < ahora) {
        return next(); // Sigue con modoLectura (true)
      }

      // Si la suscripción es activa y no ha vencido, se permite la edición
      req.modoLectura = false;
      next();

    } catch (error) {
      next(error); // Asegura que cualquier error se pase al siguiente middleware
    }
};
