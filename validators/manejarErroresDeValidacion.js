const { throwBadRequestErrorWithMultipleErrors } = require("../errors/throwHTTPErrors")
const { validationResult } = require("express-validator")

const manejarErroresDeValidacion = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throwBadRequestErrorWithMultipleErrors(errors);
    }
    next();
};

module.exports = manejarErroresDeValidacion