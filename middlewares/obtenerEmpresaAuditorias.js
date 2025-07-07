const { throwServerError, throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");

const obtenerEmpresaAuditoria = async (req, res, next)=> {
    const auditoriaId = req.params?.auditoriaId || req.body?.auditoriaId;

    if(!auditoriaId){
        throwServerError("Debe pasar el ID de la auditoría.")
    }
    // Obtener la información de la auditoria
    const {rows: rowsAuditoria} = await pool.query(
        `SELECT empresa_id FROM auditorias WHERE id=$1`, [auditoriaId]
    )
    if(!rowsAuditoria.length === 0){
        throwNotFoundError("La auditoría no existe.");
    }

    req.empresaId = rowsAuditoria[0].empresa_id;
    next();
}

module.exports = obtenerEmpresaAuditoria