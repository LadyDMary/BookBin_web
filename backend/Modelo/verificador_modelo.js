const supabase = require('../bd-supabase');
const Notificaciones = require('./notificacion_modelo');
const Apelaciones = require('./apelacion_modelo');
const Verificaciones = require('./verificacion_modelo');

// Creaciones por verificar: solo las publicadas sin aprobar (incluye las rechazadas que el autor ya corrigió y reenvió).
// Las rechazadas sin corregir nunca aparecen.
// Una rechazada sin corregir queda como borrador (borrador = 1), así que no aparece hasta que se corrija.
async function listarPendientes() {
    const { data, error } = await supabase
        .from('mcreacion')
        .select('id_creacion, nombre, descripcion, imagen, id_usuario, aprovado, veces_rechazada, corregida, musuarios (nombre)')
        .eq('activo', 1)
        .eq('aprovado', 0)
        .eq('borrador', 0)
        // Nunca rechazadas, o rechazadas que el autor ya corrigió (corregida = 1)
        .or('veces_rechazada.is.null,veces_rechazada.eq.0,corregida.eq.1')
        .order('id_creacion', { ascending: true });

    if (error) throw error;
    return data;
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

// Marca la creación como aprobada y cierra sus reportes pendientes
async function aprobarCreacion(idCreacion, idVerificador) {
    const { data, error } = await supabase
        .from('mcreacion')
        .update({ aprovado: 1, borrador: 0, id_verificador: idVerificador })
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
        .update({ activo: 0, aprovado: 0, id_verificador: idVerificador, razon_baneo: razon })
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

// Rechaza: la creación vuelve a borrador para que su autor la corrija.
// La razón no se guarda en la creación: le llega al autor como notificación.
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
        .update({ estado: 'resuelto' })
        .eq('id_creacion', idCreacion)
        .eq('estado', 'pendiente');

    if (error) throw error;
}

// Apelaciones pendientes de autores que impugnan un rechazo
async function listarApelaciones() {
    return Apelaciones.listarPendientes();
}

// Todos los reportes pendientes (uno por reporte), con quién reportó y la creación reportada
async function listarReportes() {
    const { data, error } = await supabase
        .from('mreportes')
        .select('id_reporte, id_creacion, motivo, detalle, musuarios (nombre), mcreacion (nombre, imagen, activo)')
        .eq('estado', 'pendiente')
        .order('id_reporte', { ascending: true });

    if (error) throw error;
    return data.filter((r) => r.mcreacion && r.mcreacion.activo === 1);
}

// Descarta los reportes pendientes: la creación se queda como está (sin avisar al autor)
async function descartarReportes(idCreacion) {
    const creacion = await obtenerCreacionActiva(idCreacion);
    if (!creacion) return false;

    await cerrarReportes(idCreacion);
    return true;
}

// Mantiene el rechazo: la creación no cambia, la apelación queda resuelta y el autor recibe la respuesta
async function mantenerRechazo(idApelacion) {
    const apelacion = await Apelaciones.resolver(idApelacion);
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

module.exports = {
    mantenerRechazo,
    obtenerApelacion: Apelaciones.obtenerApelacion,
    descartarReportes,
    listarReportes,
    listarPendientes,
    obtenerCreacionActiva,
    obtenerReportePendiente,
    aprobarCreacion,
    banearCreacion,
    rechazarCreacion,
    listarApelaciones,
};