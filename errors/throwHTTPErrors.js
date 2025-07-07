// Function to throw a 400 error (Bad request)
exports.throwBadRequestError = (field, message = 'Bad request') => {
    const error = new Error(message)
    error.field = field
    error.name = 'BadRequestError'
    throw error
}

// Function to throw a 400 error (Bad Request) with multiple error messages
exports.throwBadRequestErrorWithMultipleErrors = (errors, message = 'Bad request') => {

    // Arreglo para almacenar errores únicos
    const uniqueErrors = [];

    // Set para rastrear campos (path) únicos
    const errorPaths = new Set();
    
    // Iterar a través de los errores
    errors.array().forEach(error => {
        const { path, msg } = error;

        // Verificar si el campo aún no ha sido encontrado
        if (!errorPaths.has(path)) {
            // Agregar el campo al conjunto para evitar duplicados
            errorPaths.add(path);

            // Crear un nuevo objeto con propiedades renombradas
            const nuevoError = {
                field: path,
                message: msg,
            };

            // Agregar el nuevo error al arreglo
            uniqueErrors.push(nuevoError);
        }
    });

    const error = new Error(message)
    error.errors = uniqueErrors
    error.name = 'BadRequestErrorMultiple'
    throw error
}

// Function to throw a 401 error (Unauthorized)
exports.throwUnauthorizedError = (message = 'No autorizado') => {
    const error = new Error(message)
    error.name = 'UnauthorizedError'
    throw error
};

// Function to throw a 403 error (Forbidden)
exports.throwForbiddenError = (message = 'Acceso prohibido') => {
    const error = new Error(message)
    error.name = 'ForbiddenError'
    throw error
};

// Function to throw a 410 error (Gone)
exports.throwGoneError = (message = "El recurso solicitado ya no se encuentra disponible") => {
    const error = new Error(message)
    error.name = 'GoneError'
    throw error
}

// Function to throw a 404 error (Not Found)
exports.throwNotFoundError = (message = 'Recurso no encontrado') => {
    const error = new Error(message);
    error.name = 'NotFoundError'
    throw error
};
// Function to throw a 500 error (Server Error)
exports.throwServerError = (message = 'Se produjo un error interno del servidor. Por favor, inténtelo de nuevo más tarde.') => {
    const error = new Error(message)
    error.name = 'ServerError'
    throw error
};
