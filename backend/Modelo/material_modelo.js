const pool = require('../bd-supabase');
/*
async function listarMateriales() {
    const [rows] = await pool.query(
        'SELECT id_materiales, nombre FROM dmateriales ORDER BY nombre'
    );
    return rows;
}
    */
async function obtenerMateriales() {
    const [filas] = await pool.query(
        'SELECT id_materiales, nombre FROM dmateriales ORDER BY nombre ASC'
    );
    return filas;
}

module.exports = {obtenerMateriales };