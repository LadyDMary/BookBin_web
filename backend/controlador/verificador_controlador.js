const Verificador = require('../Modelo/verificador_modelo');

function idValido(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Lee una lista de ids del body: [3, "7", 3] → [3, 7]  (máximo 20 por vez)
function leerIds(valor) {
    if (!Array.isArray(valor)) return [];
    return [...new Set(valor.map(idValido).filter(Boolean))].slice(0, 20);
}

// Respuesta común cuando algo falla en Supabase
function errorServidor(res, error, mensaje) {
    console.error(mensaje, error);
    return res.status(500).json({ error: mensaje });
}

// =====================================================================
// Creaciones (verificador normal)
// =====================================================================

// GET /api/verificador/creaciones  → las libres (inicio)
async function listarPendientes(req, res) {
    try {
        return res.json(await Verificador.listarPendientes());
    } catch (error) {
        return errorServidor(res, error, 'No se pudieron cargar las creaciones.');
    }
}

// GET /api/verificador/mis-creaciones  → las que eligió (Por verificar)
async function listarMisCreaciones(req, res) {
    try {
        return res.json(await Verificador.listarCreacionesAsignadas(req.usuario.id));
    } catch (error) {
        return errorServidor(res, error, 'No se pudieron cargar tus creaciones por verificar.');
    }
}

// POST /api/verificador/creaciones/tomar   body: { ids: [3, 7] }
async function tomarCreaciones(req, res) {
    const ids = leerIds(req.body.ids);
    if (ids.length === 0) return res.status(400).json({ error: 'Selecciona al menos una creación.' });

    try {
        const tomadas = await Verificador.tomarCreaciones(ids, req.usuario.id);
        // Si otro verificador ganó alguna, se avisa cuántas no se pudieron tomar
        return res.json({ tomadas, noDisponibles: ids.length - tomadas.length });
    } catch (error) {
        return errorServidor(res, error, 'No se pudieron tomar las creaciones.');
    }
}

// POST /api/verificador/creaciones/:id/soltar
async function soltarCreacion(req, res) {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id de creación no válido.' });

    try {
        const ok = await Verificador.soltarCreacion(id, req.usuario.id);
        if (!ok) return res.status(404).json({ error: 'Esa creación no está en tu lista.' });
        return res.json({ mensaje: 'La creación regresó al inicio.' });
    } catch (error) {
        return errorServidor(res, error, 'No se pudo soltar la creación.');
    }
}

// =====================================================================
// Decisiones: aprobar, rechazar y banear
// Solo quien tiene asignada la creación (o su reporte / apelación) puede decidir
// =====================================================================

async function revisarPermiso(req, res) {
    const idCreacion = idValido(req.params.id);
    if (!idCreacion) {
        res.status(400).json({ error: 'Id de creación no válido.' });
        return null;
    }
    const permitido = await Verificador.puedeDecidir(idCreacion, req.usuario.id, req.usuario.tipo);
    if (!permitido) {
        res.status(403).json({ error: 'Primero elige esta creación desde el inicio.' });
        return null;
    }
    return idCreacion;
}

function leerRazon(req, res, accion) {
    const razon = String(req.body.razon || '').trim();
    if (!razon) {
        res.status(400).json({ error: `Escribe la razón del ${accion}.` });
        return null;
    }
    if (razon.length > 500) {
        res.status(400).json({ error: 'La razón no debe pasar de 500 caracteres.' });
        return null;
    }
    return razon;
}

// POST /api/verificador/creaciones/:id/aprobar
async function aprobar(req, res) {
    try {
        const idCreacion = await revisarPermiso(req, res);
        if (!idCreacion) return;

        const ok = await Verificador.aprobarCreacion(idCreacion, req.usuario.id);
        if (!ok) return res.status(404).json({ error: 'No se encontró la creación.' });
        return res.json({ mensaje: 'Creación aprobada.' });
    } catch (error) {
        return errorServidor(res, error, 'No se pudo aprobar la creación.');
    }
}

// POST /api/verificador/creaciones/:id/baneado   body: { razon }
async function banear(req, res) {
    try {
        const razon = leerRazon(req, res, 'baneo');
        if (!razon) return;
        const idCreacion = await revisarPermiso(req, res);
        if (!idCreacion) return;

        const ok = await Verificador.banearCreacion(idCreacion, req.usuario.id, razon);
        if (!ok) return res.status(404).json({ error: 'No se encontró la creación.' });
        return res.json({ mensaje: 'Creación baneada.' });
    } catch (error) {
        return errorServidor(res, error, 'No se pudo banear la creación.');
    }
}

// POST /api/verificador/creaciones/:id/rechazar   body: { razon }
async function rechazar(req, res) {
    try {
        const razon = leerRazon(req, res, 'rechazo');
        if (!razon) return;
        const idCreacion = await revisarPermiso(req, res);
        if (!idCreacion) return;

        const ok = await Verificador.rechazarCreacion(idCreacion, req.usuario.id, razon);
        if (!ok) return res.status(404).json({ error: 'No se encontró la creación.' });
        return res.json({ mensaje: 'Creación rechazada.' });
    } catch (error) {
        return errorServidor(res, error, 'No se pudo rechazar la creación.');
    }
}

// =====================================================================
// Líder: reportes y apelaciones
// =====================================================================

// GET /api/verificador/reportes  → libres, uno por creación
async function listarReportes(req, res) {
    try {
        return res.json(await Verificador.listarReportes());
    } catch (error) {
        return errorServidor(res, error, 'No se pudieron cargar los reportes.');
    }
}

// GET /api/verificador/creaciones/:id/reporte
async function obtenerReporte(req, res) {
    try {
        const idCreacion = idValido(req.params.id);
        if (!idCreacion) return res.status(400).json({ error: 'Id de creación no válido.' });

        const reporte = await Verificador.obtenerReportePendiente(idCreacion);
        if (!reporte) return res.status(404).json({ error: 'Esta creación no tiene reportes pendientes.' });

        const contenido = [reporte.motivo, reporte.detalle].filter(Boolean).join(': ');
        return res.json({ ...reporte, contenido });
    } catch (error) {
        return errorServidor(res, error, 'No se pudo cargar el reporte.');
    }
}

// GET /api/verificador/apelaciones  → libres
async function listarApelaciones(req, res) {
    try {
        return res.json(await Verificador.listarApelaciones());
    } catch (error) {
        return errorServidor(res, error, 'No se pudieron cargar las apelaciones.');
    }
}

// GET /api/verificador/apelaciones/:id  → solo si la eligió este líder
async function obtenerApelacion(req, res) {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id de apelación no válido.' });

    try {
        const apelacion = await Verificador.obtenerApelacion(id, req.usuario.id);
        if (!apelacion) return res.status(404).json({ error: 'Esa apelación no está en tu lista.' });
        return res.json(apelacion);
    } catch (error) {
        return errorServidor(res, error, 'No se pudo cargar la apelación.');
    }
}

// POST /api/verificador/apelaciones/:id/mantener
async function mantenerApelacion(req, res) {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id de apelación no válido.' });

    try {
        const ok = await Verificador.mantenerApelacion(id, req.usuario.id);
        if (!ok) return res.status(404).json({ error: 'Esa apelación no está en tu lista.' });
        return res.json({ mensaje: 'Se mantuvo el rechazo.' });
    } catch (error) {
        return errorServidor(res, error, 'No se pudo cerrar la apelación.');
    }
}

// POST /api/verificador/tomar   body: { reportes: [idCreacion...], apelaciones: [idApelacion...] }
async function tomarRevision(req, res) {
    const reportes = leerIds(req.body.reportes);
    const apelaciones = leerIds(req.body.apelaciones);
    if (reportes.length + apelaciones.length === 0) {
        return res.status(400).json({ error: 'Selecciona al menos un reporte o una apelación.' });
    }

    try {
        const [reportesTomados, apelacionesTomadas] = await Promise.all([
            reportes.length ? Verificador.tomarReportes(reportes, req.usuario.id) : [],
            apelaciones.length ? Verificador.tomarApelaciones(apelaciones, req.usuario.id) : [],
        ]);
        const noDisponibles =
            reportes.length - reportesTomados.length + apelaciones.length - apelacionesTomadas.length;
        return res.json({ reportes: reportesTomados, apelaciones: apelacionesTomadas, noDisponibles });
    } catch (error) {
        return errorServidor(res, error, 'No se pudieron tomar los pendientes.');
    }
}

// GET /api/verificador/por-revisar
async function listarPorRevisar(req, res) {
    try {
        return res.json(await Verificador.listarPorRevisar(req.usuario.id));
    } catch (error) {
        return errorServidor(res, error, 'No se pudo cargar tu lista por revisar.');
    }
}

// POST /api/verificador/reportes/:idCreacion/soltar
async function soltarReportes(req, res) {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id de creación no válido.' });

    try {
        const ok = await Verificador.soltarReportes(id, req.usuario.id);
        if (!ok) return res.status(404).json({ error: 'Ese reporte no está en tu lista.' });
        return res.json({ mensaje: 'El reporte regresó al inicio.' });
    } catch (error) {
        return errorServidor(res, error, 'No se pudo soltar el reporte.');
    }
}

// POST /api/verificador/apelaciones/:id/soltar
async function soltarApelacion(req, res) {
    const id = idValido(req.params.id);
    if (!id) return res.status(400).json({ error: 'Id de apelación no válido.' });

    try {
        const ok = await Verificador.soltarApelacion(id, req.usuario.id);
        if (!ok) return res.status(404).json({ error: 'Esa apelación no está en tu lista.' });
        return res.json({ mensaje: 'La apelación regresó al inicio.' });
    } catch (error) {
        return errorServidor(res, error, 'No se pudo soltar la apelación.');
    }
}

module.exports = {
    listarPendientes,
    listarMisCreaciones,
    tomarCreaciones,
    soltarCreacion,
    aprobar,
    banear,
    rechazar,
    listarReportes,
    obtenerReporte,
    listarApelaciones,
    obtenerApelacion,
    mantenerApelacion,
    tomarRevision,
    listarPorRevisar,
    soltarReportes,
    soltarApelacion,
};
