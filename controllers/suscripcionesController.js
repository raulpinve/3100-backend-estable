const { pool } = require("../initDB");
const { LIMITES_PLANES } = require("../utils/planesUtils");

exports.confirmarDesbloqueo = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const usuarioId = req.usuario.id; 
        const { empresas = [], usuarios = [] } = req.body;

        await client.query("BEGIN");

        // 1️⃣ Obtener suscripción activa
        const { rows } = await client.query(
            `
            SELECT id, plan, pendiente_desbloqueo
            FROM suscripciones
            WHERE usuario_id = $1 AND estado = 'activo'
            FOR UPDATE
            `,
            [usuarioId]
        );

        if (rows.length === 0) {
            throw new Error("No hay suscripción activa");
        }

        const suscripcion = rows[0];

        if (!suscripcion.pendiente_desbloqueo) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "No hay desbloqueo pendiente"
            });
        }

        // 2️⃣ Validar límites del plan
        const limites = LIMITES_PLANES[suscripcion.plan];

        if (empresas.length > limites.empresas) {
            throw new Error("Excede el límite de empresas del plan");
        }

        const totalUsuariosActivos = usuarios.length; 
        if (totalUsuariosActivos > limites.usuarios) {
            throw new Error("Excede el límite de usuarios del plan");
        }

        // 3️⃣ Bloquear TODO primero
        await client.query(
            `
            UPDATE empresas
            SET estado = 'bloqueado'
            WHERE owner = $1
            `,
            [usuarioId]
        );

        await client.query(
            `
            UPDATE usuarios
            SET estado = 'bloqueado'
            WHERE owner = $1
            `,
            [usuarioId]
        );

        // 4️⃣ Activar SOLO los seleccionados
        if (empresas.length > 0) {
            await client.query(
                `
                UPDATE empresas
                SET estado = 'activo'
                WHERE id = ANY($1) AND owner = $2
                `,
                [empresas, usuarioId]
            );
        }

        if (usuarios.length > 0) {
            await client.query(
                `
                UPDATE usuarios
                SET estado = 'activo'
                WHERE id = ANY($1) AND owner = $2
                `,
                [usuarios, usuarioId]
            );
        }

        // 5️⃣ Marcar suscripción como resuelta
        await client.query(
            `
            UPDATE suscripciones
            SET pendiente_desbloqueo = false
            WHERE id = $1
            `,
            [suscripcion.id]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: "Desbloqueo confirmado correctamente"
        });

    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};
