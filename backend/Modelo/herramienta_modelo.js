const supabase = require('../bd-supabase');

// Catálogo de herramientas activas, ordenado por nombre
async function obtenerHerramientas() {
    const { data, error } = await supabase
        .from('dherramientas')
        .select('id_herramientas, nombre, descripcion')
        .eq('activo', 1)
        .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
}

module.exports = { obtenerHerramientas };
