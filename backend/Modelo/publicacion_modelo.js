const supabase = require('../bd-supabase');

function formatearCreaciones(filas) {
    return filas.map((c) => {
        const materiales = (c.materiales_creaciones || [])
            .map((rel) => rel.dmateriales)
            .filter(Boolean);
        const { materiales_creaciones, ...resto } = c;
        return { ...resto, materiales };
    });
}

async function listarCreaciones({ idMaterial, busqueda } = {}) {
    let query = supabase
        .from('mcreacion')
        .select(`
            id_creacion, nombre, descripcion, imagen, id_usuario, aprovado,
            materiales_creaciones${idMaterial ? '!inner' : ''} (
                id_materiales,
                dmateriales ( id_materiales, nombre, descripcion, codigo )
            )
        `)
        .eq('activo', 1)
        .eq('borrador', 0)
        .order('id_creacion', { ascending: false });

    if (idMaterial) {
        query = query.eq('materiales_creaciones.id_materiales', idMaterial);
    }

    if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return formatearCreaciones(data);
}

async function listarCreacionesDeUsuario(idUsuario) {
    const { data, error } = await supabase
        .from('mcreacion')
        .select(`
            id_creacion, nombre, descripcion, imagen, id_usuario, borrador, aprovado,
            materiales_creaciones (
                dmateriales ( id_materiales, nombre, descripcion, codigo )
            )
        `)
        .eq('activo', 1)
        .eq('id_usuario', idUsuario)
        .order('id_creacion', { ascending: false });

    if (error) throw error;
    return formatearCreaciones(data);
}

async function obtenerCreacion(id) {
    const { data, error } = await supabase
        .from('mcreacion')
        .select(`
            *,
            materiales_creaciones (
                dmateriales ( id_materiales, nombre, descripcion, codigo )
            )
        `)
        .eq('id_creacion', id)
        .eq('activo', 1)
        .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;
    return formatearCreaciones([data])[0];
}

async function crearCreacion({ nombre, descripcion, instrucciones, idUsuario, imagen, borrador, idMateriales = [] }) {
    const { data: nueva, error } = await supabase
        .from('mcreacion')
        .insert([{
            nombre,
            descripcion,
            instrucciones,
            activo: 1,
            aprovado: 0,
            id_usuario: idUsuario,
            imagen,
            borrador,
        }])
        .select()
        .single();

    if (error) throw error;

    if (Array.isArray(idMateriales) && idMateriales.length > 0) {
        const filasMateriales = idMateriales.map((idMaterial) => ({
            id_creacion: nueva.id_creacion,
            id_materiales: idMaterial,
        }));
        const { error: errorMat } = await supabase
            .from('materiales_creaciones')
            .insert(filasMateriales);

        if (errorMat) throw errorMat;
    }

    return {
        ...nueva,
        id_materiales: idMateriales,
    };
}

async function actualizarCreacion(id, { nombre, descripcion, instrucciones, imagen }) {
    const cambios = { nombre, descripcion, instrucciones };
    if (imagen !== undefined) cambios.imagen = imagen;

    const { data, error } = await supabase
        .from('mcreacion')
        .update(cambios)
        .eq('id_creacion', id)
        .eq('activo', 1)
        .select();

    if (error) throw error;
    return data.length > 0;
}

async function eliminarCreacion(id) {
    const { data, error } = await supabase
        .from('mcreacion')
        .update({ activo: 0 })
        .eq('id_creacion', id)
        .eq('activo', 1)
        .select();

    if (error) throw error;
    return data.length > 0;
}

module.exports = {
    listarCreaciones,
    listarCreacionesDeUsuario,
    obtenerCreacion,
    crearCreacion,
    actualizarCreacion,
    eliminarCreacion,
};