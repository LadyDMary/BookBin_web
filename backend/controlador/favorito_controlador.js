const FavoritoModelo = require('../modelo/favorito_modelo');

async function listarFavoritos(req, res) {
    const idUsuario = Number(req.params.idUsuario);

    if (!Number.isInteger(idUsuario)) {
        return res.status(400).json({ error: 'El ID de usuario no es válido.' });
    }

    try {
        const favoritos = await FavoritoModelo.obtenerFavoritos(idUsuario);
        return res.json(favoritos);
    } catch (error) {
        console.error('Error al listar favoritos:', error);
        return res.status(500).json({ error: 'No se pudieron cargar las creaciones favoritas.' });
    }
}

async function guardarFavorito(req, res) {
    const idUsuario = Number(req.body.id_usuarios);
    const idCreacion = Number(req.body.id_creacion);

    if (!Number.isInteger(idUsuario) || !Number.isInteger(idCreacion)) {
        return res.status(400).json({ error: 'Se requieren id_usuarios e id_creacion válidos.' });
    }

    try {
        const favorito = await FavoritoModelo.agregarFavorito(idUsuario, idCreacion);
        return res.status(201).json({
            mensaje: 'Creación agregada a favoritos',
            favorito,
        });
    } catch (error) {
        console.error('Error al guardar favorito:', error);
        return res.status(500).json({ error: 'No se pudo guardar en favoritos.' });
    }
}

async function eliminarFavorito(req, res) {
    const idUsuario = Number(req.body.id_usuarios);
    const idCreacion = Number(req.body.id_creacion);

    if (!Number.isInteger(idUsuario) || !Number.isInteger(idCreacion)) {
        return res.status(400).json({ error: 'Se requieren id_usuarios e id_creacion válidos.' });
    }

    try {
        await FavoritoModelo.quitarFavorito(idUsuario, idCreacion);
        return res.json({ mensaje: 'Creación eliminada de favoritos' });
    } catch (error) {
        console.error('Error al quitar favorito:', error);
        return res.status(500).json({ error: 'No se pudo quitar de favoritos.' });
    }
}

module.exports = {
    listarFavoritos,
    guardarFavorito,
    eliminarFavorito,
};