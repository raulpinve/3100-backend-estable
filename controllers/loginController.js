const { generarTokenAutenticacion, compararPasswordHasheada, generarTokenImagen } = require("../utils/hash");
const { throwUnauthorizedError, throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const validarToken = async (req, res, next) => {
    try {
        const bearerToken = req.headers['authorization'];
        if (!bearerToken) {
            throwUnauthorizedError("No tienes permisos para realizar esta acción.");
        }

        const token = bearerToken.startsWith("Bearer ")
            ? bearerToken.slice(7)
            : bearerToken;

        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY_JWT);
            
            const { rows } = await pool.query(`
                SELECT id, primer_nombre, apellidos, username, email, email_verificado, rol, avatar, avatar_thumbnail, owner
                FROM usuarios
                WHERE username = $1 
            `, [decoded.username]);

            const usuario = rows[0];

            if (!usuario) {
                throwUnauthorizedError("El usuario no existe o fue eliminado.");
            }

            req.usuario = {
                id: usuario.id,
                primerNombre: usuario.primer_nombre,
                apellidos: usuario.apellidos,
                username: usuario.username,
                email: usuario.email,
                emailVerificado: usuario.email_verificado,
                rol: usuario.rol,
                owner: usuario.owner,
                avatar: usuario.avatar ? generarTokenImagen("usuario", usuario.id) : null,
                avatarThumbnail: usuario.avatar_thumbnail ? generarTokenImagen("usuario", usuario.id, true) : null
            };

            next();
        } catch (error) {
            throwUnauthorizedError("Token inválido o expirado. No tienes permisos para realizar esta acción.");
        }
    } catch (error) {
        next(error);
    }
};

const signUp = async (req, res, next) => {
    const { primerNombre, apellidos, email, username, password } = req.body;

    try {
        // Iniciar transacción
        await pool.query("BEGIN");

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar el usuario en la BD
        const userQuery = await pool.query(
            `INSERT INTO usuarios (primer_nombre, apellidos, email, username, password, rol)
             VALUES ($1, $2, $3, $4, $5, 'superadministrador') 
             RETURNING id, primer_nombre, apellidos, email, username, email_verificado, rol, avatar, avatar_thumbnail`,
            [primerNombre, apellidos, email, username, hashedPassword]
        );
        const user = userQuery.rows[0];

        // Firmar URLs de avatar si existen (normalmente no habrá en signUp, pero se prevé por consistencia)
        const userConAvatar = {
            ...user,
            avatar: user.avatar ? generarTokenImagen("usuario", user.id) : null,
            avatar_thumbnail: user.avatar_thumbnail ? generarTokenImagen("usuario", user.id, true) : null
        };

        const { payload, token } = generarTokenAutenticacion(userConAvatar);
        await pool.query("COMMIT");

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            token, 
            data: payload,
        });

    } catch (error) {
        await pool.query("ROLLBACK");
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // 1. Buscar usuario activo
        const { rows } = await pool.query(`
            SELECT id, primer_nombre, apellidos, email, username, rol,
                password, avatar, avatar_thumbnail, email_verificado
            FROM   usuarios
            WHERE  LOWER(username) = LOWER($1)
        `, [username]);

        if (rows.length === 0) {
            throwNotFoundError("El usuario o la contraseña no son correctas.");
        }
        const usuarioEncontrado = rows[0];

        // 2. Verificar contraseña
        if (!compararPasswordHasheada(password, usuarioEncontrado.password)) {
            throwUnauthorizedError("El usuario o la contraseña no son correctas.");
        }

        // 3. Firmar URLs de avatar/thumbnail para el payload del JWT
        const usuarioParaToken = {
            ...usuarioEncontrado,
            avatar: usuarioEncontrado.avatar
                ? generarTokenImagen("usuario", usuarioEncontrado.id)
                : null,
            avatar_thumbnail: usuarioEncontrado.avatar_thumbnail
                ? generarTokenImagen("usuario", usuarioEncontrado.id, true)
                : null
        };
        // 4. Generar token de autenticación con la info procesada
        const { payload, token } = generarTokenAutenticacion(usuarioParaToken);

        // 5. Responder
        return res.json({
            statusCode: 200,
            status: "success",
            token,
            data: payload,
        });

    } catch (error) {
        next(error);
    }
};

const obtenerUsuario = (req, res, next) => {
    try {
        const usuario = req.usuario;
        return res.json({
            statusCode: 200,
            status: "success",
            data: usuario
        });
    } catch (error) {
        next(error);
    }
};

// Función para verificar el correo electrónico
const verificarEmail = async (req, res, next) => {
    const { token } = req.params;

    try {
        let decoded;

        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY_JWT_EMAIL_VERIFICATION);
        } catch (error) {
            throwGoneError("El código de verificación ha expirado.");
        }

        const email = decoded.email?.toLowerCase();

        // Buscar usuario por email
        const { rows } = await pool.query(
            `SELECT id, email_verificado FROM usuarios WHERE email = $1`,
            [email]
        );

        if (rows.length === 0) {
            throwNotFoundError("No es posible verificar el E-mail porque el usuario no existe.");
        }

        const usuario = rows[0];

        // Actualizar el estado de verificación
        await pool.query(
            `UPDATE usuarios SET email_verificado = TRUE, updated_at = CURRENT_TIMESTAMP WHERE email = $1`,
            [email]
        );

        res.send("El correo electrónico ha sido verificado exitosamente.");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validarToken, 
    signUp,
    login,
    obtenerUsuario,
    verificarEmail
}