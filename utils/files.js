const fs = require("fs");
const path = require("path");

const validateMimeTypeFile = (array, file) => {
    return array.includes(file.mimetype)
}

const validateSizeFile = (file, maxSize) => {
    return file.size < maxSize * 1024 * 1024
}

const createFolder = async (uploadDir) => {
    return new Promise((resolve, reject) => {
        fs.mkdir(uploadDir, { recursive: true }, (err) => {
            if (err) {
                reject(err)
            }
            resolve(uploadDir);
        });
    })
}

const uploadFile = (fileTempPath, uploadDir) => {
    return new Promise((resolve, reject) => {
        fs.rename(fileTempPath, `${uploadDir}`, (err) => {
            if (err) {
                reject(err);
            }
            resolve(`uploadDir`)
        });
    })
}

const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        try {
            // Eliminar archivo
            fs.unlinkSync(filePath);
            
            // Verificar si el directorio está vacío
            const dirPath = path.dirname(filePath);  // Obtener el directorio del archivo
            const files = fs.readdirSync(dirPath);   // Leer los archivos del directorio
            
            // Si el directorio está vacío, eliminarlo
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
}

const checkFileExists = filePath => {
    try {
        // Verificar si el archivo existe
        fs.accessSync(filePath, fs.constants.F_OK);
        return true; // El archivo existe
    } catch (err) {
        return false; // El archivo no existe o no se puede acceder
    }
}

const MIMETYPES_FIRMAS = [
    "image/jpeg",
    "image/png",
    "image/gif"
]

module.exports = {
    validateMimeTypeFile,
    validateSizeFile,
    createFolder,
    uploadFile,
    deleteFile,
    checkFileExists, 
    MIMETYPES_FIRMAS
}