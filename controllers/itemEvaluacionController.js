const { pool } = require("../initDB");

// Crear
const crearItem = async (req, res, next) => {
    const { item, descripcion, estandar, criterioId } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO items_evaluacion (item, descripcion, estandar, criterio_id)
                VALUES ($1, $2, $3, $4) RETURNING *`,
            [item, descripcion, estandar, criterioId]
        );

        const itemResult = result.rows[0];
        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Criterio creado correctamente",
            data: {
                id: itemResult.id,
                descripcion: itemResult.descripcion,
                estandar: itemResult.estandar,
                criterioId: itemResult.criterioId,
            }
        });
    } catch (err) {
        next(err)
    }
};

// Obtener todos
const obtenerItems = async (req, res, next) => {
    try {
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 20;
        const offset = (pagina - 1) * limite;

        const itemsQuery = await pool.query(`
            SELECT *
            FROM items_evaluacion
            ORDER BY id ASC
            LIMIT $1 OFFSET $2
        `, [limite, offset]);

        const totalQuery = await pool.query(`SELECT COUNT(*) FROM items_evaluacion`);
        const totalRegistros = parseInt(totalQuery.rows[0].count);
        const totalPaginas = Math.ceil(totalRegistros / limite);

        const items = itemsQuery.rows.map(item => ({
            id: item.id,
            item: item.item,
            descripcion: item.descripcion,
            estandar: item.estandar,
            criterioId: item.criterio_id
        }));

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            paginacion: {
                paginaActual: pagina,
                totalPaginas
            },
            data: items
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
            data: {
                id: item.id,
                descripcion: item.descripcion,
                estandar: item.estandar,
                criterioId: item.criterioId,
            }
        });

    } catch (err) {
        next(err);
    }
};

// Actualizar
const actualizarItem = async (req, res, next) => {
    const { itemId } = req.params;
    const { item, descripcion, estandar, criterio_id } = req.body;
    try {
        const result = await pool.query(
            `UPDATE items_evaluacion
                SET item = $1,
                    descripcion = $2,
                    estandar = $3,
                    criterio_id = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING *`,
            [item, descripcion, estandar, criterio_id, itemId]
        );
        if (result.rows.length === 0) throwNotFoundError("El item no existe.");

        const itemResult = result.rows[0];

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Item actualizado con éxito.",
            data: {
                id: itemResult.id,
                descripcion: itemResult.descripcion,
                estandar: itemResult.estandar,
                criterioId: itemResult.criterioId,
            }
        });
    } catch (err) {
        next(err);
    }
};

// Eliminar
const eliminarItem = async (req, res) => {
    const { itemId } = req.params;
    try {
        const result = await pool.query('DELETE FROM items_evaluacion WHERE id = $1 RETURNING *', [itemId]);
        if (result.rows.length === 0) throwNotFoundError("El item no existe.");

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Item eliminado correctamente",
        });
    } catch (err) {
        next(err)
    }
}

module.exports = {
    crearItem,
    obtenerItems, 
    obtenerItemPorId,
    actualizarItem,
    eliminarItem
}