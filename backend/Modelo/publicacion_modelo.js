const pool = require('../bd-local');

async function listarCreaciones() {
    const [rows] = await pool.query('SELECT * FROM mcreacion WHERE activo = 1');
    return rows;
}

async function obtenerCreacion(id) {
    const [rows] = await pool.query('SELECT * FROM mcreacion WHERE id_creacion = ? AND activo = 1', [id]);
    return rows[0];
}

async function crearCreacion({ nombre, descripcion, instrucciones, idUsuario }) {
    const [result] = await pool.query(
        `INSERT INTO mcreacion (nombre, descripcion, instrucciones, activo, aprobado, id_usuario)
        VALUES (?, ?, ?, 1, 0, ?)`,
        [nombre, descripcion, instrucciones, idUsuario]
    );
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

// PARA DESPUÉS: requiere la columna `imagen` en mcreacion y la tabla materiales_creaciones
async function crearCreacionConMateriales({ nombre, descripcion, instrucciones, id_usuario, id_materiales, imagen }) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Insertar la creación principal
        const [resultCreacion] = await connection.query(
            `INSERT INTO mcreacion (nombre, descripcion, instrucciones, activo, aprobado, id_usuario, imagen)
            VALUES (?, ?, ?, 1, 0, ?, ?)`,
            [nombre, descripcion, instrucciones, id_usuario, imagen]
        );

        const idCreacion = resultCreacion.insertId;

        // 2. Insertar los materiales seleccionados en la tabla puente
        if (id_materiales && id_materiales.length > 0) {
            const valoresMateriales = id_materiales.map((idMaterial) => [idCreacion, idMaterial]);

            await connection.query(
                `INSERT INTO materiales_creaciones (id_creacion, id_materiales) VALUES ?`,
                [valoresMateriales]
            );
        }

        await connection.commit();

        return {
            id_creacion: idCreacion,
            nombre,
            descripcion,
            instrucciones,
            activo: 1,
            aprobado: 0,
            id_usuario,
            imagen,
            id_materiales: id_materiales || [],
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function actualizarCreacion(id, { nombre, descripcion, instrucciones }) {
    const [result] = await pool.query(
        `UPDATE mcreacion SET nombre = ?, descripcion = ?, instrucciones = ?
        WHERE id_creacion = ? AND activo = 1`,
        [nombre, descripcion, instrucciones, id]
    );
    return result.affectedRows > 0;
}

async function eliminarCreacion(id) {
    const [result] = await pool.query(
        'UPDATE mcreacion SET activo = 0 WHERE id_creacion = ? AND activo = 1',
        [id]
    );
    return result.affectedRows > 0;
}

module.exports = {
    listarCreaciones,
    obtenerCreacion,
    crearCreacion,
    crearCreacionConMateriales,
    actualizarCreacion,
    eliminarCreacion,
};