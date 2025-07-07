const { throwNotFoundError, throwBadRequestError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { snakeToCamel } = require("../utils/utils");

const obtenerResultadosItems = async (req, res, next) => {
	const { criterioId, auditoriaId } = req.params;

	try {
		const result = await pool.query(
			`SELECT rie.id, ie.item, ie.descripcion, ie.estandar, ie.ocultar_item as ocultar_number_item, ie.es_titulo,
				rie.resultado, rie.observaciones
				FROM resultados_items_evaluacion as rie 
					INNER JOIN items_evaluacion as ie
					ON rie.item_id = ie.id
				WHERE rie.criterio_id = $1 AND rie.auditoria_id = $2`,
			[criterioId, auditoriaId]
		);
		return res.status(201).json({
			statusCode: 201,
			status: "success",
			data: result.rows.map(snakeToCamel)
		});
	} catch (err) {
		next(err);
	}
};

const actualizarResultado = async (req, res, next) => {
	const { resultadoItemId } = req.params;
	const { resultado } = req.body;

	try {
		// 1. Verificar si el item asociado es un título
		const verificacion = await pool.query(
			`SELECT i.es_titulo
			 FROM resultados_items_evaluacion rie
			 JOIN items_evaluacion i ON rie.item_id = i.id
			 WHERE rie.id = $1`,
			[resultadoItemId]
		);

		if (verificacion.rows.length === 0) {
			throwNotFoundError("Ítem no encontrado.");
		}

		if (verificacion.rows[0].es_titulo) {
			throwBadRequestError(undefined, "No se puede editar un resultado para un ítem que es solo un título.");
		}

		// 2. Si no es título, entonces actualizar
		const result = await pool.query(
			`UPDATE resultados_items_evaluacion
			 SET resultado = $1,
				 updated_at = CURRENT_TIMESTAMP
			 WHERE id = $2
			 RETURNING *`,
			[resultado, resultadoItemId]
		);

		if (result.rows.length === 0) {
			throwNotFoundError("Ítem no encontrado.");
		}

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			message: "Resultado editado correctamente",
			data: snakeToCamel(result.rows[0])
		});
	} catch (err) {
		next(err);
	}
};

const actualizarObservaciones = async (req, res, next) => {
	const { resultadoItemId } = req.params;
	const { observaciones } = req.body;

	try {
		// 1. Verificar si el item asociado es un título
		const verificacion = await pool.query(
			`SELECT i.es_titulo
			 FROM resultados_items_evaluacion rie
			 JOIN items_evaluacion i ON rie.item_id = i.id
			 WHERE rie.id = $1`,
			[resultadoItemId]
		);

		if (verificacion.rows.length === 0) {
			throwNotFoundError("Ítem no encontrado.");
		}

		if (verificacion.rows[0].es_titulo) {
			throwBadRequestError(undefined, "No se puede editar las observaciones para un ítem que es solo un título.");
		}

		// 2. Si no es título, entonces actualizar observaciones
		const result = await pool.query(
			`UPDATE resultados_items_evaluacion
			 SET observaciones = $1,
				 updated_at = CURRENT_TIMESTAMP
			 WHERE id = $2
			 RETURNING *`,
			[observaciones, resultadoItemId]
		);

		if (result.rows.length === 0) {
			throwNotFoundError("Ítem no encontrado.");
		}

		return res.status(200).json({
			statusCode: 200,
			status: "success",
			message: "Item editado correctamente",
			data: snakeToCamel(result.rows[0])
		});
	} catch (err) {
		next(err);
	}
};

module.exports = {
	obtenerResultadosItems,
	actualizarResultado,
	actualizarObservaciones
}