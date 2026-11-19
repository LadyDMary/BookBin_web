const HerramientaModelo = require('../Modelo/herramienta_modelo');

async function listarHerramientas(req, res) {
    try {
        const herramientas = await HerramientaModelo.obtenerHerramientas();
        return res.json(herramientas);
    } catch (error) {
        console.error('Error al listar herramientas:', error);
        return res.status(500).json({ error: 'No se pudieron cargar las herramientas' });
    }
}

module.exports = { listarHerramientas };
