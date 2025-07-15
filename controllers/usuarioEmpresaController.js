const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { snakeToCamel } = require("../utils/utils");
const ROLES_VALIDOS = ["admin", "editor", "lector"];

exports.obtenerEmpresas = async (req, res, next) => {
    try {
        const result = await pool.query("SELECT id, nombre FROM empresas ORDER BY nombre");
        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: result.rows.map(snakeToCamel)
        });
    } catch (err) {
        next(err);
    }
};

exports.obtenerEmpresasDeUsuario = async (req, res, next) => {
    const { usuarioId } = req.params;

    try {
        const usuarioQuery = await pool.query("SELECT * FROM usuarios WHERE id = $1", [usuarioId]);
        if(!usuarioQuery) {
            throwNotFoundError("El usuario seleccionado no existe");
        }
        const rol = usuarioQuery.rows[0].rol;
        let query;

        if(rol === "administrador"){
            query = `SELECT * FROM empresas WHERE owner = $1`
        }else {
            query = `SELECT e.*, ue.rol_empresa FROM empresas as e
                    JOIN usuario_empresa as ue
                    ON ue.empresa_id = e.id
                    WHERE ue.usuario_id = $1`
        }
        const result = await pool.query( query, [usuarioId] );
       
        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: result.rows.map(snakeToCamel)
        });
    } catch (err) {
        next(err);
    }
};

exports.asignarActualizarRolEmpresa = async (req, res, next) => {
    const { usuarioId, empresaId } = req.params;
    const { rolEmpresa } = req.body;

    if (!ROLES_VALIDOS.includes(rolEmpresa)) {
        return res.status(400).json({ error: "Rol inválido." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO usuario_empresa (usuario_id, empresa_id, rol_empresa)
            VALUES ($1, $2, $3)
            ON CONFLICT (usuario_id, empresa_id)
            DO UPDATE SET rol_empresa = EXCLUDED.rol_empresa
            RETURNING *`,
            [usuarioId, empresaId, rolEmpresa]
        );

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(result.rows[0])
        });
    } catch (err) {
        next(err);
    }
};

exports.eliminarAccesoEmpresa = async (req, res, next) => {
    const { usuarioId, empresaId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM usuario_empresa
            WHERE usuario_id = $1 AND empresa_id = $2
            RETURNING *`,
            [usuarioId, empresaId]
        );

        if (result.rowCount === 0) {
            throwNotFoundError("Relación no encontrada");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(result.rows[0])
        });
    } catch (err) {
        next(err);
    }
};
