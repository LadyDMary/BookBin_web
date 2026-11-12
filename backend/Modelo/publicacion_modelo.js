const pool = require('../bd-supabase');

// A una lista de creaciones le agrega su arreglo `materiales` ([{ id_materiales, nombre }])
async function agregarMateriales(creaciones) {
    if (creaciones.length === 0) return creaciones;

    const ids = creaciones.map((c) => c.id_creacion);
    const { rows: filas } = await pool.query(
        `SELECT mc.id_creacion, m.id_materiales, m.nombre FROM materiales_creaciones mc JOIN dmateriales m ON m.id_materiales = mc.id_materiales
        WHERE mc.id_creacion = ANY($1::int[]) ORDER BY m.nombre`,
        [ids]
    );

    return creaciones.map((c) => ({
        ...c,
        materiales: filas
            .filter((f) => f.id_creacion === c.id_creacion)
            .map((f) => ({ id_materiales: f.id_materiales, nombre: f.nombre })),
    }));
}

// Pantalla de inicio (Recomendados): creaciones publicadas, con filtros opcionales
async function listarCreaciones({ idMaterial, busqueda } = {}) {
    const condiciones = ['c.activo = 1', 'c.borrador = 0'];         
    const valores = [];

    if (idMaterial) {
        valores.push(idMaterial);
        condiciones.push(
            `EXISTS (SELECT 1 FROM materiales_creaciones mc WHERE mc.id_creacion = c.id_creacion AND mc.id_materiales = $${valores.length})`
        );
    }

    if (busqueda) {
        valores.push(`%${busqueda}%`);
        // ILIKE: en MySQL LIKE no distinguía mayúsculas; en Postgres sí, así se conserva el comportamiento
        condiciones.push(`(c.nombre ILIKE $${valores.length} OR c.descripcion ILIKE $${valores.length})`);
    }

    const { rows } = await pool.query(
        `SELECT c.id_creacion, c.nombre, c.descripcion, c.imagen, c.id_usuario FROM mcreacion c WHERE ${condiciones.join(' AND ')}
        ORDER BY c.id_creacion DESC`,
        valores
    );
    return agregarMateriales(rows);
}

// Pestaña "Mis creaciones": todas las del usuario, incluidos borradores
async function listarCreacionesDeUsuario(idUsuario) {
    const { rows } = await pool.query(
        `SELECT c.id_creacion, c.nombre, c.descripcion, c.imagen, c.id_usuario, c.borrador, c.aprobado
        FROM mcreacion c
        WHERE c.activo = 1 AND c.id_usuario = $1
        ORDER BY c.id_creacion DESC`,
        [idUsuario]
    );
    return agregarMateriales(rows);
}

async function obtenerCreacion(id) {
    const { rows } = await pool.query(
        'SELECT * FROM mcreacion WHERE id_creacion = $1 AND activo = 1',
        [id]
    );
    if (rows.length === 0) return undefined;
    const [creacion] = await agregarMateriales(rows);
    return creacion;
}

// Crea la creación y sus materiales en una sola transacción
async function crearCreacion({ nombre, descripcion, instrucciones, idUsuario, imagen, borrador, idMateriales = [] }) {
    const conexion = await pool.connect();
    try {
        await conexion.query('BEGIN');
        const { rows } = await conexion.query(
            `INSERT INTO mcreacion (nombre, descripcion, instrucciones, activo, aprobado, id_usuario, imagen, borrador)
            VALUES ($1, $2, $3, 1, 0, $4, $5, $6)
            RETURNING id_creacion`,
            [nombre, descripcion, instrucciones, idUsuario, imagen, borrador]
        );
        const idCreacion = rows[0].id_creacion;
        // Inserción segura de materiales (un solo INSERT con el arreglo de ids)
        if (Array.isArray(idMateriales) && idMateriales.length > 0) {
            await conexion.query(
                'INSERT INTO materiales_creaciones (id_creacion, id_materiales) SELECT $1, UNNEST($2::int[])',
                [idCreacion, idMateriales]
            );
        }
        await conexion.query('COMMIT');
        return {
            id_creacion: idCreacion,
            nombre,
            descripcion,
            instrucciones,
            imagen,
            borrador,
            aprobado: 0,
            id_usuario: idUsuario,
            id_materiales: idMateriales,
        };
    } catch (error) {
        await conexion.query('ROLLBACK');
        throw error;
    } finally {
        conexion.release();
    }
}

// Soporta actualización de nombre, descripción, instrucciones e imagen (si se proporciona)
async function actualizarCreacion(id, { nombre, descripcion, instrucciones, imagen }) {
    const valores = [nombre, descripcion, instrucciones];
    const campos = ['nombre = $1', 'descripcion = $2', 'instrucciones = $3'];

    if (imagen !== undefined) {
        valores.push(imagen);
        campos.push(`imagen = $${valores.length}`);
    }

    valores.push(id);

    const result = await pool.query(
        `UPDATE mcreacion SET ${campos.join(', ')} WHERE id_creacion = $${valores.length} AND activo = 1`,
        valores
    );
    return result.rowCount > 0;
}

async function eliminarCreacion(id) {
    const result = await pool.query(
        'UPDATE mcreacion SET activo = 0 WHERE id_creacion = $1 AND activo = 1',
        [id]
    );
    return result.rowCount > 0;
}

module.exports = {
    listarCreaciones,
    listarCreacionesDeUsuario,
    obtenerCreacion,
    crearCreacion,
    actualizarCreacion,
    eliminarCreacion,
};