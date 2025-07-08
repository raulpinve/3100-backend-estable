const { throwForbiddenError } = require("../errors/throwHTTPErrors");

const verificarPermisosAdministradores = (req, res, next) => {
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

module.exports = verificarPermisosAdministradores