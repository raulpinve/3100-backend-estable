const { pool } = require("../initDB");
const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { snakeToCamel } = require("../utils/utils");
const { hashearContrasena } = require("../utils/hash");

// Crear usuario
const crearUsuario = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { primerNombre, apellidos, username, email, password } = req.body;
        const owner = req.usuario.id;
        const hashedPassword = hashearContrasena(password);

        const query = `
            INSERT INTO usuarios (
                primer_nombre, apellidos, username, email, password,
                rol, estado, owner
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, primer_nombre, apellidos, username, email
        `;
        const values = [ primerNombre, apellidos, username, email.toLowerCase(), hashedPassword, "usuario", "activo", owner];

        const result = await client.query(query, values);
        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(result.rows[0])
        });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

//  Obtener todos los usuarios (básico)
const obtenerUsuarios = async (req, res, next) => {
    const ownerId = req.usuario.id; 
    try {
        const result = await pool.query(`
            SELECT id, primer_nombre, apellidos, username, email, rol, estado
            FROM usuarios
            WHERE eliminado = false AND owner = $1
            ORDER BY created_at DESC
        `, [ ownerId ]);

        res.status(200).json({
            statusCode: 200,
            status: "success",
            data: result.rows.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

// Obtener un solo usuario
const obtenerUsuario = async (req, res, next) => {
    try {
        const { usuarioId } = req.params;

        const result = await pool.query(`
            SELECT id, primer_nombre, apellidos, username, email, rol, estado
            FROM usuarios
            WHERE id = $1 AND eliminado = false
        `, [ usuarioId ]);

        if (result.rowCount === 0) {
            throwNotFoundError("Usuario no encontrado");
        }
        res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(result.rows[0])
        });
    } catch (error) {
        next(error);
    }
};

// Actualizar usuario
const actualizarUsuario = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { usuarioId } = req.params;
        const { primerNombre, apellidos, username } = req.body;

        const result = await client.query(`
            UPDATE usuarios
            SET primer_nombre = $1,
                apellidos = $2,
                username = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND eliminado = false
            RETURNING id, primer_nombre, apellidos, username
            `, [primerNombre, apellidos, username, usuarioId]);

        if (result.rowCount === 0) {
            throwNotFoundError("Usuario no encontrado");
        }

        res.status(200).json({
            statusCode: 200,
            status: "success",
            data: snakeToCamel(result.rows[0])
        });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

//Eliminar usuario (borrado lógico)
const eliminarUsuario = async (req, res, next) => {
    try {
        const { usuarioId } = req.params;

        const result = await pool.query(`
            UPDATE usuarios
            SET estado = 'eliminado',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND eliminado = false
        `, [usuarioId]);

        if (result.rowCount === 0) {
            throwNotFoundError("Usuario no encontrado o ya eliminado");
        }

        res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Usuario eliminado correctamente"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario
};
