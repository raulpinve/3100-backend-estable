const validarUUID = (id) => {
    const uuidRegex = /^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return false;
    }
    return true;
}

const esValidoIdNumerico = (id) => {
    if (/^\d+$/.test(id)) {
        return true;
    }
    return false;
}

const snakeToCamel = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const newObj = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        newObj[camelKey] = obj[key];
    }
    return newObj;
}
const calcularPromedioCumplimiento = (items) => {
    if (items.length === 0) return 0; // Evita división por cero si el array está vacío
    const sumaCumplimiento = items.reduce((acc, item) => acc + item.cumplimiento, 0);
    return (sumaCumplimiento / items.length).toFixed(2);
}

const calcularPromedioPonderado = (promedioEstandares, promedioServicios) => {
    const pesoEstandares = 0.5; // 50% para estándares comunes
    const pesoServicios = 0.5;  // 50% para servicios

    return ((promedioEstandares * pesoEstandares) + (promedioServicios * pesoServicios)).toFixed(2);
}

const validateMimeTypeFile = (array, file) => {
    return array.includes(file.mimetype)
}

const validateSizeFile = (file, maxSize) => {
    return file.size < maxSize * 1024 * 1024
}

const setCabecerasSinCacheImg = (res) => {
    res.set({
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Surrogate-Control": "no-store"
    });
};

module.exports = {
    validarUUID, 
    esValidoIdNumerico,
    snakeToCamel,
    calcularPromedioCumplimiento, 
    calcularPromedioPonderado,
    validateMimeTypeFile,
    validateSizeFile,
    setCabecerasSinCacheImg
}
