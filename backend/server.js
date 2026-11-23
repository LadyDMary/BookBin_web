// backend/server.js
// Punto de entrada del backend: configura Express, las sesiones y todas las rutas de la API.

// Lee las variables del archivo .env (claves de Supabase, SESSION_SECRET, JWT_SECRET, etc.)
require('dotenv').config();
const path = require('path');
const express = require('express');
const multer = require('multer');
const session = require('express-session');

// Middleware para recibir la imagen de una creación (la deja en memoria para subirla a Supabase Storage)
const subida = require('./middleware/subida');

// Almacén propio: guarda las sesiones en la tabla "sesiones" de Supabase
// (hace lo mismo que el MySQLStore que vimos en clase, pero para Postgres)
const { AlmacenSesionesSupabase } = require('./almacen_sesiones');

// Autenticación con sesiones + JWT
//  - NOMBRE_COOKIE: nombre de la cookie de sesión en el navegador
//  - requiereJWT: exige un token válido, no revocado y de la misma cuenta que la sesión (si no, 401)
//  - requiereTipo: exige un tipo de cuenta (usuario, administrador...) (si no, 403)
//  - fijarIdDelToken: cambia el id que mande el navegador por el del token (nadie actúa a nombre de otro)
//  - soloSuPropioId: en rutas con :id, solo deja usar tu propio id (si no, 403)
//  - refrescarToken: entrega un JWT nuevo si la sesión sigue activa
//  - cerrarSesion: destruye la sesión y manda el JWT a la lista negra
const {
    NOMBRE_COOKIE,
    requiereJWT,
    requiereTipo,
    fijarIdDelToken,
    soloSuPropioId,
    refrescarToken,
    cerrarSesion,
    identificarOpcional,
} = require('./middleware/autenticacion');

// Controladores: la lógica de cada parte de la aplicación
const controladorPublicaciones = require('./controlador/publicaciones_controlador');
const controladorMateriales = require('./controlador/material_controlador');
const controladorHerramientas = require('./controlador/herramienta_controlador');
const controladorUsuario = require('./controlador/usuario_controlador');
const controladorReportes = require('./controlador/reporte_controlador');
const controladorFavoritos = require('./controlador/favorito_controlador');
const controladorVerificador = require('./controlador/verificador_controlador');
const controladorNotificaciones = require('./controlador/notificacion_controlador');


// Grupos de protección que se repiten en varias rutas
const soloUsuarios = [requiereJWT, requiereTipo('usuario')];
const soloAdmin = [requiereJWT, requiereTipo('administrador')];
const soloVerificadores = [requiereJWT, requiereTipo('verificador', 'verificador_lider')];
const soloLider = [requiereJWT, requiereTipo('verificador_lider')];

const app = express();

// Permite leer el cuerpo de las peticiones en formato JSON (req.body)
app.use(express.json());

// ---------- Sesiones ----------
// Cada navegador recibe una cookie httpOnly con el id de su sesión;
// los datos de la sesión (quién inició sesión) se guardan en la tabla "sesiones".
app.use(session({
    name: NOMBRE_COOKIE,
    secret: process.env.SESSION_SECRET, // firma la cookie para que no se pueda falsificar
    store: new AlmacenSesionesSupabase(),
    resave: false,             // no vuelve a guardar la sesión si no cambió
    saveUninitialized: false,  // no crea sesiones vacías para visitantes que no iniciaron sesión
    rolling: true,             // cada petición reinicia el tiempo: vence por inactividad
    cookie: {
        httpOnly: true,        // el JavaScript de la página no puede leer la cookie
        sameSite: 'lax',       // la cookie no viaja en peticiones POST desde otros sitios
        secure: process.env.NODE_ENV === 'production', // solo por HTTPS cuando esté publicado
        maxAge: 1000 * 60 * 60 * 24, // 1 día
    },
}));

// Imágenes viejas guardadas en la carpeta uploads (las nuevas ya están en Supabase Storage)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Sesión: renovar token y cerrar sesión ----------
// El JWT dura poco (JWT_EXPIRA); cuando expira, el front pide uno nuevo aquí usando la cookie de sesión
app.post('/api/refresh', refrescarToken);
// Destruye la sesión, borra la cookie y revoca el JWT (queda en la tabla tokens_revocados)
app.post('/api/logout', cerrarSesion);

// ---------- Usuarios (públicas: aún no hay sesión) ----------
app.post('/api/registrar', controladorUsuario.registrar);
// Busca la cuenta (administrador, verificador o usuario), crea la sesión y regresa el JWT
app.post('/api/login', controladorUsuario.iniciarSesion);

// Editar tu perfil: solo tu propia cuenta
app.put('/api/usuarios/:id', ...soloUsuarios, soloSuPropioId('id'), controladorUsuario.actualizarPerfil);

// ---------- Creaciones (publicaciones) ----------
// Públicas: cualquiera puede ver y buscar creaciones (?q=texto&material=id)
app.get('/api/creaciones', controladorPublicaciones.listarCreaciones);
app.get('/api/creaciones/usuario/:idUsuario', controladorPublicaciones.listarCreacionesDeUsuario);
app.get('/api/creaciones/:id', identificarOpcional, controladorPublicaciones.obtenerCreacion);

// Protegidas: el id del autor sale del token, no de lo que mande el navegador.
// En las rutas con imagen, fijarIdDelToken va DESPUÉS de subida.single(), que es quien llena req.body.
app.post('/api/creaciones', ...soloUsuarios, subida.single('imagen'), fijarIdDelToken('id_usuario'), controladorPublicaciones.crearCreacion);
app.put('/api/creaciones/:id', ...soloUsuarios, subida.single('imagen'), fijarIdDelToken('id_usuario'), controladorPublicaciones.actualizarCreacion);
app.delete('/api/creaciones/:id', ...soloUsuarios, fijarIdDelToken('id_usuario'), controladorPublicaciones.eliminarCreacion);

// ---------- Catálogos (públicos) ----------
app.get('/api/materiales', controladorMateriales.listarMateriales);
app.get('/api/herramientas', controladorHerramientas.listarHerramientas);

// ---------- Reportes ----------
// Solo usuarios con sesión pueden reportar; el reporte queda a su nombre
app.post('/api/creaciones/:id/reportes', ...soloUsuarios, fijarIdDelToken('id_usuario'), controladorReportes.crearReporte);

// ---------- Notificaciones ----------
// Cada usuario solo ve y marca las suyas (por ejemplo, la razón de un rechazo)
app.get('/api/notificaciones', ...soloUsuarios, controladorNotificaciones.listar);
app.put('/api/notificaciones/:id/leida', ...soloUsuarios, controladorNotificaciones.marcarLeida);

// ---------- Favoritos ----------
// Solo puedes ver tus propios favoritos y guardar/quitar a tu nombre
app.get('/api/favoritos/:idUsuario', ...soloUsuarios, soloSuPropioId('idUsuario'), controladorFavoritos.listarFavoritos);
app.post('/api/favoritos', ...soloUsuarios, fijarIdDelToken('id_usuarios'), controladorFavoritos.guardarFavorito);
app.delete('/api/favoritos', ...soloUsuarios, fijarIdDelToken('id_usuarios'), controladorFavoritos.eliminarFavorito);

// ---------- Administrador: gestión de verificadores ----------
// Solo cuentas de tipo administrador; al crear, el verificador queda ligado al admin del token
app.post('/api/admin/verificadores', ...soloAdmin, fijarIdDelToken('id_administrador'), controladorUsuario.registrarVerificador);
app.get('/api/admin/verificadores', ...soloAdmin, controladorUsuario.listarVerificadores);
app.put('/api/admin/verificadores/:id', ...soloAdmin, controladorUsuario.modificarVerificador);
app.delete('/api/admin/verificadores/:id', ...soloAdmin, controladorUsuario.eliminarVerificador);

// ---------- Verificadores ----------
app.get('/api/verificador/creaciones', ...soloVerificadores, controladorVerificador.listarPendientes);
app.get('/api/verificador/reportes', ...soloVerificadores, controladorVerificador.listarReportes);
app.get('/api/verificador/creaciones/:id/reporte', ...soloVerificadores, controladorVerificador.obtenerReporte);
app.post('/api/verificador/creaciones/:id/aprobar', ...soloVerificadores, fijarIdDelToken('id_verificador'), controladorVerificador.aprobar);
app.post('/api/verificador/creaciones/:id/baneado', ...soloVerificadores, fijarIdDelToken('id_verificador'), controladorVerificador.banear);
app.post('/api/verificador/creaciones/:id/rechazar', ...soloVerificadores, fijarIdDelToken('id_verificador'), controladorVerificador.rechazar);

// Solo el líder (por ejemplo, apelaciones)
app.get('/api/verificador/apelaciones', ...soloLider, controladorVerificador.listarApelaciones);

// ---------- Manejo de errores ----------
// Errores de la subida de imágenes (tamaño, tipo de archivo) y cualquier otro error inesperado
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const mensaje = err.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen no debe pesar más de 2 MB.'
            : 'No se pudo subir la imagen.';
        return res.status(400).json({ error: mensaje });
    }
    if (err && err.message && err.message.startsWith('Solo se permiten')) {
        return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

// ---------- Arranque ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});