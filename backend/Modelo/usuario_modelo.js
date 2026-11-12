const pool = require('../bd-supabase');

// Arma "col = $1, col2 = $2" para un UPDATE, solo con las columnas permitidas y definidas
function armarCambios(datos) {
    const cambios = Object.entries(datos).filter(([, v]) => v !== undefined);
    return {
        vacio: cambios.length === 0,
        columnas: cambios.map(([c], i) => `${c} = $${i + 1}`).join(', '),
        valores: cambios.map(([, v]) => v),
    };
}

// ---------- Usuarios (tabla musuarios, llave id_usuario) ----------

async function obtenerUsuarioPorId(id) {
    const { rows } = await pool.query('SELECT * FROM musuarios WHERE id_usuario = $1', [id]);
    return rows[0];
}

async function obtenerUsuarioPorCorreo(correo) {
    const { rows } = await pool.query('SELECT * FROM musuarios WHERE correo = $1', [correo]);
    return rows[0];
}

async function crearUsuario({ nombre, correo, contrasena }) {
    const { rows } = await pool.query(
        'INSERT INTO musuarios (nombre, correo, contrasena, activo) VALUES ($1, $2, $3, 1) RETURNING *',
        [nombre, correo, contrasena]
    );
    return rows[0];
}

async function actualizarUsuario(id, { nombre, correo, contrasena }) {
    const { vacio, columnas, valores } = armarCambios({ nombre, correo, contrasena });
    if (vacio) return obtenerUsuarioPorId(id);
    const { rows } = await pool.query(
        `UPDATE musuarios SET ${columnas} WHERE id_usuario = $${valores.length + 1} RETURNING *`,
        [...valores, id]
    );
    return rows[0];
}

// ---------- Verificador (tabla mverificador, llave id_verificador) ----------

async function obtenerVerificadorPorId(id) {
    const { rows } = await pool.query('SELECT * FROM mverificador WHERE id_verificador = $1', [id]);
    return rows[0];
}

async function crearVerificador({ nombre, correo, contrasena, rol, id_administrador }) {
    const { rows } = await pool.query(
        'INSERT INTO mverificador (nombre, correo, contrasena, activo, rol, id_administrador) VALUES ($1, $2, $3, 1, $4, $5) RETURNING *',
        [nombre, correo, contrasena, rol, id_administrador]
    );
    return rows[0];
}

async function actualizarVerificador(id, { nombre, correo, contrasena, rol }) {
    const { vacio, columnas, valores } = armarCambios({ nombre, correo, contrasena, rol });
    if (vacio) return obtenerVerificadorPorId(id);
    const { rows } = await pool.query(
        `UPDATE mverificador SET ${columnas} WHERE id_verificador = $${valores.length + 1} RETURNING *`,
        [...valores, id]
    );
    return rows[0];
}

// ---------- Administrador (tabla madministrador, llave id_administrador) ----------

async function obtenerAdministradorPorId(id) {
    const { rows } = await pool.query('SELECT * FROM madministrador WHERE id_administrador = $1', [id]);
    return rows[0];
}

async function crearAdministrador({ nombre, correo, contrasena }) {
    const { rows } = await pool.query(
        'INSERT INTO madministrador (nombre, correo, contrasena, activo) VALUES ($1, $2, $3, 1) RETURNING *',
        [nombre, correo, contrasena]
    );
    return rows[0];
}

async function actualizarAdministrador(id, { nombre, correo, contrasena }) {
    const { vacio, columnas, valores } = armarCambios({ nombre, correo, contrasena });
    if (vacio) return obtenerAdministradorPorId(id);
    const { rows } = await pool.query(
        `UPDATE madministrador SET ${columnas} WHERE id_administrador = $${valores.length + 1} RETURNING *`,
        [...valores, id]
    );
    return rows[0];
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