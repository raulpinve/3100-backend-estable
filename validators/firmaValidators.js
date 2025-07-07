const { body } = require("express-validator");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");
const { pool } = require("../initDB");
const { validarUUID } = require("../utils/utils");

const validarCrearFirma = [
    body("nombresCompletos")
        .optional()
        .isLength({ min: 2 }).withMessage("El nombre completo debe tener al menos dos caracteres.")
        .isLength({ max: 100 }).withMessage("El nombre completo no puede tener más de 100 caracteres.")
        .custom(async (value, { req }) => {
            const { auditoriaId } = req.params;

            // Buscar firma por nombre (case insensitive)
            const { rows: firmas } = await pool.query(
                `SELECT * FROM firmas WHERE LOWER(nombres_completos) = LOWER($1)`,
                [value]
            );
            if (firmas.length > 0) {
                const firma = firmas[0];

                // Verificar si ya está asociada a la auditoría
                const { rows: relaciones } = await pool.query(
                    `SELECT * FROM auditoria_firma WHERE auditoria_id = $1 AND firma_id = $2`,
                    [auditoriaId, firma.id]
                );
                if (relaciones.length > 0) {
                    throw new Error("Ya has usado la firma de este usuario en esta auditoría.");
                }
            }
            return true;
        }),

    body("rol")
        .optional()
        .isIn(["auditor", "auditado"])
        .withMessage('Debe seleccionar un rol válido: "Auditado" y "Auditor"'),

    body("usuario")
        .optional({ checkFalsy: true })
        .isUUID().withMessage("El usuario seleccionado no es correcto.")
        .custom(async (value, { req }) => {
            const { auditoriaId } = req.params;

            // Verificar existencia del usuario
            const { rows: usuarios } = await pool.query(
                `SELECT * FROM usuarios WHERE id = $1`,
                [value]
            );
            if (usuarios.length === 0) {
                throw new Error("El usuario seleccionado no existe.");
            }

            // Verificar firma del usuario
            const { rows: firmas } = await pool.query(
                `SELECT * FROM firmas WHERE usuario_id = $1`,
                [value]
            );
            if (firmas.length === 0) {
                throw new Error("El usuario no tiene una firma registrada");
            }

            const firma = firmas[0];

            // Verificar si la firma ya fue usada en esta auditoría
            const { rows: relaciones } = await pool.query(
                `SELECT * FROM auditoria_firma WHERE auditoria_id = $1 AND firma_id = $2`,
                [auditoriaId, firma.id]
            );
            if (relaciones.length > 0) {
                throw new Error("Ya has usado la firma de este usuario en esta auditoría.");
            }

            return true;
        }),

    manejarErroresDeValidacion
];

const validarFirmaId = async (req, res, next) => {
    try {
        const { firmaId } = req.params;

        if (!validarUUID(firmaId)) {
            throwNotFoundError("La firma seleccionada no es válida.");
        }

        const { rows: firmas } = await pool.query(
            `SELECT * FROM firmas WHERE id = $1`,
            [firmaId]
        );

        if (firmas.length === 0) {
            throwNotFoundError("La firma seleccionada no existe.");
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports ={
    validarCrearFirma,
    validarFirmaId
}