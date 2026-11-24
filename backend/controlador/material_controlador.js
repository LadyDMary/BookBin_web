const MaterialModelo = require('../Modelo/material_modelo');

async function listarMateriales(req, res) {
    try {
        const materiales = await MaterialModelo.obtenerMateriales();
        return res.json(materiales);
    } catch (error) {
        console.error('Error al listar materiales:', error);
        return res.status(500).json({ error: 'No se pudieron cargar los materiales' });
    }
}

module.exports = { listarMateriales };