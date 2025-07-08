const { throwNotFoundError } = require('../errors/throwHTTPErrors');
const { pool } = require('../initDB');
const { snakeToCamel } = require('../utils/utils');

// Crear grupo
const crearGrupo = async (req, res, next) => {
    const { nombre } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO grupos_autoevaluacion (nombre)
             VALUES ($1)
             RETURNING *`,
            [nombre]
        );

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Grupo creado correctamente",
            data: result.rows[0],
        });
        
    } catch (error) {
        next(error);
    }
};

// Obtener todos los grupos
const obtenerGrupos = async (req, res, next) => {
    const { consulta } = req.query;
    const pagina = parseInt(req.query.page) || 1;
    const tamanoPagina = parseInt(req.query.limit) || 10;
    const offset = (pagina - 1) * tamanoPagina;

    try {
        let filtros = `1=1`; // Siempre verdadero, para poder agregar más filtros con AND
        let valores = [];
        let contador = 1;

        if (consulta) {
            filtros += ` AND nombre ILIKE $${contador}`;
            valores.push(`%${consulta}%`);
            contador++;
        }

        // 1. Contar total de grupos
        const { rows: totalRows } = await pool.query(`
            SELECT COUNT(*) AS total FROM grupos_autoevaluacion WHERE ${filtros}
        `, valores);

        const totalGrupos = parseInt(totalRows[0].total);
        const totalPaginas = Math.ceil(totalGrupos / tamanoPagina) || 1;

        // 2. Obtener datos paginados
        valores.push(tamanoPagina, offset);

        const { rows: grupos } = await pool.query(`
            SELECT id, nombre,  created_at
            FROM grupos_autoevaluacion
            WHERE ${filtros}
            ORDER BY id ASC
            LIMIT $${contador} OFFSET $${contador + 1}
        `, valores);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            paginacion: {
                paginaActual: pagina,
                totalPaginas,
            },
            data: grupos.map(grupo => snakeToCamel(grupo)),
        });
    } catch (error) {
        next(error);
    }
};

// Obtener un grupo por ID
const obtenerGrupoPorId = async (req, res, next) => {
    const { grupoId } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM grupos_autoevaluacion WHERE id = $1`,
            [grupoId]
        );
        if (result.rowCount === 0) {
            throwNotFoundError("Grupo no encontrado.")
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
};

// Actualizar grupo
const actualizarGrupo = async (req, res, next) => {
    const { grupoId } = req.params;
    const { nombre } = req.body;

    try {
        const result = await pool.query(
            `UPDATE grupos_autoevaluacion
             SET nombre = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [nombre, grupoId]
        );

        if (result.rowCount === 0) {
            throwNotFoundError("Grupo no encontrado.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Grupo actualizado correctamente",
            data: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
};

// Eliminar grupo
const eliminarGrupo = async (req, res, next) => {
    const { grupoId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM grupos_autoevaluacion WHERE id = $1 RETURNING *`,
            [grupoId]
        );

        if (result.rowCount === 0) {
            throwNotFoundError("Grupo no encontrado.")
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Grupo eliminado correctamente",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    crearGrupo,
    obtenerGrupos,
    obtenerGrupoPorId,
    actualizarGrupo,
    eliminarGrupo,
};
