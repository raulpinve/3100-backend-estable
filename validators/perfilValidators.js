const { body } = require("express-validator");
const { pool } = require("../initDB");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");
const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { validarUUID } = require("../utils/utils");

const validarUsuarioId = async (req, res, next) => {
    try {
        const { usuarioId } = req.params;
        if (!validarUUID(usuarioId)) {
            throwNotFoundError("El ID del usuario no es correcto.");
        }

        const { rows } = await pool.query(`SELECT id FROM usuarios WHERE id = $1`, [usuarioId]);
        if (rows.length === 0) {
            throwNotFoundError("Usuario no encontrado.");
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Validar email: formato válido + unicidad (excepto si es el mismo usuario)
 */
const validateEmail = [
    body("email")
        .isEmail().withMessage("Escriba un e-mail correcto.")
        .custom(async (value, { req }) => {
            const usuarioId = req.usuario.id; // asumimos que lo guarda tu middleware de auth
            const normalizedEmail = value.toLowerCase();

            const { rows } = await pool.query(
                `SELECT id FROM usuarios WHERE email = $1`,
                [normalizedEmail]
            );

            if (rows.length > 0 && rows[0].id !== usuarioId) {
                throw new Error("El e-mail ya se encuentra en uso.");
            }

            return true;
        }),
    manejarErroresDeValidacion
];

/**
 * Validar actualización de perfil: nombre, apellidos y username
 */
const validateActualizarPerfil = [
    body("primerNombre")
        .isLength({ min: 2 }).withMessage("El nombre debe tener al menos dos caracteres.")
        .isLength({ max: 30 }).withMessage("El nombre no puede tener más de 30 caracteres."),
    body("apellidos")
        .isLength({ min: 2 }).withMessage("Los apellidos deben tener al menos dos caracteres.")
        .isLength({ max: 60 }).withMessage("Los apellidos no pueden tener más de 60 caracteres."),
    body("username")
        .matches(/^[a-zA-Z0-9_]{3,20}$/)
        .withMessage("El username debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos.")
        .custom(async (username, { req }) => {
            const usuarioId = req.usuario.id;
            const usernameLower = username.toLowerCase();

            const { rows } = await pool.query(
                `SELECT id FROM usuarios WHERE LOWER(username) = $1`,
                [usernameLower]
            );

            if (rows.length > 0 && rows[0].id !== usuarioId) {
                throw new Error("El username ya está en uso por otro usuario.");
            }

            return true;
        }),
    manejarErroresDeValidacion
];

// Validar actualizar contraseña
const validarActualizarPassword = [
    body("currentPassword")
        .notEmpty().withMessage("Debe ingresar la contraseña actual."),

    body("newPassword")
        .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}[\]:;"'<>,.?\\/]).{8,20}$/)
        .withMessage("La nueva contraseña debe tener al menos una letra mayúscula, un número, un carácter especial y tener entre 8 y 20 caracteres de longitud."),

    manejarErroresDeValidacion,
];

module.exports = {
  validarUsuarioId,
  validateEmail,
  validateActualizarPerfil,
  validarActualizarPassword
};
