
const obtenerEmpresaId = (req, res, next)=> {
    req.empresaId = req?.params?.empresaId || req?.body?.empresaId;
    next();
}

module.exports = obtenerEmpresaId