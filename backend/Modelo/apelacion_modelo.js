const supabase = require('../bd-supabase');

// Tabla apelacion: id_apelacion, id_verificacion, contenido (ya existen).
// id_verificacion apunta a la fila de dverificacion del rechazo que se apela.
// Columnas que faltan para ligar la apelación con su autor y su rechazo:
//   alter table apelacion add column if not exists id_creacion     integer;
//   alter table apelacion add column if not exists id_usuario      integer;
//   alter table apelacion add column if not exists id_notificacion bigint;
//   alter table apelacion add column if not exists estado          text not null default 'pendiente';
//   alter table apelacion add column if not exists fecha           timestamptz not null default now();
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

// Apelaciones pendientes con los datos de la creación y de quien apeló
async function listarPendientes() {
    const { data, error } = await supabase
        .from('apelacion')
        .select('id_apelacion, id_creacion, id_usuario, id_verificacion, contenido, fecha')
        .eq('estado', 'pendiente')
        .order('id_apelacion', { ascending: true });

    if (error) throw error;
    if (data.length === 0) return [];

    const idsCreacion = [...new Set(data.map((a) => a.id_creacion))];
    const idsUsuario = [...new Set(data.map((a) => a.id_usuario))];

    const [{ data: creaciones, error: errorCreaciones }, { data: usuarios, error: errorUsuarios }] = await Promise.all([
        supabase.from('mcreacion').select('id_creacion, nombre, imagen, activo').in('id_creacion', idsCreacion),
        supabase.from('musuarios').select('id_usuario, nombre').in('id_usuario', idsUsuario),
    ]);
    if (errorCreaciones) throw errorCreaciones;
    if (errorUsuarios) throw errorUsuarios;

    const porCreacion = new Map(creaciones.map((c) => [c.id_creacion, c]));
    const porUsuario = new Map(usuarios.map((u) => [u.id_usuario, u]));

    return data
        .map((a) => ({
            ...a,
            motivo: a.contenido, // el front lo muestra como motivo
            mcreacion: porCreacion.get(a.id_creacion) || null,
            musuarios: porUsuario.get(a.id_usuario) || null,
        }))
        .filter((a) => a.mcreacion && a.mcreacion.activo === 1);
}

// Cuando un verificador decide sobre la creación (aprobar, rechazar o banear), sus apelaciones quedan resueltas
async function cerrarDeCreacion(idCreacion) {
    const { error } = await supabase
        .from('apelacion')
        .update({ estado: 'resuelta' })
        .eq('id_creacion', idCreacion)
        .eq('estado', 'pendiente');

    if (error) throw error;
}

// Una apelación con quien apeló y la razón del rechazo que se apela
async function obtenerApelacion(idApelacion) {
    const { data, error } = await supabase
        .from('apelacion')
        .select('id_apelacion, id_creacion, id_usuario, id_notificacion, id_verificacion, contenido, estado, fecha')
        .eq('id_apelacion', idApelacion)
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

// Marca la apelación como resuelta (solo si seguía pendiente)
async function resolver(idApelacion) {
    const { data, error } = await supabase
        .from('apelacion')
        .update({ estado: 'resuelta' })
        .eq('id_apelacion', idApelacion)
        .eq('estado', 'pendiente')
        .select('id_apelacion, id_creacion, id_usuario')
        .maybeSingle();

    if (error) throw error;
    return data;
}

module.exports = { obtenerApelacion, resolver, crearApelacion, yaApelada, notificacionesApeladas, listarPendientes, cerrarDeCreacion };