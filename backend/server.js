const express = require('express');
const app = express();

app.use(express.json());

const PORT = 4000;

app.get('/saludo', (req, res) => {
    res.json({mensaje: 'Prueba de GET'});
});

