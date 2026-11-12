import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  sequelize,
  Rol,
  Usuario,
  PerfilInstitucional,
  Carritos,
  Formatos,
  Generos,
  Autores,
  Editorial,
  Libros,
  Catalogo_Productos,
} from "../models/index.js";

async function runSeed() {
  try {
    await sequelize.authenticate();
    console.log("Conectado a la base de datos.");

    // Sincronizar esquemas relacionales
    await sequelize.sync({ alter: true });
    console.log("✅ Esquema relacional sincronizado");

    // 1. Roles según especificación de 5 roles (RF-02)
    const rolesData = [
      { nombre: "CLIENTE_MINORISTA", descripcion: "Cliente minorista con compras individuales y carrito estándar" },
      { nombre: "CLIENTE_INSTITUCIONAL", descripcion: "Cliente institucional / mayorista para compras por volumen y cotizaciones" },
      { nombre: "ASESOR", descripcion: "Asesor comercial encargado de cotizaciones y atención B2B" },
      { nombre: "ADMIN", descripcion: "Administrador con control total del sistema y catálogo" },
      { nombre: "CLIENTE", descripcion: "Alias de compatibilidad para cliente minorista" },
    ];
    const rolesMap = {};
    for (const r of rolesData) {
      const [rol] = await Rol.findOrCreate({ where: { nombre: r.nombre }, defaults: r });
      rolesMap[r.nombre] = rol;
    }
    console.log("✅ Roles asegurados");

    // 2. Usuarios semilla para pruebas con credenciales conocidas
    const defaultPassword = "Password123!";
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(defaultPassword, salt);

    const usuariosData = [
      {
        email: "admin@editorial.com",
        password_hash,
        nombres: "Carlos",
        apellidos: "Administrador",
        telefono: "+502 5555-0001",
        rol_id: rolesMap["ADMIN"].id,
        activo: true,
      },
      {
        email: "asesor@editorial.com",
        password_hash,
        nombres: "Ana",
        apellidos: "Asesora Comercial",
        telefono: "+502 5555-0002",
        rol_id: rolesMap["ASESOR"].id,
        activo: true,
      },
      {
        email: "minorista@editorial.com",
        password_hash,
        nombres: "Juan",
        apellidos: "Pérez Minorista",
        telefono: "+502 5555-0003",
        rol_id: rolesMap["CLIENTE_MINORISTA"].id,
        activo: true,
      },
      {
        email: "institucional@colegio.edu",
        password_hash,
        nombres: "Licda. Beatriz",
        apellidos: "Méndez Institucional",
        telefono: "+502 5555-0004",
        rol_id: rolesMap["CLIENTE_INSTITUCIONAL"].id,
        activo: true,
        perfilInstitucional: {
          razon_social: "Colegio Mayor San Agustín S.A.",
          documento_tributario: "NIT-901234567-8",
          direccion_fiscal: "Avenida Las Américas 14-20, Zona 10, Ciudad de Guatemala",
          contacto_cargo: "Directora de Compras Bibliográficas",
          estado_verificacion: "verificado",
        },
      },
      {
        email: "institucional2@universidad.edu",
        password_hash,
        nombres: "Dr. Roberto",
        apellidos: "Gómez Universidad",
        telefono: "+502 5555-0005",
        rol_id: rolesMap["CLIENTE_INSTITUCIONAL"].id,
        activo: true,
        perfilInstitucional: {
          razon_social: "Universidad Panamericana de Ciencias",
          documento_tributario: "NIT-812345678-1",
          direccion_fiscal: "Campus Central Universitario, Km 15.5 Carretera a El Salvador",
          contacto_cargo: "Coordinador de Biblioteca Central",
          estado_verificacion: "pendiente",
        },
      },
    ];

    for (const u of usuariosData) {
      const [usuario] = await Usuario.findOrCreate({
        where: { email: u.email },
        defaults: {
          email: u.email,
          password_hash: u.password_hash,
          nombres: u.nombres,
          apellidos: u.apellidos,
          telefono: u.telefono,
          rol_id: u.rol_id,
          activo: u.activo,
        },
      });

      // Crear carrito automático para clientes
      await Carritos.findOrCreate({
        where: { usuario_id: usuario.id },
        defaults: { usuario_id: usuario.id },
      });

      // Crear perfil institucional si aplica
      if (u.perfilInstitucional) {
        await PerfilInstitucional.findOrCreate({
          where: { usuario_id: usuario.id },
          defaults: {
            usuario_id: usuario.id,
            ...u.perfilInstitucional,
          },
        });
      }
    }
    console.log("✅ Usuarios semilla de prueba creados para todos los roles");

    // 3. Formatos
    const formatosData = [
      { codigo: "FISICO_TB", nombre: "Físico - Tapa Blanda" },
      { codigo: "FISICO_TD", nombre: "Físico - Tapa Dura" },
      { codigo: "EBOOK", nombre: "Digital - E-Book" },
      { codigo: "AUDIO", nombre: "Audiolibro" },
    ];
    const formatosMap = {};
    for (const f of formatosData) {
      const [formato] = await Formatos.findOrCreate({
        where: { codigo: f.codigo },
        defaults: f,
      });
      formatosMap[f.codigo] = formato;
    }
    console.log("✅ Formatos asegurados");

    // 4. Géneros
    const generosData = [
      { nombre: "Ciencia Ficción", descripcion: "Obras con bases científicas o futuristas especulativas." },
      { nombre: "Fantasía", descripcion: "Universos imaginarios, magia y seres mitológicos." },
      { nombre: "Tecnología y Software", descripcion: "Libros técnicos sobre desarrollo de software y computación." },
      { nombre: "Realismo Mágico", descripcion: "Narrativa donde lo irreal y fantástico se percibe como natural." },
      { nombre: "Desarrollo Personal", descripcion: "Guías prácticas y motivación para el crecimiento individual." },
      { nombre: "Filosofía y Ensayo", descripcion: "Tratados sobre ética, pensamiento crítico y sociedad." },
      { nombre: "Historia Universal", descripcion: "Crónicas y análisis de la evolución histórica de la humanidad." },
    ];
    const generosMap = {};
    for (const g of generosData) {
      const [genero] = await Generos.findOrCreate({
        where: { nombre: g.nombre },
        defaults: g,
      });
      generosMap[g.nombre] = genero;
    }
    console.log("✅ Géneros asegurados");

    // 5. Editoriales
    const editorialesData = [
      { nombre: "Penguin Random House", email_contacto: "contacto@penguin.com", sitio_web: "https://penguinrandomhouse.com" },
      { nombre: "Editorial Planeta", email_contacto: "info@planeta.es", sitio_web: "https://www.planetadelibros.com" },
      { nombre: "Prentice Hall", email_contacto: "contact@pearson.com", sitio_web: "https://www.pearson.com" },
      { nombre: "Alianza Editorial", email_contacto: "info@alianzaeditorial.es", sitio_web: "https://www.alianzaeditorial.es" },
      { nombre: "O'Reilly Media", email_contacto: "info@oreilly.com", sitio_web: "https://www.oreilly.com" },
      { nombre: "Fondo de Cultura Económica", email_contacto: "ventas@fondodeculturaeconomica.com", sitio_web: "https://www.fondodeculturaeconomica.com" },
    ];
    const editorialesMap = {};
    for (const ed of editorialesData) {
      const [editorial] = await Editorial.findOrCreate({
        where: { nombre: ed.nombre },
        defaults: ed,
      });
      editorialesMap[ed.nombre] = editorial;
    }
    console.log("✅ Editoriales aseguradas");

    // 6. Autores
    const autoresData = [
      {
        nombres: "Gabriel",
        apellidos: "García Márquez",
        biografia: "Escritor y periodista colombiano, Premio Nobel de Literatura 1982.",
      },
      {
        nombres: "Robert C.",
        apellidos: "Martin",
        biografia: "Conocido como 'Uncle Bob', ingeniero de software y autor de Clean Code.",
      },
      {
        nombres: "George",
        apellidos: "Orwell",
        biografia: "Novelista y ensayista británico, autor de 1984 y Rebelión en la granja.",
      },
      {
        nombres: "Frank",
        apellidos: "Herbert",
        biografia: "Escritor estadounidense de ciencia ficción, creador de Dune.",
      },
      {
        nombres: "Martin",
        apellidos: "Fowler",
        biografia: "Ingeniero de software británico, especialista en patrones de arquitectura y refactorización.",
      },
      {
        nombres: "J.R.R.",
        apellidos: "Tolkien",
        biografia: "Filólogo y escritor británico, autor de El Señor de los Anillos y El Hobbit.",
      },
      {
        nombres: "Yuval Noah",
        apellidos: "Harari",
        biografia: "Historiador y filósofo israelí, profesor de la Universidad Hebrea de Jerusalén.",
      },
      {
        nombres: "Marco",
        apellidos: "Aurelio",
        biografia: "Emperador romano y filósofo estoico, autor de las Meditaciones.",
      },
      {
        nombres: "Carl",
        apellidos: "Sagan",
        biografia: "Astrónomo, astrofísico y divulgador científico estadounidense, autor de Cosmos.",
      },
      {
        nombres: "James",
        apellidos: "Clear",
        biografia: "Escritor y conferencista enfocado en hábitos y toma de decisiones, autor de Hábitos Atómicos.",
      },
    ];
    const autoresMap = {};
    for (const a of autoresData) {
      const [autor] = await Autores.findOrCreate({
        where: { nombres: a.nombres, apellidos: a.apellidos },
        defaults: a,
      });
      autoresMap[`${a.nombres} ${a.apellidos}`] = autor;
    }
    console.log("✅ Autores asegurados");

    // 7. Catálogo Completo: Mínimo 10 Libros con variantes y stock
    const catalogoData = [
      {
        titulo: "Cien Años de Soledad",
        sinopsis: "La historia épica de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo.",
        anio_edicion: 1967,
        portada_url: "https://images.cdn.editorialplaneta.com/covers/cien_anos_de_soledad.jpg",
        autores: ["Gabriel García Márquez"],
        generos: ["Realismo Mágico"],
        editorial: "Editorial Planeta",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-0307474728", precio: 18.50, stock: 45 },
          { formato: "FISICO_TD", isbn: "978-0307474735", precio: 28.00, stock: 20 },
          { formato: "EBOOK", isbn: "978-0307474742", precio: 9.99, stock: 999 },
        ],
      },
      {
        titulo: "Clean Code: A Handbook of Agile Software Craftsmanship",
        sinopsis: "Guía fundamental sobre buenas prácticas de programación, refactorización y diseño de código limpio y mantenible.",
        anio_edicion: 2008,
        portada_url: "https://m.media-amazon.com/images/I/41xShlnTZTL._SX376_BO1,204,203,200_.jpg",
        autores: ["Robert C. Martin"],
        generos: ["Tecnología y Software"],
        editorial: "Prentice Hall",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-0132350884", precio: 42.00, stock: 25 },
          { formato: "FISICO_TD", isbn: "978-0132350885", precio: 58.00, stock: 15 },
          { formato: "EBOOK", isbn: "978-0132350891", precio: 29.99, stock: 999 },
        ],
      },
      {
        titulo: "1984",
        sinopsis: "Clásica novela distópica que introduce los conceptos del Gran Hermano, la Policía del Pensamiento y la vigilancia absoluta.",
        anio_edicion: 1949,
        portada_url: "https://images.penguinrandomhouse.com/covers/1984.jpg",
        autores: ["George Orwell"],
        generos: ["Ciencia Ficción"],
        editorial: "Penguin Random House",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-0451524935", precio: 12.00, stock: 40 },
          { formato: "FISICO_TD", isbn: "978-0451524942", precio: 22.00, stock: 15 },
          { formato: "AUDIO", isbn: "978-0451524959", precio: 14.50, stock: 999 },
        ],
      },
      {
        titulo: "Dune",
        sinopsis: "En el desértico planeta Arrakis, el joven Paul Atreides enfrenta traición, intrigas dinásticas y el destino del universo.",
        anio_edicion: 1965,
        portada_url: "https://images.penguinrandomhouse.com/covers/dune.jpg",
        autores: ["Frank Herbert"],
        generos: ["Ciencia Ficción", "Fantasía"],
        editorial: "Penguin Random House",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-0441172719", precio: 19.90, stock: 35 },
          { formato: "FISICO_TD", isbn: "978-0441172726", precio: 34.00, stock: 18 },
          { formato: "EBOOK", isbn: "978-0441172733", precio: 11.99, stock: 999 },
        ],
      },
      {
        titulo: "Refactoring: Improving the Design of Existing Code",
        sinopsis: "Tratado exhaustivo de patrones de refactorización para arquitectos e ingenieros de software.",
        anio_edicion: 2018,
        portada_url: "https://m.media-amazon.com/images/I/41T5-smx+cL._SX379_BO1,204,203,200_.jpg",
        autores: ["Martin Fowler"],
        generos: ["Tecnología y Software"],
        editorial: "Prentice Hall",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-0134757599", precio: 49.50, stock: 20 },
          { formato: "EBOOK", isbn: "978-0134757605", precio: 32.00, stock: 999 },
        ],
      },
      {
        titulo: "El Señor de los Anillos: La Comunidad del Anillo",
        sinopsis: "El inicio del épico viaje de Frodo Bolsón para destruir el Anillo Único en las entrañas del Monte del Destino.",
        anio_edicion: 1954,
        portada_url: "https://images.cdn.editorialplaneta.com/covers/senor_de_los_anillos.jpg",
        autores: ["J.R.R. Tolkien"],
        generos: ["Fantasía"],
        editorial: "Editorial Planeta",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-8445071403", precio: 24.00, stock: 30 },
          { formato: "FISICO_TD", isbn: "978-8445071410", precio: 39.00, stock: 12 },
          { formato: "AUDIO", isbn: "978-8445071427", precio: 18.00, stock: 999 },
        ],
      },
      {
        titulo: "Sapiens: De animales a dioses",
        sinopsis: "Breve historia de la humanidad que explora cómo una especie insignificante se convirtió en dueña del planeta.",
        anio_edicion: 2014,
        portada_url: "https://images.penguinrandomhouse.com/covers/sapiens.jpg",
        autores: ["Yuval Noah Harari"],
        generos: ["Historia Universal", "Filosofía y Ensayo"],
        editorial: "Penguin Random House",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-0062316097", precio: 21.00, stock: 50 },
          { formato: "FISICO_TD", isbn: "978-0062316103", precio: 32.50, stock: 22 },
          { formato: "EBOOK", isbn: "978-0062316110", precio: 12.99, stock: 999 },
        ],
      },
      {
        titulo: "Meditaciones",
        sinopsis: "Las reflexiones personales e íntimas del emperador Marco Aurelio sobre el estoicismo y la serenidad mental.",
        anio_edicion: 2020,
        portada_url: "https://images.alianzaeditorial.es/covers/meditaciones.jpg",
        autores: ["Marco Aurelio"],
        generos: ["Filosofía y Ensayo"],
        editorial: "Alianza Editorial",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-8420651231", precio: 14.50, stock: 40 },
          { formato: "FISICO_TD", isbn: "978-8420651248", precio: 23.00, stock: 15 },
          { formato: "EBOOK", isbn: "978-8420651255", precio: 7.99, stock: 999 },
        ],
      },
      {
        titulo: "Cosmos",
        sinopsis: "Obra maestra de divulgación astronómica que narra los 15.000 millones de años de evolución cósmica.",
        anio_edicion: 1980,
        portada_url: "https://images.cdn.editorialplaneta.com/covers/cosmos.jpg",
        autores: ["Carl Sagan"],
        generos: ["Ciencia Ficción", "Historia Universal"],
        editorial: "Editorial Planeta",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-8408053989", precio: 26.00, stock: 28 },
          { formato: "FISICO_TD", isbn: "978-8408053996", precio: 38.00, stock: 14 },
          { formato: "EBOOK", isbn: "978-8408054009", precio: 13.99, stock: 999 },
        ],
      },
      {
        titulo: "Hábitos Atómicos",
        sinopsis: "Método comprobado para desarrollar buenos hábitos, eliminar los malos y lograr resultados extraordinarios paso a paso.",
        anio_edicion: 2018,
        portada_url: "https://images.penguinrandomhouse.com/covers/habitos_atomicos.jpg",
        autores: ["James Clear"],
        generos: ["Desarrollo Personal"],
        editorial: "Penguin Random House",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-0735211292", precio: 17.90, stock: 60 },
          { formato: "FISICO_TD", isbn: "978-0735211308", precio: 27.50, stock: 25 },
          { formato: "AUDIO", isbn: "978-0735211315", precio: 15.00, stock: 999 },
        ],
      },
      {
        titulo: "Designing Data-Intensive Applications",
        sinopsis: "La biblia contemporánea sobre arquitectura de datos distribuida, fiabilidad, escalabilidad y mantenibilidad.",
        anio_edicion: 2017,
        portada_url: "https://images.oreillystatic.com/covers/9781449373320.jpg",
        autores: ["Martin Fowler"],
        generos: ["Tecnología y Software"],
        editorial: "O'Reilly Media",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-1449373320", precio: 55.00, stock: 18 },
          { formato: "EBOOK", isbn: "978-1449373337", precio: 39.99, stock: 999 },
        ],
      },
      {
        titulo: "El Hobbit",
        sinopsis: "La entrañable aventura de Bilbo Bolsón con Gandalf y trece enanos hacia la Montaña Solitaria para enfrentar a Smaug.",
        anio_edicion: 1937,
        portada_url: "https://images.cdn.editorialplaneta.com/covers/el_hobbit.jpg",
        autores: ["J.R.R. Tolkien"],
        generos: ["Fantasía"],
        editorial: "Editorial Planeta",
        variantes: [
          { formato: "FISICO_TB", isbn: "978-8445073803", precio: 16.50, stock: 35 },
          { formato: "FISICO_TD", isbn: "978-8445073810", precio: 29.00, stock: 16 },
        ],
      },
    ];

    for (const item of catalogoData) {
      const [libro] = await Libros.findOrCreate({
        where: { titulo: item.titulo },
        defaults: {
          titulo: item.titulo,
          sinopsis: item.sinopsis,
          anio_edicion: item.anio_edicion,
          portada_url: item.portada_url,
          activo: true,
        },
      });

      // Asociar Autores
      if (item.autores && item.autores.length > 0) {
        const autoresObj = item.autores.map((nombreCompleto) => autoresMap[nombreCompleto]).filter(Boolean);
        await libro.setAutores(autoresObj);
      }

      // Asociar Géneros
      if (item.generos && item.generos.length > 0) {
        const generosObj = item.generos.map((g) => generosMap[g]).filter(Boolean);
        await libro.setGeneros(generosObj);
      }

      // Asociar Editorial
      if (item.editorial && editorialesMap[item.editorial]) {
        await libro.setEditoriales([editorialesMap[item.editorial]]);
      }

      // Variantes en Catalogo_Productos
      for (const variante of item.variantes) {
        const formatoObj = formatosMap[variante.formato];
        if (!formatoObj) continue;

        await Catalogo_Productos.findOrCreate({
          where: { isbn: variante.isbn },
          defaults: {
            libro_id: libro.id,
            formato_id: formatoObj.id,
            isbn: variante.isbn,
            precio_base: variante.precio,
            stock_disponible: variante.stock,
            activo: true,
          },
        });
      }
    }

    console.log("✅ 12 Libros con catálogo y variantes creados exitosamente");
    console.log("\n=======================================================");
    console.log("CREDENCIALES DE PRUEBA CREADAS (Password para todos: Password123!)");
    console.log("1. Visitante: Sin autenticación (Navegación libre por catálogo)");
    console.log("2. Cliente Minorista: minorista@editorial.com");
    console.log("3. Cliente Institucional: institucional@colegio.edu (Verificado)");
    console.log("4. Cliente Institucional: institucional2@universidad.edu (Pendiente)");
    console.log("5. Asesor de Ventas: asesor@editorial.com");
    console.log("6. Administrador: admin@editorial.com");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  }
}

runSeed();
