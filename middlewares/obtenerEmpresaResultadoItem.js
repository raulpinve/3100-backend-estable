const { throwServerError, throwNotFoundError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");

const obtenerEmpresaResultadoItem = async (req, res, next)=> {
    const resultadoItemId = req.params?.resultadoItemId || req.body?.resultadoItemId;

    if(!resultadoItemId){
        throwServerError("Debe pasar el ID del item.")
    }
    // Obtener la información de la auditoria
    const {rows: rowsResultadoItem} = await pool.query(
        `SELECT auditorias.empresa_id FROM auditorias as aud
            INNER JOIN resultados_items_evaluacion as rie
            ON aud.id = rie.auditoria_id
            WHERE rie.id=$1`, [resultadoItemId]
    )
    if(!rowsResultadoItem.length === 0){
        throwNotFoundError("La auditoría no existe.");
    }

    req.empresaId = rowsResultadoItem[0].empresa_id;
    next();
}

module.exports = obtenerEmpresaResultadoItem