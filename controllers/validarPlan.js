const { throwForbiddenError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");

const PLAN_LIMITS = {
    basico:   { empresas: 1, auditores: 1 },
    estandar: { empresas: 3, auditores: 5 },
    premium:  { empresas: 10, auditores: 15 }
};

function validarPlan(tipo) {
    return async function(req, res, next) {
        try {
            const adminId = req?.usuario?.id;

            // 1. Obtener la suscripción activa
            const { rows: sub } = await pool.query(
                `SELECT plan 
                FROM suscripciones 
                WHERE usuario_id = $1 AND estado = 'activo'
                ORDER BY fecha_inicio DESC
                LIMIT 1`,
                [adminId]
            );

            if (!sub.length) {
                return res.status(403).json({
                    error: "No tienes una suscripción activa."
                });
            }

            const plan = sub[0].plan;
            const limites = PLAN_LIMITS[plan];

            if(!limites){
                throwForbiddenError("Tu plan no tiene límites configurados.");
            }

            // 2. Contar recursos
            let query = "";
            if(tipo === "empresa"){
                query = `SELECT COUNT(*)::int AS total FROM empresas WHERE owner = $1`;
            } else if(tipo === "auditor"){
                query  = `SELECT COUNT(*)::int AS total FROM usuarios WHERE owner = $1`
            }

            const { rows: rowsRecursos } = await pool.query(query, [adminId]);
            const total = rowsRecursos[0].total;

            // 3. Comparar límite
            const limite = tipo === "empresa"
                ? limites.empresas
                : limites.auditores;

            if (total >= limite) {
                const nombreRecurso = tipo === "auditor" ? "auditores" : "empresas";

                throwForbiddenError(
                    `Tu plan (${plan}) no te permite crear más ${nombreRecurso}. ` +
                    `Límite permitido: ${limite}, usados: ${total}.`
                );
            }
            next();
        } catch (error) {
            console.log(error);
            next(error)
        }

    }
}
module.exports = { validarPlan, PLAN_LIMITS };