const fs = require('fs');
const folderDelete = require('folder-delete');
const path = require('path');

/**
 * Sube un archivo moviéndolo de una ruta temporal a una ruta destino.
 */
const uploadFile = (fileTempPath, uploadDir) => {
    return new Promise((resolve, reject) => {
        fs.rename(fileTempPath, uploadDir, (err) => {
            if (err) return reject(err);
            resolve(uploadDir);
        });
    });
};

/**
 * Elimina un archivo y su directorio si queda vacío.
 */
const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            const dirPath = path.dirname(filePath);
            const files = fs.readdirSync(dirPath);

            if (files.length === 0) {
                fs.rmdirSync(dirPath);
                console.log('Directorio eliminado porque está vacío');
            }

            return true;
        } catch (err) {
            console.error('Error al eliminar el archivo o directorio:', err);
            return false;
        }
    }
    return true;
};

/**
 * Verifica si un archivo existe.
 */
const checkFileExists = (filePath) => {
    try {
        fs.accessSync(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
};

/**
 * Crea un directorio si no existe.
 */
const createFolder = async (uploadDir) => {
    return new Promise((resolve, reject) => {
        fs.mkdir(uploadDir, { recursive: true }, (err) => {
            if (err) return reject(err);
            resolve(uploadDir);
        });
    });
};

/**
 * Elimina un directorio y su contenido.
 */
const deleteFolder = (folderPath) => {
    try {
        folderDelete(folderPath, { debugLog: false });
    } catch (error) {
        console.error(error);
        return false;
    }
};

module.exports = {
  uploadFile,
  deleteFile,
  checkFileExists,
  createFolder,
  deleteFolder,
};
