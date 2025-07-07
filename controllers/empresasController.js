// const Usuario = require("../models/usuarioModel")
const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { snakeToCamel } = require("../utils/utils");

const crearEmpresa = async (req, res, next) => {
    try {
        const nombreEmpresa = req.body.nombre;
        const usuarioId = req.usuario.id;

        const query = `
            INSERT INTO empresas (nombre, owner)
            VALUES ($1, $2)
            RETURNING id, nombre
        `;

        const values = [nombreEmpresa, usuarioId];

        const { rows } = await pool.query(query, values);
        const nuevaEmpresa = rows[0];

        return res.status(201).json({
            statusCode: 201,
            status: 'success',
            data: nuevaEmpresa
        });
    } catch (error) {
        next(error);
    }
};

const obtenerEmpresa = async (req, res, next) => {
    try {
        const { empresaId } = req.params;
        const usuarioId = req.usuario.id;

        const query = `
            SELECT * FROM empresas
            WHERE id = $1 AND owner = $2
            LIMIT 1
        `;

        const { rows } = await pool.query(query, [empresaId, usuarioId]);
        if (rows.length === 0) {
            throwNotFoundError('La empresa no existe o no te pertenece.');
        }

        return res.status(200).json({
            statusCode: 200,
            status: 'success',
            data: snakeToCamel(rows[0])
        });
    } catch (error) {
        next(error);
    }
};

// Devuelve solo las empresas activas
const obtenerEmpresas = async (req, res, next) => {
    try {
        const {rol, owner} = req.usuario;

        // Obtener el owner de las empresas
        let ownerId; 
        if(rol === "superadministrador"){
            ownerId = req.usuario.id;
        }else{
            ownerId = owner;
        }

        const pagina = parseInt(req.query.page) || 1;
        const limite = parseInt(req.query.limit) || 10;
        const offset = (pagina - 1) * limite;

        // 1. Total de empresas del usuario
        const totalQuery = `
            SELECT COUNT(*) FROM empresas
            WHERE owner = $1
        `;
        const totalResult = await pool.query(totalQuery, [ownerId]);
        const totalEmpresas = parseInt(totalResult.rows[0].count);
        const totalPaginas = Math.ceil(totalEmpresas / limite);

        // 2. Empresas paginadas
        const dataQuery = `
            SELECT * FROM empresas
            WHERE owner = $1
            ORDER BY created_at DESC NULLS LAST
            LIMIT $2 OFFSET $3
        `;
        const {rows: rowsEmpresas } = await pool.query(dataQuery, [ownerId, limite, offset]);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            paginacion: {
                paginaActual: pagina,
                totalPaginas
            },
            data: rowsEmpresas.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

const actualizarEmpresa = async (req, res, next) => {
    try {
        const empresaId = req.params.empresaId;
        const usuarioId = req.usuario.id;
        const { nombre } = req.body;

        const query = `
            UPDATE empresas
            SET nombre = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND owner = $3
            RETURNING id, nombre
        `;
        const values = [nombre, empresaId, usuarioId];
        const {rows: rowsResult} = await pool.query(query, values);

        if (rowsResult.length === 0) {
            throwNotFoundError('No se encontró la empresa o no te pertenece.');
        }

        return res.status(200).json({
            statusCode: 200,
            status: 'success',
            data: rowsResult[0]
        });
    } catch (error) {
        next(error);
    }
};

const eliminarEmpresa = async (req, res, next) => {
    const { empresaId } = req.params;

    try {
        // Primero elimina relaciones en usuario_empresa
        await pool.query(`DELETE FROM usuario_empresa WHERE empresa_id = $1`, [empresaId]);

        // Luego elimina la empresa
        const result = await pool.query(`DELETE FROM empresas WHERE id = $1 RETURNING *`, [empresaId]);

        if (result.rowCount === 0) {
           throwNotFoundError("La empresa no exisye")
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Empresa eliminada correctamente",
        });
    } catch (error){
        next(error)
    }
}

module.exports = {
    crearEmpresa, 
    obtenerEmpresa, 
    obtenerEmpresas,
    actualizarEmpresa, 
    eliminarEmpresa
}

