const Notificacion = require('../Modelo/notificacion_modelo');

// GET /api/notificaciones  (las del usuario del token)
async function listar(req, res) {
    try {
        return res.json(await Notificacion.listarDeUsuario(req.usuario.id));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudieron cargar las notificaciones.' });
    }
}

// PUT /api/notificaciones/:id/leida
async function marcarLeida(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Id de notificación no válido.' });
    }

    try {
        const ok = await Notificacion.marcarLeida(id, req.usuario.id);
        if (!ok) return res.status(404).json({ error: 'No se encontró la notificación.' });
        return res.json({ mensaje: 'Notificación leída.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo actualizar la notificación.' });
    }
}

module.exports = { listar, marcarLeida };