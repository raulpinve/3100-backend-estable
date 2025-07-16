-- Cambiar a la base de datos
\c postgres
DROP DATABASE IF EXISTS "3100";
CREATE DATABASE "3100";
\c "3100"

-- 1. Usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primer_nombre TEXT,
    apellidos TEXT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    email_verificado BOOLEAN DEFAULT FALSE,
    rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('administrador', 'superadministrador', 'usuario')),
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'bloqueado', 'eliminado')),
    avatar TEXT,
    avatar_thumbnail TEXT,
    owner UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Empresas
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    owner UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Relación muchos-a-muchos: usuario_empresa
CREATE TABLE usuario_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    rol_empresa TEXT NOT NULL CHECK (rol_empresa IN ('admin', 'editor', 'lector')),
    UNIQUE (usuario_id, empresa_id)
);

-- 4. Grupos de autoevaluación  (nivel agrupador)
CREATE TABLE grupos_autoevaluacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Criterios de evaluación (asociados a los grupos)
CREATE TABLE criterios_evaluacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('estandar', 'servicio', 'otros_criterios')),
    grupo_id UUID REFERENCES grupos_autoevaluacion(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Ítems de evaluación (asociados a los criterios)
CREATE TABLE items_evaluacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item TEXT NOT NULL,
    descripcion TEXT,
    estandar TEXT CHECK (estandar IN (
        'talentoHumano',
        'infraestructura',
        'dotacion',
        'medicamentos',
        'procesosPrioritarios',
        'historiaClinica',
        'interdependencia',
        'noAplica',
    )),
    highlight_color TEXT DEFAULT NULL,
    es_evaluable BOOLEAN DEFAULT true,
    mostrar_item BOOLEAN DEFAULT true,
    criterio_id UUID NOT NULL REFERENCES criterios_evaluacion(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Firmas
CREATE TABLE firmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres_completos TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('auditor', 'auditado')),
    archivo TEXT,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Auditorías
CREATE TABLE auditorias (
    id SERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    fecha_auditoria TIMESTAMP NOT NULL,
    auditor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Relación auditoría <-> criterios
CREATE TABLE auditoria_criterio (
    auditoria_id INTEGER REFERENCES auditorias(id) ON DELETE CASCADE,
    criterio_evaluacion_id UUID REFERENCES criterios_evaluacion(id) ON DELETE CASCADE,
    PRIMARY KEY (auditoria_id, criterio_evaluacion_id)
);

-- 10. Relación auditoría <-> firmas
CREATE TABLE auditoria_firma (
    auditoria_id INTEGER REFERENCES auditorias(id) ON DELETE CASCADE,
    firma_id UUID REFERENCES firmas(id),
    PRIMARY KEY (auditoria_id, firma_id)
);

-- 11. Resultados por ítem de evaluación
CREATE TABLE resultados_items_evaluacion (
    id SERIAL PRIMARY KEY,
    auditoria_id INTEGER NOT NULL REFERENCES auditorias(id) ON DELETE CASCADE,
    resultado TEXT NOT NULL DEFAULT 'noAplica' CHECK (resultado IN ('cumple', 'noCumple', 'noAplica', 'noEvaluable', 'cumpleParcial')),
    observaciones TEXT,
    item_id UUID NOT NULL REFERENCES items_evaluacion(id) ON DELETE CASCADE,
    criterio_id UUID NOT NULL REFERENCES criterios_evaluacion(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);