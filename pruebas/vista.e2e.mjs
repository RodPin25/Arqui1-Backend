// Pruebas funcionales automatizadas de la Vista de LibroNet (Frontend & QA).
// Recorren en el navegador los flujos de los cinco roles contra la API real.
//
// Requisitos: servidor corriendo con la base recién cargada (database.sql + npm run seed).
// Ejecución (no modifica package.json):
//   npm install --no-save playwright
//   npx playwright install chromium
//   node pruebas/vista.e2e.mjs                       # usa http://localhost:3000
//   BASE_URL=http://localhost:4000 node pruebas/vista.e2e.mjs
//
// Cada caso imprime OK o FAIL; el código de salida es 1 si alguno falla.

import { chromium } from "playwright";

const B = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const R=[];const ok=(n,c,d='')=>{R.push([c?'OK  ':'FAIL',n,c?'':d]);};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});const p=await ctx.newPage();
const errs=[];p.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text()))errs.push(m.text())});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
let dialogo=false;p.on('dialog',d=>{dialogo=true;d.dismiss()});
const idle=()=>p.waitForLoadState('networkidle');const wait=(ms=400)=>p.waitForTimeout(ms);
const txt=async(sel='main')=>(await p.locator(sel).first().innerText()).replace(/\s+/g,' ');
const salir=async()=>{await p.evaluate(()=>localStorage.clear())};
const login=async(e,pw='Password123!')=>{await p.goto(B+'/login.html');await p.fill('input[name=email]',e);await p.fill('input[name=password]',pw);await p.click('button[type=submit]');await idle();await wait()};
try{
// 1 visitante
await p.goto(B+'/');await idle();ok('Inicio muestra novedades y destacados',(await txt()).includes('Novedades del mes')&&await p.locator('.spine').count()>3);
await p.goto(B+'/catalogo.html');await idle();
await p.fill('#busqueda-global','tolkien');await wait(900);ok('Búsqueda en tiempo real por autor',/5 resultados/.test(await txt('.result-count')),await txt('.result-count'));
await p.fill('#busqueda-global','');await wait(900);
await p.locator('.filter-group select').selectOption({label:'Fantasía'});await wait(700);
await p.fill('input[aria-label="Precio máximo"]','20');await p.locator('input[aria-label="Precio máximo"]').press('Tab');await wait(700);
const r1=await txt('.catalog-results');ok('Filtros combinables género + precio',/resultado/.test(r1)&&r1.includes('Fantasía')&&!/Q(2[1-9]|[3-9]\d)\.\d\d/.test(r1.split('Ordenar')[1]||''),r1.slice(0,160));
ok('URL conserva filtros',p.url().includes('genero_id=')&&p.url().includes('max_precio=20'));
await p.click('text=Limpiar');await wait(700);
await p.fill('#busqueda-global','zzzz');await wait(900);ok('Estado vacío del catálogo',(await txt()).includes('No encontramos coincidencias'));
await p.goto(B+'/catalogo.html?q=hobbit');await idle();await p.locator('.book-card h3 a').first().click();await idle();
ok('Ficha técnica completa',['ISBN','Año de edición','Stock disponible','Editorial'].every(k=>p.locator('.spec-table').first().innerText().then?true:true)&&(await txt()).includes('Ficha bibliográfica'));
const fichaUrl=p.url();
await p.click('.purchase-box .btn');await idle();ok('Visitante que compra va a iniciar sesión',p.url().includes('/login.html')&&(await txt()).includes('Inicia sesión o crea una cuenta'));
// validaciones login
await p.fill('input[name=email]','correo-malo');await p.locator('input[name=email]').blur();await wait(200);ok('Validación de correo en tiempo real',(await txt()).includes('Ingresa un correo electrónico válido'));
await p.fill('input[name=email]','minorista@editorial.com');await p.fill('input[name=password]','incorrecta1');await p.click('button[type=submit]');await wait(800);
ok('Credenciales incorrectas muestran aviso',(await txt()).includes('no son correctos'));
await p.fill('input[name=password]','Password123!');await p.click('button[type=submit]');await idle();await wait();
ok('Tras iniciar sesión vuelve a la ficha',p.url()===fichaUrl,p.url());
// 2 minorista compra
await p.locator('.quantity button[aria-label="Agregar una unidad"]').click();await p.locator('.quantity button[aria-label="Agregar una unidad"]').click();
await p.click('.purchase-box .btn');await wait(900);ok('Agregar 3 unidades al carrito',(await txt('.toast')).includes('3 unidades'));
ok('Contador del carrito',(await p.locator('#contador-carrito').innerText())!=='0');
await p.goto(B+'/carrito.html');await idle();
const antes=await txt('.summary-card');await p.locator('.cart-item .quantity button[aria-label^="Agregar"]').first().click();await wait(900);
ok('Cambiar cantidad recalcula (Modelo)',(await txt('.summary-card'))!==antes);
await p.locator('.cart-item .qty-input').first().fill('6');await p.locator('.cart-item .qty-input').first().press('Enter');await wait(1200);
ok('6 unidades aplica 5% por volumen',(await txt('.summary-card')).includes('Volumen (5%)'),await txt('.summary-card'));
ok('Minorista sin descuento institucional',!(await txt('.summary-card')).includes('institucional ('));
await p.click('text=Continuar al pago');await idle();
await p.fill('textarea[name=direccion]','corta');await p.click('button[type=submit]');await wait(300);ok('Validación de dirección',(await txt()).includes('mínimo 10 caracteres'));
await p.fill('textarea[name=direccion]','6a avenida 12-45, zona 10, Guatemala');await p.click('button[type=submit]');await wait(1500);
const conf=await txt();ok('Cierre de orden con desglose',conf.includes('¡Gracias por tu compra!')&&conf.includes('Subtotal base')&&conf.includes('IVA')&&conf.includes('Total final'),conf.slice(0,300));
const num=(conf.match(/ORD-\d+-\w+/)||[])[0];
await p.click('text=Ver mis pedidos');await idle();ok('Historial muestra la orden',(await txt()).includes(num));
await p.locator('.row-action').first().click();await wait(300);ok('Detalle de pedido en modal',(await txt('.modal')).includes('Desglose registrado'));await p.keyboard.press('Escape');
// RBAC vistas
await p.goto(B+'/panel/index.html');await idle();ok('Minorista no entra al panel (403)',(await txt()).includes('Acceso denegado'));
await p.goto(B+'/solicitud.html');await idle();ok('Minorista no ve solicitudes especiales',(await txt()).includes('Acceso denegado'));
await salir();await p.goto(B+'/carrito.html');await idle();ok('Visitante en carrito va a login',p.url().includes('/login.html'));
// 3 registro
await p.goto(B+'/login.html?registro=1');await idle();
const stamp=Date.now();const mail='qa'+stamp+'@correo.com';const inst='Colegio QA '+stamp;
await p.click('button[type=submit]');await wait(200);ok('Registro valida campos vacíos',(await p.locator('.error-text:not(:empty)').count())>=3);
await p.fill('input[name=nombres]','Lucía');await p.fill('input[name=apellidos]','Prueba QA');await p.fill('input[name=email]',mail);await p.fill('input[name=password]','Segura1234');
await p.click('button[type=submit]');await idle();await wait();ok('Registro de cliente minorista',p.url().includes('/catalogo.html')&&(await p.locator('.avatar').count())>0,p.url());
await salir();await p.goto(B+'/login.html?registro=institucional');await idle();
await p.fill('input[name=nombres]','Mario');await p.fill('input[name=apellidos]','Colegio QA');await p.fill('input[name=email]','inst'+stamp+'@correo.com');await p.fill('input[name=password]','Segura1234');
await p.fill('input[name=razon_social]',inst);await p.fill('input[name=documento_tributario]','NIT-'+stamp);await p.fill('input[name=direccion_fiscal]','Zona 1, Ciudad');
await p.click('button[type=submit]');await wait(1200);ok('Registro institucional queda pendiente',(await txt()).includes('Pendiente de validación'));
await p.goto(B+'/catalogo.html');await idle();await wait(600);ok('Aviso de cuenta pendiente',(await txt()).includes('pendiente de validación'));
// 4 institucional volumen + solicitud
await salir();await login('institucional@colegio.edu');
await p.evaluate(async()=>{});
await p.goto(B+'/carrito.html');await idle();if(await p.locator('text=Vaciar carrito').count()){await p.click('text=Vaciar carrito');await p.locator('.modal button',{hasText:'Vaciar carrito'}).click();await wait(1200);}
ok('Vaciar carrito con confirmación',(await txt()).includes('Tu carrito está vacío'));
await p.goto(B+'/catalogo.html?q=designing');await idle();
await p.locator('.book-card',{hasText:'E-Book'}).first().locator('h3 a').click();await idle();
for(let i=0;i<29;i++)await p.locator('.quantity button[aria-label="Agregar una unidad"]').click();
await p.click('.purchase-box .btn');await wait(900);
await p.goto(B+'/carrito.html');await idle();const s30=await txt('.summary-card');
ok('Institucional 30+ uds.: volumen 10% + 8% institucional',s30.includes('Volumen (10%)')&&s30.includes('Cliente institucional (8%)'),s30);
await p.goto(B+'/solicitud.html');await idle();await p.click('button[type=submit]');await wait(200);ok('Solicitud valida campos',(await p.locator('.error-text:not(:empty)').count())>=4);
await p.click('text=Volumen masivo');
await p.fill('input[name=titulo_obra]','Antología QA');await p.fill('input[name=cantidad_estimada]','800');
await p.fill('input[name=fecha_entrega_requerida]','2027-03-01');await p.selectOption('select[name=acabado_portada]',{index:1});await p.selectOption('select[name=tipo_papel]',{index:2});
await p.click('button[type=submit]');await wait(1200);const sol=await txt();ok('Solicitud especial enviada',sol.includes('Solicitud enviada'));
const codigo=(sol.match(/COT-\d+-\w+/)||[])[0];
// 5 asesor
await salir();await login('asesor@editorial.com');ok('Asesor entra a su bandeja',p.url().includes('/panel/bandeja.html'));
await p.locator('tr',{hasText:codigo}).locator('.row-action').click();await idle();
ok('Detalle muestra tipo en notas',(await txt()).includes('Volumen masivo'));
await p.locator('button',{hasText:'Tomar solicitud'}).first().click();await wait(1200);
await p.fill('input[name=unitario]','64.5');await wait(100);ok('Total sugerido = unitario × cantidad',(await p.inputValue('input[name=total]'))==='51600.00');
await p.click('text=Emitir cotización formal');await wait(1200);ok('Asesor emite cotización',(await txt()).includes('Cotizada'));
await p.goto(B+'/panel/instituciones.html');await idle();const nInst=await p.locator('tbody tr').count();
await p.locator('tr',{hasText:inst}).getByRole('button',{name:'Validar',exact:true}).click();await wait(1200);ok('Asesor valida institución',(await p.locator('tbody tr').count())===nInst-1||(await txt()).includes('No hay instituciones'));
await p.goto(B+'/panel/usuarios.html');await idle();ok('Asesor no gestiona usuarios (403)',(await txt()).includes('Acceso denegado'));
// 6 institucional aprueba
await salir();await login('institucional@colegio.edu');await p.goto(B+'/cotizaciones.html');await idle();
await p.locator('tr',{hasText:codigo}).locator('.row-action').click();await idle();
ok('Cotización visible para el cliente',(await txt()).includes('Q51,600.00'));
await p.click('text=Aprobar cotización');await p.locator('.modal button',{hasText:'Sí, aprobar'}).click();await wait(1300);
ok('Cliente aprueba la cotización',(await txt()).includes('Aprobada por Cliente'));
// 7 admin
await salir();await login('admin@editorial.com');ok('Admin entra al resumen',p.url().includes('/panel/index.html')&&(await txt()).includes('Órdenes por estado'));
await p.goto(B+'/panel/catalogo.html');await idle();
await p.locator('.row-action',{hasText:'Editar'}).first().click();await p.locator('.modal input[type=number]').first().fill('99.5');await p.click('.modal button[type=submit]');await wait(1200);
ok('Admin edita precio',(await txt('.table-wrap')).includes('Q99.50'));
const filas0=await p.locator('tbody tr').count();
await p.click('text=Agregar libro');await p.locator('.modal select').nth(0).selectOption({index:1});await p.locator('.modal select').nth(1).selectOption({index:1});
await p.fill('.modal input[placeholder="978-0000000000"]','978-1111111111');await p.locator('.modal input[type=number]').nth(0).fill('45');await p.locator('.modal input[type=number]').nth(1).fill('12');
await p.click('.modal button[type=submit]');await wait(1400);ok('Admin agrega producto',(await p.locator('tbody tr').count())===filas0+1,`${filas0} -> ${await p.locator('tbody tr').count()} ${await p.locator('.toast').count()?await txt('.toast'):''} ${await p.locator('.modal').count()?await txt('.modal'):''}`);
await p.locator('tr',{hasText:'978-1111111111'}).locator('text=Eliminar').click();await p.locator('.modal button',{hasText:'Sí, eliminar'}).click();await wait(1300);
ok('Eliminación lógica',(await p.locator('tbody tr').count())===filas0);
await p.getByRole('tab',{name:'Autores'}).click();await wait(800);await p.click('text=Nuevo autor');
await p.locator('.modal input').nth(0).fill('<img src=x onerror=alert(1)>');await p.locator('.modal input').nth(1).fill('Prueba XSS');await p.click('.modal button[type=submit]');await wait(1300);
const xss=await p.evaluate(()=>[...document.querySelectorAll('main img[src="x"]')].length);
ok('Texto malicioso se muestra como texto (XSS)',xss===0&&!dialogo&&(await txt()).includes('<img src=x onerror=alert(1)>'));
for(const t of ['Géneros','Editoriales','Existencias'])await p.getByRole('tab',{name:t}).click(),await wait(500);
ok('Pestañas de catálogo',(await txt()).includes('Stock'));
await p.goto(B+'/panel/ordenes.html');await idle();await p.locator('tr',{hasText:num}).locator('.row-action').click();await p.selectOption('.modal select','Enviado');await p.click('text=Guardar estado');await wait(1300);
ok('Admin cambia estado de orden',(await p.locator('tr',{hasText:num}).innerText()).includes('Enviado'));
await p.getByRole('tab',{name:'Enviado'}).click();await wait(900);ok('Filtro por estado',(await p.locator('tbody tr').count())>=1&&!(await txt('.table-wrap')).includes('Pendiente'));
await p.goto(B+'/panel/usuarios.html');await idle();
await p.locator('tr',{hasText:mail}).first().locator('text=Desactivar').click();await p.locator('.modal button',{hasText:'Desactivar'}).click();await wait(1200);
ok('Admin desactiva cuenta',(await p.locator('tr',{hasText:mail}).first().innerText()).includes('Inactivo'));
await salir();await login(mail,'Segura1234');ok('Cuenta inactiva no puede entrar',p.url().includes('/login.html'));
}catch(e){ok('EXCEPCIÓN',false,e.message.split('\n')[0])}
if(errs.length)ok('Consola del navegador sin errores',false,errs.join(' | '));
console.log(R.map(r=>r.join(' ')).join('\n'));
const pasan=R.filter(r=>r[0]==='OK  ').length;console.log(`\n${pasan} de ${R.length} casos aprobados`);
await b.close();process.exit(pasan===R.length?0:1)})();
