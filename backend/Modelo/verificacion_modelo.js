const supabase = require('../bd-supabase');

// Tabla dverificacion: una fila por cada rechazo de una creación
//   id_verificacion, id_creacion, id_verificador, comentario (razón), corregida (0/1), alerta (opcional)

// Guarda un rechazo y regresa su fila (la apelación se liga a su id_verificacion)
async function crear({ idCreacion, idVerificador, comentario }) {
    const { data, error } = await supabase
        .from('dverificacion')
        .insert([{
            id_creacion: idCreacion,
            id_verificador: idVerificador,
            comentario,
            corregida: 0,
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// El rechazo más reciente de una creación
async function ultimaDeCreacion(idCreacion) {
    const { data, error } = await supabase
        .from('dverificacion')
        .select('id_verificacion, id_verificador, comentario, corregida')
        .eq('id_creacion', idCreacion)
        .order('id_verificacion', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

// Cuando el autor corrige y reenvía, sus rechazos pendientes quedan como corregidos
async function marcarCorregidas(idCreacion) {
    const { error } = await supabase
        .from('dverificacion')
        .update({ corregida: 1 })
        .eq('id_creacion', idCreacion)
        .eq('corregida', 0);

    if (error) throw error;
}

module.exports = { crear, ultimaDeCreacion, marcarCorregidas };