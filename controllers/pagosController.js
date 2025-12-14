const { throwForbiddenError, throwServerError, throwBadRequestError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const crypto = require("crypto");

const PLANES = {
  basico: {
    mensual: 29000,
    trimestral: 29000 * 3 * 0.90,
    semestral: 29000 * 6 * 0.85,
    anual: 29000 * 12 * 0.80
  },
  estandar: {
    mensual: 59900,
    trimestral: 59900 * 3 * 0.90,
    semestral: 59900 * 6 * 0.85,
    anual: 59900 * 12 * 0.80
  },
  premium: {
    mensual: 189000,
    trimestral: 189000 * 3 * 0.90,
    semestral: 189000 * 6 * 0.85,
    anual: 189000 * 12 * 0.80
  }
};

const nivelPlanes = {
    "basico": 1,
    "estandar": 2, 
    "premium": 3    
}

// Función para crear el hash de la firma de integridad
async function hashCadenaIntegridad(cadenaConcatenada) {
    const encondedText = new TextEncoder().encode(cadenaConcatenada);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encondedText);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function obtenerReferenciaPago(plan, periodo) {
    const referencia = `${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const secretoIntegridad = process.env.SECRETO_INTEGRIDAD_WOMPI;

    const PERIODOS = {
        mes: "mensual",
        trimestre: "trimestral",
        semestre: "semestral",
        anio: "anual"
    };

    if (!PLANES[plan]) {
        throw new Error("Plan inválido");
    }

    if (!PERIODOS[periodo]) {
        throw new Error("Período inválido");
    }

    const aliasPeriodo = PERIODOS[periodo];

    // 👉 TOTAL con descuento (igual al frontend)
    const totalConDescuento = PLANES[plan][aliasPeriodo];

    if (!totalConDescuento || totalConDescuento <= 0) {
        throw new Error("Monto inválido");
    }

    const monto = Math.round(totalConDescuento * 100); // centavos

    const hashHex = await hashCadenaIntegridad(
        `${referencia}${monto}COP${secretoIntegridad}`
    );

    return {
        referencia,
        monto,
        hashHex
    };
}

function obtenerFechasPeriodo(meses) {
    const today = new Date();

    // Clonamos para no mutar la original
    const future = new Date(today);
    future.setMonth(future.getMonth() + meses);

    const format = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    return {
        fechaInicio: format(today),
        fechaFin: format(future)
    };
}

function validarFirma (event){
    const timestamp = event.timestamp;
    const {id: transactionId, status, amount_in_cents} = event.data.transaction;

    // 1. Concatena los valores de las propiedaes del evento
    let concatenatedValues = `${transactionId}${status}${amount_in_cents}`

    // 2. Concatena el campo timestamp 
    concatenatedValues += timestamp;

    // 3. Concatena tu secreto
    concatenatedValues += "test_events_fyyBqBHHzwt2tnC5rdlc5PalY6HQ3HH1"

    // Genera el checksum con la llave secreta
    const checksum = crypto
        .createHash('sha256')
        .update(concatenatedValues)
        .digest('hex');

    // Compara el checksum generado con el recibido
    return checksum === event.signature.checksum;
}

exports.crearReferenciaCompra = async function (req, res, next) {
  try {
    const { plan, periodo } = req.body;
    const { id: usuarioId } = req.usuario;

    if (!req.usuario) {
      throwForbiddenError("No tienes permisos para realizar esta acción.");
    }

    const { referencia, monto, hashHex } =
      await obtenerReferenciaPago(plan, periodo);

    // ❗️ Solo eliminar pagos pendientes
    await pool.query(
      `DELETE FROM pagos_wompi 
       WHERE usuario_id = $1 AND estado = 'pendiente'`,
      [usuarioId]
    );

    const { rows } = await pool.query(
      `INSERT INTO pagos_wompi (usuario_id, plan, referencia, monto)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [usuarioId, plan, referencia, monto / 100] // guardamos en COP
    );

    if (rows.length === 0) {
      throwServerError("No se pudo crear la referencia");
    }

    return res.json({
      referencia,
      monto, // centavos
      firmaIntegridad: hashHex
    });
  } catch (error) {
    next(error);
  }
};

exports.webhook = async function (req, res, next) {
    const event = req.body;
    const client = await pool.connect();

    try {
        const isValid = validarFirma(event);
        if (!isValid) {
            return res.status(400).json({ error: "Firma inválida" });
        }

        if (event.event !== "transaction.updated") {
            return res.status(200).json({ message: "Evento ignorado" });
        }

        const transaction = event.data.transaction;
        const { status, reference } = transaction;

        await client.query("BEGIN");

        // 🔎 Buscar pago
        const { rows } = await client.query(
            `SELECT * FROM pagos_wompi WHERE referencia = $1 FOR UPDATE`,
            [reference]
        );

        if (rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Referencia no encontrada" });
        }

        const pago = rows[0];

        // 🧠 Idempotencia
        if (pago.estado === "aprobado") {
            await client.query("COMMIT");
            return res.status(200).json({ message: "Pago ya procesado" });
        }

        let nuevoEstado = "error";

        if (status === "APPROVED") {
            nuevoEstado = "aprobado";

            const { usuario_id: usuarioId, plan, periodo } = pago;

            // Desactivar suscripciones previas
            await client.query(
                `UPDATE suscripciones 
                SET estado = 'inactivo' 
                WHERE usuario_id = $1 AND estado = 'activo'`,
                [usuarioId]
            );

            const { fechaInicio, fechaFin } = obtenerFechasPeriodo(periodo);


            // Verificar si el usuario hizo downgrade
            const {rows: ultimaSuscripcion} = await client.query(
                `SELECT id, plan FROM suscripciones WHERE usuario_id = $1`, 
                [usuarioId]
            )
            let drowngrade = false;
            if(ultimaSuscripcion.length > 0){
                const planActual = ultimaSuscripcion[0].plan;
                const nuevoPlan = pago.plan;

                if(nivelPlanes[nuevoPlan] < nivelPlanes[planActual]){
                    drowngrade = true;
                }
            }

            // Crear nueva suscripción
            await client.query(
                `INSERT INTO suscripciones 
                (usuario_id, plan, estado, fecha_inicio, fecha_fin, drowngrade)
                VALUES ($1, $2, 'activo', $3, $4, $5)`,
                [usuarioId, plan, fechaInicio, fechaFin]
            );
        } 
        else if (status === "DECLINED") {
            nuevoEstado = "fallido";
        }

        // 🔄 Actualizar estado del pago
        await client.query(
            `UPDATE pagos_wompi 
            SET estado = $1, actualizado_en = NOW()
            WHERE referencia = $2`,
            [nuevoEstado, reference]
        );

        await client.query("COMMIT");
        res.status(200).json({ message: "Webhook procesado" });
        } catch (error) {
            await client.query("ROLLBACK");
            next(error);
        } finally {
            client.release();
        }
    };

