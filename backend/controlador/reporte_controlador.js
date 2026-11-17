const Reporte = require('../modelo/reporte_modelo');
const Creacion = require('../modelo/publicacion_modelo');
const { validarReporte } = require('../validaciones');

async function crearReporte(req, res) {
    const idCreacion = Number(req.params.id);
    const idUsuario = Number(req.body.id_usuario);
    const motivo = (req.body.motivo || '').toString().trim();
    const detalle = (req.body.detalle || '').toString().trim();

    if (!Number.isInteger(idCreacion) || !Number.isInteger(idUsuario)) {
        return res.status(400).json({ error: 'Datos del reporte no válidos.' });
    }
    const problema = validarReporte({ motivo, detalle });
    if (problema) return res.status(400).json({ error: problema });

    try {
        const creacion = await Creacion.obtenerCreacion(idCreacion);
        if (!creacion) return res.status(404).json({ error: 'No se encontró la creación.' });

        if (await Reporte.yaReporto(idCreacion, idUsuario)) {
            return res.status(409).json({ error: 'Ya reportaste esta creación.' });
        }

        const nuevo = await Reporte.crearReporte({ idCreacion, idUsuario, motivo, detalle });
        return res.status(201).json({ mensaje: 'Reporte enviado', reporte: nuevo });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo enviar el reporte.' });
    }
}

module.exports = { crearReporte };