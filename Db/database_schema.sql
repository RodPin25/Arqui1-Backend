-- =============================================================================
-- PROYECTO FINAL: PLATAFORMA WEB EDITORIAL MULTICANAL (ARQUITECTURA MVC)
-- SCRIPT DDL: DEFINICIÓN DE ESTRUCTURA Y ESQUEMA DE BASE DE DATOS (POSTGRESQL)
-- =============================================================================
-- Motor: PostgreSQL 12+
-- Convención: snake_case, llaves explícitas, 3FN con desnormalización financiera,
-- auditoría (created_at, updated_at, deleted_at para borrado lógico).
-- =============================================================================

-- 0. Limpieza previa en cascada (para ejecuciones limpias / idempotentes)
DROP TABLE IF EXISTS cotizaciones_propuestas CASCADE;
DROP TABLE IF EXISTS cotizaciones_solicitudes CASCADE;
DROP TABLE IF EXISTS orden_detalles CASCADE;
DROP TABLE IF EXISTS ordenes CASCADE;
DROP TABLE IF EXISTS carrito_items CASCADE;
DROP TABLE IF EXISTS carritos CASCADE;
DROP TABLE IF EXISTS catalogo_productos CASCADE;
DROP TABLE IF EXISTS libros_editoriales CASCADE;
DROP TABLE IF EXISTS libros_generos CASCADE;
DROP TABLE IF EXISTS libros_autores CASCADE;
DROP TABLE IF EXISTS libros CASCADE;
DROP TABLE IF EXISTS formatos CASCADE;
DROP TABLE IF EXISTS generos CASCADE;
DROP TABLE IF EXISTS autores CASCADE;
DROP TABLE IF EXISTS editoriales CASCADE;
DROP TABLE IF EXISTS perfiles_institucionales CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Función genérica para actualización automática de updated_at
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MÓDULO 1: SEGURIDAD, ROLES Y USUARIOS (RF-02)
-- =============================================================================

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE roles IS 'Roles del sistema para control de acceso RBAC (Visitante, Minorista, Institucional, Asesor, Administrador)';

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    rol_id BIGINT NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

COMMENT ON TABLE usuarios IS 'Cuentas de usuario con hashing de credenciales y soft delete';

CREATE TABLE perfiles_institucionales (
    usuario_id BIGINT PRIMARY KEY,
    razon_social VARCHAR(200) NOT NULL,
    documento_tributario VARCHAR(50) NOT NULL UNIQUE, -- NIT, RUC o RFC
    direccion_fiscal TEXT NOT NULL,
    contacto_cargo VARCHAR(100),
    estado_verificacion VARCHAR(30) DEFAULT 'pendiente' NOT NULL 
        CHECK (estado_verificacion IN ('pendiente', 'verificado', 'rechazado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_perfiles_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TRIGGER trg_perfiles_institucionales_updated_at
BEFORE UPDATE ON perfiles_institucionales
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

COMMENT ON TABLE perfiles_institucionales IS 'Datos extendidos 1:1 para Clientes Institucionales/Mayoristas requeridos en cotizaciones y descuentos';

-- =============================================================================
-- MÓDULO 2: FONDO EDITORIAL Y CATÁLOGO DE PRODUCTOS (RF-01, RF-05.1)
-- =============================================================================

CREATE TABLE editoriales (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    email_contacto VARCHAR(150),
    sitio_web VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TRIGGER trg_editoriales_updated_at
BEFORE UPDATE ON editoriales
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

CREATE TABLE autores (
    id BIGSERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    biografia TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TRIGGER trg_autores_updated_at
BEFORE UPDATE ON autores
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

CREATE TABLE generos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TRIGGER trg_generos_updated_at
BEFORE UPDATE ON generos
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

CREATE TABLE formatos (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE, -- 'tapa_blanda', 'tapa_dura', 'ebook'
    nombre VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE formatos IS 'Catálogo comercial de formatos físicos y digitales';

CREATE TABLE libros (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    sinopsis TEXT NOT NULL,
    anio_edicion SMALLINT NOT NULL CHECK (anio_edicion >= 1400 AND anio_edicion <= 2100),
    portada_url TEXT,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TRIGGER trg_libros_updated_at
BEFORE UPDATE ON libros
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

COMMENT ON TABLE libros IS 'Obra bibliográfica abstracta (padre del catálogo)';

-- Tablas intermedias de relación N:M
CREATE TABLE libros_autores (
    libro_id BIGINT NOT NULL,
    autor_id BIGINT NOT NULL,
    orden_autoria SMALLINT DEFAULT 1 NOT NULL,
    PRIMARY KEY (libro_id, autor_id),
    CONSTRAINT fk_la_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_la_autor FOREIGN KEY (autor_id) REFERENCES autores(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE libros_generos (
    libro_id BIGINT NOT NULL,
    genero_id BIGINT NOT NULL,
    PRIMARY KEY (libro_id, genero_id),
    CONSTRAINT fk_lg_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lg_genero FOREIGN KEY (genero_id) REFERENCES generos(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE libros_editoriales (
    libro_id BIGINT NOT NULL,
    editorial_id BIGINT NOT NULL,
    PRIMARY KEY (libro_id, editorial_id),
    CONSTRAINT fk_le_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_le_editorial FOREIGN KEY (editorial_id) REFERENCES editoriales(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ediciones y productos comerciales en catálogo
CREATE TABLE catalogo_productos (
    id BIGSERIAL PRIMARY KEY,
    libro_id BIGINT NOT NULL,
    formato_id BIGINT NOT NULL,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    precio_base NUMERIC(12, 2) NOT NULL CHECK (precio_base >= 0),
    stock_disponible INTEGER NOT NULL DEFAULT 0 CHECK (stock_disponible >= 0),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT uq_libro_formato UNIQUE (libro_id, formato_id),
    CONSTRAINT fk_catalogo_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_catalogo_formato FOREIGN KEY (formato_id) REFERENCES formatos(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TRIGGER trg_catalogo_productos_updated_at
BEFORE UPDATE ON catalogo_productos
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

COMMENT ON TABLE catalogo_productos IS 'Variantes comerciales concretas con ISBN, precio unitario y control de stock';

-- =============================================================================
-- MÓDULO 3: CARRITO, VENTAS Y ÓRDENES DE COMPRA (RF-03, RF-05.2)
-- =============================================================================

CREATE TABLE carritos (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT UNIQUE, -- NULL si es usuario invitado / anónimo con token
    sesion_token VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_carritos_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TRIGGER trg_carritos_updated_at
BEFORE UPDATE ON carritos
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

CREATE TABLE carrito_items (
    id BIGSERIAL PRIMARY KEY,
    carrito_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_carrito_producto UNIQUE (carrito_id, producto_id),
    CONSTRAINT fk_ci_carrito FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ci_producto FOREIGN KEY (producto_id) REFERENCES catalogo_productos(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TRIGGER trg_carrito_items_updated_at
BEFORE UPDATE ON carrito_items
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

CREATE TABLE ordenes (
    id BIGSERIAL PRIMARY KEY,
    numero_orden VARCHAR(30) NOT NULL UNIQUE,
    usuario_id BIGINT NOT NULL,
    subtotal_base NUMERIC(12, 2) NOT NULL CHECK (subtotal_base >= 0),
    descuento_volumen NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (descuento_volumen >= 0),
    porcentaje_descuento_volumen NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (porcentaje_descuento_volumen >= 0),
    descuento_institucional NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (descuento_institucional >= 0),
    porcentaje_descuento_institucional NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (porcentaje_descuento_institucional >= 0),
    total_impuestos NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_impuestos >= 0),
    total_final NUMERIC(12, 2) NOT NULL CHECK (total_final >= 0),
    estado VARCHAR(30) DEFAULT 'Pendiente' NOT NULL 
        CHECK (estado IN ('Pendiente', 'Aprobado', 'Enviado', 'Cancelado')),
    direccion_entrega TEXT NOT NULL,
    fecha_orden TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_ordenes_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TRIGGER trg_ordenes_updated_at
BEFORE UPDATE ON ordenes
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

COMMENT ON TABLE ordenes IS 'Órdenes de compra procesadas con desglose histórico inmutable de reglas de negocio ejecutadas en el Modelo';

CREATE TABLE orden_detalles (
    id BIGSERIAL PRIMARY KEY,
    orden_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario_historico NUMERIC(12, 2) NOT NULL CHECK (precio_unitario_historico >= 0),
    subtotal_linea NUMERIC(12, 2) NOT NULL CHECK (subtotal_linea >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_od_orden FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_od_producto FOREIGN KEY (producto_id) REFERENCES catalogo_productos(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE orden_detalles IS 'Líneas de pedido con congelación de precio unitario y subtotal al momento de la compra';

-- =============================================================================
-- MÓDULO 4: SOLICITUDES DE COTIZACIÓN Y PEDIDOS PERSONALIZADOS (RF-04, RF-05.3)
-- =============================================================================

CREATE TABLE cotizaciones_solicitudes (
    id BIGSERIAL PRIMARY KEY,
    codigo_solicitud VARCHAR(30) NOT NULL UNIQUE,
    cliente_id BIGINT NOT NULL,
    libro_id BIGINT NULL, -- Puede ser un libro existente o nuevo
    titulo_obra VARCHAR(255) NOT NULL,
    cantidad_estimada INTEGER NOT NULL CHECK (cantidad_estimada > 0),
    acabado_portada VARCHAR(100) NOT NULL, -- ej. Plastificado Mate, Barniz UV, Tapa dura con sobrecubierta
    tipo_papel VARCHAR(100) NOT NULL, -- ej. Bond 75g, Couche 150g, Ahuesado 80g
    fecha_entrega_requerida DATE NOT NULL,
    notas_cliente TEXT,
    estado VARCHAR(30) DEFAULT 'Pendiente' NOT NULL 
        CHECK (estado IN ('Pendiente', 'En Revisión', 'Cotizada', 'Aprobada por Cliente', 'Rechazada por Cliente', 'Cancelada')),
    asesor_id BIGINT NULL, -- Asesor asignado a la solicitud
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT fk_cs_cliente FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cs_libro FOREIGN KEY (libro_id) REFERENCES libros(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cs_asesor FOREIGN KEY (asesor_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TRIGGER trg_cotizaciones_solicitudes_updated_at
BEFORE UPDATE ON cotizaciones_solicitudes
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

COMMENT ON TABLE cotizaciones_solicitudes IS 'Solicitudes de pedidos especiales y tirajes mayoristas hechas por clientes institucionales';

CREATE TABLE cotizaciones_propuestas (
    id BIGSERIAL PRIMARY KEY,
    solicitud_id BIGINT NOT NULL,
    asesor_id BIGINT NOT NULL,
    costo_unitario_ofrecido NUMERIC(12, 2) NOT NULL CHECK (costo_unitario_ofrecido >= 0),
    costo_total_propuesto NUMERIC(12, 2) NOT NULL CHECK (costo_total_propuesto >= 0),
    tiempo_entrega_dias INTEGER NOT NULL CHECK (tiempo_entrega_dias > 0),
    condiciones_comerciales TEXT,
    fecha_validez DATE NOT NULL,
    estado VARCHAR(30) DEFAULT 'Emitida' NOT NULL 
        CHECK (estado IN ('Emitida', 'Aceptada', 'Vencida', 'Cancelada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_cp_solicitud FOREIGN KEY (solicitud_id) REFERENCES cotizaciones_solicitudes(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cp_asesor FOREIGN KEY (asesor_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TRIGGER trg_cotizaciones_propuestas_updated_at
BEFORE UPDATE ON cotizaciones_propuestas
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp_modificacion();

COMMENT ON TABLE cotizaciones_propuestas IS 'Propuestas formales digitales emitidas por los Asesores de Ventas para aprobación del cliente';

-- =============================================================================
-- ÍNDICES ESTRATÉGICOS PARA CONSULTAS DE ALTO RENDIMIENTO
-- =============================================================================

-- 1. Búsqueda y Catálogo (RF-01.2)
CREATE INDEX idx_libros_titulo ON libros (titulo) WHERE deleted_at IS NULL;
CREATE INDEX idx_libros_anio ON libros (anio_edicion) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalogo_isbn ON catalogo_productos (isbn);
CREATE INDEX idx_catalogo_libro_formato ON catalogo_productos (libro_id, formato_id) WHERE deleted_at IS NULL AND activo = TRUE;
CREATE INDEX idx_catalogo_precio ON catalogo_productos (precio_base) WHERE deleted_at IS NULL AND activo = TRUE;

-- 2. Tablas pivote de búsqueda relacional
CREATE INDEX idx_libros_autores_autor ON libros_autores (autor_id);
CREATE INDEX idx_libros_generos_genero ON libros_generos (genero_id);
CREATE INDEX idx_libros_editoriales_editorial ON libros_editoriales (editorial_id);

-- 3. Transacciones y Auditoría
CREATE INDEX idx_ordenes_usuario_fecha ON ordenes (usuario_id, fecha_orden DESC);
CREATE INDEX idx_ordenes_estado ON ordenes (estado);
CREATE INDEX idx_orden_detalles_orden ON orden_detalles (orden_id);

-- 4. Bandeja de Cotizaciones del Asesor
CREATE INDEX idx_cotizaciones_estado_fecha ON cotizaciones_solicitudes (estado, created_at DESC);
CREATE INDEX idx_cotizaciones_asesor ON cotizaciones_solicitudes (asesor_id);
CREATE INDEX idx_cotizaciones_cliente ON cotizaciones_solicitudes (cliente_id);
