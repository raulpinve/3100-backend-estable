const { pool } = require("../initDB");
const { throwNotFoundError } = require("../errors/throwHTTPErrors");
const { snakeToCamel } = require("../utils/utils");
const { hashearContrasena, generarTokenImagen } = require("../utils/hash");

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
    const { consulta, pagina = 1, tamanoPagina = 7 } = req.query;

    const paginaInt = parseInt(pagina);
    const tamanoPaginaInt = parseInt(tamanoPagina);
    const offset = (paginaInt - 1) * tamanoPaginaInt;

    try {
        let filtros = `estado != 'eliminado' AND owner = $1`;
        let valores = [ownerId];
        let contador = 2;

        if (consulta) {
            filtros += ` AND (
                primer_nombre ILIKE $${contador} OR 
                apellidos ILIKE $${contador} OR 
                email ILIKE $${contador} OR 
                username ILIKE $${contador}
            )`;
            valores.push(`%${consulta}%`);
            contador++;
        }

        // Total de usuarios
        const totalUsuariosQuery = await pool.query(`
            SELECT COUNT(*) AS total
            FROM usuarios
            WHERE ${filtros}
        `, valores);

        const totalUsuarios = parseInt(totalUsuariosQuery.rows[0].total, 10);
        const totalPaginas = Math.ceil(totalUsuarios / tamanoPaginaInt) || 1;

        valores.push(tamanoPaginaInt, offset);

        // Consulta paginada
        const result = await pool.query(`
            SELECT id, primer_nombre, apellidos, username, email, rol, estado, avatar, avatar_thumbnail
            FROM usuarios
            WHERE ${filtros}
            ORDER BY created_at DESC
            LIMIT $${contador} OFFSET $${contador + 1}
        `, valores);

        const usuariosProcesados = result.rows.map(usuario => {
            const usuarioCamel = snakeToCamel(usuario);
            return {
                ...usuarioCamel,
                avatar: usuario.avatar ? generarTokenImagen("usuario", usuario.id) : null,
                avatarThumbnail: usuario.avatar_thumbnail ? generarTokenImagen("usuario", usuario.id, true) : null
            };
        });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            paginacion: {
                paginaActual: paginaInt,
                totalPaginas
            },
            data: usuariosProcesados
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
            WHERE id = $1 AND estado != 'eliminado'
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
            WHERE id = $4 AND estado != 'eliminado'
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
            WHERE id = $1 AND estado != 'eliminado'
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
