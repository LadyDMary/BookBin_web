const Verificador = require('../Modelo/verificador_modelo');

function idValido(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/verificador/creaciones
async function listarPendientes(req, res) {
    try {
        return res.json(await Verificador.listarPendientes());
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudieron cargar las creaciones.' });
    }
}

// GET /api/verificador/creaciones/:id/reporte
async function obtenerReporte(req, res) {
    try {
        const idCreacion = idValido(req.params.id);
        if (!idCreacion) return res.status(400).json({ error: 'Id de creación no válido.' });

        const reporte = await Verificador.obtenerReportePendiente(idCreacion);
        if (!reporte) return res.status(404).json({ error: 'Esta creación no tiene reportes pendientes.' });

        // El front muestra "contenido": se arma con motivo + detalle
        const contenido = [reporte.motivo, reporte.detalle].filter(Boolean).join(': ');
        return res.json({ ...reporte, contenido });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo cargar el reporte.' });
    }
}

// POST /api/verificador/creaciones/:id/aprobar
async function aprobar(req, res) {
    try {
        const idCreacion = idValido(req.params.id);
        if (!idCreacion) return res.status(400).json({ error: 'Id de creación no válido.' });

        const ok = await Verificador.aprobarCreacion(idCreacion, req.body.id_verificador);
        if (!ok) return res.status(404).json({ error: 'No se encontró la creación.' });

        return res.json({ mensaje: 'Creación aprobada.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo aprobar la creación.' });
    }
}

// POST /api/verificador/creaciones/:id/baneado   body: { razon }
async function banear(req, res) {
    try {
        const idCreacion = idValido(req.params.id);
        if (!idCreacion) return res.status(400).json({ error: 'Id de creación no válido.' });

        const razon = String(req.body.razon || '').trim();
        if (!razon) return res.status(400).json({ error: 'Escribe la razón del baneo.' });
        if (razon.length > 500) return res.status(400).json({ error: 'La razón no debe pasar de 500 caracteres.' });

        const ok = await Verificador.banearCreacion(idCreacion, req.body.id_verificador, razon);
        if (!ok) return res.status(404).json({ error: 'No se encontró la creación.' });

        return res.json({ mensaje: 'Creación baneada.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo banear la creación.' });
    }
}

// POST /api/verificador/creaciones/:id/rechazar   body: { razon }
async function rechazar(req, res) {
    try {
        const idCreacion = idValido(req.params.id);
        if (!idCreacion) return res.status(400).json({ error: 'Id de creación no válido.' });

        const razon = String(req.body.razon || '').trim();
        if (!razon) return res.status(400).json({ error: 'Escribe la razón del rechazo.' });
        if (razon.length > 500) return res.status(400).json({ error: 'La razón no debe pasar de 500 caracteres.' });

        const ok = await Verificador.rechazarCreacion(idCreacion, req.body.id_verificador, razon);
        if (!ok) return res.status(404).json({ error: 'No se encontró la creación.' });

        return res.json({ mensaje: 'Creación rechazada.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo rechazar la creación.' });
    }
}

// POST /api/verificador/creaciones/:id/descartar
async function descartar(req, res) {
    try {
        const idCreacion = idValido(req.params.id);
        if (!idCreacion) return res.status(400).json({ error: 'Id de creación no válido.' });

        const ok = await Verificador.descartarReportes(idCreacion);
        if (!ok) return res.status(404).json({ error: 'No se encontró la creación.' });

        return res.json({ mensaje: 'Reportes descartados.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudieron descartar los reportes.' });
    }
}

// GET /api/verificador/reportes
async function listarReportes(req, res) {
    try {
        return res.json(await Verificador.listarReportes());
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudieron cargar los reportes.' });
    }
}

// GET /api/verificador/apelaciones/:id (solo líder)
async function obtenerApelacion(req, res) {
    try {
        const id = idValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'Id de apelación no válido.' });

        const apelacion = await Verificador.obtenerApelacion(id);
        if (!apelacion) return res.status(404).json({ error: 'No se encontró la apelación.' });
        return res.json(apelacion);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo cargar la apelación.' });
    }
}

// POST /api/verificador/apelaciones/:id/mantener (solo líder): el rechazo se queda como está
async function mantenerRechazo(req, res) {
    try {
        const id = idValido(req.params.id);
        if (!id) return res.status(400).json({ error: 'Id de apelación no válido.' });

        const ok = await Verificador.mantenerRechazo(id);
        if (!ok) return res.status(404).json({ error: 'No se encontró la apelación pendiente.' });
        return res.json({ mensaje: 'Apelación resuelta: se mantiene el rechazo.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo resolver la apelación.' });
    }
}

// GET /api/verificador/apelaciones (solo líder)
async function listarApelaciones(req, res) {
    try {
        return res.json(await Verificador.listarApelaciones());
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudieron cargar las apelaciones.' });
    }
}

module.exports = { obtenerApelacion, mantenerRechazo, descartar, listarReportes, listarPendientes, obtenerReporte, aprobar, banear, rechazar, listarApelaciones };