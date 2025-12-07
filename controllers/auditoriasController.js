const { throwNotFoundError, throwBadRequestError } = require("../errors/throwHTTPErrors");
const { pool } = require("../initDB");
const { validateMimeTypeFile, createFolder, uploadFile, validateSizeFile, checkFileExists } = require("../utils/files");
const { snakeToCamel, calcularPromedioCumplimiento, calcularPromedioPonderado, ordenarItems } = require("../utils/utils");
const ExcelJS = require('exceljs');
const path = require("path");
const fs = require("fs");
const { generarTokenFirma } = require("../utils/hash");
const EXCEL_COLORS = {
    yellow: 'FFFFF3B0', // amarillo claro
    red:    'FFFECACA', // rojo claro
    gray:   'FFE5E7EB', // gray-200
    blue:   'FFBFDBFE', // azul claro
    green:  'FFD1FAE5'  // verde claro
};


function safeSheetName(name) {
    return name.replace(/[:\/\\?\*\[\]]/g, '').substring(0, 31);
}

// Convierte Markdown → richText para ExcelJS
async function markdownHtmlToRichText(content) {
    if (!content || typeof content !== 'string') return content;

    const { marked } = await import('marked');
    const { JSDOM } = await import('jsdom');

    // 1. Convierte el markdown a HTML (sin romper las etiquetas <u>)
    const html = marked.parseInline(content);

    // 2. Crea el DOM con el HTML completo
    const dom = new JSDOM(`<div>${html}</div>`);
    const nodes = [...dom.window.document.querySelector('div').childNodes];

    // 3. Procesa los nodos en richText
    const richText = nodes.map((node) => {
        const text = node.textContent || '';
        if (!text.trim()) return null;

        const font = {};

        if (node.nodeName === 'STRONG' || node.nodeName === 'B') font.bold = true;
        if (node.nodeName === 'EM' || node.nodeName === 'I') font.italic = true;
        if (node.nodeName === 'U') font.underline = true;

        // Combina estilos anidados: <u><strong>Texto</strong></u>
        if (node.nodeType === 1 && node.hasChildNodes()) {
            const inner = node.firstChild;
            if (inner?.nodeName === 'STRONG' || inner?.nodeName === 'B') font.bold = true;
            if (inner?.nodeName === 'EM' || inner?.nodeName === 'I') font.italic = true;
        }

        return { text, font };
    }).filter(Boolean);

    return richText.length > 0 ? { richText } : content;
}

const colorMap = {
  yellow: 'FFFFFF00', // amarillo
  red:    'FFFF0000', // rojo
  gray:   'FF9CA3AF', // gris Tailwind (gray-400)
  blue:   'FF3B82F6', // azul Tailwind (blue-500)
  green:  'FF10B981', // verde Tailwind (green-500)
};

const nombresLargosEstandares = {
    talentoHumano: "Talento Humano",
    infraestructura: "Infraestructura",
    dotacion: "Dotación",
    medicamentos: "Medicamentos, dispositivos médicos e insumos",
    procesosPrioritarios: "Procesos Prioritarios",
    historiaClinica: "Historia Clínica",
    interdependencia: "Interdependencia", 
    otros_criterios: "Otros criterios de evaluación"
};
const nombresLargosResultados = {
    cumple: "Cumple",
    noCumple: "No cumple",
    noAplica: "No aplica",
    cumpleParcial: "Cumple parcial"
};

const obtenerConsolidado = async (auditoriaId) => {
    const query = `
        WITH conteo AS (
            SELECT
                ie.criterio_id,
                ce.nombre,
                ce.tipo,
                COUNT(*) FILTER (WHERE rie.resultado = 'cumple') AS cumple,
                COUNT(*) FILTER (WHERE rie.resultado = 'noCumple') AS no_cumple,
                COUNT(*) FILTER (WHERE rie.resultado = 'noAplica') AS no_aplica,
                COUNT(*) FILTER (WHERE rie.resultado = 'cumpleParcial') AS cumple_parcial,
                COUNT(*) FILTER (WHERE rie.resultado = 'noEvaluable') AS no_evaluable,
                COUNT(*) FILTER (WHERE rie.resultado != 'noEvaluable') AS total_criterios
            FROM resultados_items_evaluacion rie
            INNER JOIN items_evaluacion ie ON rie.item_id = ie.id
            INNER JOIN criterios_evaluacion ce ON ie.criterio_id = ce.id
            WHERE rie.auditoria_id = $1
            GROUP BY ie.criterio_id, ce.nombre, ce.tipo
        ),
        cumplimiento_calculado AS (
            SELECT
                *,
                CASE
                    WHEN (total_criterios - no_aplica) > 0 THEN
                        ROUND(((cumple + (cumple_parcial * 0.5)) / (total_criterios - no_aplica)) * 100, 2)
                    ELSE 0
                END AS cumplimiento
            FROM conteo
        )
        SELECT * FROM cumplimiento_calculado
    `;

    const { rows } = await pool.query(query, [auditoriaId]);
    return rows.map(snakeToCamel);
};

exports.crearAuditoria = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const { criteriosEvaluacion, empresaId, fechaAuditoria, estado } = req.body;
        const auditorId = req.usuario.id;
        const criteriosEvaluacionUnicos = [...new Set(criteriosEvaluacion.map(id => id.toString()))];

        await client.query('BEGIN');
        
        // 1. Obtener criterios relacionados con los servicios
        const itemEvaluacionCriterioQuery = await client.query(
            `SELECT id, criterio_id, es_evaluable FROM items_evaluacion
            WHERE criterio_id = ANY($1::uuid[])`,
            [criteriosEvaluacionUnicos]
        );

        const itemsEvaluacion = itemEvaluacionCriterioQuery.rows;
        // 2. Insertar auditoría
        const auditoriaQuery = await client.query(
            `INSERT INTO auditorias (empresa_id, fecha_auditoria, estado) VALUES ($1, $2, $3) RETURNING *`,
            [empresaId, fechaAuditoria, estado]
        );
        const auditoria = auditoriaQuery.rows[0];
        
        // 3. Insertar resultados_criterios con estado "noAplica" o "noEvaluable" de acuerdo al tipo de item
        for (const item of itemsEvaluacion) {
            const resultado = item.es_evaluable ? "noAplica" : "noEvaluable";
            await client.query(
                `INSERT INTO resultados_items_evaluacion (auditoria_id, item_id, criterio_id, resultado)
                VALUES ($1, $2, $3, $4)`,
                [auditoria.id, item.id, item.criterio_id, resultado]
            );
        }

        // 4. Insertar en auditoria_criterio (relación N:M entre auditoría y criterios_evaluacion)
        for (const criterioId of criteriosEvaluacionUnicos) {
            await client.query(
                `INSERT INTO auditoria_criterio (auditoria_id, criterio_evaluacion_id)
                VALUES ($1, $2)`,
                [auditoria.id, criterioId]
            );
        }

        // 5. Insertar usuario en auditores_auditorias
        await client.query(
            `INSERT INTO auditores_auditoria (auditoria_id, auditor_id) 
                VALUES ($1, $2)`, [auditoria.id, auditorId])

        await client.query('COMMIT');

        // 6. Obtener auditoría con empresa (si deseas incluir datos de empresa)
        const auditoriaCompleta = await pool.query(`
            SELECT a.*, e.nombre AS empresa_nombre
            FROM auditorias a
            LEFT JOIN empresas e ON a.empresa_id = e.id
            WHERE a.id = $1
        `, [auditoria.id]);

        const auditoriaInformacion =  auditoriaCompleta.rows[0]

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            data: snakeToCamel(auditoriaInformacion)
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

exports.obtenerAuditoria = async (req, res, next) => {
    try {
        const { auditoriaId } = req.params;
        const id = parseInt(auditoriaId);

        // 1. Verifica que exista la auditoría y obtiene info + empresa
        const auditoriaQuery = await pool.query(`
            SELECT a.*, e.nombre AS empresa_nombre
            FROM auditorias a
            LEFT JOIN empresas e ON a.empresa_id = e.id
            WHERE a.id = $1
        `, [id]);

        if (auditoriaQuery.rowCount === 0) {
            throwNotFoundError("La auditoría no existe.");
        }

        const auditoria = snakeToCamel(auditoriaQuery.rows[0]);

        // 2. Obtener criterios asociados desde auditoria_criterio
        const criteriosQuery = await pool.query(`
            SELECT ce.*
            FROM criterios_evaluacion ce
            INNER JOIN auditoria_criterio auc ON auc.criterio_evaluacion_id = ce.id
            WHERE auc.auditoria_id = $1
        `, [id]);

        auditoria.criteriosEvaluacion = criteriosQuery.rows.map(snakeToCamel);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: auditoria
        });

    } catch (error) {
        next(error);
    }
};

exports.obtenerAuditoriasPorEmpresa = async (req, res, next) => {
    try {
        const empresaId = req.params.empresaId;
        const pagina = parseInt(req.query.pagina) || 1;
        const limite = parseInt(req.query.limite) || 10;
        const offset = (pagina - 1) * limite;

        // 1. Auditorías por empresa
        const auditoriasQuery = await pool.query(`
            SELECT a.*, e.nombre AS empresa_nombre
            FROM auditorias a
            LEFT JOIN empresas e ON e.id = a.empresa_id
            WHERE a.empresa_id = $1
            ORDER BY a.fecha_auditoria DESC
            LIMIT $2 OFFSET $3
        `, [empresaId, limite, offset]);

        const auditorias = auditoriasQuery.rows.map(snakeToCamel);

        // 2. Total registros
        const totalQuery = await pool.query(`
            SELECT COUNT(*) FROM auditorias WHERE empresa_id = $1
        `, [empresaId]);
        const totalRegistros = parseInt(totalQuery.rows[0].count);
        const totalPaginas = Math.ceil(totalRegistros / limite);

        // 3. Obtener solo los IDs de criterios asociados
        const auditoriaIds = auditorias.map(a => a.id);
        if (auditoriaIds.length > 0) {
            const criteriosQuery = await pool.query(`
                SELECT auditoria_id, criterio_evaluacion_id
                FROM auditoria_criterio
                WHERE auditoria_id = ANY($1)
            `, [auditoriaIds]);

            // Agrupar por auditoría
            const criteriosPorAuditoria = {};
            criteriosQuery.rows.forEach(({ auditoria_id, criterio_evaluacion_id }) => {
                if (!criteriosPorAuditoria[auditoria_id]) {
                    criteriosPorAuditoria[auditoria_id] = [];
                }
                criteriosPorAuditoria[auditoria_id].push(criterio_evaluacion_id);
            });

            // Agregar al objeto auditoría
            auditorias.forEach(a => {
                a.criteriosEvaluacion = criteriosPorAuditoria[a.id] || [];
            });
        }

        // 4. Respuesta
        return res.status(200).json({
            statusCode: 200,
            status: "success",
            paginacion: {
                paginaActual: pagina,
                totalPaginas
            },
            data: auditorias
        });
    } catch (error) {
        next(error);
    }
};

exports.obtenerCriteriosDeAuditoria = async (req, res, next) => {
    try {
        const auditoriaId = parseInt(req.params.auditoriaId);

        const criteriosQuery = await pool.query(`
            SELECT ce.*
            FROM criterios_evaluacion ce
            INNER JOIN auditoria_criterio ac ON ac.criterio_evaluacion_id = ce.id
            WHERE ac.auditoria_id = $1
            ORDER BY ce.nombre
        `, [auditoriaId]);

        const criterios = criteriosQuery.rows.map(snakeToCamel);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: criterios
        });

    } catch (error) {
        next(error);
    }
};

exports.obtenerResultadosAuditoriaPorCriterio = async (req, res, next) => {
    try {
        const auditoriaId = parseInt(req.params.auditoriaId);
        const criterioId = req.params.criterioId;

        if (isNaN(auditoriaId) || !criterioId) {
            return res.status(400).json({ error: "Parámetros inválidos." });
        }

        const resultadosQuery = await pool.query(`
            SELECT rie.* FROM resultados_items_evaluacion rie
                INNER JOIN items_evaluacion ie ON rie.item_id = ie.id
            WHERE rie.auditoria_id = $1 AND ie.criterio_id = $2
            ORDER BY ie.item
        `, [auditoriaId, criterioId]);

        const resultados = resultadosQuery.rows.map(snakeToCamel);

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: resultados
        });
    } catch (error) {
        next(error);
    }
};

exports.agregarCriteriosAuditoria = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const auditoriaId = parseInt(req.params.auditoriaId);
        const { criterios = [] } = req.body; 

        if (!Array.isArray(criterios) || criterios.length === 0) {
            throwBadRequestError(undefined, "Debe enviar un arreglo de criterios.");
        }
        await client.query('BEGIN');

        // 1. Obtener criterios ya existentes en la auditoría
        const existentesQuery = await client.query(
            `SELECT criterio_evaluacion_id FROM auditoria_criterio WHERE auditoria_id = $1`,
            [auditoriaId]
        );
        const existentes = existentesQuery.rows.map(row => row.criterio_evaluacion_id);

        // 2. Filtrar criterios nuevos
        const criteriosNuevos = criterios.filter(id => !existentes.includes(id));

        if (criteriosNuevos.length === 0) {
            await client.query('ROLLBACK');
            return res.status(200).json({
                statusCode: 200,
                status: "success",
                message: "No hay nuevos criterios para agregar."
            });
        }

        // 3. Insertar nuevos criterios en auditoria_criterio
        for (const criterioId of criteriosNuevos) {
            await client.query(
                `INSERT INTO auditoria_criterio (auditoria_id, criterio_evaluacion_id)
                VALUES ($1, $2)`,
                [auditoriaId, criterioId]
            );
        }

        // 4. Obtener todos los items relacionados con esos criterios
        const itemsQuery = await client.query(
            `SELECT id, criterio_id, es_evaluable FROM items_evaluacion
            WHERE criterio_id = ANY($1::uuid[])`,
            [criteriosNuevos]
        );
        const items = itemsQuery.rows;

        // 5. Insertar resultados "noAplica" para cada item
        for (const item of items) {
            const resultado = item.es_evaluable ? "noAplica" : "noEvaluable";
            await client.query(
                `INSERT INTO resultados_items_evaluacion (auditoria_id, item_id, criterio_id, resultado)
                VALUES ($1, $2, $3, $4)`,
                [auditoriaId, item.id, item.criterio_id, resultado]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Criterios agregados a la auditoría correctamente."
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

exports.eliminarCriteriosAuditoria = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const auditoriaId = req.params.auditoriaId;
        const { criterios = [] } = req.body;

        if (!Array.isArray(criterios) || criterios.length === 0) {
            throwBadRequestError(undefined, "Debe enviar un arreglo de criterios a eliminar.")
        }

        await client.query("BEGIN");

        // 1. Verificar qué criterios realmente existen en la auditoría
        const existentesQuery = await client.query(
            `SELECT criterio_evaluacion_id FROM auditoria_criterio
                WHERE auditoria_id = $1`,
            [auditoriaId]
        );

        const existentes = existentesQuery.rows.map((row) => row.criterio_evaluacion_id);
        const criteriosAEliminar = criterios.filter((id) => existentes.includes(id));

        if (criteriosAEliminar.length === 0) {
            await client.query("ROLLBACK");
            throwBadRequestError(undefined, "No se encontraron criterios válidos para eliminar.");
        }

        // 2. Buscar items asociados a los criterios a eliminar
        const itemsQuery = await client.query(
            `SELECT id FROM items_evaluacion
            WHERE criterio_id = ANY($1::uuid[])`,
            [ criteriosAEliminar ]
        );

        const itemIds = itemsQuery.rows.map((row) => row.id);

        // 3. Eliminar resultados asociados a esos items en esta auditoría
        if (itemIds.length > 0) {
            await client.query(
                `DELETE FROM resultados_items_evaluacion
                WHERE auditoria_id = $1 AND item_id = ANY($2::uuid[])`,
                [auditoriaId, itemIds]
            );
        }

        // 4. Eliminar vínculos de criterios en la tabla auditoria_criterio
        await client.query(
            `DELETE FROM auditoria_criterio
            WHERE auditoria_id = $1 AND criterio_evaluacion_id = ANY($2::uuid[])`,
            [auditoriaId, criteriosAEliminar]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Criterios eliminados de la auditoría correctamente.",
        });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
}

exports.descargarConsolidado = async (req, res, next) => {
    try {
        const { auditoriaId } = req.params;
        const workbook = new ExcelJS.Workbook();

        // ----------------------------
        // Helpers seguros
        // ----------------------------
        const safeSheetName = (name) => name?.toString().replace(/[:\/\\?\*\[\]]/g,'').substring(0,31) || 'Hoja';
        const safeValue = (value, fallback='') => {
            if(value === undefined || value === null) return fallback;
            if(typeof value === 'number') return value;
            if(typeof value === 'string') return value;
            return value.toString();
        };

        const safeRichText = (obj) => {
            if (!obj) return '';

            // Si ya es richText, devolverlo tal cual
            if (Array.isArray(obj?.richText)) {
                return { richText: obj.richText };
            }

            // Si no es richText, convertir a texto simple
            return safeValue(obj);
        };

        // ----------------------------
        // Obtener consolidado
        // ----------------------------
        const resultadoConsolidado = await obtenerConsolidado(auditoriaId);

        /** HOJA CONSOLIDADO */
        const hojaConsolidado = workbook.addWorksheet(safeSheetName('Consolidado'));
        hojaConsolidado.mergeCells('B2:I2');
        hojaConsolidado.getCell('B2').value = 'Informe Consolidado';
        hojaConsolidado.getCell('B2').font = { bold: true, size: 14, color: { argb: 'FFFFFF' }};
        hojaConsolidado.getCell('B2').alignment = { horizontal: 'center' };
        hojaConsolidado.columns = Array(9).fill().map((_, i) => ({ width: i===0 ? 5 : 20 }));
        for(let i=2;i<=9;i++){
            hojaConsolidado.getColumn(i).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }

        let rowOffset = 3;

        /** ESTÁNDARES */
        const estandares = resultadoConsolidado.filter(c => c.tipo === "estandar");
        estandares.sort((a, b) => {
            const aNombre = (a?.nombre ?? '').toString().toLowerCase();
            const bNombre = (b?.nombre ?? '').toString().toLowerCase();
            return aNombre.localeCompare(bNombre);
        });


        if(estandares.length>0){
            hojaConsolidado.mergeCells(`B${rowOffset}:I${rowOffset}`);
            hojaConsolidado.getCell(`B${rowOffset}`).value = 'Estándares';
            hojaConsolidado.getCell(`B${rowOffset}`).font = { bold: true, size: 12 };
            hojaConsolidado.getCell(`B${rowOffset}`).alignment = { horizontal: 'center' };
            hojaConsolidado.getCell(`B${rowOffset}`).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD1D5DB'} };
            rowOffset++;

            hojaConsolidado.getRow(rowOffset).values = ['', 'Estandar', '', 'Total criterios', 'Cumple', 'No Cumple', 'Cumple parcial', 'No Aplica', 'Cumplimiento (%)'];
            hojaConsolidado.getRow(rowOffset).font = { bold:true };
            hojaConsolidado.getRow(rowOffset).alignment = { horizontal:'center' };
            rowOffset++;

            estandares.forEach(estandar => {
                hojaConsolidado.addRow([
                    '',
                    safeValue(estandar.nombre),
                    '',
                    safeValue(estandar.totalCriterios,0),
                    safeValue(estandar.cumple,0),
                    safeValue(estandar.noCumple,0),
                    safeValue(estandar.cumpleParcial,0),
                    safeValue(estandar.noAplica,0),
                    safeValue(estandar.cumplimiento,0)/100
                ]);
                hojaConsolidado.mergeCells(`B${rowOffset}:C${rowOffset}`);
                const lastRow = hojaConsolidado.lastRow;
                if(typeof lastRow.getCell(9).value === 'number') lastRow.getCell(9).numFmt='0.0%';
                rowOffset++;
            });
            rowOffset++;
        }

        /** SERVICIOS */
        const servicios = resultadoConsolidado.filter(c => c.tipo === "servicio");
        servicios.sort((a, b) => {
            const aNombre = (a?.servicioDetalles?.nombre ?? '').toString().toLowerCase();
            const bNombre = (b?.servicioDetalles?.nombre ?? '').toString().toLowerCase();
            return aNombre.localeCompare(bNombre);
        });


        if(servicios.length>0){
            hojaConsolidado.mergeCells(`B${rowOffset}:I${rowOffset}`);
            hojaConsolidado.getCell(`B${rowOffset}`).value = 'Servicios';
            hojaConsolidado.getCell(`B${rowOffset}`).font = { bold:true, size:12 };
            hojaConsolidado.getCell(`B${rowOffset}`).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD1D5DB'} };
            hojaConsolidado.getCell(`B${rowOffset}`).alignment = { horizontal:'center' };
            rowOffset++;

            hojaConsolidado.getRow(rowOffset).values = ['', 'Servicio', '', 'Total criterios', 'Cumple', 'No Cumple', 'Cumple parcial', 'No Aplica', 'Cumplimiento (%)'];
            hojaConsolidado.getRow(rowOffset).font = { bold:true };
            hojaConsolidado.getRow(rowOffset).alignment = { horizontal:'center' };
            rowOffset++;

            servicios.forEach(servicio => {
                hojaConsolidado.addRow([
                    '',
                    safeValue(servicio.servicioDetalles?.nombre),
                    '',
                    safeValue(servicio.totalCriterios,0),
                    safeValue(servicio.cumple,0),
                    safeValue(servicio.noCumple,0),
                    safeValue(servicio.cumpleParcial,0),
                    safeValue(servicio.noAplica,0),
                    safeValue(servicio.cumplimiento,0)/100
                ]);
                hojaConsolidado.mergeCells(`B${rowOffset}:C${rowOffset}`);
                const lastRow = hojaConsolidado.lastRow;
                if(typeof lastRow.getCell(9).value==='number') lastRow.getCell(9).numFmt='0.0%';
                rowOffset++;
            });
            rowOffset++;
        }

        /** CRITERIOS DE EVALUACIÓN */
        const {rows: rowsCriteriosAuditorias} = await pool.query(
            `SELECT * FROM auditoria_criterio 
             INNER JOIN criterios_evaluacion
             ON auditoria_criterio.criterio_evaluacion_id = criterios_evaluacion.id
             WHERE auditoria_criterio.auditoria_id = $1`, [auditoriaId]
        );
        const criterios = rowsCriteriosAuditorias || [];

        for(const criterio of criterios){
            let rowOffsetServicio = 3;
            const hojaServicio = workbook.addWorksheet(safeSheetName(criterio.nombre));

            hojaServicio.mergeCells('B2:F2');
            hojaServicio.getCell('B2').value = safeValue(criterio.nombre);
            hojaServicio.getCell('B2').font = { bold:true, size:14, color:{argb:'FFFFFF'} };
            hojaServicio.getCell('B2').alignment = { horizontal:'center' };
            hojaServicio.getCell('B2').fill = hojaServicio.getCell('E2').fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF4B5563'} };

            hojaServicio.columns = [
                {width:5},{width:20},{width:65},
                {width:20},{width:22},{width:50}
            ];

            hojaServicio.autoFilter = { from:'D3', to:'E3' };
            hojaServicio.getColumn(2).alignment = { vertical:'middle', horizontal:'center' };
            hojaServicio.getColumn(3).alignment = { vertical:'middle', wrapText:true };
            hojaServicio.getColumn(4).alignment = { vertical:'middle', horizontal:'center' };
            hojaServicio.getColumn(5).alignment = { horizontal:'center', vertical:'middle' };
            hojaServicio.getColumn(6).alignment = { wrapText:true, vertical:'middle' };

            hojaServicio.getRow(rowOffsetServicio).values = ['', 'Ítem', 'Criterio de evaluación', 'Estandar', 'Estado', 'Observaciones'];
            hojaServicio.getRow(rowOffsetServicio).font = { bold:true };
            hojaServicio.getRow(rowOffsetServicio).alignment = { horizontal:'center' };
            for(let col=2; col<=6; col++){
                hojaServicio.getCell(rowOffsetServicio,col).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD1D5DB'} };
            }
            rowOffsetServicio++;

            const {rows: resultadosItems} = await pool.query(
                `SELECT * FROM resultados_items_evaluacion as rie
                 INNER JOIN items_evaluacion as ie
                 ON rie.item_id = ie.id
                 WHERE rie.criterio_id = $1 AND rie.auditoria_id = $2
                 ORDER BY string_to_array(item, '.')::int[]`,
                 [criterio.id, auditoriaId]
            );

            for (const resultado of resultadosItems) {
                const descripcionObj = await markdownHtmlToRichText(resultado.descripcion);
                const observacionesObj = await markdownHtmlToRichText(resultado.observaciones);

                const row = hojaServicio.addRow([
                    '',
                    safeValue(resultado.mostrar_item ? resultado.item : ""),
                    safeRichText(descripcionObj),
                    safeValue(nombresLargosEstandares[resultado.estandar], 'N/A'),
                    safeValue(nombresLargosResultados[resultado.resultado], ''),
                    safeRichText(observacionesObj)
                ]);

                //  Si highlight_color existe y está mapeado
                const colorARGB = EXCEL_COLORS[resultado.highlight_color];

                if (colorARGB) {
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: colorARGB }
                        };
                    });
                }
            }
        }

        /** FIRMAS */
        let colStart = 1;
        const {rows: rowsFirmas} = await pool.query(
            `SELECT * FROM auditoria_firma 
             INNER JOIN firmas
             ON auditoria_firma.firma_id = firmas.id
             WHERE auditoria_firma.auditoria_id = $1`, [auditoriaId]
        );
        const firmas = rowsFirmas || [];
        const rutaFirmaDefault = path.join(__dirname, `../public/img/image-default.png`);
        [10,11,12,13,14].forEach(c => hojaConsolidado.getColumn(c).width = 20);

        firmas.forEach((firma, index) => {
            const pathFile = path.join(__dirname, `../uploads/firmas/${firma.archivo}`);
            const rutaFirma = checkFileExists(pathFile) ? pathFile : rutaFirmaDefault;

            const imageId = workbook.addImage({ filename: rutaFirma, extension:'png' });
            hojaConsolidado.addImage(imageId, { tl:{col:colStart,row:rowOffset}, br:{col:colStart+1,row:rowOffset+4} });

            hojaConsolidado.getCell(rowOffset+5,colStart+1).value = safeValue(firma._completos,'');
            hojaConsolidado.getCell(rowOffset+5,colStart+1).font = { bold:true };
            hojaConsolidado.getCell(rowOffset+5,colStart+1).alignment = { vertical:'top', wrapText:true };

            hojaConsolidado.getCell(rowOffset+6,colStart+1).value = safeValue(firma.rol,'').replace(/\b\w/g,c=>c.toUpperCase());
            hojaConsolidado.getCell(rowOffset+6,colStart+1).alignment = { horizontal:'left' };
            colStart++;
        });

        res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition','attachment; filename=ReporteCompleto.xlsx');
        await workbook.xlsx.write(res);
        res.status(200).end();

    } catch(error){
        next(error);
    }
};


exports.obtenerConsolidadoAuditoria = async (req, res, next) => {
    try {
        const {auditoriaId} = req.params
        const resultadoFinal = await obtenerConsolidado(auditoriaId)

        return res.status(200).json({
            "statusCode": 200,
            "status": "success",
            "data": resultadoFinal
        })

    } catch (error) {
        next(error)       
    }
}

exports.actualizarAuditoria = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const auditoriaId = parseInt(req.params.auditoriaId);
        const { fechaAuditoria, estado } = req.body;

        const result = await client.query(
            `UPDATE auditorias
             SET fecha_auditoria = $1,
                 estado = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [fechaAuditoria, estado, auditoriaId]
        );

        if (result.rowCount === 0) {
            throwNotFoundError("Auditoría no encontrada.");
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Auditoría actualizada correctamente.",
            data: snakeToCamel(result.rows[0])
        });

    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
}

// Eliminar auditoría
exports.eliminarAuditoria = async (req, res, next) => {
    const client = await pool.connect();

    try {
        const auditoriaId = parseInt(req.params.auditoriaId);
        const result = await client.query(
            `DELETE FROM auditorias WHERE id = $1 RETURNING *`,
            [auditoriaId]
        );

        if (result.rowCount === 0) {
            throwNotFoundError("La auditoría no existe.")
        }

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Auditoría eliminada correctamente."
        });

    } catch (error) {
        next(error);
    } finally {
        client.release();
    }
};

/* Firmas */
// Agregar firma de usuario registrado
exports.agregarFirmaUsuarioRegistrado = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { usuarioId } = req.body;
        const { auditoriaId } = req.params;

        await client.query("BEGIN");

        // Verificar que el usuario exista
        const { rows: usuarios } = await client.query(
            "SELECT 1 FROM usuarios WHERE id = $1",
            [usuarioId]
        );
        if (usuarios.length === 0) {
            throwNotFoundError("El usuario seleccionado no existe.");
        }

        // Verificar que el usuario tenga firma
        const { rows: firmas } = await client.query(
            "SELECT * FROM firmas WHERE usuario_id = $1",
            [usuarioId]
        );
        console.log(firmas)
        if (firmas.length === 0) {
            throwNotFoundError("El usuario no tiene una firma registrada.");
        }

        const { id: firmaId, archivo } = firmas[0];

        // Insertar relación en auditoria_firma
        await client.query(
            `INSERT INTO auditoria_firma (auditoria_id, firma_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [auditoriaId, firmaId]
        );

        await client.query("COMMIT");

        // Verificar si el archivo existe
        const filePath = path.join(__dirname, `../uploads/firmas/${archivo}`);
        let rutaFirma = '/images/image-default.png';

        if (checkFileExists(filePath)) {
            rutaFirma = generarTokenFirma(archivo); 
        }

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Firma asociada exitosamente.",
            data: {
                ...snakeToCamel(firmas[0]),
                rutaFirma
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};

// Agregar firma
exports.agregarFirmaUsuarioSinRegistrar = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { nombresCompletos, rol } = req.body;
        const { auditoriaId } = req.params;

        await client.query("BEGIN");

        const file = req.files?.archivo?.[0];
        if (!file) {
            throwBadRequestError("archivo", "No se ha subido ningún archivo.");
        }
        if (!validateMimeTypeFile(["image/png", "image/jpeg", "image/jpg"], file)) {
            throwBadRequestError("file", "Solo se permite la carga de imágenes.");
        }
        if (!validateSizeFile(file, 10)) {
            throwBadRequestError("file", "El archivo excede el tamaño máximo permitido (10 MB).");
        }

        const newFilename = file.newFilename;

        // Carpeta general: ./uploads/firmas  (mantén la misma convención que los otros controladores)
        const firmaDir = path.join(__dirname, `../uploads/firmas`);
        await createFolder(firmaDir);

        const fullPath = path.join(firmaDir, newFilename);
        await uploadFile(file.filepath, fullPath);

        const insertFirma = `
            INSERT INTO firmas (nombres_completos, rol, archivo)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const { rows } = await client.query(insertFirma, [nombresCompletos, rol, newFilename]);
        const { id: firmaId, archivo } = rows[0];

        await client.query(
            "INSERT INTO auditoria_firma (auditoria_id, firma_id) VALUES ($1, $2)",
            [auditoriaId, firmaId]
        );

        await client.query("COMMIT");

        const filePath = path.join(__dirname, `../uploads/firmas/${archivo}`);
        let rutaFirma = "/images/image-default.png";

        if (checkFileExists(filePath)) {
            rutaFirma = generarTokenFirma(archivo); 
        }

        return res.status(201).json({
            statusCode: 201,
            status: "success",
            message: "Firma creada correctamente.",
            data: {
                ...snakeToCamel(rows[0]),
                rutaFirma
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};


// Obtener firmas
exports.obtenerFirmas = async (req, res, next) => {
    try {
        const { auditoriaId } = req.params;

        // Obtener las firmas relacionadas con la auditoría
        const { rows: firmas } = await pool.query(`
            SELECT f.*
            FROM firmas f
            INNER JOIN auditoria_firma af ON af.firma_id = f.id
            WHERE af.auditoria_id = $1
        `, [auditoriaId]);

        // Agregar ruta del archivo con token
        const firmasActualizadas = firmas.map(firma => {
            let rutaFirma = "/images/image-default.png";
            const archivoPath = path.join(__dirname, `../uploads/firmas/${firma.archivo}`);

            if (checkFileExists(archivoPath)) {
                rutaFirma = generarTokenFirma(firma.archivo);
            }

            return {
                ...firma,
                rutaFirma
            };
        });

        return res.status(200).json({
            statusCode: 200,
            status: "success",
            data: firmasActualizadas.map(snakeToCamel)
        });
    } catch (error) {
        next(error);
    }
};

exports.quitarFirma = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { firmaId, auditoriaId } = req.params;

        await client.query("BEGIN");

        // 1. Verificar que la firma exista
        const { rows: firmas } = await client.query(
            `SELECT * FROM firmas WHERE id = $1`,
            [firmaId]
        );
        if (firmas.length === 0) {
            throwNotFoundError("La firma seleccionada no existe");
        }

        const firma = firmas[0];

        // 2. Eliminar la relación en la tabla intermedia
        await client.query(
            `DELETE FROM auditoria_firma 
             WHERE auditoria_id = $1 AND firma_id = $2`,
            [auditoriaId, firmaId]
        );

        // 3. Si no tiene usuario asignado, eliminar firma y archivo
        if (!firma.usuario_id) {
            await client.query(`DELETE FROM firmas WHERE id = $1`, [firmaId]);

            const archivoPath = path.join(__dirname, `../firmas/${firma.archivo}`);
            if (fs.existsSync(archivoPath)) {
                fs.unlinkSync(archivoPath); // eliminar archivo físico
            }
        }

        await client.query("COMMIT");

        return res.json({
            statusCode: 200,
            status: "success",
            message: "Firma eliminada exitosamente."
        });
    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};
