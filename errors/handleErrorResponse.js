// Import functions to handle specific errors
const handleHttpThrowErrors = require('./handleHTTPThrowErrors')

// Main function to handle error responses of the application
const handleErrorResponse = (err, req, res, next) => {  
    let errorObject;
    switch (err.name) {
        // Error 400: Handle bad request errors
        case 'BadRequestError':
            errorObject = handleHttpThrowErrors.handleBadRequestError(err.message, err.field);
            break;
        case 'BadRequestErrorMultiple':
            errorObject = handleHttpThrowErrors.handleBadRequestErrorMultiple(err.errors, err.message);
            break

        // Error 401: Handle unauthorized user errors
        case 'UnauthorizedError':
            errorObject = handleHttpThrowErrors.handleUnauthorizedError(err.message);
        break;

        // Error 404: Handle not found errors
        case 'NotFoundError':
            errorObject = handleHttpThrowErrors.handleNotFound(err.message);
            break;
   
        // Error 403: Handle forbidden access to resources
        case 'ForbiddenError':
            errorObject = handleHttpThrowErrors.handleForbiddenError(err.message);
            break;

        // ERror 410: handle gone resources
        case 'GoneError': 
            errorObject = handleHttpThrowErrors.handleGoneError(err.message)

        // Error 500: Handle server errors
        case 'ServerError':
            errorObject = handleHttpThrowErrors.handleDefaultErrorResponse(err.message)
            break
    
        default:
            console.log(err);
            // Handle any other type of error with default response
            errorObject = handleHttpThrowErrors.handleDefaultErrorResponse()
            break;
    }

    // Return the response with the status code and error object
    return res.status(errorObject.statusCode).json( errorObject );
}

// Export the error response handling function
module.exports = handleErrorResponse
