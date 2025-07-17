const { pool } = require("../initDB");
const { snakeToCamel, ordenarItems } = require("../utils/utils");

// Crear
const crearItem = async (req, res, next) => {
    const { item, descripcion, estandar, criterioId, esEvaluable, mostrarItem, highlightColor } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Crear item de evaluación
        const result = await client.query(
            `INSERT INTO items_evaluacion (item, descripcion, estandar, criterio_id, es_evaluable, mostrar_item, highlight_color)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [item, descripcion, estandar, criterioId, esEvaluable, mostrarItem, highlightColor]
        );

        const itemResult = result.rows[0];

        // Obtener auditorías asociadas al criterio
        const { rows: auditorias } = await client.query(
            `SELECT * FROM auditoria_criterio WHERE criterio_evaluacion_id = $1`,
            [criterioId]
        );

        // Insertar resultados iniciales para cada auditoría
        for (const auditoria of auditorias) {
            await client.query(
                `INSERT INTO resultados_items_evaluacion 
                 (auditoria_id, resultado, observaciones, item_id, criterio_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                [auditoria.auditoria_id, 'noAplica', "", itemResult.id, criterioId]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Criterio creado correctamente",
            data: snakeToCamel(itemResult)
        });

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

// Obtener todos
const obtenerItems = async (req, res, next) => {
    try {
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 20;
        const offset = (pagina - 1) * limite;
        const {criterioId} = req.params

        const itemsQuery = await pool.query(`
            SELECT *
            FROM items_evaluacion
            WHERE criterio_id = $1
            ORDER BY id ASC
            LIMIT $2 OFFSET $3
        `, [criterioId, limite, offset]);

        const totalQuery = await pool.query(`SELECT COUNT(*) FROM items_evaluacion`);
        const totalRegistros = parseInt(totalQuery.rows[0].count);
        const totalPaginas = Math.ceil(totalRegistros / limite);

        const items = ordenarItems(itemsQuery.rows);

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

// Obtener uno
const obtenerItemPorId = async (req, res, next) => {
    const { itemId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM items_evaluacion WHERE id = $1', [itemId]);
        if (result.rows.length === 0) throwNotFoundError("Item no encontrado.");
        const item = result.rows[0];

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(item)
        });

    } catch (err) {
        next(err);
    }
};

// Actualizar
const actualizarItem = async (req, res, next) => {
    const { itemId } = req.params;
    const { item, descripcion, estandar, esEvaluable, mostrarItem, highlightColor } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE items_evaluacion
                SET item = $1,
                    descripcion = $2,
                    estandar = $3,
                    es_evaluable = $4,
                    mostrar_item = $5,
                    highlight_color = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *`,
            [item, descripcion, estandar, esEvaluable, mostrarItem, highlightColor, itemId]
        );

        if (result.rows.length === 0) throwNotFoundError("El item no existe.");
        const itemResult = result.rows[0];

        // Al actualizar los ítems de auditoría:
        // si el tipo cambia a "título", el resultado pasa a "noAplica";
        // en caso contrario, se mantiene como "noEvaluable".
        const nuevoResultado = esEvaluable ? "noAplica": "noEvaluable";

        await client.query(`UPDATE resultados_items_evaluacion SET resultado = $1 WHERE item_id = $2`, 
            [nuevoResultado, itemId]
        )
        await client.query('COMMIT'); 

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Item actualizado con éxito.",
            data: snakeToCamel(itemResult)
        });

    } catch (err) {
        await client.query('ROLLBACK'); 
        next(err);
    } finally {
        client.release();
    }
};

// Eliminar
const eliminarItem = async (req, res, next) => {
    const { itemId } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Eliminar resultados relacionados
        await client.query(
            'DELETE FROM resultados_items_evaluacion WHERE item_id = $1',
            [itemId]
        );

        // Eliminar el ítem de evaluación
        const result = await client.query(
            'DELETE FROM items_evaluacion WHERE id = $1 RETURNING *',
            [itemId]
        );

        if (result.rows.length === 0) throwNotFoundError("El item no existe.");

        await client.query('COMMIT');

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Item eliminado correctamente",
        });

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = {
    crearItem,
    obtenerItems, 
    obtenerItemPorId,
    actualizarItem,
    eliminarItem
}