const Creacion = require('../modelo/publicacion_modelo');
const Validacion = require('../validaciones');
const { subirImagen, borrarImagen } = require('../almacenamiento_imagenes');

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

// Lee las cantidades { idMaterial: cantidad }. Regresa null si alguna no es válida (entero de 1 a 999)
function leerCantidades(valor, idMateriales) {
    let objeto = {};
    if (valor) {
        try {
            objeto = typeof valor === 'string' ? JSON.parse(valor) : valor;
        } catch {
            return null;
        }
        if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) return null;
    }

    const cantidades = {};
    for (const idMaterial of idMateriales) {
        const cantidad = objeto[idMaterial] === undefined ? 1 : Number(objeto[idMaterial]);
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999) return null;
        cantidades[idMaterial] = cantidad;
    }
    return cantidades;
}

async function listarCreaciones(req, res) {
    try {
        const idMaterial = Number(req.query.material) || null;
        const busqueda = (req.query.q || '').toString().trim().slice(0, 50);
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
    const cantidades = leerCantidades(req.body.cantidades, idMateriales);
    const idHerramientas = leerMateriales(req.body.id_herramientas);

    const problema = Validacion.validarCamposCreacion({ nombre, descripcion, instrucciones }, esBorrador);
    
    if (!cantidades) {
        return res.status(400).json({ error: 'La cantidad de cada material debe ser un número entre 1 y 999.' });
    }
    if (problema || !Number.isInteger(idUsuario)) {
        return res.status(400).json({ error: problema || 'El id_usuario es obligatorio y debe ser numérico.' });
    } if (!esBorrador && !req.file) {
        return res.status(400).json({ error: 'Agrega una imagen para publicar la creación.' });
    }
    // La imagen se sube a Supabase Storage solo cuando los datos ya son válidos
    let imagenUrl = null;
    try {
        if (req.file) imagenUrl = await subirImagen(req.file);

        const nueva = await Creacion.crearCreacion({
            nombre,
            descripcion,
            instrucciones,
            idUsuario,
            imagen: imagenUrl,
            borrador: esBorrador ? 1 : 0,
            idMateriales,
            cantidades,
            idHerramientas,
        });
        
        return res.status(201).json(nueva);
    } catch (error) {
        // Si falló al guardar en la BD, quita la imagen que ya se había subido
        if (imagenUrl) borrarImagen(imagenUrl);
        console.error(error);
        if (error.materialInvalido) {
            return res.status(400).json({ error: 'Alguno de los materiales seleccionados ya no existe.' });
        }
        if (error.herramientaInvalida) {
            return res.status(400).json({ error: 'Alguna de las herramientas seleccionadas ya no existe.' });
        }
        return res.status(500).json({ error: 'No se pudo guardar la creación' });
    }
}
//funciones para actualizar una creacion
async function actualizarCreacion(req, res) {
    const id = Number(req.params.id);
    const idUsuario = Number(req.body.id_usuario);

    if (!Number.isInteger(id) || !Number.isInteger(idUsuario)) {
        return res.status(400).json({ error: 'Datos de la creación no válidos.' });
    }

    // 1. Validar con las mismas reglas que al crear
    const nombre = (req.body.nombre || '').trim();
    const descripcion = (req.body.descripcion || '').trim();
    const instrucciones = (req.body.instrucciones || '').trim();

    const problema = Validacion.validarCamposCreacion({ nombre, descripcion, instrucciones }, false);
    if (problema) {
        return res.status(400).json({ error: problema });
    }

    // Materiales: si los mandan, debe quedar al menos uno
    const enviaronMateriales = req.body.id_materiales !== undefined;
    const idMateriales = leerMateriales(req.body.id_materiales);
    if (enviaronMateriales && idMateriales.length === 0) {
        return res.status(400).json({ error: 'Selecciona al menos un material.' });
    }
    const cantidades = leerCantidades(req.body.cantidades, idMateriales);
    if (!cantidades) {
        return res.status(400).json({ error: 'La cantidad de cada material debe ser un número entre 1 y 999.' });
    }

    // Herramientas: opcionales; si las mandan (aunque sea vacío) se reemplazan
    const enviaronHerramientas = req.body.id_herramientas !== undefined;
    const idHerramientas = leerMateriales(req.body.id_herramientas);

    let nuevaImagen = null;
    try {
        // 2. Verificar que exista y que sea del usuario
        const anterior = await Creacion.obtenerCreacion(id);
        if (!anterior) {
            return res.status(404).json({ error: 'No se encontró la creación.' });
        }
        if (Number(anterior.id_usuario) !== idUsuario) {
            return res.status(403).json({ error: 'Solo puedes editar tus propias creaciones.' });
        }

        // 3. Guardar los cambios
        const cambios = { nombre, descripcion, instrucciones };
        if (req.file) {
            nuevaImagen = await subirImagen(req.file);
            cambios.imagen = nuevaImagen;
        }

        await Creacion.actualizarCreacion(id, cambios);
        if (enviaronMateriales) {
            await Creacion.actualizarMaterialesCreacion(id, idMateriales, cantidades);
        }
        if (enviaronHerramientas) {
            await Creacion.actualizarHerramientasCreacion(id, idHerramientas);
        }

        // 4. Borrar la imagen vieja solo cuando todo salió bien
        if (nuevaImagen && anterior.imagen) {
            borrarImagen(anterior.imagen);
        }

        return res.json({ mensaje: 'Creación actualizada', id_creacion: id, ...cambios, id_materiales: idMateriales });
    } catch (error) {
        if (nuevaImagen) borrarImagen(nuevaImagen);
        console.error(error);
        if (error.materialInvalido) {
            return res.status(400).json({ error: 'Alguno de los materiales seleccionados ya no existe.' });
        }
        if (error.herramientaInvalida) {
            return res.status(400).json({ error: 'Alguna de las herramientas seleccionadas ya no existe.' });
        }
        return res.status(500).json({ error: 'No se pudo actualizar la creación.' });
    }
}

//funciones para eliminar una creacion
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
        if (Number(creacionExistente.id_usuario) !== Number(req.body.id_usuario)) {
            return res.status(403).json({ error: 'Solo puedes eliminar tus propias creaciones.' });
        }

        // 2. Eliminar de la base de datos
        const eliminada = await Creacion.eliminarCreacion(id);
        if (!eliminada) {
            return res.status(404).json({ error: 'No se pudo eliminar la creación de la base de datos' });
        }

        // 3. Borrar la imagen (de Supabase Storage o, si es vieja, de /uploads)
        if (creacionExistente.imagen) {
            borrarImagen(creacionExistente.imagen);
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