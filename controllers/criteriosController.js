const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { snakeToCamel } = require("../utils/utils");

// Crear criterio
const crearCriterio = async (req, res, next) => {
    const { nombre, tipo, grupoId } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO criterios_evaluacion (nombre, tipo, grupo_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [nombre, tipo, grupoId]
        );

        const criterio = result.rows[0];
        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Criterio creado correctamente",
            data: {
                id: criterio.id,
                nombre: criterio.nombre,
                tipo: criterio.tipo, 
            }
        });
    } catch (error) {
        next(error)
    }
};

// Obtener todos los criterios
const obtenerCriterios = async (req, res, next) => {
    try {
        const grupoId = req.params.grupoId;
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 20;
        const offset = (pagina - 1) * limite;

        const criteriosQuery = await pool.query(`
            SELECT c.*, g.id as grupoId, g.nombre AS grupo_nombre
            FROM criterios_evaluacion c
            LEFT JOIN grupos_autoevaluacion g ON c.grupo_id = g.id
            WHERE g.id = $1
            ORDER BY c.id ASC
            LIMIT $2 OFFSET $3
        `, [ grupoId, limite, offset ]);

        const totalQuery = await pool.query(`SELECT COUNT(*) FROM criterios_evaluacion`);
        const totalRegistros = parseInt(totalQuery.rows[0].count);
        const totalPaginas = Math.ceil(totalRegistros / limite);

        const criterios = criteriosQuery.rows.map(criterio => {
            return {
                id: criterio.id, 
                nombre: criterio.nombre,
                tipo: criterio.tipo,
                grupoId: criterio.grupoId
            }
        })

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            paginacion: {
                paginaActual: pagina,
                totalPaginas
            },
            data: criterios
        });
    } catch (error) {
        next(error);
    }
};

// Obtener un criterio por ID
const obtenerCriterioPorId = async (req, res) => {
    const { criterioId } = req.params;
    try {
        const { rows: rowsCriterios } = await pool.query(
            `SELECT ce.*, ga.nombre as nombre_grupo FROM criterios_evaluacion as ce
                INNER JOIN grupos_autoevaluacion as ga
                ON ce.grupo_id = ga.id
                WHERE ce.id = $1`,
            [criterioId]
        );
        if (rowsCriterios.length === 0) {
            throwNotFoundError("Criterio de evaluación no encontrado.")
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(rowsCriterios[0]),
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            status: "error",
            message: "Error interno al obtener el criterio",
        });
    }
};

// Actualizar criterio
const actualizarCriterio = async (req, res, next) => {
    const { criterioId } = req.params;
    const { nombre, tipo } = req.body;

    try {
        const { rows: rowsCriterio } = await pool.query(
            `UPDATE criterios_evaluacion
                SET nombre = $1, tipo = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *`,
            [ nombre, tipo, criterioId]
        );

        if (rowsCriterio.length === 0) {
            throwNotFoundError("Criterio no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Criterio actualizado correctamente",
            data: {
                id: rowsCriterio[0].id, 
                nombre: rowsCriterio[0].nombre, 
                tipo: rowsCriterio[0].tipo
            },
        });
    } catch (error) {
        next(error)
    }
};

// Eliminar criterio
const eliminarCriterio = async (req, res) => {
    const { criterioId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM criterios_evaluacion WHERE id = $1 RETURNING *`,
            [criterioId]
        );

        if (result.rowCount === 0) {
            throwNotFoundError("Criterio no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Criterio eliminado correctamente",
        });
    } catch (error) {
        next(error)
    }
};

module.exports = {
    crearCriterio,
    obtenerCriterios,
    obtenerCriterioPorId,
    actualizarCriterio,
    eliminarCriterio
};
