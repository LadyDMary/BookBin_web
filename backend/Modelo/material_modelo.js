const pool = require('../bd-supabase');

async function obtenerMateriales() {
    const { rows } = await pool.query(
        'SELECT id_materiales, nombre FROM dmateriales ORDER BY nombre ASC'
    );
    return rows;
}

module.exports = { obtenerMateriales };