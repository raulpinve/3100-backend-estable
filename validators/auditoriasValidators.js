const { body } = require("express-validator");
const { pool } = require("../initDB");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");
const { throwNotFoundError } = require("../errors/throwHTTPErrors");

// Estados permitidos
const estadosValidos = ["pendiente", "enProgreso", "revisada", "aprobada", "rechazada"];

const validarEstadoFecha = () => [
    body("estado")
        .isIn(estadosValidos)
        .withMessage(`Debe seleccionar una opción correcta. Valores válidos: ${estadosValidos.join(", ")}`),
    body("fechaAuditoria")
        .isISO8601()
        .withMessage("La fecha debe estar en formato YYYY-MM-DD"),
];

const validarCrearAuditoria = [
    ...validarEstadoFecha(),

    body("criteriosEvaluacion")
        .isArray({ min: 1 })
        .withMessage("Debe seleccionar al menos un estándar o servicio.")
        .custom(async (criterios) => {
            const criteriosUnicos = [...new Set(criterios.map(id => id.toString()))];
            const result = await pool.query(
                `SELECT id FROM criterios_evaluacion WHERE id = ANY($1::uuid[])`,
                [criteriosUnicos]
            );
            if (result.rowCount !== criteriosUnicos.length) {
                throw new Error("Uno o más criterios no existen.");
            }
            return true;
        }),

    body("empresaId")
        .isUUID()
        .custom(async value => {
            const result = await pool.query("SELECT id FROM empresas WHERE id = $1", [value]);
            if (result.rowCount === 0) {
                throw new Error("La empresa seleccionada no existe");
            }
            return true;
        }),

    manejarErroresDeValidacion,
];

const validarEditarAuditoria = [
    ...validarEstadoFecha(),
    manejarErroresDeValidacion,
];

const validarAuditoriaId = async (req, res, next) => {
    try {
        const id = Number(req.params.auditoriaId);

        if (!Number.isInteger(id)) {
            throwNotFoundError("El ID de auditoría no es válido.");
        }

        const { rows } = await pool.query(`
            SELECT 
                a.id AS auditoria_id,
                e.id AS empresa_id,
                e.estado,
                e.owner
            FROM auditorias a
            JOIN empresas e ON e.id = a.empresa_id
            WHERE a.id = $1
        `, [id]);

        if (!rows.length) {
            throwNotFoundError("Auditoría no existe.");
        }
        req.auditoria = {
            id: rows[0].auditoria_id
        };

        req.empresa = {
            id: rows[0].empresa_id,
            estado: rows[0].estado,
            owner: rows[0].owner
        };

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
  validarCrearAuditoria,
  validarEditarAuditoria,
  validarAuditoriaId,
}