const { body } = require("express-validator");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");
const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { validarUUID } = require("../utils/utils");

const tiposPermitidos = ['estandar', 'servicio', 'otros_criterios'];

//  Validar si el grupo existe
const grupoExiste = async (grupoId) => {
    const result = await pool.query(
        `SELECT id FROM grupos_autoevaluacion WHERE id = $1`,
        [grupoId]
    );
    return result.rowCount > 0;
};

//  Validar creación de criterio
const validarCrearCriterio = [
    body("nombre")
        .isLength({ min: 2 }).withMessage("El nombre debe tener al menos dos caracteres.")
        .isLength({ max: 200 }).withMessage("El nombre no puede tener más de 200 caracteres."),

    body("tipo")
        .isIn(tiposPermitidos).withMessage(`El tipo debe ser uno de: ${tiposPermitidos.join(', ')}`),

    body("grupoId")
        .custom(async (value) => {
            if (!validarUUID(value)) {
                throw new Error("El ID del grupo no es válido");
            }
            const existe = await grupoExiste(value);
            if (!existe) {
                throw new Error("Grupo no encontrado.");
            }
            return true;
        }),

    manejarErroresDeValidacion
];

// Validar actualización de criterio
const validarActualizarCriterio = [
    body("nombre")
        .optional()
        .isLength({ min: 2 }).withMessage("El nombre debe tener al menos dos caracteres.")
        .isLength({ max: 200 }).withMessage("El nombre no puede tener más de 200 caracteres."),

    body("tipo")
        .optional()
        .isIn(tiposPermitidos).withMessage(`El tipo debe ser uno de: ${tiposPermitidos.join(', ')}`),

    body("grupoId")
        .optional()
        .custom(async (value) => {
            if (!validarUUID(value)) {
                throw new Error("El grupo no es válido");
            }
            const existe = await grupoExiste(value);
            if (!existe) {
                throw new Error("El grupo no existe");
            }
            return true;
        }),

    manejarErroresDeValidacion
];

// Validar que el ID del criterio exista
const validarCriterioId = async (req, res, next) => {
    try {
        const { criterioId } = req.params;

        if (!validarUUID(criterioId)) {
            throwNotFoundError("Criterio no encontrado");
        }

        const result = await pool.query(
            `SELECT id FROM criterios_evaluacion WHERE id = $1`,
            [criterioId]
        );

        if (result.rowCount === 0) {
            throwNotFoundError("Criterio no encontrado");
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validarCrearCriterio,
    validarActualizarCriterio,
    validarCriterioId
};
