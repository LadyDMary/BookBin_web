const supabase = require('../bd-supabase');

function formatearCreaciones(filas) {
    return filas.map((c) => {
        // Cada material lleva la cantidad que pide la creación
        const materiales = (c.materiales_creaciones || [])
            .filter((rel) => rel.dmateriales)
            .map((rel) => ({ ...rel.dmateriales, cantidad: rel.cantidad ?? 1 }));
        const herramientas = (c.herramientas_creaciones || [])
            .map((rel) => rel.dherramientas)
            .filter(Boolean);
        const { materiales_creaciones, herramientas_creaciones, ...resto } = c;
        return { ...resto, materiales, herramientas };
    });
}
async function listarCreaciones({ idMaterial, busqueda } = {}) {
    let query = supabase
        .from('mcreacion')
        .select(`
            id_creacion, nombre, descripcion, imagen, id_usuario, aprovado,
            materiales_creaciones (
                id_materiales,
                cantidad,
                dmateriales ( id_materiales, nombre, descripcion, codigo )
            )
        `)
        .eq('activo', 1)
        .eq('borrador', 0)
        .eq('aprovado', 1)
        .order('id_creacion', { ascending: false });

    if (idMaterial) {
        // 1) Busca los ids de las creaciones que usan ese material
        const { data: relaciones, error: errorRel } = await supabase
            .from('materiales_creaciones')
            .select('id_creacion')
            .eq('id_materiales', idMaterial);

        if (errorRel) throw errorRel;

        const ids = [...new Set(relaciones.map((r) => r.id_creacion))];
        if (ids.length === 0) return [];

        // 2) Trae solo esas creaciones
        query = query.in('id_creacion', ids);
    }

    if (busqueda) {
        const texto = busqueda.replace(/[\\"]/g, '\\$&');
        query = query.or(`nombre.ilike."%${texto}%",descripcion.ilike."%${texto}%"`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return formatearCreaciones(data);
}
async function listarCreacionesDeUsuario(idUsuario) {
    const { data, error } = await supabase
        .from('mcreacion')
        .select(`
            id_creacion, nombre, descripcion, imagen, id_usuario, borrador, aprovado,
            materiales_creaciones (
                cantidad,
                dmateriales ( id_materiales, nombre, descripcion, codigo )
            )
        `)
        .eq('activo', 1)
        .eq('id_usuario', idUsuario)
        .order('id_creacion', { ascending: false });

    if (error) throw error;
    return formatearCreaciones(data);
}

async function obtenerCreacion(id) {
    const { data, error } = await supabase
        .from('mcreacion')
        .select(`
            *,
            musuarios (nombre),
            materiales_creaciones (
                cantidad,
                dmateriales ( id_materiales, nombre, descripcion, codigo )
            ),
            herramientas_creaciones (
                dherramientas ( id_herramientas, nombre, descripcion )
            )
        `)
        .eq('id_creacion', id)
        .eq('activo', 1)
        .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;
    return formatearCreaciones([data])[0];
}

async function crearCreacion({ nombre, descripcion, instrucciones, idUsuario, imagen, borrador, idMateriales = [], cantidades = {}, idHerramientas = [] }) {
    const { data: nueva, error } = await supabase
        .from('mcreacion')
        .insert([{
            nombre,
            descripcion,
            instrucciones,
            activo: 1,
            aprovado: 0,
            id_usuario: idUsuario,
            imagen,
            borrador,
        }])
        .select()
        .single();

    if (error) throw error;

    if (Array.isArray(idMateriales) && idMateriales.length > 0) {
        const filasMateriales = idMateriales.map((idMaterial) => ({
            id_creacion: nueva.id_creacion,
            id_materiales: idMaterial,
            cantidad: cantidades[idMaterial] ?? 1,
        }));
        const { error: errorMat } = await supabase
            .from('materiales_creaciones')
            .insert(filasMateriales);

        if (errorMat) {
            // Deshace la creación para no dejarla guardada sin materiales
            await supabase.from('mcreacion').delete().eq('id_creacion', nueva.id_creacion);
            if (errorMat.code === '23503') errorMat.materialInvalido = true;
            throw errorMat;
        }
    }

    if (Array.isArray(idHerramientas) && idHerramientas.length > 0) {
        const { error: errorHer } = await supabase
            .from('herramientas_creaciones')
            .insert(idHerramientas.map((idHerramienta) => ({
                id_creacion: nueva.id_creacion,
                id_herramientas: idHerramienta,
            })));

        if (errorHer) {
            // Deshace todo: primero los materiales ya guardados y luego la creación
            await supabase.from('materiales_creaciones').delete().eq('id_creacion', nueva.id_creacion);
            await supabase.from('mcreacion').delete().eq('id_creacion', nueva.id_creacion);
            if (errorHer.code === '23503') errorHer.herramientaInvalida = true;
            throw errorHer;
        }
    }

    return {
        ...nueva,
        id_materiales: idMateriales,
        id_herramientas: idHerramientas,
    };
}
//funciones para actualizar la creacion

async function actualizarCreacion(id, { nombre, descripcion, instrucciones, imagen, borrador, aprovado, corregida }) {
    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre;
    if (descripcion !== undefined) cambios.descripcion = descripcion;
    if (instrucciones !== undefined) cambios.instrucciones = instrucciones;
    if (imagen !== undefined) cambios.imagen = imagen;
    if (borrador !== undefined) cambios.borrador = borrador;
    if (aprovado !== undefined) cambios.aprovado = aprovado;
    if (corregida !== undefined) cambios.corregida = corregida;

    if (Object.keys(cambios).length === 0) return false;

    const { data, error } = await supabase
        .from('mcreacion')
        .update(cambios)
        .eq('id_creacion', id)
        .eq('activo', 1)
        .select();

    if (error) throw error;
    return data.length > 0;
}
// Reemplaza los materiales de una creación por la lista nueva
async function actualizarMaterialesCreacion(idCreacion, idMateriales, cantidades = {}) {
    // Guarda los actuales por si hay que restaurarlos
    const { data: anteriores, error: errorLeer } = await supabase
        .from('materiales_creaciones')
        .select('id_materiales, cantidad')
        .eq('id_creacion', idCreacion);
    if (errorLeer) throw errorLeer;

    const { error: errorBorrar } = await supabase
        .from('materiales_creaciones')
        .delete()
        .eq('id_creacion', idCreacion);
    if (errorBorrar) throw errorBorrar;

    const filas = idMateriales.map((idMaterial) => ({
        id_creacion: idCreacion,
        id_materiales: idMaterial,
        cantidad: cantidades[idMaterial] ?? 1,
    }));
    const { error: errorInsertar } = await supabase
        .from('materiales_creaciones')
        .insert(filas);

    if (errorInsertar) {
        // Si falla, regresa los materiales que tenía antes
        if (anteriores.length > 0) {
            await supabase.from('materiales_creaciones').insert(
                anteriores.map((m) => ({ id_creacion: idCreacion, id_materiales: m.id_materiales, cantidad: m.cantidad ?? 1 }))
            );
        }
        if (errorInsertar.code === '23503') errorInsertar.materialInvalido = true;
        throw errorInsertar;
    }
    return true;
}

// Reemplaza las herramientas de una creación por la lista nueva (puede quedar vacía)
async function actualizarHerramientasCreacion(idCreacion, idHerramientas) {
    const { data: anteriores, error: errorLeer } = await supabase
        .from('herramientas_creaciones')
        .select('id_herramientas')
        .eq('id_creacion', idCreacion);
    if (errorLeer) throw errorLeer;

    const { error: errorBorrar } = await supabase
        .from('herramientas_creaciones')
        .delete()
        .eq('id_creacion', idCreacion);
    if (errorBorrar) throw errorBorrar;

    if (idHerramientas.length === 0) return true;

    const { error: errorInsertar } = await supabase
        .from('herramientas_creaciones')
        .insert(idHerramientas.map((idHerramienta) => ({
            id_creacion: idCreacion,
            id_herramientas: idHerramienta,
        })));

    if (errorInsertar) {
        // Si falla, regresa las herramientas que tenía antes
        if (anteriores.length > 0) {
            await supabase.from('herramientas_creaciones').insert(
                anteriores.map((h) => ({ id_creacion: idCreacion, id_herramientas: h.id_herramientas }))
            );
        }
        if (errorInsertar.code === '23503') errorInsertar.herramientaInvalida = true;
        throw errorInsertar;
    }
    return true;
}

async function eliminarCreacion(id) {
    const { data, error } = await supabase
        .from('mcreacion')
        .update({ activo: 0 })
        .eq('id_creacion', id)
        .eq('activo', 1)
        .select();

    if (error) throw error;
    return data.length > 0;
}
//buscar publicacion
async function buscarCreacionesPorNombre(nombre) {
    const termino = String(nombre || '').trim();
    if (!termino) return [];

    // Escapa % y _ para que se busquen como texto literal
    const patron = `%${termino.replace(/[\\%_]/g, '\\$&')}%`;

    const { data, error } = await supabase
        .from('mcreacion')
        .select(`
            id_creacion, nombre, descripcion, imagen, id_usuario, aprovado,
            materiales_creaciones (
                id_materiales,
                cantidad,
                dmateriales ( id_materiales, nombre, descripcion, codigo )
            )
        `)
        .eq('activo', 1)
        .eq('borrador', 0)
        .ilike('nombre', patron)
        .order('id_creacion', { ascending: false });

    if (error) throw error;
    return formatearCreaciones(data);
}
module.exports = {
    listarCreaciones,
    listarCreacionesDeUsuario,
    obtenerCreacion,
    crearCreacion,
    actualizarCreacion,
    actualizarMaterialesCreacion,
    actualizarHerramientasCreacion,
    eliminarCreacion,
    buscarCreacionesPorNombre,
};