const pool = require('../bd-local');
const {randomUUID} = require('crypto');

async function listarCreaciones() {
    const [rows] = await pool.query('SELECT * FROM mcreacion WHERE activo = 1');
    return rows;
}

async function obtenerCreacion(id) {
    const [rows] = await pool.query( 'SELECT * FROM mcreacion WHERE id_creacion = ? AND activo = 1', [id]);
    return rows[0];
}

async function crearCreacion({ nombre, descripcion, instrucciones, idUsuario }) {
    const [result] = await pool.query(`INSERT INTO mcreacion (nombre, descripcion, instrucciones, activo, aprobado, id_usuario)VALUES (?, ?, ?, 1, 0, ?)`,[nombre, descripcion, instrucciones, idUsuario]);
    return {
        id_creacion: result.insertId,
        nombre,
        descripcion,
        instrucciones,
        activo: 1,
        aprobado: 0,
        id_usuario: idUsuario,
    };
}

async function actualizarCreacion(id, { nombre, descripcion, instrucciones }) {
    const [result] = await pool.query(`UPDATE mcreacion SET nombre = ?, descripcion = ?, instrucciones = ? WHERE id_creacion = ? AND activo = 1`, [nombre, descripcion, instrucciones, id]);
    return result.affectedRows > 0;
}

async function eliminarCreacion(id) {
    const [result] = await pool.query( 'UPDATE mcreacion SET activo = 0 WHERE id_creacion = ? AND activo = 1',[id]);
    return result.affectedRows > 0;
}

module.exports = {listarCreaciones, obtenerCreacion, crearCreacion, actualizarCreacion, eliminarCreacion,};