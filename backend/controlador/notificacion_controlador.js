const Notificacion = require('../Modelo/notificacion_modelo');
const Apelacion = require('../Modelo/apelacion_modelo');
const Creacion = require('../Modelo/publicacion_modelo');
const Verificacion = require('../Modelo/verificacion_modelo');

// GET /api/notificaciones  (las del usuario del token)
async function listar(req, res) {
    try {
        const [lista, apeladas] = await Promise.all([
            Notificacion.listarDeUsuario(req.usuario.id),
            Apelacion.notificacionesApeladas(req.usuario.id),
        ]);
        return res.json(lista.map((n) => ({ ...n, apelada: apeladas.has(n.id_notificacion) })));
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

// POST /api/notificaciones/:id/apelar   body: { motivo }
// El autor apela un rechazo desde su notificación
async function apelar(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Id de notificación no válido.' });
    }

    const motivo = String(req.body.motivo || '').trim();
    if (motivo.length < 10) return res.status(400).json({ error: 'Explica tu motivo (mínimo 10 caracteres).' });
    if (motivo.length > 500) return res.status(400).json({ error: 'El motivo no debe pasar de 500 caracteres.' });

    try {
        const notificacion = await Notificacion.obtenerDeUsuario(id, req.usuario.id);
        if (!notificacion) return res.status(404).json({ error: 'No se encontró la notificación.' });
        if (notificacion.tipo !== 'rechazo' || !notificacion.id_creacion) {
            return res.status(400).json({ error: 'Solo se pueden apelar los rechazos.' });
        }
        if (await Apelacion.yaApelada(id)) {
            return res.status(409).json({ error: 'Ya enviaste una apelación para este rechazo.' });
        }

        const creacion = await Creacion.obtenerCreacion(notificacion.id_creacion);
        if (!creacion || Number(creacion.id_usuario) !== req.usuario.id) {
            return res.status(404).json({ error: 'No se encontró la creación.' });
        }
        // Solo tiene sentido apelar mientras siga rechazada (aún no corregida ni aprobada)
        if (creacion.borrador !== 1 || creacion.aprovado === 1) {
            return res.status(409).json({ error: 'Esta creación ya no está rechazada, no hace falta apelar.' });
        }

        // La apelación se liga al rechazo (fila de dverificacion). Los rechazos hechos antes de existir
        // esa tabla no tienen fila: se crea con la razón guardada en la notificación.
        let verificacion = await Verificacion.ultimaDeCreacion(notificacion.id_creacion);
        if (!verificacion) {
            if (!creacion.id_verificador) {
                return res.status(409).json({ error: 'No se pudo ligar la apelación con el rechazo.' });
            }
            verificacion = await Verificacion.crear({
                idCreacion: notificacion.id_creacion,
                idVerificador: creacion.id_verificador,
                comentario: notificacion.mensaje || 'Rechazo',
            });
        }

        await Apelacion.crearApelacion({
            idCreacion: notificacion.id_creacion,
            idUsuario: req.usuario.id,
            idNotificacion: id,
            idVerificacion: verificacion.id_verificacion,
            contenido: motivo,
        });
        return res.status(201).json({ mensaje: 'Apelación enviada.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo enviar la apelación.' });
    }
}

module.exports = { listar, marcarLeida, apelar };