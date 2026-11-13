const supabase = require('../bd-supabase');

async function obtenerMateriales() {
    const { data, error } = await supabase
        .from('dmateriales')
        .select('id_materiales, nombre, descripcion, codigo')
        .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
}

module.exports = { obtenerMateriales };