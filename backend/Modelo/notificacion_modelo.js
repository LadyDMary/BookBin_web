const supabase = require('../bd-supabase');

// Tabla requerida en Supabase:
//   create table mnotificaciones (
//     id_notificacion bigint generated always as identity primary key,
//     id_usuario      integer not null,
//     id_creacion     integer,
//     tipo            text not null default 'rechazo',   -- 'rechazo' | 'aprobacion'
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

module.exports = { crearNotificacion, listarDeUsuario, marcarLeida };