const { throwForbiddenError } = require("../errors/throwHTTPErrors");

module.exports = function bloquearEdicionSiLectura(req, res, next) {

    if(req.modoLectura){
        const metodo = req.method;
        const metodosBloqueados = ["POST", "PUT", "PATCH", "DELETE"];

        if(metodosBloqueados.includes(metodo)){
            throwForbiddenError("Tu suscripción no está activa. Solo puedes visualizar la información")
        }
    }

    next();
}