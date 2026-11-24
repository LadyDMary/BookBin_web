const Apelacion = require('../Modelo/apelacion_modelo');

// POST /api/notificaciones/:id/apelar   body: { motivo }
async function apelar(req, res) {
    const idNotificacion = Number(req.params.id);
    if (!Number.isInteger(idNotificacion) || idNotificacion <= 0) {
        return res.status(400).json({ error: 'Id de notificación no válido.' });
    }

    const motivo = String(req.body.motivo || '').trim();
    if (motivo.length < 10 || motivo.length > 500) {
        return res.status(400).json({ error: 'Explica el motivo en 10 a 500 caracteres.' });
    }

    try {
        const resultado = await Apelacion.crearApelacion({
            idNotificacion,
            idUsuario: req.usuario.id,
            motivo,
        });
        if (resultado.error) return res.status(resultado.estado).json({ error: resultado.error });
        return res.status(201).json({ mensaje: 'Apelación enviada.' });
    } catch (error) {
        console.error('Error al apelar:', error);
        return res.status(500).json({ error: 'No se pudo enviar la apelación.' });
    }
}

module.exports = { apelar };
