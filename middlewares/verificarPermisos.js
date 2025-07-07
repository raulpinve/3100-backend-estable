const { pool } = require("../initDB");
const { throwForbiddenError } = require("../errors/throwHTTPErrors");

const permisosPorRol = {
  admin:   { puede_leer: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
  editor:  { puede_leer: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
  lector:  { puede_leer: true, puede_crear: false, puede_editar: false, puede_eliminar: false }
};

const verificarPermisos = (accion) => async (req, res, next) => {
    try {
        const { id: usuarioId } = req.usuario;
        const empresaId = req.empresaId;

        if (!empresaId) {
            throwForbiddenError("No estás autorizado para realizar esta acción.");
        }

        // 🔐 Si es el dueño (owner), puede hacer todo
        const { rows: rowsEmpresa } = await pool.query(
            `SELECT id FROM empresas WHERE owner = $1 AND id = $2`,
            [usuarioId, empresaId]
        );

        if (rowsEmpresa.length > 0) {
            return next();
        }

        // 👤 Si no es owner, buscar su rol en la empresa
        const { rows } = await pool.query(
            `SELECT rol_empresa FROM usuario_empresa WHERE usuario_id = $1 AND empresa_id = $2`,
            [usuarioId, empresaId]
        );

        if (rows.length === 0) {
            throwForbiddenError("No tienes acceso a esta empresa.");
        }

        const rol = rows[0].rol_empresa;
        const permisos = permisosPorRol[rol];

        if (!permisos?.[`puede_${accion}`]) {
            throwForbiddenError(`Tu rol (${rol}) no te permite realizar esta acción (${accion}).`);
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = verificarPermisos;
