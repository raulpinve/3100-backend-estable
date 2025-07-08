const { body } = require("express-validator");
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion");
const { pool } = require("../initDB");

const validatePassword = () => 
    body("password")
        .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]:;"'<>,.?\\/]).{8,20}$/)
        .withMessage("La contraseña debe tener al menos una letra mayúscula, un número, un carácter especial y entre 8 y 20 caracteres.");

const validarCrearUsuario = [
    body("primerNombre")
        .notEmpty().withMessage("Debe proporcionar un nombre.")
        .isLength({ min: 2, max: 30 }).withMessage("El nombre debe tener entre 2 y 30 caracteres."),
    body("apellidos")
        .notEmpty().withMessage("Debe proporcionar los apellidos.")
        .isLength({ min: 2, max: 60 }).withMessage("Los apellidos deben tener entre 2 y 60 caracteres."),
    body("email")
        .notEmpty().withMessage("Debe proporcionar un E-mail.")
        .isEmail().withMessage("Escriba un e-mail correcto.")
        .custom(async email => {
            const { rowCount } = await pool.query("SELECT 1 FROM usuarios WHERE email = $1 AND estado != 'eliminado'", [ email ]);
            if(rowCount > 0){
                throw new Error("El e-mail ya está registrado.");
            }
        }),
    body("username")
        .notEmpty().withMessage("Debe proporcionar un username.")
        .matches(/^[a-zA-Z0-9_]{3,20}$/)
        .withMessage("El username debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos.")
        .custom(async username => {
            const { rowCount } = await pool.query("SELECT 1 FROM usuarios WHERE username = $1 AND estado != 'eliminado'", [ username ]);
            if(rowCount > 0){
                throw new Error("El username ya está en uso.");
            }
        }),
    validatePassword(),
    manejarErroresDeValidacion
];

const validarActualizarUsuario = [
    body("primerNombre")
        .optional()
        .isLength({ min: 2, max: 30 }).withMessage("El nombre debe tener entre 2 y 30 caracteres."),
    body("apellidos")
        .optional()
        .isLength({ min: 2, max: 60 }).withMessage("Los apellidos deben tener entre 2 y 60 caracteres."),
    body("username")
        .optional()
        .matches(/^[a-zA-Z0-9_]{3,20}$/)
        .withMessage("El username debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos.")
        .custom(async (username, { req }) => {
            const id = req.params.id;
            const { rowCount } = await pool.query("SELECT 1 FROM usuarios WHERE username = $1 AND id != $2 AND estado != 'eliminado'", [ username, id ]);
            if(rowCount > 0){
                throw new Error("El username ya está en uso.");
            }
        }),
    manejarErroresDeValidacion
];


module.exports = {
  validarCrearUsuario,
  validarActualizarUsuario,
};
