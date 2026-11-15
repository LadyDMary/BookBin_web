const fs = require('fs');
const path = require('path');
const Creacion = require('../modelo/publicacion_modelo');
const Validacion = require('../validaciones');

function leerMateriales(valor) {
    if (!valor) return [];
    try {
        const lista = typeof valor === 'string' ? JSON.parse(valor) : valor;
        if (Array.isArray(lista)) {
            return [...new Set(lista.map(Number).filter(Number.isInteger))];
        }
    } catch {
        return [];
    }
    return [];
}

function borrarImagenSubida(req) {
    if (req && req.file) {
        fs.unlink(req.file.path, () => {});
    }
}

function borrarImagenPorRuta(rutaImagen) {
    if (!rutaImagen) return;
    const rutaAbsoluta = path.join(__dirname, '..', rutaImagen);
    fs.unlink(rutaAbsoluta, () => {});
}

async function listarCreaciones(req, res) {
    try {
        const idMaterial = Number(req.query.material) || null;
        const busqueda = (req.query.q || '').toString().trim();
        const creaciones = await Creacion.listarCreaciones({ idMaterial, busqueda });
        res.json(creaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'No se pudieron listar las creaciones' });
    }
}

async function listarCreacionesDeUsuario(req, res) {
    const idUsuario = Number(req.params.idUsuario);
    if (!Number.isInteger(idUsuario)) {
        return res.status(400).json({ error: 'El id de usuario no es válido' });
    }

    try {
        const creaciones = await Creacion.listarCreacionesDeUsuario(idUsuario);
        res.json(creaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'No se pudieron listar tus creaciones' });
    }
}

async function obtenerCreacion(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: 'El ID de la creación no es válido' });
        }

        const creacion = await Creacion.obtenerCreacion(id);
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
    const nombre = (req.body.nombre || '').trim();
    const descripcion = (req.body.descripcion || '').trim();
    const instrucciones = (req.body.instrucciones || '').trim();
    const idUsuario = Number(req.body.id_usuario);
    const esBorrador = req.body.accion === 'borrador' || req.body.borrador === 'true' || req.body.borrador === true;
    const idMateriales = leerMateriales(req.body.id_materiales || req.body.materiales);

    const problema = Validacion.validarCamposCreacion({ nombre, descripcion, instrucciones }, esBorrador);
    
    if (problema || !Number.isInteger(idUsuario)) {
        borrarImagenSubida(req);
        return res.status(400).json({ error: problema || 'El id_usuario es obligatorio y debe ser numérico.' });
    } if (!esBorrador && !req.file) {
        return res.status(400).json({ error: 'Agrega una imagen para publicar la creación.' });
    }
    try {
        const nueva = await Creacion.crearCreacion({
            nombre,
            descripcion,
            instrucciones,
            idUsuario,
            imagen: req.file ? `/uploads/${req.file.filename}` : null,
            borrador: esBorrador ? 1 : 0,
            idMateriales,
        });
        
        return res.status(201).json(nueva);
    } catch (error) {
        borrarImagenSubida(req);
        console.error(error);
        return res.status(500).json({ error: 'No se pudo guardar la creación' });
    }
}

async function actualizarCreacion(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        borrarImagenSubida(req);
        return res.status(400).json({ error: 'ID de creación no válido' });
    }
    // 1. Guardar solo los campos que el usuario realmente envió
    const cambios = {};
    if (req.body.nombre !== undefined) {
        const nombreLimpio = String(req.body.nombre).trim();
        if (!nombreLimpio || nombreLimpio.length > 100) {
            borrarImagenSubida(req);
            return res.status(400).json({ error: 'El nombre debe tener entre 1 y 100 caracteres.' });
        }
        cambios.nombre = nombreLimpio;
    }
    if (req.body.descripcion !== undefined) {
        const descLimpia = String(req.body.descripcion).trim();
        if (!descLimpia) {
            borrarImagenSubida(req);
            return res.status(400).json({ error: 'La descripción no puede quedar vacía.' });
        }
        cambios.descripcion = descLimpia;
    }
    if (req.body.instrucciones !== undefined) {
        const instLimpias = String(req.body.instrucciones).trim();
        if (!instLimpias) {
            borrarImagenSubida(req);
            return res.status(400).json({ error: 'Las instrucciones no pueden quedar vacías.' });
        }
        cambios.instrucciones = instLimpias;
    }
    if (req.file) {
        cambios.imagen = `/uploads/${req.file.filename}`;
    }
    // 2. Si no enviaron ningún campo ni imagen, detener aquí
    if (Object.keys(cambios).length === 0) {
        return res.status(400).json({ error: 'No enviaste ningún dato para actualizar.' });
    }
    try {
        // Si subieron imagen nueva, borrar la anterior del servidor
        if (req.file) {
            const anterior = await Creacion.obtenerCreacion(id);
            if (!anterior) {
                borrarImagenSubida(req);
                return res.status(404).json({ error: 'No se encontró la creación a actualizar' });
            }
            if (anterior.imagen) {
                borrarImagenPorRuta(anterior.imagen);
            }
        }
        // 3. Enviar solo el objeto `cambios` al modelo
        const actualizada = await Creacion.actualizarCreacion(id, cambios);
        if (!actualizada) {
            borrarImagenSubida(req);
            return res.status(404).json({ error: 'No se encontró la creación a actualizar' });
        }
        return res.json({ id_creacion: id, ...cambios });
    } catch (error) {
        borrarImagenSubida(req);
        console.error(error);
        return res.status(500).json({ error: 'No se pudo actualizar la creación' });
    }
}

async function eliminarCreacion(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'ID de creación no válido' });
    }

    try {
        // 1. Obtener la creación para saber si tiene una imagen que debamos eliminar
        const creacionExistente = await Creacion.obtenerCreacion(id);
        if (!creacionExistente) {
            return res.status(404).json({ error: 'No se encontró la creación' });
        }

        // 2. Eliminar de la base de datos
        const eliminada = await Creacion.eliminarCreacion(id);
        if (!eliminada) {
            return res.status(404).json({ error: 'No se pudo eliminar la creación de la base de datos' });
        }

        // 3. Borrar la imagen física en /uploads
        if (creacionExistente.imagen) {
            borrarImagenPorRuta(creacionExistente.imagen);
        }

        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo eliminar la creación' });
    }
}

module.exports = {
    listarCreaciones,
    listarCreacionesDeUsuario,
    obtenerCreacion,
    crearCreacion,
    actualizarCreacion,
    eliminarCreacion,
};