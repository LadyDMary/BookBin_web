const Creacion = require('../modelo/creacion_modelo');

// Revisa que existan los campos y que quepan en la base de datos
function datosValidos({ nombre, descripcion, instrucciones }) {
    return (
        nombre && descripcion && instrucciones &&
        nombre.length <= 50 &&
        descripcion.length <= 100 &&
        instrucciones.length <= 500
    );
}


async function listarCreaciones(req, res) {
    try {
        const creaciones = await Creacion.listarCreaciones();
        res.json(creaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'No se pudieron listar las creaciones' });
    }
}

async function obtenerCreacion(req, res) {
    try {
        const creacion = await Creacion.obtenerCreacion(req.params.id);
        if (!creacion) {
        return res.status(404).json({ error: 'No se encontró la creación' });
        }
        res.json(creacion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'No se pudo obtener la creación' });
    }
}

async function crearCreacion(req, res) {
    const { nombre, descripcion, instrucciones, id_usuario } = req.body;

    if (!id_usuario || !datosValidos({ nombre, descripcion, instrucciones })) {
        return res.status(400).json({
        error: 'nombre (máx. 50), descripcion (máx. 100), instrucciones (máx. 500) e id_usuario son obligatorios',
        });
    }

    try {
        const nueva = await Creacion.crearCreacion({
        nombre,
        descripcion,
        instrucciones,
        idUsuario: id_usuario,
        });
        res.status(201).json(nueva);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'No se pudo crear la creación' });
    }
}

async function actualizarCreacion(req, res) {
    const { id } = req.params;
    const { nombre, descripcion, instrucciones } = req.body;

    if (!datosValidos({ nombre, descripcion, instrucciones })) {
        return res.status(400).json({
        error: 'nombre (máx. 50), descripcion (máx. 100) e instrucciones (máx. 500) son obligatorios',
        });
    }

    try {
        const actualizada = await Creacion.actualizarCreacion(id, { nombre, descripcion, instrucciones });
        if (!actualizada) {
        return res.status(404).json({ error: 'No se encontró la creación' });
        }
        res.json({ id_creacion: Number(id), nombre, descripcion, instrucciones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'No se pudo actualizar la creación' });
    }
}

async function eliminarCreacion(req, res) {
    try {
        const eliminada = await Creacion.eliminarCreacion(req.params.id);
        if (!eliminada) {
        return res.status(404).json({ error: 'No se encontró la creación' });
        }
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'No se pudo eliminar la creación' });
    }
}

module.exports = {listarCreaciones, obtenerCreacion, crearCreacion, actualizarCreacion, eliminarCreacion };