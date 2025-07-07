const manejarErroresDeValidacion = require("./manejarErroresDeValidacion")
const { throwNotFoundError } = require("../errors/throwHTTPErrors")
const { body } = require("express-validator")
const { validarUUID } = require("../utils/utils")
const { pool } = require("../initDB")

const validarCrearEmpresa = [
    body("nombre")
        .isLength({ min: 2 }).withMessage('El nombre debe tener al menos dos caracteres.')
        .isLength({ max: 100 }).withMessage('El nombre no puede tener más de 100 caracteres.')
        .custom(async (value, { req }) => {
            const ownerId = req.usuario.id;

            const query = `
                SELECT 1 FROM empresas
                WHERE LOWER(nombre) = LOWER($1) AND owner = $2
                LIMIT 1
            `;

            const { rowCount } = await pool.query(query, [value, ownerId]);
            if (rowCount > 0) {
                throw new Error('Ya hay otra empresa registrada con este nombre.');
            }

            return true;
        }),
    manejarErroresDeValidacion
]

const validarActualizarEmpresa = [
    body("nombre")
        .isLength({ min: 2 }).withMessage('El nombre debe tener al menos dos caracteres.')
        .isLength({ max: 100 }).withMessage('El nombre no puede tener más de 100 caracteres.')
        .custom(async (value, { req }) => {
            const ownerId = req.usuario.id;
            const empresaId = req.params.empresaId;

            const query = `
                SELECT id FROM empresas 
                WHERE LOWER(nombre) = LOWER($1) 
                AND owner = $2 
                AND id <> $3
                LIMIT 1
            `;

            const { rowCount } = await pool.query(query, [value, ownerId, empresaId]);
            if (rowCount > 0) {
                throw new Error('Ya hay otra empresa registrada con este nombre.');
            }

            return true;
        }),
    manejarErroresDeValidacion
];

const validarEmpresaId = async (req, res, next) => {
    try {
        const { empresaId } = req.params;

        // Validar formato UUID
        if (!validarUUID(empresaId)) {
            throwNotFoundError('La empresa seleccionada no existe.');
        }

        // Verificar existencia en la base de datos
        const query = 'SELECT id FROM empresas WHERE id = $1';
        const { rowCount } = await pool.query(query, [empresaId]);

        if (rowCount === 0) {
            throwNotFoundError('La empresa seleccionada no existe.');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validarCrearEmpresa, 
    validarActualizarEmpresa,
    validarEmpresaId
}