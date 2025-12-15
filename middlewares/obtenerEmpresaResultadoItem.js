const { throwServerError, throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");

const obtenerEmpresaResultadoItem = async (req, res, next) => {
    try {
        const resultadoItemId = req.params?.resultadoItemId || req.body?.resultadoItemId;

        if (!resultadoItemId) {
            throwServerError("Debe pasar el ID del ítem de resultado.");
        }

        const { rows } = await pool.query(`
            SELECT 
                e.id     AS empresa_id,
                e.estado AS empresa_estado,
                e.owner  AS empresa_owner
            FROM resultados_items_evaluacion rie
            JOIN auditorias a ON a.id = rie.auditoria_id
            JOIN empresas   e ON e.id = a.empresa_id
            WHERE rie.id = $1
        `, [resultadoItemId]);

        if (rows.length === 0) {
            throwNotFoundError("El ítem de resultado no existe.");
        }

        req.empresa = {
            id: rows[0].empresa_id,
            estado: rows[0].empresa_estado,
            owner: rows[0].empresa_owner
        };

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = obtenerEmpresaResultadoItem