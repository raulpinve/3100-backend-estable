const { body } = require("express-validator")
const manejarErroresDeValidacion = require("./manejarErroresDeValidacion")
const { pool } = require("../initDB")

const validatePassword = () => [
    body("password")
        .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-\={}[\]:;\""<>,.?\\/]).{8,20}$/)
        .withMessage("La contraseña debe tener al menos una letra mayúscula, un número, un carácter especial y tener entre 8 y 20 caracteres de longitud."),
]
const validateUsername = () => [
    body("username")
        .notEmpty().withMessage("Debe proporcionar un username.")
        .matches(/^[a-zA-Z0-9_]{3,20}$/)
        .withMessage("El username debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos."),
]

const validateSignup = [
    body("primerNombre")
        .notEmpty().withMessage("Debe proporcionar un nombre")
        .isLength({ min: 2 }).withMessage("El nombre debe tener al menos dos caracteres.")
        .isLength({ max: 30 }).withMessage("El nombre no puede tener más de 30 caracteres."),
    body("apellidos")
        .notEmpty().withMessage("Debe proporcionar los apellidos")
        .isLength({ min: 2 }).withMessage("Los apellidos deben tener al menos dos caracteres.")
        .isLength({ max: 60 }).withMessage("Los apellidos no pueden tener más de 60 caracteres."),
    body("email")
        .notEmpty().withMessage("Debe proporcionar un E-mail")
        .isEmail().withMessage("Escriba un e-mail correcto.")
        .custom(async email => {
            const { rowCount } = await pool.query("SELECT 1 FROM usuarios WHERE email = $1", [ email ]);
            if(rowCount > 0){
                throw new Error("El e-mail ya está registrado.")
            }
            return true
        }),
    body("username")
        .notEmpty().withMessage("Debe proporcionar un username")
        .matches(/^[a-zA-Z0-9_]{3,20}$/)
        .withMessage("El username debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos.")
        .custom(async username => {
            const { rowCount } = await pool.query("SELECT 1 FROM usuarios WHERE username = $1", [ username ]);
            if(rowCount > 0){
                throw new Error("El e-mail ya está registrado.")
            }
            return true
        }),
    validatePassword(),
    manejarErroresDeValidacion
]

const validateLogin = [
    validateUsername(),
    validatePassword(),    
    manejarErroresDeValidacion
]

const validateSolicitudResetearContrasena  = [
    validateUsername(),
    manejarErroresDeValidacion
]

const validateResetPassword = [
    validatePassword(),  
    manejarErroresDeValidacion
]

module.exports = {
    validateSignup, 
    validateLogin,
    validateSolicitudResetearContrasena, 
    validateResetPassword
}
