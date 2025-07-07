const { validateMimeTypeFile, validateSizeFile, createFolder, uploadFile, checkFileExists, MIMETYPES_FIRMAS } = require("../utils/files");
const { throwBadRequestError, throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const path = require("path");
const fs = require("fs");
const { generarTokenFirma } = require("../utils/hash");

const crearFirma = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id: usuarioId, primerNombre, apellidos } = req.usuario;

        // Verifica si ya tiene firma
        const { rowCount: existeFirma } = await client.query(
            "SELECT 1 FROM firmas WHERE usuario_id = $1",
            [usuarioId]
        );

        if (existeFirma > 0) {
            throwBadRequestError("archivo", "El usuario ya tiene una firma registrada.");
        }

        const file = req.files?.archivo?.[0];
        if (!file) {
            throwBadRequestError("archivo", "No se ha subido ningún archivo.");
        }

        if (!validateMimeTypeFile(MIMETYPES_FIRMAS, file)) {
            throwBadRequestError("file", "Solo se permiten la carga de imágenes.");
        }

        if (!validateSizeFile(file, 10)) {
            throwBadRequestError("file", "El archivo excede el tamaño máximo permitido (10MB)");
        }

        const newFilename = file.newFilename;

        // Carpeta general
        const firmaDir = path.join(__dirname, `../uploads/firmas`);
        await createFolder(firmaDir);

        const fullPath = path.join(firmaDir, newFilename);
        await uploadFile(file.filepath, fullPath);

        const nombresCompletos = `${primerNombre} ${apellidos}`;
        const rol = "auditor";

        const insertQuery = `
            INSERT INTO firmas (nombres_completos, rol, archivo, usuario_id)
            VALUES ($1, $2, $3, $4)
            RETURNING archivo`;

        const { rows } = await client.query(insertQuery, [
            nombresCompletos,
            rol,
            newFilename,
            usuarioId
        ]);

        const archivo = rows[0]?.archivo;
        const rutaCompleta = path.join(__dirname, `../uploads/firmas/${archivo}`);

        let rutaFirma = null;
        if (checkFileExists(rutaCompleta)) {
            rutaFirma = generarTokenFirma(archivo);
        }

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Firma creada correctamente.",
            data: {
                rutaFirma,
            },
        });
    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

const obtenerFirma = async (req, res, next) => {
    try {
        const { id: usuarioId } = req.usuario;

        // Buscar la firma del usuario
        const result = await pool.query(
            'SELECT * FROM firmas WHERE usuario_id = $1',
            [usuarioId]
        );

        if (result.rows.length === 0) {
            throwNotFoundError("La firma no existe");
        }

        const firmaEncontrada = result.rows[0];
        let rutaFirma = `/images/image-default.png`;

        const filePath = path.join(__dirname, `../uploads/firmas/${firmaEncontrada.archivo}`);
        if (checkFileExists(filePath)) {
            rutaFirma = generarTokenFirma(firmaEncontrada.archivo);
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: {
                rutaFirma
            }
        });
    } catch (error) {
        next(error);
    }
};

const eliminarFirma = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id: usuarioId } = req.usuario;

        await client.query('BEGIN');

        const { rows: firmas } = await client.query(
            'SELECT * FROM firmas WHERE usuario_id = $1',
            [usuarioId]
        );

        if (firmas.length === 0) {
            await client.query('ROLLBACK');
            return res.json({
                statusCode: 200,
                status: "success",
                message: "El usuario no tiene una firma registrada."
            });
        }

        const firma = firmas[0];
        const archivoPath = path.join(__dirname, `../firmas/${firma.archivo}`);

        const { rows: auditoriasRelacionadas } = await client.query(
            'SELECT * FROM auditoria_firma WHERE firma_id = $1',
            [firma.id]
        );

        if (auditoriasRelacionadas.length === 0) {
            await client.query('DELETE FROM firmas WHERE id = $1', [firma.id]);

            // Intentar eliminar el archivo solo después del DELETE exitoso
            if (fs.existsSync(archivoPath)) {
                fs.unlinkSync(archivoPath);
            }
        } else {
            await client.query(
                'UPDATE firmas SET usuario_id = NULL WHERE id = $1',
                [firma.id]
            );
        }

        await client.query('COMMIT');

        return res.json({
            statusCode: 200,
            status: "success",
            message: "Firma eliminada exitosamente."
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

module.exports = {
    crearFirma,
    obtenerFirma, 
    eliminarFirma
}