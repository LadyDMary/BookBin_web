// backend/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const multer = require('multer');

const subida = require('./middleware/subida');
const controladorPublicaciones = require('./controlador/publicaciones_controlador');
const controladorMateriales = require('./controlador/material_controlador');
const controladorUsuario = require('./controlador/usuario_controlador');
const controladorReportes = require('./controlador/reporte_controlador');
const controladorFavoritos = require('./controlador/favorito_controlador');

const app = express();


app.use(express.json());

// Las imágenes subidas se sirven desde /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Creaciones (publicaciones)
app.get('/api/creaciones', controladorPublicaciones.listarCreaciones);
app.get('/api/creaciones/usuario/:idUsuario', controladorPublicaciones.listarCreacionesDeUsuario);
app.get('/api/creaciones/:id', controladorPublicaciones.obtenerCreacion);
app.post('/api/creaciones', subida.single('imagen'), controladorPublicaciones.crearCreacion);
app.put('/api/creaciones/:id', controladorPublicaciones.actualizarCreacion);
app.delete('/api/creaciones/:id', controladorPublicaciones.eliminarCreacion);

// Materiales
app.get('/api/materiales', controladorMateriales.listarMateriales);

// Usuarios
app.post('/api/registrar', controladorUsuario.registrar);
app.post('/api/login', controladorUsuario.iniciarSesion);

//reportes
app.post('/api/creaciones/:id/reportes', controladorReportes.crearReporte);

//favoritos
app.get('/api/creaciones/favoritos/:idUsuario', controladorFavoritos.listarFavoritos);
app.post('/api/creaciones/favoritos', controladorFavoritos.guardarFavorito);
app.delete('/api/creaciones/favoritos', controladorFavoritos.eliminarFavorito);

//Edicion de datos de usuarios
app.put('/api/usuarios/:id', controladorUsuario.actualizarPerfil);

// Errores de la subida de imágenes (tamaño, tipo de archivo)
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});