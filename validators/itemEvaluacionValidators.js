const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");
const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { body } = require("express-validator");
const { pool } = require("../initDB");
const { validarUUID } = require("../utils/utils");

const regexItem = /^\d+(\.\d+)*$/;
const arrayEstandar = [
    "talentoHumano", "infraestructura", "dotacion", "medicamentos",
    "procesosPrioritarios", "historiaClinica", "interdependencia", "noAplica", "noEvaluable"
];

const validarItem = () => [
    body("descripcion")
        .isLength({ min: 10 }).withMessage('La descripción debe tener al menos 10 caracteres.')
        .isLength({ max: 1000 }).withMessage('La descripción no puede tener más de 1000 caracteres.'),

    body("estandar")
        .isIn(arrayEstandar)
        .withMessage('Debe seleccionar un estandar correcto.'),

    body("esEvaluable")
        .isBoolean()
        .withMessage('esEvaluable debe ser de tipo booleano'),

    body("ocultarItem")
        .isBoolean()
        .withMessage('ocultarItem debe ser de tipo booleano'),
    
    body("highlightColor")
        .custom((value) => {
            if (value === null || value === "") return true;
            return ["yellow", "red", "gray", "blue", "green"].includes(value);
        })
        .withMessage("highlightColor debe ser un color válido, vacío o null.")
];

// Crear item
const validarCrearItem = [
    ...validarItem(),
    body("criterioId")
        .custom(async value => {
            const criterio = await pool.query("SELECT id FROM criterios_evaluacion WHERE id = $1", [value]);
            if (criterio.rowCount === 0) throw new Error("Criterio no encontrado");
                return true;
        }),

    body("item")
        .matches(regexItem).withMessage('El formato no es válido. Debe ser como "1", "1.1", "1.1.1", etc.')
        .custom(async (value, { req }) => {
            const { criterioId } = req.body;
            if (value && criterioId) {
                const existe = await pool.query(
                    `SELECT id FROM items_evaluacion WHERE item = $1 AND criterio_id = $2`,
                    [value, criterioId]
                );
                if (existe.rowCount > 0) {
                    throw new Error("El ítem ya se encuentra en uso.");
                }
            }
            return true;
        }),
    manejarErroresDeValidacion
];

// Actualizar item
const validarActualizarItem = [
    ...validarItem(),
    body("item")
        .optional()
        .matches(regexItem).withMessage('El formato no es válido. Debe ser como "1", "1.1", "1.1.1", etc.')
        .custom(async (value, { req }) => {
            const itemId = req.params.itemId;
            if (value) {
                const actual = await pool.query("SELECT * FROM items_evaluacion WHERE id = $1", [itemId]);
                if (actual.rowCount === 0) throw new Error("Item no encontrado");

                const { criterio_id: criterioId, item } = actual.rows[0];

                if (item !== value) {
                    const existe = await pool.query(
                        `SELECT id FROM items_evaluacion WHERE item = $1 AND criterio_id = $2 AND id <> $3`,
                        [value, criterioId, itemId]
                    );
                    if (existe.rowCount > 0) {
                        throw new Error("El ítem ya se encuentra en uso.");
                    }
                }
            }
            return true;
        }),
    manejarErroresDeValidacion
];

// Validar ID (existencia y número entero)
const validarItemId = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        if (!validarUUID(itemId)) {
            throwNotFoundError("El ID del item de evaluación no es correcto.");
        }
        const result = await pool.query("SELECT id FROM items_evaluacion WHERE id = $1", [itemId]);
        if (result.rowCount === 0) {
            throwNotFoundError("Item de evaluación no encontrado");
        }
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
  validarCrearItem,
  validarActualizarItem,
  validarItemId
};
