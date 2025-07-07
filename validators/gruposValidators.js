const { body } = require("express-validator");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");
const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { validarUUID } = require("../utils/utils");

// Verifica si un nombre ya existe (sin importar mayúsculas/minúsculas)
const nombreExiste = async (nombre) => {
    const result = await pool.query(
        `SELECT * FROM grupos_autoevaluacion WHERE LOWER(nombre) = LOWER($1) LIMIT 1`,
        [nombre]
    );
    return result.rows[0];
};

// Validar creación de grupo
const validarCrearGrupo = [
    body("nombre")
        .isLength({ min: 2 }).withMessage("El nombre debe tener al menos dos caracteres.")
        .isLength({ max: 200 }).withMessage("El nombre no puede tener más de 200 caracteres.")
        .custom(async (value) => {
            const grupoExistente = await nombreExiste(value);
            if (grupoExistente) {
                throw new Error("El nombre ya se encuentra en uso");
            }
            return true;
        }),
    manejarErroresDeValidacion
];

// Validar actualización de grupo
const validarActualizarGrupo = [
    body("nombre")
        .isLength({ min: 2 }).withMessage("El nombre debe tener al menos dos caracteres.")
        .isLength({ max: 200 }).withMessage("El nombre no puede tener más de 200 caracteres.")
        .custom(async (value, { req }) => {
            const grupoExistente = await nombreExiste(value);
            if (grupoExistente && grupoExistente.id.toString() !== req.params.id) {
                throw new Error("El nombre ya se encuentra en uso");
            }
            return true;
        }),
    manejarErroresDeValidacion
];

// Validar que el ID exista en la base de datos
const validarGrupoId = async (req, res, next) => {
    try {
        const { grupoId } = req.params;

        // Asegúrate de que sea un número válido
        if (!validarUUID(grupoId)) {
            throwNotFoundError("Grupo no encontrado");
        }
        const result = await pool.query(
            `SELECT id FROM grupos_autoevaluacion WHERE id = $1`,
            [grupoId]
        );

        if (result.rowCount === 0) {
            throwNotFoundError("Grupo no encontrado");
        }
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validarCrearGrupo,
    validarActualizarGrupo,
    validarGrupoId
};
