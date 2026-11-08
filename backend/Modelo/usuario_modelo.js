const pool = require('../bd-local');
const {randomUUID} = require('crypto');


// Usuarios

async function obtenerUsuarioPorId(id) {
    const [filas] = await pool.query('SELECT * FROM musuarios WHERE id = ?', [id]);

    return filas[0];    
}

async function crearUsuario({nombre, correo, contrasena}) {
    const id = randomUUID();
    await pool.query(
        'INSERT INTO musuarios (id, nombre, correo, contrasena) VALUES (?,?,?,?)',
        [id, nombre, correo, contrasena]
    );
    return obtenerUsuarioPorId(id);
}

async function actualizarUsuario(id, {nombre, correo, contrasena}) {
    const cambios = Object.entries ({nombre, correo, contrasena}).filter(([, v])=> v !== undefined);
    if (cambios.length === 0) return obtenerUsuarioPorId(id);
    const columnas = cambios.map(([c]) => `${c} = ?`).join(', ');
    const [info] = await pool.query(
        `UPDATE musuarios SET ${columnas} WHERE id = ?`,
        [...cambios.map(([, v]) => v), id]
    );
    if (info.affectedRows === 0) return undefined;
    return obtenerUsuarioPorId(id);
}



// Verificador

async function obtenerVerificadorPorId(id) {
    const [filas] = await pool.query('SELECT * FROM mverificador WHERE id = ?', [id]);

    return filas[0];
}

async function crearVerificador({nombre, correo, contrasena, rol, id_administrador}) {
    const id = randomUUID();
    await pool.query(
        'INSERT INTO musuarios (id, nombre, correo, contrasena, rol, id_administrador) VALUES (?,?,?,?,?,?)',
        [id, nombre, correo, contrasena, rol, id_administrador]
    );
    return obtenerVerificadorPorId(id);
}

async function actualizarVerificador(id, {nombre, correo, contrasena, rol}) {
    const cambios = Object.entries ({nombre, correo, contrasena, rol}).filter(([, v])=> v !== undefined);
    if (cambios.length === 0) return obtenerUsuarioPorId(id);
    const columnas = cambios.map(([c]) => `${c} = ?`).join(', ');
    const [info] = await pool.query(
        `UPDATE mverificador SET ${columnas} WHERE id = ?`,
        [...cambios.map(([, v]) => v), id]
    );
    if (info.affectedRows === 0) return undefined;
    return obtenerUsuarioPorId(id);
}


// Administrador

async function obtenerAdministradorPorId(id) {
    const [filas] = await pool.query('SELECT * FROM madministrador WHERE id = ?', [id]);

    return filas[0];
}

async function crearAdministrador({nombre, correo, contrasena}) {
    const id = randomUUID();
    await pool.query(
        'INSERT INTO madministrador (id, nombre, correo, contrasena) VALUES (?,?,?,?)',
        [id, nombre, correo, contrasena]
    );
    return obtenerAdministradorPorId(id);
}

async function actualizarAdministrador(id, {nombre, correo, contrasena}) {
    const cambios = Object.entries ({nombre, correo, contrasena}).filter(([, v])=> v !== undefined);
    if (cambios.length === 0) return obtenerAdministradorPorId(id);
    const columnas = cambios.map(([c]) => `${c} = ?`).join(', ');
    const [info] = await pool.query(
        `UPDATE madministrador SET ${columnas} WHERE id = ?`,
        [...cambios.map(([, v]) => v), id]
    );
    if (info.affectedRows === 0) return undefined;
    return obtenerUsuarioPorId(id);
}



module.exports = {
    obtenerUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    obtenerVerificadorPorId,
    crearVerificador,
    actualizarVerificador,
    obtenerAdministradorPorId,
    crearAdministrador,
    actualizarAdministrador
};

