
exports.validarUUID = (id) => {
    const uuidRegex = /^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return false;
    }
    return true;
}

exports.esValidoIdNumerico = (id) => {
    if (/^\d+$/.test(id)) {
        return true;
    }
    return false;
}

exports.snakeToCamel = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const newObj = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        newObj[camelKey] = obj[key];
    }
    return newObj;
}
exports.calcularPromedioCumplimiento = (items) => {
    if (items.length === 0) return 0; // Evita división por cero si el array está vacío
    const sumaCumplimiento = items.reduce((acc, item) => acc + item.cumplimiento, 0);
    return (sumaCumplimiento / items.length).toFixed(2);
}

exports.calcularPromedioPonderado = (promedioEstandares, promedioServicios) => {
    const pesoEstandares = 0.5; // 50% para estándares comunes
    const pesoServicios = 0.5;  // 50% para servicios

    return ((promedioEstandares * pesoEstandares) + (promedioServicios * pesoServicios)).toFixed(2);
}

exports.validateMimeTypeFile = (array, file) => {
    return array.includes(file.mimetype)
}

exports.validateSizeFile = (file, maxSize) => {
    return file.size < maxSize * 1024 * 1024
}

exports.setCabecerasSinCacheImg = (res) => {
    res.set({
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Surrogate-Control": "no-store"
    });
};

exports.ordenarItems = (elements) => {
    return elements.sort((a, b) => {
        // Accedemos al campo 'item' de cada objeto y lo convertimos a string
        const aString = (a.item !== null && a.item !== undefined) ? String(a.item) : '';
        const bString = (b.item !== null && b.item !== undefined) ? String(b.item) : '';

        // Convertimos los valores de 'item' a arrays de números
        const aParts = aString.split('.').map(Number);
        const bParts = bString.split('.').map(Number);

        // Comparamos las partes del 'item' parte por parte
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0; // Si no hay más partes, tratamos como 0
            const bPart = bParts[i] || 0;

            if (aPart < bPart) return -1;
            if (aPart > bPart) return 1;
        }

        return 0; // Son iguales
    });
}
