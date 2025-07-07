const { throwForbiddenError } = require("../errors/throwHTTPErrors");

const verificarPermisosSuperadministradores = (req, res, next) => {
    const {rol} = req.usuario;

    try {
        if(rol !== "superadministrador"){
            throwForbiddenError("No estás autorizado para realizar esta acción.");
        }    
        return next()
    } catch (error) {
        next(error);
    }
}

module.exports = verificarPermisosSuperadministradores