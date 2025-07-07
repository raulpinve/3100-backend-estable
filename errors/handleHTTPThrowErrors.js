const handleHttpThrowErrors = {
    // Function to handle bad request errors (400)
    handleBadRequestError: (message = "Los datos proporcionados no son válidos", field = false) => {
        if (field) {
            return {
                statusCode: 400,
                message: "Los datos proporcionados no son válidos",
                error: {
                    fieldErrors: [{
                        field: field,
                        message: message,
                    }]
                }
            };
        } else {
            return {
                error: "BadRequest",
                statusCode: 400,
                message: message || "Los datos proporcionados no son válidos",
            };
        }
    },
    // Function to handle bad request errors with multiple errors (400)
    handleBadRequestErrorMultiple: (errors = [], message = "Los datos proporcionados no son válidos") => {
        const errorList = Array.isArray(errors) ? errors : [];
        return {
            statusCode: 400,
            message: message,
            error: {
                fieldErrors: errorList
            }
        }
    }, 
    
    // Function to handle not found errors (404)
    handleNotFound: (message = "Recurso no encontrado") => {
        return {
            statusCode: 404,
            message: message,
            error: "NotFoundError"
        }
    },
    // Function to handle unauthorized user errors
    handleUnauthorizedError: (message = "Acceso no autorizado") => {
        return {
            statusCode: 401, 
            message: message, 
            error: "UnauthorizedError"
        }
    },
    // Function to handle forbidden access errors 
    handleForbiddenError: (message = "Acceso prohibido") => {
        return {
            statusCode: 403, 
            message: message, 
            error: "ForbiddenError"
        }
    }, 

    // Function to handle gone error
    handleGoneError: (message = 'El recurso solicitado ya no se encuentra disponible') => {
        return {
            statusCode: 410, 
            message: message, 
            error: "GoneError"
        }
    },
    // Function to handle all types of errors
    handleDefaultErrorResponse: (message = "Se produjo un error interno del servidor. Por favor, inténtelo de nuevo más tarde.") => {
        return {
            // Returns an object with status code 500 and a generic error message
            statusCode: 500,
            message: message,
            error: "ServerError"
        }
    } 
}

module.exports = handleHttpThrowErrors
