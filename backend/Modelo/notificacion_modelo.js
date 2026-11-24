const supabase = require('../bd-supabase');

// Tabla requerida en Supabase:
//   create table mnotificaciones (
//     id_notificacion bigint generated always as identity primary key,
//     id_usuario      integer not null,
//     id_creacion     integer,
//     tipo            text not null default 'rechazo',   -- 'rechazo' | 'aprobacion' | 'apelacion' | 'baneo'
//     titulo          text not null,
//     mensaje         text not null,
//     leida           smallint not null default 0,
//     fecha           timestamptz not null default now()
//   );
async function crearNotificacion({ idUsuario, idCreacion, tipo = 'rechazo', titulo, mensaje }) {
    const { error } = await supabase
        .from('mnotificaciones')
        .insert([{ id_usuario: idUsuario, id_creacion: idCreacion, tipo, titulo, mensaje }]);

    if (error) throw error;
}

async function listarDeUsuario(idUsuario) {
    const { data, error } = await supabase
        .from('mnotificaciones')
        .select('id_notificacion, id_creacion, tipo, titulo, mensaje, leida, fecha')
        .eq('id_usuario', idUsuario)
        .order('fecha', { ascending: false });

    if (error) throw error;
    return data;
}

async function obtenerDeUsuario(idNotificacion, idUsuario) {
    const { data, error } = await supabase
        .from('mnotificaciones')
        .select('id_notificacion, id_creacion, tipo, mensaje')
        .eq('id_notificacion', idNotificacion)
        .eq('id_usuario', idUsuario)
        .maybeSingle();

    if (error) throw error;
    return data;
}

// Solo marca la notificación si es del usuario
async function marcarLeida(idNotificacion, idUsuario) {
    const { data, error } = await supabase
        .from('mnotificaciones')
        .update({ leida: 1 })
        .eq('id_notificacion', idNotificacion)
        .eq('id_usuario', idUsuario)
        .select('id_notificacion')
        .maybeSingle();

    if (error) throw error;
    return Boolean(data);
}

// De las creaciones dadas, los ids de las que fueron baneadas (activo = 0 con razón de baneo).
// Sirve para que las notificaciones viejas de rechazo ya no ofrezcan corregir ni apelar.
async function creacionesBaneadas(idsCreacion) {
    const ids = [...new Set(idsCreacion.filter(Boolean))];
    if (ids.length === 0) return new Set();

    const { data, error } = await supabase
        .from('mcreacion')
        .select('id_creacion')
        .in('id_creacion', ids)
        .eq('activo', 0)
        .not('razon_baneo', 'is', null);

    if (error) throw error;
    return new Set(data.map((c) => c.id_creacion));
}

module.exports = { crearNotificacion, listarDeUsuario, obtenerDeUsuario, marcarLeida, creacionesBaneadas };