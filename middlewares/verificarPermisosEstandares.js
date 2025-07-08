const { throwForbiddenError } = require("../errors/throwHTTPErrors");

const verificarPermisosEstandares = (req, res, next) => {
    const {rol} = req.usuario;

    try {
        if(rol !== "administrador"){
            throwForbiddenError("No estás autorizado para realizar esta acción.");
        }    
        return next()
    } catch (error) {
        next(error);
    }
}

module.exports = verificarPermisosEstandares