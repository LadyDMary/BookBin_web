const supabase = require('../bd-supabase');

// Trae los favoritos activos de un usuario específico junto con los datos de cada creación
async function obtenerFavoritos(idUsuario) {
    const { data, error } = await supabase
        .from('favoritos')
        .select(`
            id_favoritos,
            id_usuarios,
            id_creacion,
            mcreacion!inner (
                id_creacion, nombre, descripcion, imagen, id_usuario, activo, aprovado,
                materiales_creaciones (
                    dmateriales ( id_materiales, nombre )
                )
            )
        `)
        .eq('id_usuarios', idUsuario)
        .eq('activo', 1)
        .eq('mcreacion.aprovado', 1)
        .eq('mcreacion.activo', 1)
        .order('id_favoritos', { ascending: false });

    if (error) throw error;

    // Acomoda cada creación para que tarjeta.js pueda mostrar su foto, nombre y materiales
    return data.map((fav) => {
        const c = fav.mcreacion;
        const materiales = (c.materiales_creaciones || [])
            .map((rel) => rel.dmateriales)
            .filter(Boolean);
        const { materiales_creaciones, ...resto } = c;
        return { ...resto, materiales };
    });
}

// Agrega un favorito (y si ya existía desactivado, lo vuelve a activar)
async function agregarFavorito(idUsuario, idCreacion) {
    const { data: existente, error: errorBusqueda } = await supabase
        .from('favoritos')
        .select('id_favoritos, activo')
        .eq('id_usuarios', idUsuario)
        .eq('id_creacion', idCreacion)
        .maybeSingle();

    if (errorBusqueda) throw errorBusqueda;

    if (existente) {
        const { data, error } = await supabase
            .from('favoritos')
            .update({ activo: 1 })
            .eq('id_favoritos', existente.id_favoritos)
            .select('id_favoritos')
            .single();

        if (error) throw error;
        return data;
    }

    const { data, error } = await supabase
        .from('favoritos')
        .insert([{
            id_usuarios: idUsuario,
            id_creacion: idCreacion,
            activo: 1,
        }])
        .select('id_favoritos')
        .single();

    if (error) throw error;
    return data;
}

// Quita un favorito (borrado lógico poniendo activo en 0)
async function quitarFavorito(idUsuario, idCreacion) {
    const { error } = await supabase
        .from('favoritos')
        .update({ activo: 0 })
        .eq('id_usuarios', idUsuario)
        .eq('id_creacion', idCreacion);

    if (error) throw error;
    return true;
}

module.exports = {
    obtenerFavoritos,
    agregarFavorito,
    quitarFavorito,
};