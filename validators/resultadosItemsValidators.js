const { param, body } = require('express-validator');

// Validación para actualizar resultado
const validarActualizarResultado = [
	param('resultadoItemId')
		.isInt().withMessage('El ID del resultado debe ser un número entero'),

	body('resultado')
		.exists().withMessage('El resultado es obligatorio')
		.isIn(['cumple', 'noCumple', 'noAplica', 'cumpleParcial'])
		.withMessage('El resultado debe ser uno de: cumple, noCumple, noAplica, cumpleParcial')
];

// Validación para actualizar observaciones
const validarActualizarObservaciones = [
	param('resultadoItemId')
		.isInt().withMessage('El ID del resultado debe ser un número entero'),

	body('observaciones')
		.optional({ checkFalsy: true }) 
		.isString().withMessage('Las observaciones deben ser un texto')
		.isLength({ max: 1000 }).withMessage('Las observaciones no pueden superar los 1000 caracteres')
];

module.exports = {
	validarActualizarResultado,
	validarActualizarObservaciones
};
