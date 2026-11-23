const supabase = require('../bd-supabase');
const Notificaciones = require('./notificacion_modelo');

// Creaciones por verificar: publicadas sin aprobar, y rechazadas que siguen sin corregirse
async function listarPendientes() {
    const { data, error } = await supabase
        .from('mcreacion')
        .select('id_creacion, nombre, descripcion, imagen, id_usuario, aprovado, veces_rechazada, corregida, musuarios (nombre)')
        .eq('activo', 1)
        .eq('aprovado', 0)
        // Publicadas, o rechazadas que el autor todavía no corrige (siguen como borrador)
        .or('borrador.eq.0,veces_rechazada.gt.0')
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
        .select('id_creacion')
        .maybeSingle();

    if (error) throw error;
    if (!data) return false;

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

    await Notificaciones.crearNotificacion({
        idUsuario: data.id_usuario,
        idCreacion: data.id_creacion,
        titulo: `Tu creación "${data.nombre}" fue rechazada`,
        mensaje: razon,
    });
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

// Creaciones con reportes pendientes (apelaciones, solo líder)
async function listarApelaciones() {
    const { data, error } = await supabase
        .from('mreportes')
        .select('id_reporte, id_creacion, motivo, detalle, mcreacion (nombre, imagen, activo)')
        .eq('estado', 'pendiente')
        .order('id_reporte', { ascending: true });

    if (error) throw error;
    return data.filter((r) => r.mcreacion && r.mcreacion.activo === 1);
}

module.exports = {
    listarPendientes,
    obtenerCreacionActiva,
    obtenerReportePendiente,
    aprobarCreacion,
    banearCreacion,
    rechazarCreacion,
    listarApelaciones,
};