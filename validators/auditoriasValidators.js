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
        const { auditoriaId } = req.params;
        const id = parseInt(auditoriaId);

        if (isNaN(id)) {
            throwNotFoundError("El ID de auditoría no es válido.");
        }

        const result = await pool.query("SELECT id FROM auditorias WHERE id = $1", [id]);
        if (result.rowCount === 0) {
            throwNotFoundError("Auditoría no existe.");
        }
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