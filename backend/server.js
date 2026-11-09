const express = require('express');
const controlador = require('./controlador/controlador_publicaciones');

const app = express();
app.use(express.json()); // sin esto, req.body llega vacío

app.get('/api/creaciones', controlador.listarCreaciones);
app.get('/api/creaciones/:id', controlador.obtenerCreacion);
app.post('/api/creaciones', controlador.crearCreacion);
app.put('/api/creaciones/:id', controlador.actualizarCreacion);
app.delete('/api/creaciones/:id', controlador.eliminarCreacion);