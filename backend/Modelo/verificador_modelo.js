const supabase = require('../bd-supabase');
const Notificaciones = require('./notificacion_modelo');
const Apelaciones = require('./apelacion_modelo');
const Verificaciones = require('./verificacion_modelo');

// =====================================================================
// Cómo funciona la asignación
//  - Cada creación, reporte y apelación tiene id_verificador_asignado.
//  - null  → está libre y aparece en el inicio para que alguien la elija.
//  - un id → ya la eligió ese verificador; solo aparece en su "Por verificar"
//            (o "Por revisar" si es líder) y nadie más la puede decidir.
//  - Al tomar se usa un solo UPDATE ... WHERE id_verificador_asignado IS NULL:
//    si dos verificadores eligen la misma al mismo tiempo, solo uno se la queda.
// =====================================================================

const SIN_ASIGNAR = { id_verificador_asignado: null, asignado_en: null };

// ---------------------------------------------------------------------
// Creaciones (verificador normal)
// ---------------------------------------------------------------------

// Solo las publicadas sin aprobar (incluye las rechazadas que el autor ya corrigió y reenvió).
// Una rechazada sin corregir queda como borrador (borrador = 1), así que no aparece hasta que se corrija.
function consultaPendientes() {
    return supabase
        .from('mcreacion')
        .select('id_creacion, nombre, descripcion, imagen, id_usuario, aprovado, veces_rechazada, corregida, asignado_en, musuarios (nombre)')
        .eq('activo', 1)
        .eq('aprovado', 0)
        .eq('borrador', 0)
        // Nunca rechazadas, o rechazadas que el autor ya corrigió (corregida = 1)
        .or('veces_rechazada.is.null,veces_rechazada.eq.0,corregida.eq.1')
        .order('id_creacion', { ascending: true });
}

// Inicio: las que nadie ha elegido
async function listarPendientes() {
    const { data, error } = await consultaPendientes().is('id_verificador_asignado', null);
    if (error) throw error;
    return data;
}

// "Por verificar": las que eligió este verificador
async function listarCreacionesAsignadas(idVerificador) {
    const { data, error } = await consultaPendientes().eq('id_verificador_asignado', idVerificador);
    if (error) throw error;
    return data;
}

// Se queda con las que sigan libres; regresa los ids que sí logró tomar
async function tomarCreaciones(ids, idVerificador) {
    const { data, error } = await supabase
        .from('mcreacion')
        .update({ id_verificador_asignado: idVerificador, asignado_en: new Date().toISOString() })
        .in('id_creacion', ids)
        .is('id_verificador_asignado', null)
        .eq('activo', 1)
        .eq('aprovado', 0)
        .eq('borrador', 0)
        .select('id_creacion');

    if (error) throw error;
    return data.map((c) => c.id_creacion);
}

// La regresa al inicio para que otro la elija
async function soltarCreacion(idCreacion, idVerificador) {
    const { data, error } = await supabase
        .from('mcreacion')
        .update(SIN_ASIGNAR)
        .eq('id_creacion', idCreacion)
        .eq('id_verificador_asignado', idVerificador)
        .select('id_creacion')
        .maybeSingle();

    if (error) throw error;
    return Boolean(data);
}

// ¿Este verificador puede decidir sobre esta creación?
//  - verificador normal: si la creación está asignada a él
//  - líder: si tiene asignado un reporte o una apelación pendiente de esa creación
async function puedeDecidir(idCreacion, idVerificador, tipo) {
    if (tipo === 'verificador_lider') {
        const [reportes, tieneApelacion] = await Promise.all([
            supabase.from('mreportes').select('id_reporte', { count: 'exact', head: true })
                .eq('id_creacion', idCreacion).eq('estado', 'pendiente')
                .eq('id_verificador_asignado', idVerificador),
            Apelaciones.tieneAsignadaDeCreacion(idCreacion, idVerificador),
        ]);
        if (reportes.error) throw reportes.error;
        return reportes.count > 0 || tieneApelacion;
    }

    const { data, error } = await supabase
        .from('mcreacion')
        .select('id_creacion')
        .eq('id_creacion', idCreacion)
        .eq('id_verificador_asignado', idVerificador)
        .maybeSingle();

    if (error) throw error;
    return Boolean(data);
}

async function obtenerCreacionActiva(idCreacion) {
    const { data, error } = await supabase
        .from('mcreacion')
        .select('id_creacion, aprovado, activo')
        .eq('id_creacion', idCreacion)
        .eq('activo', 1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

// ---------------------------------------------------------------------
// Decisiones (las usan ambos tipos de verificador)
// Todas liberan la creación y cierran sus reportes y apelaciones
// ---------------------------------------------------------------------

async function aprobarCreacion(idCreacion, idVerificador) {
    const { data, error } = await supabase
        .from('mcreacion')
        .update({ aprovado: 1, borrador: 0, id_verificador: idVerificador, ...SIN_ASIGNAR })
        .eq('id_creacion', idCreacion)
        .eq('activo', 1)
        .select('id_creacion, nombre, id_usuario')
        .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    await Notificaciones.crearNotificacion({
        idUsuario: data.id_usuario,
        idCreacion: data.id_creacion,
        tipo: 'aprobacion',
        titulo: `Tu creación "${data.nombre}" fue aprobada`,
        mensaje: 'Ya está publicada y cualquier usuario puede verla.',
    });
    await Apelaciones.cerrarDeCreacion(idCreacion);
    await cerrarReportes(idCreacion);
    return true;
}

// Banea: borrado lógico (activo = 0) y guarda la razón y quién lo hizo
async function banearCreacion(idCreacion, idVerificador, razon) {
    const { data, error } = await supabase
        .from('mcreacion')
        .update({ activo: 0, aprovado: 0, id_verificador: idVerificador, razon_baneo: razon, ...SIN_ASIGNAR })
        .eq('id_creacion', idCreacion)
        .eq('activo', 1)
        .select('id_creacion, nombre, id_usuario')
        .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    // El autor recibe una notificación de baneo (sin opción de corregir ni apelar)
    await Notificaciones.crearNotificacion({
        idUsuario: data.id_usuario,
        idCreacion: data.id_creacion,
        tipo: 'baneo',
        titulo: `Tu creación "${data.nombre}" fue baneada`,
        mensaje: razon,
    });
    await Apelaciones.cerrarDeCreacion(idCreacion);
    await cerrarReportes(idCreacion);
    return true;
}

// Rechaza: vuelve a borrador para que el autor la corrija y se libera.
// Cuando el autor la corrija, vuelve a aparecer en el inicio para cualquiera.
async function rechazarCreacion(idCreacion, idVerificador, razon) {
    const { data: actual, error: errorLeer } = await supabase
        .from('mcreacion')
        .select('veces_rechazada')
        .eq('id_creacion', idCreacion)
        .eq('activo', 1)
        .maybeSingle();

    if (errorLeer) throw errorLeer;
    if (!actual) return false;

    // Cuenta el rechazo y reinicia "corregida": el autor debe volver a corregirla
    const { data, error } = await supabase
        .from('mcreacion')
        .update({
            borrador: 1,
            aprovado: 0,
            id_verificador: idVerificador,
            veces_rechazada: (actual.veces_rechazada || 0) + 1,
            corregida: 0,
            ...SIN_ASIGNAR,
        })
        .eq('id_creacion', idCreacion)
        .eq('activo', 1)
        .select('id_creacion, nombre, id_usuario')
        .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    // Cada rechazo queda registrado en dverificacion (la apelación se liga a esa fila)
    await Verificaciones.crear({ idCreacion, idVerificador, comentario: razon });

    await Notificaciones.crearNotificacion({
        idUsuario: data.id_usuario,
        idCreacion: data.id_creacion,
        titulo: `Tu creación "${data.nombre}" fue rechazada`,
        mensaje: razon,
    });
    await Apelaciones.cerrarDeCreacion(idCreacion);
    await cerrarReportes(idCreacion);
    return true;
}

async function cerrarReportes(idCreacion) {
    const { error } = await supabase
        .from('mreportes')
        .update({ estado: 'resuelto', ...SIN_ASIGNAR })
        .eq('id_creacion', idCreacion)
        .eq('estado', 'pendiente');

    if (error) throw error;
}

// Descarta los reportes pendientes: la creación se queda como está (sin avisar al autor)
async function descartarReportes(idCreacion) {
    const creacion = await obtenerCreacionActiva(idCreacion);
    if (!creacion) return false;

    await cerrarReportes(idCreacion);
    return true;
}

// ---------------------------------------------------------------------
// Reportes (solo líder). Se agrupan por creación: si 3 personas reportan
// la misma creación, el líder ve una sola fila con "3 reportes".
// ---------------------------------------------------------------------

// Reporte pendiente más reciente de una creación (con el nombre de quien reportó)
async function obtenerReportePendiente(idCreacion) {
    const { data, error } = await supabase
        .from('mreportes')
        .select('*, musuarios (nombre)')
        .eq('id_creacion', idCreacion)
        .eq('estado', 'pendiente')
        .order('id_reporte', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

function agruparPorCreacion(reportes) {
    const grupos = new Map();
    for (const r of reportes) {
        if (!r.mcreacion || r.mcreacion.activo !== 1) continue;
        const grupo = grupos.get(r.id_creacion);
        if (grupo) {
            grupo.total += 1;
            if (!grupo.motivos.includes(r.motivo)) grupo.motivos.push(r.motivo);
        } else {
            grupos.set(r.id_creacion, {
                tipo: 'reporte',
                id_creacion: r.id_creacion,
                mcreacion: r.mcreacion,
                motivo: r.motivo,
                detalle: r.detalle,
                motivos: [r.motivo],
                musuarios: r.musuarios,
                total: 1,
            });
        }
    }
    return [...grupos.values()];
}

function consultaReportes() {
    return supabase
        .from('mreportes')
        .select('id_reporte, id_creacion, motivo, detalle, musuarios (nombre), mcreacion (nombre, imagen, activo)')
        .eq('estado', 'pendiente')
        .order('id_reporte', { ascending: true });
}

// Inicio del líder: reportes que nadie ha elegido
async function listarReportes() {
    const { data, error } = await consultaReportes().is('id_verificador_asignado', null);
    if (error) throw error;
    return agruparPorCreacion(data);
}

// Toma todos los reportes pendientes y libres de esas creaciones
async function tomarReportes(idsCreaciones, idVerificador) {
    const { data, error } = await supabase
        .from('mreportes')
        .update({ id_verificador_asignado: idVerificador, asignado_en: new Date().toISOString() })
        .in('id_creacion', idsCreaciones)
        .eq('estado', 'pendiente')
        .is('id_verificador_asignado', null)
        .select('id_creacion');

    if (error) throw error;
    return [...new Set(data.map((r) => r.id_creacion))];
}

async function soltarReportes(idCreacion, idVerificador) {
    const { data, error } = await supabase
        .from('mreportes')
        .update(SIN_ASIGNAR)
        .eq('id_creacion', idCreacion)
        .eq('estado', 'pendiente')
        .eq('id_verificador_asignado', idVerificador)
        .select('id_reporte');

    if (error) throw error;
    return data.length > 0;
}

// ---------------------------------------------------------------------
// Apelaciones (solo líder): la lógica vive en apelacion_modelo
// ---------------------------------------------------------------------

async function listarApelaciones() {
    return Apelaciones.listarPendientes();
}

// Mantiene el rechazo: la creación no cambia, la apelación queda resuelta y el autor recibe la respuesta
async function mantenerRechazo(idApelacion, idVerificador) {
    const apelacion = await Apelaciones.resolver(idApelacion, idVerificador);
    if (!apelacion) return false;

    const { data: creacion, error } = await supabase
        .from('mcreacion')
        .select('nombre')
        .eq('id_creacion', apelacion.id_creacion)
        .maybeSingle();
    if (error) throw error;

    await Notificaciones.crearNotificacion({
        idUsuario: apelacion.id_usuario,
        idCreacion: apelacion.id_creacion,
        tipo: 'apelacion',
        titulo: `Revisamos tu apelación de "${creacion ? creacion.nombre : 'tu creación'}"`,
        mensaje: 'Se mantiene el rechazo. Puedes corregir tu creación y volver a enviarla.',
    });
    return true;
}

// ---------------------------------------------------------------------
// "Por revisar" del líder: reportes y apelaciones que eligió, en una sola lista
// ---------------------------------------------------------------------

async function listarPorRevisar(idVerificador) {
    const [reportes, apelaciones] = await Promise.all([
        consultaReportes().eq('id_verificador_asignado', idVerificador),
        Apelaciones.listarAsignadas(idVerificador),
    ]);
    if (reportes.error) throw reportes.error;

    return [...agruparPorCreacion(reportes.data), ...apelaciones];
}

module.exports = {
    // creaciones
    listarPendientes,
    listarCreacionesAsignadas,
    tomarCreaciones,
    soltarCreacion,
    puedeDecidir,
    obtenerCreacionActiva,
    aprobarCreacion,
    banearCreacion,
    rechazarCreacion,
    descartarReportes,
    // reportes
    obtenerReportePendiente,
    listarReportes,
    tomarReportes,
    soltarReportes,
    // apelaciones
    listarApelaciones,
    obtenerApelacion: Apelaciones.obtenerApelacion,
    tomarApelaciones: Apelaciones.tomar,
    soltarApelacion: Apelaciones.soltar,
    mantenerRechazo,
    // líder
    listarPorRevisar,
};
