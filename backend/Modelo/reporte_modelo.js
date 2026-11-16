const supabase = require('../bd-supabase');

async function crearReporte({ idCreacion, idUsuario, motivo, detalle }) {
    const { data, error } = await supabase
        .from('mreportes')
        .insert([{ id_creacion: idCreacion, id_usuario: idUsuario, motivo, detalle }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Evita que el mismo usuario reporte dos veces la misma creación
async function yaReporto(idCreacion, idUsuario) {
    const { data, error } = await supabase
        .from('mreportes')
        .select('id_reporte')
        .eq('id_creacion', idCreacion)
        .eq('id_usuario', idUsuario)
        .eq('estado', 'pendiente')
        .limit(1);

    if (error) throw error;
    return data.length > 0;
}

module.exports = { crearReporte, yaReporto };