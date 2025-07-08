const { pool } = require("../initDB");
const ROLES_VALIDOS = ["admin", "editor", "lector"];

exports.obtenerEmpresas = async (req, res, next) => {
    try {
        const result = await pool.query("SELECT id, nombre FROM empresas ORDER BY nombre");
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
};

exports.obtenerEmpresasDeUsuario = async (req, res, next) => {
    const { usuarioId } = req.params;

    try {
        const result = await pool.query(
            `SELECT ue.empresa_id, e.nombre, ue.rol_empresa
                FROM usuario_empresa ue
                JOIN empresas e ON ue.empresa_id = e.id
                WHERE ue.usuario_id = $1`,
            [usuarioId]
        );
        res.json(result.rows);
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

        res.json(result.rows[0]);
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
            return res.status(404).json({ error: "Relación no encontrada" });
        }

        res.json({ mensaje: "Acceso eliminado", data: result.rows[0] });
    } catch (err) {
        next(err);
    }
};
