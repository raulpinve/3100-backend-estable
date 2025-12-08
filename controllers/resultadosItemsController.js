const { throwNotFoundError, throwBadRequestError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { snakeToCamel, ordenarItems } = require("../utils/utils");

const obtenerResultadosItems = async (req, res, next) => {
    const { criterioId, auditoriaId } = req.params;

    const consulta = req.query.consulta || "";         // filtro por descripción
    const resultadoFiltro = req.query.resultado || ""; // filtro por resultado
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 20;
    const offset = (pagina - 1) * limite;

    try {
        // ---- Query principal con paginación ----
        const itemsQuery = await pool.query(
            `SELECT 
                rie.id, 
                ie.item, 
                ie.descripcion, 
                ie.estandar, 
                ie.mostrar_item, 
                ie.es_evaluable, 
                ie.highlight_color,
                rie.resultado, 
                rie.observaciones
            FROM resultados_items_evaluacion AS rie
            INNER JOIN items_evaluacion AS ie 
                ON rie.item_id = ie.id
            WHERE rie.criterio_id = $1 
              AND rie.auditoria_id = $2
              AND ie.descripcion ILIKE $3
              AND rie.resultado::text ILIKE $4
            ORDER BY string_to_array(ie.item, '.')::int[]
            LIMIT $5 OFFSET $6`,
            [
                criterioId,
                auditoriaId,
                `%${consulta}%`,
                `%${resultadoFiltro}%`,
                limite,
                offset
            ]
        );

        // ---- Total filtrado ----
        const totalQuery = await pool.query(
            `SELECT COUNT(*)
             FROM resultados_items_evaluacion AS rie
             INNER JOIN items_evaluacion AS ie 
                ON rie.item_id = ie.id
             WHERE rie.criterio_id = $1
               AND rie.auditoria_id = $2
               AND ie.descripcion ILIKE $3
               AND rie.resultado::text ILIKE $4`,
            [
                criterioId,
                auditoriaId,
                `%${consulta}%`,
                `%${resultadoFiltro}%`
            ]
        );

		
        const totalRegistros = parseInt(totalQuery.rows[0].count);
        const totalPaginas = Math.ceil(totalRegistros / limite);

        const items = itemsQuery.rows;

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            paginacion: {
                paginaActual: pagina,
                totalPaginas
            },
            data: items.map(snakeToCamel)
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
			`SELECT i.es_evaluable
			 FROM resultados_items_evaluacion rie
			 JOIN items_evaluacion i ON rie.item_id = i.id
			 WHERE rie.id = $1`,
			[resultadoItemId]
		);

		if (verificacion.rows.length === 0) {
			throwNotFoundError("Ítem no encontrado.");
		}

		if (!verificacion.rows[0].es_evaluable) {
			throwBadRequestError(undefined, "No se puede editar un resultado para un ítem que no es evaluable ");
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
			`SELECT i.es_evaluable
			 FROM resultados_items_evaluacion rie
			 JOIN items_evaluacion i ON rie.item_id = i.id
			 WHERE rie.id = $1`,
			[resultadoItemId]
		);

		if (verificacion.rows.length === 0) {
			throwNotFoundError("Ítem no encontrado.");
		}

		if (!verificacion.rows[0].es_evaluable) {
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