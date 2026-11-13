const supabase = require('../bd-supabase');

// ---------- Usuarios (tabla musuarios, llave id_usuario) ----------

async function obtenerUsuarioPorId(id) {
    const { data, error } = await supabase
        .from('musuarios')
        .select('*')
        .eq('id_usuario', id)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function obtenerUsuarioPorCorreo(correo) {
    const { data, error } = await supabase
        .from('musuarios')
        .select('*')
        .eq('correo', correo)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function crearUsuario({ nombre, correo, contrasena }) {
    const { data, error } = await supabase
        .from('musuarios')
        .insert([{ nombre, correo, contrasena, activo: 1 }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function actualizarUsuario(id, { nombre, correo, contrasena }) {
    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre;
    if (correo !== undefined) cambios.correo = correo;
    if (contrasena !== undefined) cambios.contrasena = contrasena;

    if (Object.keys(cambios).length === 0) return obtenerUsuarioPorId(id);

    const { data, error } = await supabase
        .from('musuarios')
        .update(cambios)
        .eq('id_usuario', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ---------- Verificador (tabla mverificador, llave id_verificador) ----------

async function obtenerVerificadorPorId(id) {
    const { data, error } = await supabase
        .from('mverificador')
        .select('*')
        .eq('id_verificador', id)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function crearVerificador({ nombre, correo, contrasena, rol, id_administrador }) {
    const { data, error } = await supabase
        .from('mverificador')
        .insert([{ nombre, correo, contrasena, activo: 1, rol, id_administrador }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function actualizarVerificador(id, { nombre, correo, contrasena, rol }) {
    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre;
    if (correo !== undefined) cambios.correo = correo;
    if (contrasena !== undefined) cambios.contrasena = contrasena;
    if (rol !== undefined) cambios.rol = rol;

    if (Object.keys(cambios).length === 0) return obtenerVerificadorPorId(id);

    const { data, error } = await supabase
        .from('mverificador')
        .update(cambios)
        .eq('id_verificador', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ---------- Administrador (tabla madministrador, llave id_administrador) ----------

async function obtenerAdministradorPorId(id) {
    const { data, error } = await supabase
        .from('madministrador')
        .select('*')
        .eq('id_administrador', id)
        .maybeSingle();

    if (error) throw error;
    return data;
}

async function crearAdministrador({ nombre, correo, contrasena }) {
    const { data, error } = await supabase
        .from('madministrador')
        .insert([{ nombre, correo, contrasena, activo: 1 }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function actualizarAdministrador(id, { nombre, correo, contrasena }) {
    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre;
    if (correo !== undefined) cambios.correo = correo;
    if (contrasena !== undefined) cambios.contrasena = contrasena;

    if (Object.keys(cambios).length === 0) return obtenerAdministradorPorId(id);

    const { data, error } = await supabase
        .from('madministrador')
        .update(cambios)
        .eq('id_administrador', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

module.exports = {
    obtenerUsuarioPorId,
    obtenerUsuarioPorCorreo,
    crearUsuario,
    actualizarUsuario,
    obtenerVerificadorPorId,
    crearVerificador,
    actualizarVerificador,
    obtenerAdministradorPorId,
    crearAdministrador,
    actualizarAdministrador,
};