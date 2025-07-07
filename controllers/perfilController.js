const { throwNotFoundError, throwUnauthorizedError, throwBadRequestError } = require("../errors/throwHTTPErrors");
const { enviarEmailVerificacion } = require("../utils/emailUtils");
const { pool } = require("../initDB");
const bcrypt = require("bcrypt");
const { validatePassword, hashearContrasena, generarTokenImagen } = require("../utils/hash");
const { validateMimeTypeFile, validateSizeFile } = require("../utils/utils");
const { createFolder, uploadFile, deleteFile } = require("../utils/files");
const sharp = require("sharp");
const path = require("path");

const actualizarEmail = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const usuarioId = req.usuario.id;
        const nuevoEmail = req.body.email;

        const usuarioQuery = await client.query(
            `SELECT email FROM usuarios WHERE id = $1`,
            [usuarioId]
        );

        if (usuarioQuery.rowCount === 0) {
            throwNotFoundError("El usuario no existe");
        }

        const emailActual = usuarioQuery.rows[0].email;

        let emailVerificado = true;
        if (emailActual !== nuevoEmail) {
            emailVerificado = false;
        }

        await client.query(
            `UPDATE usuarios
             SET email = $1, email_verificado = $2, updated_at = NOW()
             WHERE id = $3`,
            [nuevoEmail, emailVerificado, usuarioId]
        );

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: { email: nuevoEmail }
        });

    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

const enviarCorreoConfirmacion = async (req, res, next) => {
    try {
        await enviarEmailVerificacion(req.usuario)
        return res.status(200).json({
            "statusCode": 200,
            "status": "success",
            "message": "El correo de verificación ha sido enviado exitosamente"
        })
    } catch (error) {
        next(error)
    }
}

const actualizarPassword = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const usuarioId = req.usuario.id;
        const currentPassword = req.body.currentPassword || "";
        const newPassword = req.body.newPassword;

        // Obtener el usuario
        const { rows } = await client.query(
            `SELECT password FROM usuarios WHERE id = $1`,
            [usuarioId]
        );

        if (rows.length === 0) {
            throwUnauthorizedError("Usuario no encontrado.");
        }

        const usuario = rows[0];

        // Verificar contraseña actual
        const match = await bcrypt.compare(currentPassword, usuario.password);
        if (!match) {
            throwBadRequestError("currentPassword", "La contraseña actual no es correcta.");
        }

        // Validar nueva contraseña
        if (!validatePassword(newPassword)) {
            throwBadRequestError("newPassword", "La nueva contraseña no es correcta.");
        }

        const hashedPassword = await hashearContrasena(newPassword); 

        // Actualizar contraseña
        await client.query(
            `UPDATE usuarios SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [hashedPassword, usuarioId]
        );

        res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "La contraseña ha sido editada exitosamente",
        });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

const editarPerfil = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const usuarioId = req.usuario.id; 
        const { primerNombre, apellidos, username } = req.body;

        // Validar existencia del usuario
        const { rowCount } = await client.query(
            `SELECT id FROM usuarios WHERE id = $1`,
            [usuarioId]
        );
        if (rowCount === 0) {
            throwNotFoundError("El usuario no existe.");
        }

        // Actualizar perfil
        await client.query(
            `UPDATE usuarios
            SET primer_nombre = $1,
                apellidos = $2,
                username = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4`,
            [primerNombre, apellidos, username, usuarioId]
        );

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "El perfil ha sido editado exitosamente",
        });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

const actualizarAvatar = async (req, res, next) => {
    const { id: usuarioId } = req.usuario;
    const file = req.files["avatar"] && req.files["avatar"][0];

    let avatarPath = null;
    let thumbnailPath = null;

    try {
        if (!file) {
            throwBadRequestError("avatar", "No se ha subido ningún archivo.");
        }
        if (!validateMimeTypeFile(["image/jpeg", "image/png"], file)) {
            throwBadRequestError("avatar", "Solo se permiten archivos de imagen (jpeg y png).");
        }
        if (!validateSizeFile(file, 10)) {
            throwBadRequestError("avatar", "El archivo excede el tamaño máximo permitido (10MB).");
        }

        const direccionCarpetaUsuario = path.join(__dirname, `../uploads/avatar-usuarios/${usuarioId}`);
        await createFolder(direccionCarpetaUsuario);

        // Obtener rutas anteriores pero no borrarlas todavía
        const resultado = await pool.query(
            `SELECT avatar, avatar_thumbnail FROM usuarios WHERE id = $1`,
            [usuarioId]
        );
        const { avatar: avatarAnterior, avatar_thumbnail: thumbAnterior } = resultado.rows[0] || {};

        const nuevoNombreArchivo = file.newFilename;
        avatarPath = path.join(direccionCarpetaUsuario, nuevoNombreArchivo);
        thumbnailPath = path.join(direccionCarpetaUsuario, `thumb-${nuevoNombreArchivo}`);

        // Subir el archivo original
        await uploadFile(file.filepath, avatarPath);

        try {
            await sharp(avatarPath)
                .rotate()
                .resize(150)
                .flatten({ background: { r: 255, g: 255, b: 255 } }) 
                .jpeg({ mozjpeg: true })
                .toFile(thumbnailPath);
        } catch (error) {
            await deleteFile(avatarPath);
            throwBadRequestError("avatar", "Ocurrió un error al subir la imagen. Por favor, intenta nuevamente.");
        }

        try {
            // Actualizar BD
            const query = `
                UPDATE usuarios
                SET avatar = $1, avatar_thumbnail = $2
                WHERE id = $3
            `;
            const values = [
                nuevoNombreArchivo,
                `thumb-${nuevoNombreArchivo}`,
                usuarioId,
            ];
            await pool.query(query, values);

            // Eliminar los archivos anteriores solo si todo fue bien
            const rutaAvatarAnterior = avatarAnterior && path.join(direccionCarpetaUsuario, avatarAnterior);
            const rutaThumbAnterior = thumbAnterior && path.join(direccionCarpetaUsuario, thumbAnterior);

            await Promise.allSettled([
                deleteFile(rutaAvatarAnterior),
                deleteFile(rutaThumbAnterior)
            ]);

        } catch (error) {
            // Eliminar los nuevos archivos si falla la base de datos
            await Promise.allSettled([
                deleteFile(avatarPath),
                deleteFile(thumbnailPath)
            ]);
            throwBadRequestError("avatar", "Ocurrió un error al subir la imagen. Por favor, intenta nuevamente.");
        }

        // Obtener la información del usuario
        const {rows: rowsUser} = await pool.query(`SELECT id, avatar, avatar_thumbnail FROM usuarios WHERE id=$1`, [usuarioId]);
        if(rowsUser.length === 0){
            throwNotFoundError("El usuario seleccionado no existe.")
        }
        const user = rowsUser[0];

        // Firmar URLs de avatar si existen (normalmente no habrá en signUp, pero se prevé por consistencia)
        const userConAvatar = {
            avatar: user.avatar ? generarTokenImagen("usuario", user.id) : null,
            avatarThumbnail: user.avatar_thumbnail ? generarTokenImagen("usuario", user.id, true) : null
        };

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Avatar actualizado exitosamente.",
            data: { ...userConAvatar }
        });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

const eliminarAvatar = async (req, res, next) => {
    const { id: usuarioId } = req.usuario;

    try {
        // Obtener rutas actuales del avatar
        const resultado = await pool.query(
            `SELECT avatar, avatar_thumbnail FROM usuarios WHERE id = $1`,
             [usuarioId ]
        );
        console.log(resultado)
        const { avatar, avatar_thumbnail: thumbnail } = resultado.rows[0] || {};

        if (!avatar && !thumbnail) {
            throwBadRequestError("avatar", "No hay avatar para eliminar.");
        }

        const direccionCarpetaUsuario = path.join(__dirname, `../uploads/avatar-usuarios/${usuarioId}`);
        const rutaAvatar = avatar && path.join(direccionCarpetaUsuario, avatar);
        const rutaThumb = thumbnail && path.join(direccionCarpetaUsuario, thumbnail);

        // Actualizar BD
        await pool.query(
            `UPDATE usuarios SET avatar = NULL, avatar_thumbnail = NULL WHERE id = $1`,
            [usuarioId]
        );

        // Borrar archivos del disco
        await Promise.allSettled([
            deleteFile(rutaAvatar),
            deleteFile(rutaThumb)
        ]);

        return res.json({ mensaje: "Avatar eliminado correctamente." });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    actualizarEmail,
    enviarCorreoConfirmacion,
    actualizarPassword,
    editarPerfil,
    actualizarAvatar,
    eliminarAvatar
}