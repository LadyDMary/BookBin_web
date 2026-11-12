const pool = require('../bd-supabase');

// ---------- Usuarios (tabla musuarios, llave id_usuario) ----------

async function obtenerUsuarioPorId(id) {
    const [filas] = await pool.query('SELECT * FROM musuarios WHERE id_usuario = ?', [id]);
    return filas[0];
}

async function obtenerUsuarioPorCorreo(correo) {
    const [filas] = await pool.query('SELECT * FROM musuarios WHERE correo = ?', [correo]);
    return filas[0];
}

async function crearUsuario({ nombre, correo, contrasena }) {
    const [result] = await pool.query(
        'INSERT INTO musuarios (nombre, correo, contrasena, activo) VALUES (?, ?, ?, 1)',
        [nombre, correo, contrasena]
    );
    return obtenerUsuarioPorId(result.insertId);
}

async function actualizarUsuario(id, { nombre, correo, contrasena }) {
    const cambios = Object.entries({ nombre, correo, contrasena }).filter(([, v]) => v !== undefined);
    if (cambios.length === 0) return obtenerUsuarioPorId(id);
    const columnas = cambios.map(([c]) => `${c} = ?`).join(', ');
    const [info] = await pool.query(
        `UPDATE musuarios SET ${columnas} WHERE id_usuario = ?`,
        [...cambios.map(([, v]) => v), id]
    );
    if (info.affectedRows === 0) return undefined;
    return obtenerUsuarioPorId(id);
}

// ---------- Verificador (tabla mverificador, llave id_verificador) ----------

async function obtenerVerificadorPorId(id) {
    const [filas] = await pool.query('SELECT * FROM mverificador WHERE id_verificador = ?', [id]);
    return filas[0];
}

async function crearVerificador({ nombre, correo, contrasena, rol, id_administrador }) {
    const [result] = await pool.query(
        'INSERT INTO mverificador (nombre, correo, contrasena, activo, rol, id_administrador) VALUES (?, ?, ?, 1, ?, ?)',
        [nombre, correo, contrasena, rol, id_administrador]
    );
    return obtenerVerificadorPorId(result.insertId);
}

async function actualizarVerificador(id, { nombre, correo, contrasena, rol }) {
    const cambios = Object.entries({ nombre, correo, contrasena, rol }).filter(([, v]) => v !== undefined);
    if (cambios.length === 0) return obtenerVerificadorPorId(id);
    const columnas = cambios.map(([c]) => `${c} = ?`).join(', ');
    const [info] = await pool.query(
        `UPDATE mverificador SET ${columnas} WHERE id_verificador = ?`,
        [...cambios.map(([, v]) => v), id]
    );
    if (info.affectedRows === 0) return undefined;
    return obtenerVerificadorPorId(id);
}

// ---------- Administrador (tabla madministrador, llave id_administrador) ----------

async function obtenerAdministradorPorId(id) {
    const [filas] = await pool.query('SELECT * FROM madministrador WHERE id_administrador = ?', [id]);
    return filas[0];
}

async function crearAdministrador({ nombre, correo, contrasena }) {
    const [result] = await pool.query(
        'INSERT INTO madministrador (nombre, correo, contrasena, activo) VALUES (?, ?, ?, 1)',
        [nombre, correo, contrasena]
    );
    return obtenerAdministradorPorId(result.insertId);
}

async function actualizarAdministrador(id, { nombre, correo, contrasena }) {
    const cambios = Object.entries({ nombre, correo, contrasena }).filter(([, v]) => v !== undefined);
    if (cambios.length === 0) return obtenerAdministradorPorId(id);
    const columnas = cambios.map(([c]) => `${c} = ?`).join(', ');
    const [info] = await pool.query(
        `UPDATE madministrador SET ${columnas} WHERE id_administrador = ?`,
        [...cambios.map(([, v]) => v), id]
    );
    if (info.affectedRows === 0) return undefined;
    return obtenerAdministradorPorId(id);
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