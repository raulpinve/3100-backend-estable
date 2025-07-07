const { verificarTokenImagen, verificarTokenFirma } = require("../utils/hash");
const { setCabecerasSinCacheImg } = require("../utils/utils");
const path = require("path");
const rutaDefault = path.resolve(__dirname, '../public/img/image-default.png');
const { pool } = require("../initDB");
const fs = require("fs");

/** Usuario */
exports.obtenerAvatarUsuarioThumbnail = async (req, res, next) => {
    try {
        const usuarioId = req.params.usuarioId;
        const { token } = req.query;
        const payload = verificarTokenImagen(token, usuarioId, 'usuarioId');

        if (!payload) {
            setCabecerasSinCacheImg(res);
            return res.status(200).sendFile(rutaDefault);
        }

        const resultado = await pool.query(
            `SELECT avatar_thumbnail FROM usuarios WHERE id = $1`,
            [usuarioId]
        );
        if (resultado.rowCount === 0) {
            setCabecerasSinCacheImg(res);
            return res.status(200).sendFile(rutaDefault);
        }
        const nombreAvatar = resultado.rows[0].avatar_thumbnail;
        const rutaCarpeta = path.resolve(__dirname, "../uploads/avatar-usuarios", usuarioId);
        const rutaAvatar = path.join(rutaCarpeta, nombreAvatar);
        const rutaFinal = fs.existsSync(rutaAvatar) ? rutaAvatar : rutaDefault;

        setCabecerasSinCacheImg(res);
        res.status(200).sendFile(rutaFinal);
    } catch (error) {
        next(error);
    }
};

exports.obtenerAvatarUsuario = async (req, res, next) => {
    try {
        const usuarioId = req.params.usuarioId;
        const { token } = req.query;

        const payload = verificarTokenImagen(token, usuarioId, 'usuarioId');

        if (!payload) {
            setCabecerasSinCacheImg(res);
            return res.status(200).sendFile(rutaDefault);
        }

        const resultado = await pool.query(
            `SELECT avatar FROM usuarios WHERE id = $1`,
            [usuarioId]
        );
        if (resultado.rowCount === 0) {
            setCabecerasSinCacheImg(res);
            return res.status(200).sendFile(rutaDefault);
        }
        const nombreAvatar = resultado.rows[0].avatar;
        const rutaCarpeta = path.resolve(__dirname, "../uploads/avatar-usuarios", usuarioId);
        const rutaAvatar = path.join(rutaCarpeta, nombreAvatar);
        const rutaFinal = fs.existsSync(rutaAvatar) ? rutaAvatar : rutaDefault;

        setCabecerasSinCacheImg(res);
        res.status(200).sendFile(rutaFinal);
    } catch (error) {
        next(error);
    }
};

exports.obtenerFirmaUsuario = async (req, res, next) => {
    try {
        const { archivo } = req.params;
        const { token } = req.query;

        const payload = verificarTokenFirma(token, archivo);

        if (!payload) {
            setCabecerasSinCacheImg(res);
            return res.status(200).sendFile(rutaDefault);
        }

        const rutaFirma = path.resolve(__dirname, "../uploads/firmas", archivo);
        const rutaFinal = fs.existsSync(rutaFirma) ? rutaFirma : rutaDefault;

        setCabecerasSinCacheImg(res);
        return res.status(200).sendFile(rutaFinal);
    } catch (error) {
        next(error);
    }
};