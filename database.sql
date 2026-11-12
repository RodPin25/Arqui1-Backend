--
-- PostgreSQL database dump
--

\restrict pd7oYpv7wfoaIi7owT32hUrGGrl0mO4C7Du79mvq2vfKsXnJOEywUWdEDQRtPDr

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

-- Started on 2026-11-12 10:47:47 CST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 253 (class 1255 OID 17104)
-- Name: fn_actualizar_timestamp_modificacion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_actualizar_timestamp_modificacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_actualizar_timestamp_modificacion() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 229 (class 1259 OID 17169)
-- Name: autores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.autores (
    id bigint NOT NULL,
    nombres character varying(150) NOT NULL,
    apellidos character varying(150) NOT NULL,
    biografia text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.autores OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17168)
-- Name: autores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.autores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.autores_id_seq OWNER TO postgres;

--
-- TOC entry 3747 (class 0 OID 0)
-- Dependencies: 228
-- Name: autores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.autores_id_seq OWNED BY public.autores.id;


--
-- TOC entry 244 (class 1259 OID 17310)
-- Name: carrito_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carrito_items (
    id bigint NOT NULL,
    carrito_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT carrito_items_cantidad_check CHECK ((cantidad > 0))
);


ALTER TABLE public.carrito_items OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 17309)
-- Name: carrito_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carrito_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carrito_items_id_seq OWNER TO postgres;

--
-- TOC entry 3748 (class 0 OID 0)
-- Dependencies: 243
-- Name: carrito_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carrito_items_id_seq OWNED BY public.carrito_items.id;


--
-- TOC entry 242 (class 1259 OID 17293)
-- Name: carritos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carritos (
    id bigint NOT NULL,
    usuario_id bigint,
    sesion_token character varying(100),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.carritos OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 17292)
-- Name: carritos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carritos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carritos_id_seq OWNER TO postgres;

--
-- TOC entry 3749 (class 0 OID 0)
-- Dependencies: 241
-- Name: carritos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carritos_id_seq OWNED BY public.carritos.id;


--
-- TOC entry 240 (class 1259 OID 17265)
-- Name: catalogo_productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.catalogo_productos (
    id bigint NOT NULL,
    libro_id bigint NOT NULL,
    formato_id bigint NOT NULL,
    isbn character varying(20) NOT NULL,
    precio_base numeric(12,2) NOT NULL,
    stock_disponible integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT catalogo_productos_precio_base_check CHECK ((precio_base >= (0)::numeric)),
    CONSTRAINT catalogo_productos_stock_disponible_check CHECK ((stock_disponible >= 0))
);


ALTER TABLE public.catalogo_productos OWNER TO postgres;

--
-- TOC entry 3750 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE catalogo_productos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.catalogo_productos IS 'Variantes comerciales concretas con ISBN, precio unitario y control de stock';


--
-- TOC entry 239 (class 1259 OID 17264)
-- Name: catalogo_productos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.catalogo_productos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.catalogo_productos_id_seq OWNER TO postgres;

--
-- TOC entry 3751 (class 0 OID 0)
-- Dependencies: 239
-- Name: catalogo_productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.catalogo_productos_id_seq OWNED BY public.catalogo_productos.id;


--
-- TOC entry 252 (class 1259 OID 17421)
-- Name: cotizaciones_propuestas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cotizaciones_propuestas (
    id bigint NOT NULL,
    solicitud_id bigint NOT NULL,
    asesor_id bigint NOT NULL,
    costo_unitario_ofrecido numeric(12,2) NOT NULL,
    costo_total_propuesto numeric(12,2) NOT NULL,
    tiempo_entrega_dias integer NOT NULL,
    condiciones_comerciales text,
    fecha_validez date NOT NULL,
    estado character varying(30) DEFAULT 'Emitida'::character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT cotizaciones_propuestas_costo_total_propuesto_check CHECK ((costo_total_propuesto >= (0)::numeric)),
    CONSTRAINT cotizaciones_propuestas_costo_unitario_ofrecido_check CHECK ((costo_unitario_ofrecido >= (0)::numeric)),
    CONSTRAINT cotizaciones_propuestas_estado_check CHECK (((estado)::text = ANY (ARRAY[('Emitida'::character varying)::text, ('Aceptada'::character varying)::text, ('Vencida'::character varying)::text, ('Cancelada'::character varying)::text]))),
    CONSTRAINT cotizaciones_propuestas_tiempo_entrega_dias_check CHECK ((tiempo_entrega_dias > 0))
);


ALTER TABLE public.cotizaciones_propuestas OWNER TO postgres;

--
-- TOC entry 3752 (class 0 OID 0)
-- Dependencies: 252
-- Name: TABLE cotizaciones_propuestas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.cotizaciones_propuestas IS 'Propuestas formales digitales emitidas por los Asesores de Ventas para aprobación del cliente';


--
-- TOC entry 251 (class 1259 OID 17420)
-- Name: cotizaciones_propuestas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cotizaciones_propuestas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cotizaciones_propuestas_id_seq OWNER TO postgres;

--
-- TOC entry 3753 (class 0 OID 0)
-- Dependencies: 251
-- Name: cotizaciones_propuestas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cotizaciones_propuestas_id_seq OWNED BY public.cotizaciones_propuestas.id;


--
-- TOC entry 250 (class 1259 OID 17389)
-- Name: cotizaciones_solicitudes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cotizaciones_solicitudes (
    id bigint NOT NULL,
    codigo_solicitud character varying(30) NOT NULL,
    cliente_id bigint NOT NULL,
    libro_id bigint,
    titulo_obra character varying(255) NOT NULL,
    cantidad_estimada integer NOT NULL,
    acabado_portada character varying(100) NOT NULL,
    tipo_papel character varying(100) NOT NULL,
    fecha_entrega_requerida date NOT NULL,
    notas_cliente text,
    estado character varying(30) DEFAULT 'Pendiente'::character varying NOT NULL,
    asesor_id bigint,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT cotizaciones_solicitudes_cantidad_estimada_check CHECK ((cantidad_estimada > 0)),
    CONSTRAINT cotizaciones_solicitudes_estado_check CHECK (((estado)::text = ANY (ARRAY[('Pendiente'::character varying)::text, ('En Revisión'::character varying)::text, ('Cotizada'::character varying)::text, ('Aprobada por Cliente'::character varying)::text, ('Rechazada por Cliente'::character varying)::text, ('Cancelada'::character varying)::text])))
);


ALTER TABLE public.cotizaciones_solicitudes OWNER TO postgres;

--
-- TOC entry 3754 (class 0 OID 0)
-- Dependencies: 250
-- Name: TABLE cotizaciones_solicitudes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.cotizaciones_solicitudes IS 'Solicitudes de pedidos especiales y tirajes mayoristas hechas por clientes institucionales';


--
-- TOC entry 249 (class 1259 OID 17388)
-- Name: cotizaciones_solicitudes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cotizaciones_solicitudes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cotizaciones_solicitudes_id_seq OWNER TO postgres;

--
-- TOC entry 3755 (class 0 OID 0)
-- Dependencies: 249
-- Name: cotizaciones_solicitudes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cotizaciones_solicitudes_id_seq OWNED BY public.cotizaciones_solicitudes.id;


--
-- TOC entry 227 (class 1259 OID 17155)
-- Name: editoriales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.editoriales (
    id bigint NOT NULL,
    nombre character varying(150) NOT NULL,
    email_contacto character varying(150),
    sitio_web character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.editoriales OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17154)
-- Name: editoriales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.editoriales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.editoriales_id_seq OWNER TO postgres;

--
-- TOC entry 3756 (class 0 OID 0)
-- Dependencies: 226
-- Name: editoriales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.editoriales_id_seq OWNED BY public.editoriales.id;


--
-- TOC entry 233 (class 1259 OID 17195)
-- Name: formatos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formatos (
    id bigint NOT NULL,
    codigo character varying(100) NOT NULL,
    nombre character varying(150) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.formatos OWNER TO postgres;

--
-- TOC entry 3757 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE formatos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.formatos IS 'Catálogo comercial de formatos físicos y digitales';


--
-- TOC entry 232 (class 1259 OID 17194)
-- Name: formatos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formatos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formatos_id_seq OWNER TO postgres;

--
-- TOC entry 3758 (class 0 OID 0)
-- Dependencies: 232
-- Name: formatos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formatos_id_seq OWNED BY public.formatos.id;


--
-- TOC entry 231 (class 1259 OID 17181)
-- Name: generos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.generos (
    id bigint NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.generos OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17180)
-- Name: generos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.generos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.generos_id_seq OWNER TO postgres;

--
-- TOC entry 3759 (class 0 OID 0)
-- Dependencies: 230
-- Name: generos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.generos_id_seq OWNED BY public.generos.id;


--
-- TOC entry 235 (class 1259 OID 17205)
-- Name: libros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.libros (
    id bigint NOT NULL,
    titulo character varying(150) NOT NULL,
    sinopsis text,
    anio_edicion smallint,
    portada_url text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT libros_anio_edicion_check CHECK (((anio_edicion >= 1400) AND (anio_edicion <= 2100)))
);


ALTER TABLE public.libros OWNER TO postgres;

--
-- TOC entry 3760 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE libros; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.libros IS 'Obra bibliográfica abstracta (padre del catálogo)';


--
-- TOC entry 236 (class 1259 OID 17218)
-- Name: libros_autores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.libros_autores (
    libro_id bigint NOT NULL,
    autor_id bigint NOT NULL,
    orden_autoria smallint DEFAULT 1 NOT NULL
);


ALTER TABLE public.libros_autores OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 17249)
-- Name: libros_editoriales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.libros_editoriales (
    libro_id bigint NOT NULL,
    editorial_id bigint NOT NULL
);


ALTER TABLE public.libros_editoriales OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 17234)
-- Name: libros_generos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.libros_generos (
    libro_id bigint NOT NULL,
    genero_id bigint NOT NULL
);


ALTER TABLE public.libros_generos OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 17204)
-- Name: libros_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.libros_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.libros_id_seq OWNER TO postgres;

--
-- TOC entry 3761 (class 0 OID 0)
-- Dependencies: 234
-- Name: libros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.libros_id_seq OWNED BY public.libros.id;


--
-- TOC entry 248 (class 1259 OID 17368)
-- Name: orden_detalles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orden_detalles (
    id bigint NOT NULL,
    orden_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario_historico numeric(12,2) NOT NULL,
    subtotal_linea numeric(12,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT orden_detalles_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT orden_detalles_precio_unitario_historico_check CHECK ((precio_unitario_historico >= (0)::numeric)),
    CONSTRAINT orden_detalles_subtotal_linea_check CHECK ((subtotal_linea >= (0)::numeric))
);


ALTER TABLE public.orden_detalles OWNER TO postgres;

--
-- TOC entry 3762 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE orden_detalles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.orden_detalles IS 'Líneas de pedido con congelación de precio unitario y subtotal al momento de la compra';


--
-- TOC entry 247 (class 1259 OID 17367)
-- Name: orden_detalles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orden_detalles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orden_detalles_id_seq OWNER TO postgres;

--
-- TOC entry 3763 (class 0 OID 0)
-- Dependencies: 247
-- Name: orden_detalles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orden_detalles_id_seq OWNED BY public.orden_detalles.id;


--
-- TOC entry 246 (class 1259 OID 17334)
-- Name: ordenes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ordenes (
    id bigint NOT NULL,
    numero_orden character varying(30) NOT NULL,
    usuario_id bigint NOT NULL,
    subtotal_base numeric(12,2) NOT NULL,
    descuento_volumen numeric(12,2) DEFAULT 0 NOT NULL,
    porcentaje_descuento_volumen numeric(5,2) DEFAULT 0 NOT NULL,
    descuento_institucional numeric(12,2) DEFAULT 0 NOT NULL,
    porcentaje_descuento_institucional numeric(5,2) DEFAULT 0 NOT NULL,
    total_impuestos numeric(12,2) DEFAULT 0 NOT NULL,
    total_final numeric(12,2) NOT NULL,
    estado character varying(30) DEFAULT 'Pendiente'::character varying NOT NULL,
    direccion_entrega text NOT NULL,
    fecha_orden timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT ordenes_descuento_institucional_check CHECK ((descuento_institucional >= (0)::numeric)),
    CONSTRAINT ordenes_descuento_volumen_check CHECK ((descuento_volumen >= (0)::numeric)),
    CONSTRAINT ordenes_estado_check CHECK (((estado)::text = ANY (ARRAY[('Pendiente'::character varying)::text, ('Aprobado'::character varying)::text, ('Enviado'::character varying)::text, ('Cancelado'::character varying)::text]))),
    CONSTRAINT ordenes_porcentaje_descuento_institucional_check CHECK ((porcentaje_descuento_institucional >= (0)::numeric)),
    CONSTRAINT ordenes_porcentaje_descuento_volumen_check CHECK ((porcentaje_descuento_volumen >= (0)::numeric)),
    CONSTRAINT ordenes_subtotal_base_check CHECK ((subtotal_base >= (0)::numeric)),
    CONSTRAINT ordenes_total_final_check CHECK ((total_final >= (0)::numeric)),
    CONSTRAINT ordenes_total_impuestos_check CHECK ((total_impuestos >= (0)::numeric))
);


ALTER TABLE public.ordenes OWNER TO postgres;

--
-- TOC entry 3764 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE ordenes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ordenes IS 'Órdenes de compra procesadas con desglose histórico inmutable de reglas de negocio ejecutadas en el Modelo';


--
-- TOC entry 245 (class 1259 OID 17333)
-- Name: ordenes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ordenes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ordenes_id_seq OWNER TO postgres;

--
-- TOC entry 3765 (class 0 OID 0)
-- Dependencies: 245
-- Name: ordenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ordenes_id_seq OWNED BY public.ordenes.id;


--
-- TOC entry 225 (class 1259 OID 17135)
-- Name: perfiles_institucionales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.perfiles_institucionales (
    usuario_id bigint NOT NULL,
    razon_social character varying(200) NOT NULL,
    documento_tributario character varying(50) NOT NULL,
    direccion_fiscal text NOT NULL,
    contacto_cargo character varying(100),
    estado_verificacion character varying(30) DEFAULT 'pendiente'::character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT perfiles_institucionales_estado_verificacion_check CHECK (((estado_verificacion)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('verificado'::character varying)::text, ('rechazado'::character varying)::text])))
);


ALTER TABLE public.perfiles_institucionales OWNER TO postgres;

--
-- TOC entry 3766 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE perfiles_institucionales; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.perfiles_institucionales IS 'Datos extendidos 1:1 para Clientes Institucionales/Mayoristas requeridos en cotizaciones y descuentos';


--
-- TOC entry 222 (class 1259 OID 17106)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 3767 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.roles IS 'Roles del sistema para control de acceso RBAC (Visitante, Minorista, Institucional, Asesor, Administrador)';


--
-- TOC entry 221 (class 1259 OID 17105)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 3768 (class 0 OID 0)
-- Dependencies: 221
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 224 (class 1259 OID 17116)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id bigint NOT NULL,
    rol_id bigint NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    telefono character varying(30),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 3769 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.usuarios IS 'Cuentas de usuario con hashing de credenciales y soft delete';


--
-- TOC entry 223 (class 1259 OID 17115)
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- TOC entry 3770 (class 0 OID 0)
-- Dependencies: 223
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 3378 (class 2604 OID 17172)
-- Name: autores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.autores ALTER COLUMN id SET DEFAULT nextval('public.autores_id_seq'::regclass);


--
-- TOC entry 3388 (class 2604 OID 17313)
-- Name: carrito_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items ALTER COLUMN id SET DEFAULT nextval('public.carrito_items_id_seq'::regclass);


--
-- TOC entry 3387 (class 2604 OID 17296)
-- Name: carritos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carritos ALTER COLUMN id SET DEFAULT nextval('public.carritos_id_seq'::regclass);


--
-- TOC entry 3384 (class 2604 OID 17268)
-- Name: catalogo_productos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_productos ALTER COLUMN id SET DEFAULT nextval('public.catalogo_productos_id_seq'::regclass);


--
-- TOC entry 3400 (class 2604 OID 17424)
-- Name: cotizaciones_propuestas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_propuestas ALTER COLUMN id SET DEFAULT nextval('public.cotizaciones_propuestas_id_seq'::regclass);


--
-- TOC entry 3398 (class 2604 OID 17392)
-- Name: cotizaciones_solicitudes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_solicitudes ALTER COLUMN id SET DEFAULT nextval('public.cotizaciones_solicitudes_id_seq'::regclass);


--
-- TOC entry 3377 (class 2604 OID 17158)
-- Name: editoriales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editoriales ALTER COLUMN id SET DEFAULT nextval('public.editoriales_id_seq'::regclass);


--
-- TOC entry 3380 (class 2604 OID 17198)
-- Name: formatos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formatos ALTER COLUMN id SET DEFAULT nextval('public.formatos_id_seq'::regclass);


--
-- TOC entry 3379 (class 2604 OID 17184)
-- Name: generos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generos ALTER COLUMN id SET DEFAULT nextval('public.generos_id_seq'::regclass);


--
-- TOC entry 3381 (class 2604 OID 17208)
-- Name: libros id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros ALTER COLUMN id SET DEFAULT nextval('public.libros_id_seq'::regclass);


--
-- TOC entry 3397 (class 2604 OID 17371)
-- Name: orden_detalles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_detalles ALTER COLUMN id SET DEFAULT nextval('public.orden_detalles_id_seq'::regclass);


--
-- TOC entry 3390 (class 2604 OID 17337)
-- Name: ordenes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes ALTER COLUMN id SET DEFAULT nextval('public.ordenes_id_seq'::regclass);


--
-- TOC entry 3373 (class 2604 OID 17109)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 3374 (class 2604 OID 17119)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- TOC entry 3718 (class 0 OID 17169)
-- Dependencies: 229
-- Data for Name: autores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.autores (id, nombres, apellidos, biografia, created_at, updated_at, deleted_at) FROM stdin;
1	Gabriel	García Márquez	Escritor y periodista colombiano, Premio Nobel de Literatura 1982.	2026-11-12 06:27:39.904-06	2026-11-12 06:27:39.904-06	\N
2	Robert C.	Martin	Conocido como 'Uncle Bob', ingeniero de software y autor de Clean Code.	2026-11-12 06:27:39.914-06	2026-11-12 06:27:39.914-06	\N
3	George	Orwell	Novelista y ensayista británico, autor de 1984 y Rebelión en la granja.	2026-11-12 06:27:39.919-06	2026-11-12 06:27:39.919-06	\N
4	Frank	Herbert	Escritor estadounidense de ciencia ficción, creador de Dune.	2026-11-12 06:27:39.932-06	2026-11-12 06:27:39.932-06	\N
5	Martin	Fowler	Ingeniero de software británico, especialista en patrones de arquitectura y refactorización.	2026-11-12 10:47:06.1-06	2026-11-12 10:47:06.1-06	\N
6	J.R.R.	Tolkien	Filólogo y escritor británico, autor de El Señor de los Anillos y El Hobbit.	2026-11-12 10:47:06.11-06	2026-11-12 10:47:06.11-06	\N
7	Yuval Noah	Harari	Historiador y filósofo israelí, profesor de la Universidad Hebrea de Jerusalén.	2026-11-12 10:47:06.118-06	2026-11-12 10:47:06.118-06	\N
8	Marco	Aurelio	Emperador romano y filósofo estoico, autor de las Meditaciones.	2026-11-12 10:47:06.126-06	2026-11-12 10:47:06.126-06	\N
9	Carl	Sagan	Astrónomo, astrofísico y divulgador científico estadounidense, autor de Cosmos.	2026-11-12 10:47:06.134-06	2026-11-12 10:47:06.134-06	\N
10	James	Clear	Escritor y conferencista enfocado en hábitos y toma de decisiones, autor de Hábitos Atómicos.	2026-11-12 10:47:06.141-06	2026-11-12 10:47:06.141-06	\N
\.


--
-- TOC entry 3733 (class 0 OID 17310)
-- Dependencies: 244
-- Data for Name: carrito_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carrito_items (id, carrito_id, producto_id, cantidad, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3731 (class 0 OID 17293)
-- Dependencies: 242
-- Data for Name: carritos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.carritos (id, usuario_id, sesion_token, created_at, updated_at) FROM stdin;
1	1	\N	2026-11-11 21:05:57.293-06	2026-11-11 21:05:57.293-06
2	2	\N	2026-11-11 21:29:06.665-06	2026-11-11 21:29:06.665-06
3	3	\N	2026-11-12 10:47:05.916-06	2026-11-12 10:47:05.916-06
4	4	\N	2026-11-12 10:47:05.928-06	2026-11-12 10:47:05.928-06
5	5	\N	2026-11-12 10:47:05.94-06	2026-11-12 10:47:05.94-06
6	6	\N	2026-11-12 10:47:05.952-06	2026-11-12 10:47:05.952-06
7	7	\N	2026-11-12 10:47:05.977-06	2026-11-12 10:47:05.977-06
\.


--
-- TOC entry 3729 (class 0 OID 17265)
-- Dependencies: 240
-- Data for Name: catalogo_productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.catalogo_productos (id, libro_id, formato_id, isbn, precio_base, stock_disponible, activo, created_at, updated_at, deleted_at) FROM stdin;
1	1	1	978-0307474728	18.50	45	t	2026-11-12 06:27:39.976-06	2026-11-12 06:27:39.976-06	\N
2	1	2	978-0307474735	28.00	20	t	2026-11-12 06:27:39.987-06	2026-11-12 06:27:39.987-06	\N
3	1	3	978-0307474742	9.99	999	t	2026-11-12 06:27:40.001-06	2026-11-12 06:27:40.001-06	\N
4	2	1	978-0132350884	42.00	15	t	2026-11-12 06:27:40.04-06	2026-11-12 06:27:40.04-06	\N
5	2	3	978-0132350891	29.99	999	t	2026-11-12 06:27:40.047-06	2026-11-12 06:27:40.047-06	\N
6	3	1	978-0451524935	12.00	30	t	2026-11-12 06:27:40.071-06	2026-11-12 06:27:40.071-06	\N
7	3	2	978-0451524942	22.00	10	t	2026-11-12 06:27:40.078-06	2026-11-12 06:27:40.078-06	\N
8	3	4	978-0451524959	14.50	999	t	2026-11-12 06:27:40.083-06	2026-11-12 06:27:40.083-06	\N
9	4	1	978-0441172719	19.90	25	t	2026-11-12 06:27:40.108-06	2026-11-12 06:27:40.108-06	\N
10	4	2	978-0441172726	34.00	12	t	2026-11-12 06:27:40.117-06	2026-11-12 06:27:40.117-06	\N
11	4	3	978-0441172733	11.99	999	t	2026-11-12 06:27:40.124-06	2026-11-12 06:27:40.124-06	\N
12	2	2	978-0132350885	58.00	15	t	2026-11-12 10:47:06.18-06	2026-11-12 10:47:06.18-06	\N
13	5	1	978-0134757599	49.50	20	t	2026-11-12 10:47:06.253-06	2026-11-12 10:47:06.253-06	\N
14	5	3	978-0134757605	32.00	999	t	2026-11-12 10:47:06.263-06	2026-11-12 10:47:06.263-06	\N
15	6	1	978-8445071403	24.00	30	t	2026-11-12 10:47:06.297-06	2026-11-12 10:47:06.297-06	\N
16	6	2	978-8445071410	39.00	12	t	2026-11-12 10:47:06.305-06	2026-11-12 10:47:06.305-06	\N
17	6	4	978-8445071427	18.00	999	t	2026-11-12 10:47:06.313-06	2026-11-12 10:47:06.313-06	\N
18	7	1	978-0062316097	21.00	50	t	2026-11-12 10:47:06.346-06	2026-11-12 10:47:06.346-06	\N
19	7	2	978-0062316103	32.50	22	t	2026-11-12 10:47:06.355-06	2026-11-12 10:47:06.355-06	\N
20	7	3	978-0062316110	12.99	999	t	2026-11-12 10:47:06.364-06	2026-11-12 10:47:06.364-06	\N
21	8	1	978-8420651231	14.50	40	t	2026-11-12 10:47:06.396-06	2026-11-12 10:47:06.396-06	\N
22	8	2	978-8420651248	23.00	15	t	2026-11-12 10:47:06.405-06	2026-11-12 10:47:06.405-06	\N
23	8	3	978-8420651255	7.99	999	t	2026-11-12 10:47:06.413-06	2026-11-12 10:47:06.413-06	\N
24	9	1	978-8408053989	26.00	28	t	2026-11-12 10:47:06.44-06	2026-11-12 10:47:06.44-06	\N
25	9	2	978-8408053996	38.00	14	t	2026-11-12 10:47:06.447-06	2026-11-12 10:47:06.447-06	\N
26	9	3	978-8408054009	13.99	999	t	2026-11-12 10:47:06.455-06	2026-11-12 10:47:06.455-06	\N
27	10	1	978-0735211292	17.90	60	t	2026-11-12 10:47:06.486-06	2026-11-12 10:47:06.486-06	\N
28	10	2	978-0735211308	27.50	25	t	2026-11-12 10:47:06.493-06	2026-11-12 10:47:06.493-06	\N
29	10	4	978-0735211315	15.00	999	t	2026-11-12 10:47:06.501-06	2026-11-12 10:47:06.501-06	\N
30	11	1	978-1449373320	55.00	18	t	2026-11-12 10:47:06.528-06	2026-11-12 10:47:06.528-06	\N
31	11	3	978-1449373337	39.99	999	t	2026-11-12 10:47:06.536-06	2026-11-12 10:47:06.536-06	\N
32	12	1	978-8445073803	16.50	35	t	2026-11-12 10:47:06.563-06	2026-11-12 10:47:06.563-06	\N
33	12	2	978-8445073810	29.00	16	t	2026-11-12 10:47:06.573-06	2026-11-12 10:47:06.573-06	\N
\.


--
-- TOC entry 3741 (class 0 OID 17421)
-- Dependencies: 252
-- Data for Name: cotizaciones_propuestas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cotizaciones_propuestas (id, solicitud_id, asesor_id, costo_unitario_ofrecido, costo_total_propuesto, tiempo_entrega_dias, condiciones_comerciales, fecha_validez, estado, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3739 (class 0 OID 17389)
-- Dependencies: 250
-- Data for Name: cotizaciones_solicitudes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cotizaciones_solicitudes (id, codigo_solicitud, cliente_id, libro_id, titulo_obra, cantidad_estimada, acabado_portada, tipo_papel, fecha_entrega_requerida, notas_cliente, estado, asesor_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- TOC entry 3716 (class 0 OID 17155)
-- Dependencies: 227
-- Data for Name: editoriales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.editoriales (id, nombre, email_contacto, sitio_web, created_at, updated_at, deleted_at) FROM stdin;
1	Penguin Random House	contacto@penguin.com	https://penguinrandomhouse.com	2026-11-12 06:27:39.848-06	2026-11-12 06:27:39.848-06	\N
2	Editorial Planeta	info@planeta.es	https://www.planetadelibros.com	2026-11-12 06:27:39.861-06	2026-11-12 06:27:39.861-06	\N
3	Prentice Hall	contact@pearson.com	https://www.pearson.com	2026-11-12 06:27:39.874-06	2026-11-12 06:27:39.874-06	\N
4	Alianza Editorial	info@alianzaeditorial.es	https://www.alianzaeditorial.es	2026-11-12 06:27:39.888-06	2026-11-12 06:27:39.888-06	\N
5	O'Reilly Media	info@oreilly.com	https://www.oreilly.com	2026-11-12 10:47:06.062-06	2026-11-12 10:47:06.062-06	\N
6	Fondo de Cultura Económica	ventas@fondodeculturaeconomica.com	https://www.fondodeculturaeconomica.com	2026-11-12 10:47:06.078-06	2026-11-12 10:47:06.078-06	\N
\.


--
-- TOC entry 3722 (class 0 OID 17195)
-- Dependencies: 233
-- Data for Name: formatos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formatos (id, codigo, nombre, created_at) FROM stdin;
1	FISICO_TB	Físico - Tapa Blanda	2026-11-12 06:27:39.756-06
2	FISICO_TD	Físico - Tapa Dura	2026-11-12 06:27:39.774-06
3	EBOOK	Digital - E-Book	2026-11-12 06:27:39.782-06
4	AUDIO	Audiolibro	2026-11-12 06:27:39.789-06
\.


--
-- TOC entry 3720 (class 0 OID 17181)
-- Dependencies: 231
-- Data for Name: generos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.generos (id, nombre, descripcion, created_at, updated_at, deleted_at) FROM stdin;
1	Ciencia Ficción	Obras con bases científicas o futuristas especulativas.	2026-11-12 06:27:39.804-06	2026-11-12 06:27:39.804-06	\N
2	Fantasía	Universos imaginarios, magia y seres mitológicos.	2026-11-12 06:27:39.817-06	2026-11-12 06:27:39.817-06	\N
3	Tecnología y Software	Libros técnicos sobre desarrollo de software y computación.	2026-11-12 06:27:39.827-06	2026-11-12 06:27:39.827-06	\N
4	Realismo Mágico	Narrativa donde lo irreal y fantástico se percibe como natural.	2026-11-12 06:27:39.835-06	2026-11-12 06:27:39.835-06	\N
5	Desarrollo Personal	Guías prácticas y motivación para el crecimiento individual.	2026-11-12 06:27:39.84-06	2026-11-12 06:27:39.84-06	\N
6	Filosofía y Ensayo	Tratados sobre ética, pensamiento crítico y sociedad.	2026-11-12 10:47:06.01-06	2026-11-12 10:47:06.01-06	\N
7	Historia Universal	Crónicas y análisis de la evolución histórica de la humanidad.	2026-11-12 10:47:06.021-06	2026-11-12 10:47:06.021-06	\N
\.


--
-- TOC entry 3724 (class 0 OID 17205)
-- Dependencies: 235
-- Data for Name: libros; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.libros (id, titulo, sinopsis, anio_edicion, portada_url, activo, created_at, updated_at, deleted_at) FROM stdin;
1	Cien Años de Soledad	La historia de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo.	1967	https://images.cdn.editorialplaneta.com/covers/cien_anos_de_soledad.jpg	t	2026-11-12 06:27:39.95-06	2026-11-12 06:27:39.95-06	\N
2	Clean Code: A Handbook of Agile Software Craftsmanship	Guía fundamental sobre buenas prácticas de programación, refactorización y diseño de código limpio.	2008	https://m.media-amazon.com/images/I/41xShlnTZTL._SX376_BO1,204,203,200_.jpg	t	2026-11-12 06:27:40.014-06	2026-11-12 06:27:40.014-06	\N
3	1984	Novela distópica que introduce los conceptos del Gran Hermano, la Policía del Pensamiento y la Neolengua.	1949	https://images.penguinrandomhouse.com/covers/1984.jpg	t	2026-11-12 06:27:40.053-06	2026-11-12 06:27:40.053-06	\N
4	Dune	En el desértico planeta Arrakis, el joven Paul Atreides debe enfrentar traición, intrigas imperiales y el destino del universo.	1965	https://images.penguinrandomhouse.com/covers/dune.jpg	t	2026-11-12 06:27:40.088-06	2026-11-12 06:27:40.088-06	\N
5	Refactoring: Improving the Design of Existing Code	Tratado exhaustivo de patrones de refactorización para arquitectos e ingenieros de software.	2018	https://m.media-amazon.com/images/I/41T5-smx+cL._SX379_BO1,204,203,200_.jpg	t	2026-11-12 10:47:06.221-06	2026-11-12 10:47:06.221-06	\N
6	El Señor de los Anillos: La Comunidad del Anillo	El inicio del épico viaje de Frodo Bolsón para destruir el Anillo Único en las entrañas del Monte del Destino.	1954	https://images.cdn.editorialplaneta.com/covers/senor_de_los_anillos.jpg	t	2026-11-12 10:47:06.273-06	2026-11-12 10:47:06.273-06	\N
7	Sapiens: De animales a dioses	Breve historia de la humanidad que explora cómo una especie insignificante se convirtió en dueña del planeta.	2014	https://images.penguinrandomhouse.com/covers/sapiens.jpg	t	2026-11-12 10:47:06.321-06	2026-11-12 10:47:06.321-06	\N
8	Meditaciones	Las reflexiones personales e íntimas del emperador Marco Aurelio sobre el estoicismo y la serenidad mental.	2020	https://images.alianzaeditorial.es/covers/meditaciones.jpg	t	2026-11-12 10:47:06.373-06	2026-11-12 10:47:06.373-06	\N
9	Cosmos	Obra maestra de divulgación astronómica que narra los 15.000 millones de años de evolución cósmica.	1980	https://images.cdn.editorialplaneta.com/covers/cosmos.jpg	t	2026-11-12 10:47:06.42-06	2026-11-12 10:47:06.42-06	\N
10	Hábitos Atómicos	Método comprobado para desarrollar buenos hábitos, eliminar los malos y lograr resultados extraordinarios paso a paso.	2018	https://images.penguinrandomhouse.com/covers/habitos_atomicos.jpg	t	2026-11-12 10:47:06.463-06	2026-11-12 10:47:06.463-06	\N
11	Designing Data-Intensive Applications	La biblia contemporánea sobre arquitectura de datos distribuida, fiabilidad, escalabilidad y mantenibilidad.	2017	https://images.oreillystatic.com/covers/9781449373320.jpg	t	2026-11-12 10:47:06.508-06	2026-11-12 10:47:06.508-06	\N
12	El Hobbit	La entrañable aventura de Bilbo Bolsón con Gandalf y trece enanos hacia la Montaña Solitaria para enfrentar a Smaug.	1937	https://images.cdn.editorialplaneta.com/covers/el_hobbit.jpg	t	2026-11-12 10:47:06.542-06	2026-11-12 10:47:06.542-06	\N
\.


--
-- TOC entry 3725 (class 0 OID 17218)
-- Dependencies: 236
-- Data for Name: libros_autores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.libros_autores (libro_id, autor_id, orden_autoria) FROM stdin;
1	1	1
2	2	1
3	3	1
4	4	1
5	5	1
6	6	1
7	7	1
8	8	1
9	9	1
10	10	1
11	5	1
12	6	1
\.


--
-- TOC entry 3727 (class 0 OID 17249)
-- Dependencies: 238
-- Data for Name: libros_editoriales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.libros_editoriales (libro_id, editorial_id) FROM stdin;
1	2
2	3
3	1
4	1
5	3
6	2
7	1
8	4
9	2
10	1
11	5
12	2
\.


--
-- TOC entry 3726 (class 0 OID 17234)
-- Dependencies: 237
-- Data for Name: libros_generos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.libros_generos (libro_id, genero_id) FROM stdin;
1	4
2	3
3	1
4	1
4	2
5	3
6	2
7	7
7	6
8	6
9	1
9	7
10	5
11	3
12	2
\.


--
-- TOC entry 3737 (class 0 OID 17368)
-- Dependencies: 248
-- Data for Name: orden_detalles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orden_detalles (id, orden_id, producto_id, cantidad, precio_unitario_historico, subtotal_linea, created_at) FROM stdin;
\.


--
-- TOC entry 3735 (class 0 OID 17334)
-- Dependencies: 246
-- Data for Name: ordenes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ordenes (id, numero_orden, usuario_id, subtotal_base, descuento_volumen, porcentaje_descuento_volumen, descuento_institucional, porcentaje_descuento_institucional, total_impuestos, total_final, estado, direccion_entrega, fecha_orden, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3714 (class 0 OID 17135)
-- Dependencies: 225
-- Data for Name: perfiles_institucionales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.perfiles_institucionales (usuario_id, razon_social, documento_tributario, direccion_fiscal, contacto_cargo, estado_verificacion, created_at, updated_at) FROM stdin;
6	Colegio Mayor San Agustín S.A.	NIT-901234567-8	Avenida Las Américas 14-20, Zona 10, Ciudad de Guatemala	Directora de Compras Bibliográficas	verificado	2026-11-12 10:47:05.961-06	2026-11-12 10:47:05.961-06
7	Universidad Panamericana de Ciencias	NIT-812345678-1	Campus Central Universitario, Km 15.5 Carretera a El Salvador	Coordinador de Biblioteca Central	pendiente	2026-11-12 10:47:05.983-06	2026-11-12 10:47:05.983-06
\.


--
-- TOC entry 3711 (class 0 OID 17106)
-- Dependencies: 222
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nombre, descripcion, created_at) FROM stdin;
1	CLIENTE	Cliente de la tienda de libros	2026-11-11 21:05:42.476-06
2	ADMIN	Administrador de la plataforma	2026-11-11 21:05:42.476-06
3	ASESOR	Asesor de ventas y cotizaciones	2026-11-11 21:05:42.476-06
4	CLIENTE_MINORISTA	Cliente minorista con compras individuales y carrito estándar	2026-11-12 10:47:05.723-06
5	CLIENTE_INSTITUCIONAL	Cliente institucional / mayorista para compras por volumen y cotizaciones	2026-11-12 10:47:05.745-06
\.


--
-- TOC entry 3713 (class 0 OID 17116)
-- Dependencies: 224
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, rol_id, email, password_hash, nombres, apellidos, telefono, activo, created_at, updated_at, deleted_at) FROM stdin;
1	1	cliente_test_1794452757015@libreria.com	$2b$10$fvrVBaokcF4tNfSvOooLwut3YPGXrcii0JERKicDl3s1hMoYoUmAe	Juan	Pérez	5551234567	t	2026-11-11 21:05:57.271-06	2026-11-11 21:05:57.271-06	\N
2	1	admin@email.com	$2b$10$xzAWmJ0.TC7s2Yhn8pg8tOU.GH3LLJh2K/48lvmT2goyr2eFjT6ei	Sebastian	Rodas	\N	t	2026-11-11 21:29:06.639-06	2026-11-11 21:29:06.639-06	\N
3	2	admin@editorial.com	$2b$10$TRrH4S4h1DsZQAiU2kOx2ud/fYWPtFh1JpdInFHcACnoFShLJetAS	Carlos	Administrador	+502 5555-0001	t	2026-11-12 10:47:05.905-06	2026-11-12 10:47:05.905-06	\N
4	3	asesor@editorial.com	$2b$10$TRrH4S4h1DsZQAiU2kOx2ud/fYWPtFh1JpdInFHcACnoFShLJetAS	Ana	Asesora Comercial	+502 5555-0002	t	2026-11-12 10:47:05.922-06	2026-11-12 10:47:05.922-06	\N
5	4	minorista@editorial.com	$2b$10$TRrH4S4h1DsZQAiU2kOx2ud/fYWPtFh1JpdInFHcACnoFShLJetAS	Juan	Pérez Minorista	+502 5555-0003	t	2026-11-12 10:47:05.935-06	2026-11-12 10:47:05.935-06	\N
6	5	institucional@colegio.edu	$2b$10$TRrH4S4h1DsZQAiU2kOx2ud/fYWPtFh1JpdInFHcACnoFShLJetAS	Licda. Beatriz	Méndez Institucional	+502 5555-0004	t	2026-11-12 10:47:05.945-06	2026-11-12 10:47:05.945-06	\N
7	5	institucional2@universidad.edu	$2b$10$TRrH4S4h1DsZQAiU2kOx2ud/fYWPtFh1JpdInFHcACnoFShLJetAS	Dr. Roberto	Gómez Universidad	+502 5555-0005	t	2026-11-12 10:47:05.97-06	2026-11-12 10:47:05.97-06	\N
\.


--
-- TOC entry 3771 (class 0 OID 0)
-- Dependencies: 228
-- Name: autores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.autores_id_seq', 10, true);


--
-- TOC entry 3772 (class 0 OID 0)
-- Dependencies: 243
-- Name: carrito_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.carrito_items_id_seq', 1, false);


--
-- TOC entry 3773 (class 0 OID 0)
-- Dependencies: 241
-- Name: carritos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.carritos_id_seq', 7, true);


--
-- TOC entry 3774 (class 0 OID 0)
-- Dependencies: 239
-- Name: catalogo_productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.catalogo_productos_id_seq', 33, true);


--
-- TOC entry 3775 (class 0 OID 0)
-- Dependencies: 251
-- Name: cotizaciones_propuestas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cotizaciones_propuestas_id_seq', 1, false);


--
-- TOC entry 3776 (class 0 OID 0)
-- Dependencies: 249
-- Name: cotizaciones_solicitudes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cotizaciones_solicitudes_id_seq', 1, false);


--
-- TOC entry 3777 (class 0 OID 0)
-- Dependencies: 226
-- Name: editoriales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.editoriales_id_seq', 6, true);


--
-- TOC entry 3778 (class 0 OID 0)
-- Dependencies: 232
-- Name: formatos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formatos_id_seq', 4, true);


--
-- TOC entry 3779 (class 0 OID 0)
-- Dependencies: 230
-- Name: generos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.generos_id_seq', 7, true);


--
-- TOC entry 3780 (class 0 OID 0)
-- Dependencies: 234
-- Name: libros_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.libros_id_seq', 12, true);


--
-- TOC entry 3781 (class 0 OID 0)
-- Dependencies: 247
-- Name: orden_detalles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orden_detalles_id_seq', 1, false);


--
-- TOC entry 3782 (class 0 OID 0)
-- Dependencies: 245
-- Name: ordenes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ordenes_id_seq', 1, false);


--
-- TOC entry 3783 (class 0 OID 0)
-- Dependencies: 221
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- TOC entry 3784 (class 0 OID 0)
-- Dependencies: 223
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 7, true);


--
-- TOC entry 3457 (class 2606 OID 17178)
-- Name: autores autores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.autores
    ADD CONSTRAINT autores_pkey PRIMARY KEY (id);


--
-- TOC entry 3505 (class 2606 OID 17319)
-- Name: carrito_items carrito_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3501 (class 2606 OID 17300)
-- Name: carritos carritos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_pkey PRIMARY KEY (id);


--
-- TOC entry 3503 (class 2606 OID 17302)
-- Name: carritos carritos_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_usuario_id_key UNIQUE (usuario_id);


--
-- TOC entry 3488 (class 2606 OID 17778)
-- Name: catalogo_productos catalogo_productos_isbn_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_productos
    ADD CONSTRAINT catalogo_productos_isbn_key UNIQUE (isbn);


--
-- TOC entry 3490 (class 2606 OID 17780)
-- Name: catalogo_productos catalogo_productos_isbn_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_productos
    ADD CONSTRAINT catalogo_productos_isbn_key1 UNIQUE (isbn);


--
-- TOC entry 3492 (class 2606 OID 17782)
-- Name: catalogo_productos catalogo_productos_isbn_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_productos
    ADD CONSTRAINT catalogo_productos_isbn_key2 UNIQUE (isbn);


--
-- TOC entry 3494 (class 2606 OID 17276)
-- Name: catalogo_productos catalogo_productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_productos
    ADD CONSTRAINT catalogo_productos_pkey PRIMARY KEY (id);


--
-- TOC entry 3533 (class 2606 OID 17435)
-- Name: cotizaciones_propuestas cotizaciones_propuestas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_propuestas
    ADD CONSTRAINT cotizaciones_propuestas_pkey PRIMARY KEY (id);


--
-- TOC entry 3522 (class 2606 OID 17864)
-- Name: cotizaciones_solicitudes cotizaciones_solicitudes_codigo_solicitud_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_solicitudes
    ADD CONSTRAINT cotizaciones_solicitudes_codigo_solicitud_key UNIQUE (codigo_solicitud);


--
-- TOC entry 3524 (class 2606 OID 17866)
-- Name: cotizaciones_solicitudes cotizaciones_solicitudes_codigo_solicitud_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_solicitudes
    ADD CONSTRAINT cotizaciones_solicitudes_codigo_solicitud_key1 UNIQUE (codigo_solicitud);


--
-- TOC entry 3526 (class 2606 OID 17868)
-- Name: cotizaciones_solicitudes cotizaciones_solicitudes_codigo_solicitud_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_solicitudes
    ADD CONSTRAINT cotizaciones_solicitudes_codigo_solicitud_key2 UNIQUE (codigo_solicitud);


--
-- TOC entry 3528 (class 2606 OID 17401)
-- Name: cotizaciones_solicitudes cotizaciones_solicitudes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_solicitudes
    ADD CONSTRAINT cotizaciones_solicitudes_pkey PRIMARY KEY (id);


--
-- TOC entry 3449 (class 2606 OID 17735)
-- Name: editoriales editoriales_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editoriales
    ADD CONSTRAINT editoriales_nombre_key UNIQUE (nombre);


--
-- TOC entry 3451 (class 2606 OID 17737)
-- Name: editoriales editoriales_nombre_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editoriales
    ADD CONSTRAINT editoriales_nombre_key1 UNIQUE (nombre);


--
-- TOC entry 3453 (class 2606 OID 17739)
-- Name: editoriales editoriales_nombre_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editoriales
    ADD CONSTRAINT editoriales_nombre_key2 UNIQUE (nombre);


--
-- TOC entry 3455 (class 2606 OID 17164)
-- Name: editoriales editoriales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.editoriales
    ADD CONSTRAINT editoriales_pkey PRIMARY KEY (id);


--
-- TOC entry 3467 (class 2606 OID 17743)
-- Name: formatos formatos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formatos
    ADD CONSTRAINT formatos_codigo_key UNIQUE (codigo);


--
-- TOC entry 3469 (class 2606 OID 17745)
-- Name: formatos formatos_codigo_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formatos
    ADD CONSTRAINT formatos_codigo_key1 UNIQUE (codigo);


--
-- TOC entry 3471 (class 2606 OID 17747)
-- Name: formatos formatos_codigo_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formatos
    ADD CONSTRAINT formatos_codigo_key2 UNIQUE (codigo);


--
-- TOC entry 3473 (class 2606 OID 17201)
-- Name: formatos formatos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formatos
    ADD CONSTRAINT formatos_pkey PRIMARY KEY (id);


--
-- TOC entry 3459 (class 2606 OID 17751)
-- Name: generos generos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generos
    ADD CONSTRAINT generos_nombre_key UNIQUE (nombre);


--
-- TOC entry 3461 (class 2606 OID 17753)
-- Name: generos generos_nombre_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generos
    ADD CONSTRAINT generos_nombre_key1 UNIQUE (nombre);


--
-- TOC entry 3463 (class 2606 OID 17755)
-- Name: generos generos_nombre_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generos
    ADD CONSTRAINT generos_nombre_key2 UNIQUE (nombre);


--
-- TOC entry 3465 (class 2606 OID 17190)
-- Name: generos generos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generos
    ADD CONSTRAINT generos_pkey PRIMARY KEY (id);


--
-- TOC entry 3480 (class 2606 OID 17223)
-- Name: libros_autores libros_autores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_autores
    ADD CONSTRAINT libros_autores_pkey PRIMARY KEY (libro_id, autor_id);


--
-- TOC entry 3486 (class 2606 OID 17253)
-- Name: libros_editoriales libros_editoriales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_editoriales
    ADD CONSTRAINT libros_editoriales_pkey PRIMARY KEY (libro_id, editorial_id);


--
-- TOC entry 3483 (class 2606 OID 17238)
-- Name: libros_generos libros_generos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_generos
    ADD CONSTRAINT libros_generos_pkey PRIMARY KEY (libro_id, genero_id);


--
-- TOC entry 3477 (class 2606 OID 17216)
-- Name: libros libros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros
    ADD CONSTRAINT libros_pkey PRIMARY KEY (id);


--
-- TOC entry 3520 (class 2606 OID 17377)
-- Name: orden_detalles orden_detalles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_detalles
    ADD CONSTRAINT orden_detalles_pkey PRIMARY KEY (id);


--
-- TOC entry 3511 (class 2606 OID 17816)
-- Name: ordenes ordenes_numero_orden_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_numero_orden_key UNIQUE (numero_orden);


--
-- TOC entry 3513 (class 2606 OID 17818)
-- Name: ordenes ordenes_numero_orden_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_numero_orden_key1 UNIQUE (numero_orden);


--
-- TOC entry 3515 (class 2606 OID 17820)
-- Name: ordenes ordenes_numero_orden_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_numero_orden_key2 UNIQUE (numero_orden);


--
-- TOC entry 3517 (class 2606 OID 17358)
-- Name: ordenes ordenes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_pkey PRIMARY KEY (id);


--
-- TOC entry 3441 (class 2606 OID 17724)
-- Name: perfiles_institucionales perfiles_institucionales_documento_tributario_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_institucionales
    ADD CONSTRAINT perfiles_institucionales_documento_tributario_key UNIQUE (documento_tributario);


--
-- TOC entry 3443 (class 2606 OID 17726)
-- Name: perfiles_institucionales perfiles_institucionales_documento_tributario_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_institucionales
    ADD CONSTRAINT perfiles_institucionales_documento_tributario_key1 UNIQUE (documento_tributario);


--
-- TOC entry 3445 (class 2606 OID 17728)
-- Name: perfiles_institucionales perfiles_institucionales_documento_tributario_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_institucionales
    ADD CONSTRAINT perfiles_institucionales_documento_tributario_key2 UNIQUE (documento_tributario);


--
-- TOC entry 3447 (class 2606 OID 17145)
-- Name: perfiles_institucionales perfiles_institucionales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_institucionales
    ADD CONSTRAINT perfiles_institucionales_pkey PRIMARY KEY (usuario_id);


--
-- TOC entry 3425 (class 2606 OID 17701)
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- TOC entry 3427 (class 2606 OID 17703)
-- Name: roles roles_nombre_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key1 UNIQUE (nombre);


--
-- TOC entry 3429 (class 2606 OID 17705)
-- Name: roles roles_nombre_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key2 UNIQUE (nombre);


--
-- TOC entry 3431 (class 2606 OID 17112)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 3507 (class 2606 OID 17321)
-- Name: carrito_items uq_carrito_producto; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT uq_carrito_producto UNIQUE (carrito_id, producto_id);


--
-- TOC entry 3499 (class 2606 OID 17280)
-- Name: catalogo_productos uq_libro_formato; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_productos
    ADD CONSTRAINT uq_libro_formato UNIQUE (libro_id, formato_id);


--
-- TOC entry 3433 (class 2606 OID 17714)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- TOC entry 3435 (class 2606 OID 17716)
-- Name: usuarios usuarios_email_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key1 UNIQUE (email);


--
-- TOC entry 3437 (class 2606 OID 17718)
-- Name: usuarios usuarios_email_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key2 UNIQUE (email);


--
-- TOC entry 3439 (class 2606 OID 17126)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 3495 (class 1259 OID 17783)
-- Name: idx_catalogo_isbn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_catalogo_isbn ON public.catalogo_productos USING btree (isbn);


--
-- TOC entry 3496 (class 1259 OID 17793)
-- Name: idx_catalogo_libro_formato; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_catalogo_libro_formato ON public.catalogo_productos USING btree (libro_id, formato_id) WHERE ((deleted_at IS NULL) AND (activo = true));


--
-- TOC entry 3497 (class 1259 OID 17794)
-- Name: idx_catalogo_precio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_catalogo_precio ON public.catalogo_productos USING btree (precio_base) WHERE ((deleted_at IS NULL) AND (activo = true));


--
-- TOC entry 3529 (class 1259 OID 17459)
-- Name: idx_cotizaciones_asesor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cotizaciones_asesor ON public.cotizaciones_solicitudes USING btree (asesor_id);


--
-- TOC entry 3530 (class 1259 OID 17460)
-- Name: idx_cotizaciones_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cotizaciones_cliente ON public.cotizaciones_solicitudes USING btree (cliente_id);


--
-- TOC entry 3531 (class 1259 OID 17889)
-- Name: idx_cotizaciones_estado_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cotizaciones_estado_fecha ON public.cotizaciones_solicitudes USING btree (estado, created_at DESC);


--
-- TOC entry 3474 (class 1259 OID 17762)
-- Name: idx_libros_anio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_libros_anio ON public.libros USING btree (anio_edicion) WHERE (deleted_at IS NULL);


--
-- TOC entry 3478 (class 1259 OID 17452)
-- Name: idx_libros_autores_autor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_libros_autores_autor ON public.libros_autores USING btree (autor_id);


--
-- TOC entry 3484 (class 1259 OID 17454)
-- Name: idx_libros_editoriales_editorial; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_libros_editoriales_editorial ON public.libros_editoriales USING btree (editorial_id);


--
-- TOC entry 3481 (class 1259 OID 17453)
-- Name: idx_libros_generos_genero; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_libros_generos_genero ON public.libros_generos USING btree (genero_id);


--
-- TOC entry 3475 (class 1259 OID 17761)
-- Name: idx_libros_titulo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_libros_titulo ON public.libros USING btree (titulo) WHERE (deleted_at IS NULL);


--
-- TOC entry 3518 (class 1259 OID 17457)
-- Name: idx_orden_detalles_orden; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orden_detalles_orden ON public.orden_detalles USING btree (orden_id);


--
-- TOC entry 3508 (class 1259 OID 17845)
-- Name: idx_ordenes_estado; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ordenes_estado ON public.ordenes USING btree (estado);


--
-- TOC entry 3509 (class 1259 OID 17847)
-- Name: idx_ordenes_usuario_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ordenes_usuario_fecha ON public.ordenes USING btree (usuario_id, fecha_orden DESC);


--
-- TOC entry 3558 (class 2620 OID 17179)
-- Name: autores trg_autores_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_autores_updated_at BEFORE UPDATE ON public.autores FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3563 (class 2620 OID 17332)
-- Name: carrito_items trg_carrito_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_carrito_items_updated_at BEFORE UPDATE ON public.carrito_items FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3562 (class 2620 OID 17308)
-- Name: carritos trg_carritos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_carritos_updated_at BEFORE UPDATE ON public.carritos FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3561 (class 2620 OID 17291)
-- Name: catalogo_productos trg_catalogo_productos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_catalogo_productos_updated_at BEFORE UPDATE ON public.catalogo_productos FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3566 (class 2620 OID 17446)
-- Name: cotizaciones_propuestas trg_cotizaciones_propuestas_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cotizaciones_propuestas_updated_at BEFORE UPDATE ON public.cotizaciones_propuestas FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3565 (class 2620 OID 17419)
-- Name: cotizaciones_solicitudes trg_cotizaciones_solicitudes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_cotizaciones_solicitudes_updated_at BEFORE UPDATE ON public.cotizaciones_solicitudes FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3557 (class 2620 OID 17167)
-- Name: editoriales trg_editoriales_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_editoriales_updated_at BEFORE UPDATE ON public.editoriales FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3559 (class 2620 OID 17193)
-- Name: generos trg_generos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_generos_updated_at BEFORE UPDATE ON public.generos FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3560 (class 2620 OID 17217)
-- Name: libros trg_libros_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_libros_updated_at BEFORE UPDATE ON public.libros FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3564 (class 2620 OID 17366)
-- Name: ordenes trg_ordenes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ordenes_updated_at BEFORE UPDATE ON public.ordenes FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3556 (class 2620 OID 17153)
-- Name: perfiles_institucionales trg_perfiles_institucionales_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_perfiles_institucionales_updated_at BEFORE UPDATE ON public.perfiles_institucionales FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3555 (class 2620 OID 17134)
-- Name: usuarios trg_usuarios_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp_modificacion();


--
-- TOC entry 3545 (class 2606 OID 17800)
-- Name: carrito_items carrito_items_carrito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_carrito_id_fkey FOREIGN KEY (carrito_id) REFERENCES public.carritos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3546 (class 2606 OID 17805)
-- Name: carrito_items carrito_items_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrito_items
    ADD CONSTRAINT carrito_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.catalogo_productos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3544 (class 2606 OID 17795)
-- Name: carritos carritos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carritos
    ADD CONSTRAINT carritos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3542 (class 2606 OID 17770)
-- Name: catalogo_productos catalogo_productos_formato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_productos
    ADD CONSTRAINT catalogo_productos_formato_id_fkey FOREIGN KEY (formato_id) REFERENCES public.formatos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3543 (class 2606 OID 17765)
-- Name: catalogo_productos catalogo_productos_libro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.catalogo_productos
    ADD CONSTRAINT catalogo_productos_libro_id_fkey FOREIGN KEY (libro_id) REFERENCES public.libros(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3553 (class 2606 OID 17895)
-- Name: cotizaciones_propuestas cotizaciones_propuestas_asesor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_propuestas
    ADD CONSTRAINT cotizaciones_propuestas_asesor_id_fkey FOREIGN KEY (asesor_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3554 (class 2606 OID 17890)
-- Name: cotizaciones_propuestas cotizaciones_propuestas_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_propuestas
    ADD CONSTRAINT cotizaciones_propuestas_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES public.cotizaciones_solicitudes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3550 (class 2606 OID 17884)
-- Name: cotizaciones_solicitudes cotizaciones_solicitudes_asesor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_solicitudes
    ADD CONSTRAINT cotizaciones_solicitudes_asesor_id_fkey FOREIGN KEY (asesor_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3551 (class 2606 OID 17869)
-- Name: cotizaciones_solicitudes cotizaciones_solicitudes_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_solicitudes
    ADD CONSTRAINT cotizaciones_solicitudes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3552 (class 2606 OID 17874)
-- Name: cotizaciones_solicitudes cotizaciones_solicitudes_libro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cotizaciones_solicitudes
    ADD CONSTRAINT cotizaciones_solicitudes_libro_id_fkey FOREIGN KEY (libro_id) REFERENCES public.libros(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 3536 (class 2606 OID 17229)
-- Name: libros_autores fk_la_autor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_autores
    ADD CONSTRAINT fk_la_autor FOREIGN KEY (autor_id) REFERENCES public.autores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3537 (class 2606 OID 17224)
-- Name: libros_autores fk_la_libro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_autores
    ADD CONSTRAINT fk_la_libro FOREIGN KEY (libro_id) REFERENCES public.libros(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3540 (class 2606 OID 17259)
-- Name: libros_editoriales fk_le_editorial; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_editoriales
    ADD CONSTRAINT fk_le_editorial FOREIGN KEY (editorial_id) REFERENCES public.editoriales(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3541 (class 2606 OID 17254)
-- Name: libros_editoriales fk_le_libro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_editoriales
    ADD CONSTRAINT fk_le_libro FOREIGN KEY (libro_id) REFERENCES public.libros(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3538 (class 2606 OID 17244)
-- Name: libros_generos fk_lg_genero; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_generos
    ADD CONSTRAINT fk_lg_genero FOREIGN KEY (genero_id) REFERENCES public.generos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3539 (class 2606 OID 17239)
-- Name: libros_generos fk_lg_libro; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libros_generos
    ADD CONSTRAINT fk_lg_libro FOREIGN KEY (libro_id) REFERENCES public.libros(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3535 (class 2606 OID 17148)
-- Name: perfiles_institucionales fk_perfiles_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfiles_institucionales
    ADD CONSTRAINT fk_perfiles_usuarios FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3548 (class 2606 OID 17848)
-- Name: orden_detalles orden_detalles_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_detalles
    ADD CONSTRAINT orden_detalles_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3549 (class 2606 OID 17853)
-- Name: orden_detalles orden_detalles_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orden_detalles
    ADD CONSTRAINT orden_detalles_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.catalogo_productos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3547 (class 2606 OID 17821)
-- Name: ordenes ordenes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3534 (class 2606 OID 17706)
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2026-11-12 10:47:48 CST

--
-- PostgreSQL database dump complete
--

\unrestrict pd7oYpv7wfoaIi7owT32hUrGGrl0mO4C7Du79mvq2vfKsXnJOEywUWdEDQRtPDr

