const { throwForbiddenError, throwServerError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const crypto = require("crypto");
const { PLANES, LIMITES_PLANES, NIVELES_PLANES } = require("../utils/planesUtils");

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
  const inicio = new Date();

  const fin = new Date(inicio);
  fin.setMonth(fin.getMonth() + meses);
  fin.setHours(23, 59, 59, 999); // 👈 clave

  return {
    fechaInicio: inicio,
    fechaFin: fin
  };
}

function validarFirma(event) {
    try {
        const timestamp = event?.timestamp;
        const transaction = event?.data?.transaction;
        const checksum = event?.signature?.checksum;

        if (!timestamp || !transaction || !checksum) return false;

        const { id, status, amount_in_cents } = transaction;

        const concatenatedValues = `${id}${status}${amount_in_cents}${timestamp}${process.env.EVENTS_KEY_PROD}`;

        const hash = crypto.createHash("sha256").update(concatenatedValues).digest("hex");

        return hash === checksum;
    } catch (err) {
        console.log("Error validando firma:", err);
        return false;
    }
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
      monto,
      firmaIntegridad: hashHex
    });
  } catch (error) {
    next(error);
  }
};

exports.webhook = async function (req, res, next) {
  const event = req.body;
  const client = await pool.connect();
  console.log("Webhook recibido!");

  try {
    // ⛔️ Validaciones básicas
    if (!event || !event.event) {
      return res.status(200).json({ message: "Evento ignorado" });
    }

    if (!validarFirma(event)) {
      return res.status(400).json({ error: "Firma inválida" });
    }

    if (event.event !== "transaction.updated") {
      return res.status(200).json({ message: "Evento ignorado" });
    }

    const { status, reference } = event.data.transaction;

    await client.query("BEGIN");

    // 🔒 Bloqueo para lectura y escritura
    const { rows } = await client.query(
      `SELECT * FROM pagos_wompi WHERE referencia = $1 FOR UPDATE`,
      [reference]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Referencia no encontrada" });
    }

    const pago = rows[0];

    // ✅ Si ya está en estado final, ignorar
    const ESTADOS_FINALES = ["aprobado"];
    if (ESTADOS_FINALES.includes(pago.estado)) {
      await client.query("COMMIT");
      return res.status(200).json({ message: "Pago ya procesado" });
    }

    let nuevoEstado = "error";

    if (status === "APPROVED") {
      nuevoEstado = "aprobado";

      const { usuario_id: usuarioId, plan, periodo } = pago;

      // Inactivar suscripción anterior
      await client.query(
        `UPDATE suscripciones
         SET estado = 'inactivo'
         WHERE usuario_id = $1 AND estado = 'activo'`,
        [usuarioId]
      );

      const { fechaInicio, fechaFin } = obtenerFechasPeriodo(periodo);
      const limites = LIMITES_PLANES[plan];

      // Conteo de recursos
      const { rowCount: empresasCount } = await client.query(
        `SELECT 1 FROM empresas WHERE owner = $1`,
        [usuarioId]
      );

      const { rowCount: auditoresCount } = await client.query(
        `SELECT 1 FROM usuarios WHERE owner = $1`,
        [usuarioId]
      );

      const totalUsuarios = auditoresCount + 1; // + owner
      const cubreTodo =
        empresasCount <= limites.empresas &&
        totalUsuarios <= limites.usuarios;

      // 🔐 Actualiza pago antes de crear suscripción
      await client.query(
        `UPDATE pagos_wompi
         SET estado = $1, actualizado_en = NOW()
         WHERE referencia = $2`,
        [nuevoEstado, reference]
      );

      // Crear nueva suscripción
      await client.query(
        `INSERT INTO suscripciones
         (usuario_id, plan, estado, fecha_inicio, fecha_fin, cambio_plan, pendiente_desbloqueo)
         VALUES ($1, $2, 'activo', $3, $4, true, $5)`,
        [usuarioId, plan, fechaInicio, fechaFin, !cubreTodo]
      );

      // 🔒 Bloquear TODO excepto owner
      await client.query(
        `UPDATE empresas SET estado = 'bloqueado' WHERE owner = $1`,
        [usuarioId]
      );

      await client.query(
        `UPDATE usuarios SET estado = 'bloqueado' WHERE owner = $1 AND id != $1`,
        [usuarioId]
      );

      // 🔓 Activar solo si cumple límites
      if (cubreTodo) {
        await client.query(
          `UPDATE empresas SET estado = 'activo' WHERE owner = $1`,
          [usuarioId]
        );

        await client.query(
          `UPDATE usuarios SET estado = 'activo' WHERE owner = $1`,
          [usuarioId]
        );
      }

      // 🚫 Owner siempre activo
      await client.query(
        `UPDATE usuarios SET estado = 'activo' WHERE id = $1`,
        [usuarioId]
      );

    } else if (status === "DECLINED") {
      // ❌ No permitimos retroceder desde aprobado
      nuevoEstado = pago.estado === "aprobado" ? pago.estado : "fallido";

      await client.query(
        `UPDATE pagos_wompi
         SET estado = $1, actualizado_en = NOW()
         WHERE referencia = $2`,
        [nuevoEstado, reference]
      );
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Webhook procesado correctamente" });

  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

