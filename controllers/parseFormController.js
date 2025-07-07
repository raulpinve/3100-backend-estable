const formidable = require('formidable');

// Middleware to parse forms using the Formidable library
const parseForm = (customOptions = {}) => {
    const defaultOptions = {
        multiples: false,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // Max file size: 10MB
    };
    const options = { ...defaultOptions, ...customOptions };

    return (req, res, next) => {
        const form = new formidable.IncomingForm(options);
        form.parse(req, (err, fields, files) => {
            if (err) {
                if (err.code === 1009 || err.code === "1009") {
                    return res.status(400).json({
                        statusCode: 400,
                        message: "Los datos proporcionados no son válidos",
                        error: {
                            fieldErrors: [{
                                field: "archivo",
                                message: "El archivo excede el peso máximo permitido de 10MB",
                            }]
                        },
                    })
                }
                return next(err);
            }
            // Firstvalues evita que cada "value" del field sea un "array" (comportamiento por defecto de express-validator)
            req.body = Object.fromEntries(
                Object.entries(fields).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
            );
            req.files = files;
            next();
        });
    };
};

module.exports = parseForm;
