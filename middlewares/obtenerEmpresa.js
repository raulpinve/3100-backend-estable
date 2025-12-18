const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { validarUUID } = require("../utils/utils");

const obtenerEmpresaId = async (req, res, next) => {
    try {
        const empresaId = req?.params?.empresaId || req?.body?.empresaId;
        if (!validarUUID(empresaId)) {
            throwNotFoundError("El ID de empresa no es válido.");
        }

        const { rows } = await pool.query(`
            SELECT 
                id,
                estado,
                owner
            FROM empresas
            WHERE id = $1
        `, [empresaId]);

        if (!rows.length) {
            throwNotFoundError("Empresa no existe.");
        }

        // Contexto consistente con el resto de tu app
        req.empresaId = rows[0].id;

        req.empresa = {
            id: rows[0].id,
            estado: rows[0].estado,
            owner: rows[0].owner
        };

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = obtenerEmpresaId;
