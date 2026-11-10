// backend/server.js
require('dotenv').config();
const express = require('express');
const controladorPublicaciones = require('./controlador/publicaciones_controlador');
const controladorUsuario = require('./controlador/usuario_controlador');

const app = express();

app.use(express.json());

// Creaciones (publicaciones)
app.get('/api/creaciones', controladorPublicaciones.listarCreaciones);
app.get('/api/creaciones/:id', controladorPublicaciones.obtenerCreacion);
app.post('/api/creaciones', controladorPublicaciones.crearCreacion);
app.put('/api/creaciones/:id', controladorPublicaciones.actualizarCreacion);
app.delete('/api/creaciones/:id', controladorPublicaciones.eliminarCreacion);

// Usuarios
app.post('/api/registrar', controladorUsuario.registrar);
app.post('/api/login', controladorUsuario.iniciarSesion);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});