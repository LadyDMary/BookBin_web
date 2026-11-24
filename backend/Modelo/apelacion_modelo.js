const supabase = require('../bd-supabase');

// Tabla apelacion: id_apelacion, id_verificacion, contenido (ya existen).
// id_verificacion apunta a la fila de dverificacion del rechazo que se apela.
// Columnas extra: id_creacion, id_usuario, id_notificacion, estado, fecha
// y, para la asignación al líder, id_verificador_asignado y asignado_en
// (ver sql/asignaciones_verificador.sql).

const SIN_ASIGNAR = { id_verificador_asignado: null, asignado_en: null };

async function crearApelacion({ idCreacion, idUsuario, idNotificacion, idVerificacion, contenido }) {
    const { data, error } = await supabase
        .from('apelacion')
        .insert([{
            id_creacion: idCreacion,
            id_usuario: idUsuario,
            id_notificacion: idNotificacion,
            id_verificacion: idVerificacion,
            contenido,
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ¿Ya se apeló esta notificación de rechazo?
async function yaApelada(idNotificacion) {
    const { data, error } = await supabase
        .from('apelacion')
        .select('id_apelacion')
        .eq('id_notificacion', idNotificacion)
        .limit(1);

    if (error) throw error;
    return data.length > 0;
}

// Ids de las notificaciones del usuario que ya tienen apelación
async function notificacionesApeladas(idUsuario) {
    const { data, error } = await supabase
        .from('apelacion')
        .select('id_notificacion')
        .eq('id_usuario', idUsuario);

    if (error) throw error;
    return new Set(data.map((a) => a.id_notificacion));
}

// Agrega a cada apelación los datos de su creación y de quien apeló
async function completar(apelaciones) {
    if (apelaciones.length === 0) return [];

    const idsCreacion = [...new Set(apelaciones.map((a) => a.id_creacion))];
    const idsUsuario = [...new Set(apelaciones.map((a) => a.id_usuario))];

    const [{ data: creaciones, error: errorCreaciones }, { data: usuarios, error: errorUsuarios }] = await Promise.all([
        supabase.from('mcreacion').select('id_creacion, nombre, imagen, activo').in('id_creacion', idsCreacion),
        supabase.from('musuarios').select('id_usuario, nombre').in('id_usuario', idsUsuario),
    ]);
    if (errorCreaciones) throw errorCreaciones;
    if (errorUsuarios) throw errorUsuarios;

    const porCreacion = new Map(creaciones.map((c) => [c.id_creacion, c]));
    const porUsuario = new Map(usuarios.map((u) => [u.id_usuario, u]));

    return apelaciones
        .map((a) => ({
            ...a,
            tipo: 'apelacion',
            motivo: a.contenido, // el front lo muestra como motivo
            mcreacion: porCreacion.get(a.id_creacion) || null,
            musuarios: porUsuario.get(a.id_usuario) || null,
        }))
        .filter((a) => a.mcreacion && a.mcreacion.activo === 1);
}

function consultaPendientes() {
    return supabase
        .from('apelacion')
        .select('id_apelacion, id_creacion, id_usuario, id_verificacion, contenido, fecha')
        .eq('estado', 'pendiente')
        .order('id_apelacion', { ascending: true });
}

// Inicio del líder: apelaciones pendientes que nadie ha elegido
async function listarPendientes() {
    const { data, error } = await consultaPendientes().is('id_verificador_asignado', null);
    if (error) throw error;
    return completar(data);
}

// "Por revisar": las que eligió este líder
async function listarAsignadas(idVerificador) {
    const { data, error } = await consultaPendientes().eq('id_verificador_asignado', idVerificador);
    if (error) throw error;
    return completar(data);
}

// Se queda con las que sigan libres; regresa los ids que sí logró tomar
async function tomar(ids, idVerificador) {
    const { data, error } = await supabase
        .from('apelacion')
        .update({ id_verificador_asignado: idVerificador, asignado_en: new Date().toISOString() })
        .in('id_apelacion', ids)
        .eq('estado', 'pendiente')
        .is('id_verificador_asignado', null)
        .select('id_apelacion');

    if (error) throw error;
    return data.map((a) => a.id_apelacion);
}

// La regresa al inicio del líder
async function soltar(idApelacion, idVerificador) {
    const { data, error } = await supabase
        .from('apelacion')
        .update(SIN_ASIGNAR)
        .eq('id_apelacion', idApelacion)
        .eq('estado', 'pendiente')
        .eq('id_verificador_asignado', idVerificador)
        .select('id_apelacion')
        .maybeSingle();

    if (error) throw error;
    return Boolean(data);
}

// ¿Este líder tiene asignada alguna apelación pendiente de esa creación?
async function tieneAsignadaDeCreacion(idCreacion, idVerificador) {
    const { count, error } = await supabase
        .from('apelacion')
        .select('id_apelacion', { count: 'exact', head: true })
        .eq('id_creacion', idCreacion)
        .eq('estado', 'pendiente')
        .eq('id_verificador_asignado', idVerificador);

    if (error) throw error;
    return count > 0;
}

// Cuando un verificador decide sobre la creación (aprobar, rechazar o banear), sus apelaciones quedan resueltas
async function cerrarDeCreacion(idCreacion) {
    const { error } = await supabase
        .from('apelacion')
        .update({ estado: 'resuelta', ...SIN_ASIGNAR })
        .eq('id_creacion', idCreacion)
        .eq('estado', 'pendiente');

    if (error) throw error;
}

// Una apelación con quien apeló y la razón del rechazo que se apela.
// Solo la regresa si está asignada a este líder.
async function obtenerApelacion(idApelacion, idVerificador) {
    const { data, error } = await supabase
        .from('apelacion')
        .select('id_apelacion, id_creacion, id_usuario, id_notificacion, id_verificacion, contenido, estado, fecha')
        .eq('id_apelacion', idApelacion)
        .eq('id_verificador_asignado', idVerificador)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const [{ data: usuario, error: errorUsuario }, { data: notificacion, error: errorNotificacion }] = await Promise.all([
        supabase.from('musuarios').select('nombre').eq('id_usuario', data.id_usuario).maybeSingle(),
        data.id_notificacion
            ? supabase.from('mnotificaciones').select('mensaje').eq('id_notificacion', data.id_notificacion).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ]);
    if (errorUsuario) throw errorUsuario;
    if (errorNotificacion) throw errorNotificacion;

    return {
        ...data,
        motivo: data.contenido,
        musuarios: usuario,
        razon_rechazo: notificacion ? notificacion.mensaje : null,
    };
}

// Marca la apelación como resuelta (solo si seguía pendiente y era de este líder)
async function resolver(idApelacion, idVerificador) {
    const { data, error } = await supabase
        .from('apelacion')
        .update({ estado: 'resuelta', ...SIN_ASIGNAR })
        .eq('id_apelacion', idApelacion)
        .eq('estado', 'pendiente')
        .eq('id_verificador_asignado', idVerificador)
        .select('id_apelacion, id_creacion, id_usuario')
        .maybeSingle();

    if (error) throw error;
    return data;
}

module.exports = {
    crearApelacion,
    yaApelada,
    notificacionesApeladas,
    listarPendientes,
    listarAsignadas,
    tomar,
    soltar,
    tieneAsignadaDeCreacion,
    cerrarDeCreacion,
    obtenerApelacion,
    resolver,
};
