-- =============================================================================
-- PROYECTO FINAL: PLATAFORMA WEB EDITORIAL MULTICANAL (ARQUITECTURA MVC)
-- SCRIPT DML: DATOS SEMILLA (SEED DATA) PARA DEMOSTRACIÓN Y PRUEBAS
-- =============================================================================
-- Contraseña general para todos los usuarios de demostración: Password123!
-- Hash Bcrypt precalculado: $2a$12$e86g2uG5gU/JmS6Z9N1bOe1.5zK64wL9O7gYI6o0tU8K8M2uF5X0S
-- =============================================================================

-- =============================================================================
-- 1. ROLES DEL SISTEMA (RF-02)
-- =============================================================================
INSERT INTO roles (id, nombre, descripcion) VALUES
(1, 'Visitante', 'Usuario anónimo no autenticado; puede explorar el catálogo y ver fichas técnicas.'),
(2, 'Cliente Minorista', 'Usuario individual registrado; compra a precio regular y accede al carrito estándar.'),
(3, 'Cliente Institucional', 'Cuenta corporativa/educativa; accede a descuentos adicionales del 8% y módulo de cotizaciones.'),
(4, 'Asesor de Ventas', 'Personal comercial que evalúa solicitudes de tirajes especiales y emite cotizaciones formales.'),
(5, 'Administrador', 'Control total de la plataforma: gestión de catálogo, auditoría, órdenes y usuarios.');

-- Reiniciar la secuencia para inserciones futuras automáticas
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- =============================================================================
-- 2. USUARIOS Y PERFILES INSTITUCIONALES (5 ROLES REQUERIDOS)
-- =============================================================================
INSERT INTO usuarios (id, rol_id, email, password_hash, nombres, apellidos, telefono, activo) VALUES
(1, 5, 'admin@editorial.com', '$2a$12$e86g2uG5gU/JmS6Z9N1bOe1.5zK64wL9O7gYI6o0tU8K8M2uF5X0S', 'Carlos', 'Administrador', '+502 5555-0101', TRUE),
(2, 4, 'asesor@editorial.com', '$2a$12$e86g2uG5gU/JmS6Z9N1bOe1.5zK64wL9O7gYI6o0tU8K8M2uF5X0S', 'Laura', 'Ventas Méndez', '+502 5555-0102', TRUE),
(3, 3, 'compras@universidadnacional.edu', '$2a$12$e86g2uG5gU/JmS6Z9N1bOe1.5zK64wL9O7gYI6o0tU8K8M2uF5X0S', 'Roberto', 'Gómez Director', '+502 5555-0103', TRUE),
(4, 2, 'cliente.minorista@gmail.com', '$2a$12$e86g2uG5gU/JmS6Z9N1bOe1.5zK64wL9O7gYI6o0tU8K8M2uF5X0S', 'Ana', 'Martínez Lector', '+502 5555-0104', TRUE),
(5, 1, 'visitante.demo@editorial.com', '$2a$12$e86g2uG5gU/JmS6Z9N1bOe1.5zK64wL9O7gYI6o0tU8K8M2uF5X0S', 'Visitante', 'Invitado', NULL, TRUE);

SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));

-- Perfil corporativo para el Cliente Institucional (Usuario ID: 3)
INSERT INTO perfiles_institucionales (usuario_id, razon_social, documento_tributario, direccion_fiscal, contacto_cargo, estado_verificacion) VALUES
(3, 'Universidad Nacional de Ingeniería y Tecnología', 'NIT-900854211-4', 'Av. Las Américas 12-45 Zona 14, Ciudad Universitaria', 'Jefe de Adquisiciones Bibliotecarias', 'verificado');

-- =============================================================================
-- 3. FORMATOS DE PUBLICACIÓN (3 FORMATOS)
-- =============================================================================
INSERT INTO formatos (id, codigo, nombre) VALUES
(1, 'tapa_blanda', 'Tapa Blanda / Rústica'),
(2, 'tapa_dura', 'Tapa Dura / Cartoné con Sobrecubierta'),
(3, 'ebook', 'Edición Digital E-Book (EPUB / PDF)');

SELECT setval('formatos_id_seq', (SELECT MAX(id) FROM formatos));

-- =============================================================================
-- 4. GÉNEROS LITERARIOS (6 GÉNEROS)
-- =============================================================================
INSERT INTO generos (id, nombre, descripcion) VALUES
(1, 'Arquitectura de Software y TI', 'Principios de diseño, patrones arquitectónicos, sistemas distribuidos y microservicios.'),
(2, 'Ingeniería de Software y Buenas Prácticas', 'Refactorización, código limpio, metodologías ágiles y calidad de software.'),
(3, 'Ciencia Ficción y Futurismo', 'Obras de especulación científica, viajes espaciales y tecnología futura.'),
(4, 'Historia y Ciencias Sociales', 'Ensayos históricos, evolución de civilizaciones y análisis sociocultural.'),
(5, 'Ficción Literaria y Clásicos', 'Novelas contemporáneas y clásicos de la literatura hispana y universal.'),
(6, 'Negocios y Liderazgo', 'Estrategia corporativa, gestión de proyectos y emprendimiento.');

SELECT setval('generos_id_seq', (SELECT MAX(id) FROM generos));

-- =============================================================================
-- 5. EDITORIALES (4 CASAS EDITORIALES)
-- =============================================================================
INSERT INTO editoriales (id, nombre, email_contacto, sitio_web) VALUES
(1, 'Addison-Wesley Professional', 'contact@pearsoned.com', 'https://www.informit.com/imprints/addison-wesley'),
(2, 'Prentice Hall Tech', 'info@prenticehall.com', 'https://www.pearson.com'),
(3, 'Editorial Sudamericana', 'ventas@sudamericana.com', 'https://www.penguinrandomhouse.com'),
(4, 'Gollancz SF Masters', 'rights@gollancz.co.uk', 'https://www.gollancz.co.uk');

SELECT setval('editoriales_id_seq', (SELECT MAX(id) FROM editoriales));

-- =============================================================================
-- 6. AUTORES DESTACADOS (8 AUTORES)
-- =============================================================================
INSERT INTO autores (id, nombres, apellidos, biografia) VALUES
(1, 'Robert C.', 'Martin (Uncle Bob)', 'Ingeniero de software estadounidense, conferencista y uno de los autores del Manifiesto Ágil.'),
(2, 'Martin', 'Fowler', 'Autor, conferencista y científico de software británico especializado en diseño orientado a objetos y refactorización.'),
(3, 'Erich', 'Gamma', 'Científico de la computación suizo y uno de los coautores originales de los patrones de diseño GoF.'),
(4, 'Gabriel', 'García Márquez', 'Escritor colombiano, premio Nobel de Literatura en 1982 y máximo exponente del realismo mágico.'),
(5, 'Isaac', 'Asimov', 'Escritor y profesor de bioquímica de origen ruso, célebre por sus obras de ciencia ficción y leyes de la robótica.'),
(6, 'Carl', 'Sagan', 'Astrónomo, astrofísico, cosmólogo y divulgador científico galardonado con el premio Pulitzer.'),
(7, 'Eric', 'Evans', 'Especialista en diseño de software y autor de Domain-Driven Design (DDD).'),
(8, 'Yuval Noah', 'Harari', 'Historiador, filósofo y catedrático israelí, autor de bestsellers globales sobre la evolución humana.');

SELECT setval('autores_id_seq', (SELECT MAX(id) FROM autores));

-- =============================================================================
-- 7. CATÁLOGO BIBLIOGRÁFICO: 10 LIBROS PADRE (RF-01, RF-05.1)
-- =============================================================================
INSERT INTO libros (id, titulo, sinopsis, anio_edicion, portada_url, activo) VALUES
(1, 'Clean Architecture: A Craftsman''s Guide to Software Structure', 
 'Guía fundamental para diseñar sistemas desacoplados, testeables y mantenibles aplicando principios SOLID y separación de capas.', 
 2017, 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=500', TRUE),

(2, 'Patterns of Enterprise Application Architecture', 
 'Catálogo de patrones de arquitectura empresarial que abordan la persistencia relacional, la lógica del dominio y la gestión de sesiones web.', 
 2002, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500', TRUE),

(3, 'Design Patterns: Elements of Reusable Object-Oriented Software', 
 'El clásico tratado del Gang of Four (GoF) que presenta 23 patrones de diseño creacionales, estructurales y de comportamiento.', 
 1994, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500', TRUE),

(4, 'Domain-Driven Design: Tackling Complexity in the Heart of Software', 
 'La obra pionera de Eric Evans sobre el diseño guiado por el dominio, modelado estratégico y lenguaje ubicuo.', 
 2003, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500', TRUE),

(5, 'Cien Años de Soledad', 
 'La epopeya de la familia Buendía en el pueblo ficticio de Macondo, obra cumbre de la literatura en lengua española.', 
 1967, 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=500', TRUE),

(6, 'Fundación', 
 'El inicio de la monumental saga de psicohistoria del Imperio Galáctico ideada por Hari Seldon.', 
 1951, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500', TRUE),

(7, 'Cosmos', 
 'Un viaje deslumbrante por el universo, la evolución del conocimiento humano y nuestro lugar en el cosmos.', 
 1980, 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500', TRUE),

(8, 'Sapiens: De animales a dioses', 
 'Breve historia de la humanidad que repasa las revoluciones cognitiva, agrícola y científica de nuestra especie.', 
 2014, 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=500', TRUE),

(9, 'Refactoring: Improving the Design of Existing Code', 
 'Metodología rigurosa para reestructurar código legado mejorando su arquitectura interna sin alterar su comportamiento observable.', 
 2018, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500', TRUE),

(10, 'El Amor en los Tiempos del Cólera', 
 'La conmovedora historia de amor apasionado entre Florentino Ariza y Fermina Daza a lo largo de más de medio siglo.', 
 1985, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500', TRUE);

SELECT setval('libros_id_seq', (SELECT MAX(id) FROM libros));

-- Mapeo Libros - Autores
INSERT INTO libros_autores (libro_id, autor_id, orden_autoria) VALUES
(1, 1, 1), -- Clean Architecture -> Robert C. Martin
(2, 2, 1), -- P of EAA -> Martin Fowler
(3, 3, 1), -- Design Patterns -> Erich Gamma
(4, 7, 1), -- DDD -> Eric Evans
(5, 4, 1), -- Cien Años -> García Márquez
(6, 5, 1), -- Fundación -> Isaac Asimov
(7, 6, 1), -- Cosmos -> Carl Sagan
(8, 8, 1), -- Sapiens -> Yuval Harari
(9, 2, 1), -- Refactoring -> Martin Fowler
(10, 4, 1); -- Amor en tiempos del cólera -> García Márquez

-- Mapeo Libros - Géneros
INSERT INTO libros_generos (libro_id, genero_id) VALUES
(1, 1), (1, 2), -- Clean Architecture -> Arquitectura, Calidad
(2, 1), (2, 2), -- P of EAA -> Arquitectura, Calidad
(3, 1), (3, 2), -- Design Patterns -> Arquitectura, Calidad
(4, 1), (4, 6), -- DDD -> Arquitectura, Negocios
(5, 5),         -- Cien Años -> Ficción
(6, 3),         -- Fundación -> Ciencia Ficción
(7, 4), (7, 3), -- Cosmos -> Historia, Divulgación
(8, 4), (8, 6), -- Sapiens -> Historia, Ensayo
(9, 2),         -- Refactoring -> Calidad
(10, 5);        -- El amor en los tiempos -> Ficción

-- Mapeo Libros - Editoriales
INSERT INTO libros_editoriales (libro_id, editorial_id) VALUES
(1, 2), -- Clean Architecture -> Prentice Hall
(2, 1), -- P of EAA -> Addison-Wesley
(3, 1), -- Design Patterns -> Addison-Wesley
(4, 1), -- DDD -> Addison-Wesley
(5, 3), -- Cien Años -> Sudamericana
(6, 4), -- Fundación -> Gollancz
(7, 3), -- Cosmos -> Sudamericana
(8, 3), -- Sapiens -> Sudamericana
(9, 1), -- Refactoring -> Addison-Wesley
(10, 3); -- Amor en los tiempos -> Sudamericana

-- =============================================================================
-- 8. PRODUCTOS COMERCIALES EN CATÁLOGO (FORMATOS, ISBN, PRECIOS Y STOCK)
-- =============================================================================
INSERT INTO catalogo_productos (id, libro_id, formato_id, isbn, precio_base, stock_disponible, activo) VALUES
-- Libro 1: Clean Architecture
(1, 1, 1, '978-0134494166', 42.50, 60, TRUE),   -- Tapa blanda
(2, 1, 2, '978-0134494173', 59.90, 25, TRUE),   -- Tapa dura
(3, 1, 3, '978-0134494180', 29.99, 9999, TRUE), -- E-book

-- Libro 2: Patterns of Enterprise Application Architecture
(4, 2, 1, '978-0321127426', 49.00, 40, TRUE),   -- Tapa blanda
(5, 2, 2, '978-0321127433', 68.00, 15, TRUE),   -- Tapa dura
(6, 2, 3, '978-0321127440', 34.50, 9999, TRUE), -- E-book

-- Libro 3: Design Patterns (GoF)
(7, 3, 1, '978-0201633610', 45.00, 50, TRUE),   -- Tapa blanda
(8, 3, 2, '978-0201633627', 62.00, 20, TRUE),   -- Tapa dura
(9, 3, 3, '978-0201633634', 31.00, 9999, TRUE), -- E-book

-- Libro 4: Domain-Driven Design
(10, 4, 1, '978-0321125217', 48.00, 30, TRUE),  -- Tapa blanda
(11, 4, 3, '978-0321125224', 33.00, 9999, TRUE),-- E-book

-- Libro 5: Cien Años de Soledad
(12, 5, 1, '978-0307474728', 18.50, 120, TRUE), -- Tapa blanda
(13, 5, 2, '978-0307474735', 29.90, 45, TRUE),  -- Tapa dura conmemorativa
(14, 5, 3, '978-0307474742', 9.99, 9999, TRUE),  -- E-book

-- Libro 6: Fundación
(15, 6, 1, '978-0553293357', 16.00, 80, TRUE),  -- Tapa blanda
(16, 6, 2, '978-0553293364', 27.50, 35, TRUE),  -- Tapa dura
(17, 6, 3, '978-0553293371', 8.50, 9999, TRUE),  -- E-book

-- Libro 7: Cosmos
(18, 7, 1, '978-0345539434', 22.00, 50, TRUE),  -- Tapa blanda
(19, 7, 2, '978-0345539441', 38.00, 30, TRUE),  -- Tapa dura ilustrada

-- Libro 8: Sapiens
(20, 8, 1, '978-0062316097', 24.00, 90, TRUE),  -- Tapa blanda
(21, 8, 2, '978-0062316103', 35.00, 40, TRUE),  -- Tapa dura
(22, 8, 3, '978-0062316110', 12.99, 9999, TRUE), -- E-book

-- Libro 9: Refactoring
(23, 9, 1, '978-0134757599', 46.00, 45, TRUE),  -- Tapa blanda
(24, 9, 3, '978-0134757605', 32.00, 9999, TRUE), -- E-book

-- Libro 10: El Amor en los Tiempos del Cólera
(25, 10, 1, '978-0307389732', 17.50, 70, TRUE), -- Tapa blanda
(26, 10, 2, '978-0307389749', 28.00, 25, TRUE); -- Tapa dura

SELECT setval('catalogo_productos_id_seq', (SELECT MAX(id) FROM catalogo_productos));

-- =============================================================================
-- 9. CARRITOS Y COMPRAS DEMOSTRATIVAS (RF-03)
-- =============================================================================
-- Carrito activo para el Cliente Minorista (Usuario ID: 4)
INSERT INTO carritos (id, usuario_id, sesion_token) VALUES
(1, 4, 'sess_minorista_tok_001');

INSERT INTO carrito_items (carrito_id, producto_id, cantidad) VALUES
(1, 1, 2),  -- 2 unidades de Clean Architecture Tapa Blanda
(1, 12, 1); -- 1 unidad de Cien Años de Soledad

SELECT setval('carritos_id_seq', (SELECT MAX(id) FROM carritos));
SELECT setval('carrito_items_id_seq', (SELECT MAX(id) FROM carrito_items));

-- Orden de demostración 1: Cliente Minorista con regla de descuento por volumen (6 a 20 unidades -> 5%)
-- Compra 10 unidades de Clean Architecture Tapa Blanda ($42.50 c/u) = Subtotal $425.00
-- Descuento por volumen 5% = $21.25. Subtotal con desc = $403.75. Impuesto 12% = $48.45. Total = $452.20
INSERT INTO ordenes (
    id, numero_orden, usuario_id, subtotal_base, 
    descuento_volumen, porcentaje_descuento_volumen, 
    descuento_institucional, porcentaje_descuento_institucional, 
    total_impuestos, total_final, estado, direccion_entrega, fecha_orden
) VALUES
(1, 'ORD-2026-001', 4, 425.00, 21.25, 5.00, 0.00, 0.00, 48.45, 452.20, 'Aprobado', 'Calle Las Flores 4-21, Zona 10', CURRENT_TIMESTAMP - INTERVAL '2 days');

INSERT INTO orden_detalles (orden_id, producto_id, cantidad, precio_unitario_historico, subtotal_linea) VALUES
(1, 1, 10, 42.50, 425.00);

-- Orden de demostración 2: Cliente Institucional con descuento por volumen acumulativo + 8% institucional
-- Compra 30 unidades de Design Patterns Tapa Blanda ($45.00 c/u) = Subtotal $1,350.00
-- 1) Descuento por volumen (21 a 50 unidades -> 10%): $135.00 (Saldo: $1,215.00)
-- 2) Descuento institucional 8% adicional acumulativo sobre saldo: $1,215 * 0.08 = $97.20
-- Subtotal tras descuentos: $1,117.80. Impuestos (12%): $134.14. Total = $1,251.94
INSERT INTO ordenes (
    id, numero_orden, usuario_id, subtotal_base, 
    descuento_volumen, porcentaje_descuento_volumen, 
    descuento_institucional, porcentaje_descuento_institucional, 
    total_impuestos, total_final, estado, direccion_entrega, fecha_orden
) VALUES
(2, 'ORD-2026-002', 3, 1350.00, 135.00, 10.00, 97.20, 8.00, 134.14, 1251.94, 'Pendiente', 'Universidad Nacional, Almacén Central de Biblioteca', CURRENT_TIMESTAMP - INTERVAL '4 hours');

INSERT INTO orden_detalles (orden_id, producto_id, cantidad, precio_unitario_historico, subtotal_linea) VALUES
(2, 7, 30, 45.00, 1350.00);

SELECT setval('ordenes_id_seq', (SELECT MAX(id) FROM ordenes));
SELECT setval('orden_detalles_id_seq', (SELECT MAX(id) FROM orden_detalles));

-- =============================================================================
-- 10. COTIZACIONES Y PEDIDOS PERSONALIZADOS (RF-04, RF-05.3)
-- =============================================================================
-- Solicitud 1: Pendiente de revisión en la bandeja del Asesor
INSERT INTO cotizaciones_solicitudes (
    id, codigo_solicitud, cliente_id, libro_id, titulo_obra, 
    cantidad_estimada, acabado_portada, tipo_papel, fecha_entrega_requerida, 
    notas_cliente, estado, asesor_id
) VALUES
(1, 'COT-2026-0001', 3, 1, 'Clean Architecture - Edición Institucional 2026', 
 250, 'Tapa dura con hot-stamping dorado del escudo universitario', 'Papel Ahuesado 85g cosido al hilo', 
 CURRENT_DATE + INTERVAL '45 days', 'Requerimos entrega en el campus central para inicio de semestre.', 'Pendiente', 2);

-- Solicitud 2: Ya revisada y con Propuesta Formal emitida por el Asesor de Ventas
INSERT INTO cotizaciones_solicitudes (
    id, codigo_solicitud, cliente_id, libro_id, titulo_obra, 
    cantidad_estimada, acabado_portada, tipo_papel, fecha_entrega_requerida, 
    notas_cliente, estado, asesor_id
) VALUES
(2, 'COT-2026-0002', 3, 8, 'Sapiens: De animales a dioses (Tiraje Masivo Estudiantil)', 
 500, 'Tapa blanda con plastificado mate soft-touch', 'Papel Bond ecológico 75g', 
 CURRENT_DATE + INTERVAL '30 days', 'Pedido para ciclo básico de humanidades.', 'Cotizada', 2);

-- Propuesta formal emitida por el Asesor Laura Méndez (Usuario ID: 2) para la Solicitud 2
INSERT INTO cotizaciones_propuestas (
    id, solicitud_id, asesor_id, costo_unitario_ofrecido, costo_total_propuesto, 
    tiempo_entrega_dias, condiciones_comerciales, fecha_validez, estado
) VALUES
(1, 2, 2, 14.50, 7250.00, 20, 
 'Precio especial por volumen de 500 ejemplares. 50% de anticipo al formalizar orden y 50% contra entrega. Incluye embalaje térmico y flete al campus.', 
 CURRENT_DATE + INTERVAL '15 days', 'Emitida');

SELECT setval('cotizaciones_solicitudes_id_seq', (SELECT MAX(id) FROM cotizaciones_solicitudes));
SELECT setval('cotizaciones_propuestas_id_seq', (SELECT MAX(id) FROM cotizaciones_propuestas));
