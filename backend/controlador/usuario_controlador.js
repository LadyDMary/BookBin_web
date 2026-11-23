const bcrypt = require('bcrypt');
const { abrirSesion } = require('../middleware/autenticacion');
const { 
    validarCorreo, 
    validarNombreUsuario 
} = require('../validaciones'); // Asegúrate de que la ruta apunte a tu archivo de validaciones

const {
    crearUsuario,
    obtenerUsuarioPorId,
    obtenerUsuarioPorCorreo,
    actualizarUsuario,
    obtenerVerificadorPorId,
    crearVerificador,
    actualizarVerificador,
    obtenerAdministradorPorCorreo,
    obtenerVerificadorPorCorreo,
    listarVerificadoresActivos,
    desactivarVerificador,
    correoEnUso,
} = require('../Modelo/usuario_modelo');
// --- REGISTRARSE ---
async function registrar(req, res) {
    try {
        const { nombre, correo, contrasena } = req.body;
        if (!validarNombreUsuario(nombre)) {
            return res.status(400).json({ error: 'El nombre debe tener entre 1 y 50 caracteres.' });
        }
        if (!validarCorreo(correo)) {
            return res.status(400).json({ error: 'Escribe un correo válido (máximo 45 caracteres).' });
        }
        if (!contrasena || String(contrasena).length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        }
        const correoLimpio = String(correo).trim();
       // 1. Validar que el correo no lo use nadie
        if (await correoEnUso(correoLimpio)) {
            return res.status(400).json({ error: 'El correo ya está registrado.' });
        }
        // 2. Hashear la contraseña (seguridad)
        const saltRounds = 10;
        const contrasenaHasheada = await bcrypt.hash(String(contrasena), saltRounds);
        // 3. Crear el usuario en la base de datos
        const nuevoUsuario = await crearUsuario({
            nombre: String(nombre).trim(),
            correo: correoLimpio,
            contrasena: contrasenaHasheada,
        });
        // 4. Responder (excluyendo la contraseña por seguridad)
        const { contrasena: _, ...usuarioSinPassword } = nuevoUsuario;
        return res.status(201).json({
            mensaje: 'Usuario registrado con éxito',
            usuario: usuarioSinPassword,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor al registrar.' });
    }
}
// --- INICIAR SESIÓN (usuarios, verificadores y administradores) ---
async function iniciarSesion(req, res) {
    try {
        const { correo, contrasena } = req.body;
        if (!correo || !contrasena) {
            return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
        }
        const correoLimpio = String(correo).trim();
        if (!validarCorreo(correoLimpio)) {
            return res.status(400).json({ error: 'Escribe un correo válido.' });
        }

        // 1. Buscar la cuenta: primero administrador, luego verificador, luego usuario
        let cuenta = await obtenerAdministradorPorCorreo(correoLimpio);
        let tipo = 'administrador';

        if (!cuenta) {
            cuenta = await obtenerVerificadorPorCorreo(correoLimpio);
            tipo = cuenta ? cuenta.rol : null; // 'verificador' o 'verificador_lider'
        }
        if (!cuenta) {
            cuenta = await obtenerUsuarioPorCorreo(correoLimpio);
            tipo = 'usuario';
        }
        if (!cuenta) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }

        // 2. Comparar la contraseña con la hasheada de la BD
        const esValida = await bcrypt.compare(String(contrasena), cuenta.contrasena);
        if (!esValida) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }

        // 3. Crear la sesión (cookie) y el JWT
        const token = await abrirSesion(req, cuenta, tipo);
        const { contrasena: _, ...cuentaSinPassword } = cuenta;
        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            token,
            usuario: { ...cuentaSinPassword, tipo },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
    }
}
// --- EDITAR PERFIL ---
async function actualizarPerfil(req, res) {
    try {
        const idUsuario = Number(req.params.id);
        const { nombre, correo, contrasena, contrasena_actual } = req.body;
        if (!Number.isInteger(idUsuario)) {
            return res.status(400).json({ error: 'El id de usuario no es válido.' });
        }
        if (!contrasena_actual) {
            return res.status(400).json({ error: 'Escribe tu contraseña actual para guardar los cambios.' });
        }
        // 1. Confirmar identidad con la contraseña actual
        const usuario = await obtenerUsuarioPorId(idUsuario);
        if (!usuario) {
            return res.status(404).json({ error: 'No se encontró el usuario.' });
        }
        const esValida = await bcrypt.compare(String(contrasena_actual), usuario.contrasena);
        if (!esValida) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }
        // 2. Validar y preparar solo lo que cambió
        const cambios = {};
        if (nombre !== undefined) {
            if (!validarNombreUsuario(nombre)) {
                return res.status(400).json({ error: 'El nombre debe tener entre 1 y 50 caracteres.' });
            }
            cambios.nombre = String(nombre).trim();
        }
        if (correo !== undefined) {
            const correoLimpio = String(correo).trim();
            if (!validarCorreo(correoLimpio)) {
                return res.status(400).json({ error: 'Escribe un correo válido (máximo 45 caracteres).' });
            }
            const otro = await obtenerUsuarioPorCorreo(correoLimpio);
            if (otro && otro.id_usuario !== idUsuario) {
                return res.status(409).json({ error: 'Ese correo ya está registrado por otra cuenta.' });
            }
            cambios.correo = correoLimpio;
        }
        if (contrasena) {
            if (String(contrasena).length < 8 || String(contrasena).length > 72) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener entre 8 y 72 caracteres.' });
            }
            cambios.contrasena = await bcrypt.hash(String(contrasena), 10);
        }
        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({ error: 'No hay cambios que guardar.' });
        }
        // 3. Guardar en BD y responder sin la contraseña
        const actualizado = await actualizarUsuario(idUsuario, cambios);
        const { contrasena: _, ...usuarioSinPassword } = actualizado;
        return res.json({ mensaje: 'Datos actualizados con éxito', usuario: usuarioSinPassword });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudieron guardar los cambios.' });
    }
}
const ROLES_VERIFICADOR = ['verificador', 'verificador_lider'];

// --- CREAR CUENTA DE VERIFICADOR (ADMIN) ---
async function registrarVerificador(req, res) {
    try {
        const { nombre, correo, contrasena, rol } = req.body;
        const idAdministrador = Number(req.body.id_administrador);

        if (!validarNombreUsuario(nombre)) {
            return res.status(400).json({ error: 'El nombre debe tener entre 1 y 50 caracteres.' });
        }
        if (!validarCorreo(correo)) {
            return res.status(400).json({ error: 'Escribe un correo válido.' });
        }
        if (!contrasena || String(contrasena).length < 8 || String(contrasena).length > 72) {
            return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' });
        }
        if (!ROLES_VERIFICADOR.includes(rol)) {
            return res.status(400).json({ error: 'Selecciona un rol válido.' });
        }
        if (!Number.isInteger(idAdministrador)) {
            return res.status(400).json({ error: 'Falta el administrador que crea la cuenta.' });
        }

        const correoLimpio = String(correo).trim();
        if (await correoEnUso(correoLimpio)) {
            return res.status(409).json({ error: 'Ese correo ya está registrado.' });
        }

        const contrasenaHasheada = await bcrypt.hash(String(contrasena), 10);
        const nuevo = await crearVerificador({
            nombre: String(nombre).trim(),
            correo: correoLimpio,
            contrasena: contrasenaHasheada,
            rol,
            id_administrador: idAdministrador,
        });

        const { contrasena: _, ...verificadorSinPassword } = nuevo;
        return res.status(201).json({
            mensaje: 'Cuenta de verificador creada con éxito',
            verificador: verificadorSinPassword,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error interno al crear el verificador.' });
    }
}

// --- LISTAR VERIFICADORES ACTIVOS (ADMIN) ---
async function listarVerificadores(req, res) {
    try {
        const verificadores = await listarVerificadoresActivos();
        return res.json(verificadores);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener la lista de verificadores.' });
    }
}

// --- CAMBIAR ROL O EDITAR VERIFICADOR (ADMIN) ---
async function modificarVerificador(req, res) {
    try {
        const idVerificador = Number(req.params.id);
        const { rol, nombre, correo } = req.body;

        if (!Number.isInteger(idVerificador)) {
            return res.status(400).json({ error: 'ID de verificador no válido.' });
        }

        const existente = await obtenerVerificadorPorId(idVerificador);
        if (!existente || existente.activo !== 1) {
            return res.status(404).json({ error: 'No se encontró el verificador.' });
        }

        const cambios = {};
        if (rol !== undefined) {
            if (!ROLES_VERIFICADOR.includes(rol)) {
                return res.status(400).json({ error: 'Rol no válido.' });
            }
            cambios.rol = rol;
        }
        if (nombre !== undefined) {
            if (!validarNombreUsuario(nombre)) {
                return res.status(400).json({ error: 'El nombre debe tener entre 1 y 50 caracteres.' });
            }
            cambios.nombre = String(nombre).trim();
        }
        if (correo !== undefined) {
            const correoLimpio = String(correo).trim();
            if (!validarCorreo(correoLimpio)) {
                return res.status(400).json({ error: 'Escribe un correo válido.' });
            }
            if (await correoEnUso(correoLimpio, idVerificador)) {
                return res.status(409).json({ error: 'Ese correo ya está registrado.' });
            }
            cambios.correo = correoLimpio;
        }
        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({ error: 'No hay cambios que guardar.' });
        }

        const actualizado = await actualizarVerificador(idVerificador, cambios);
        const { contrasena: _, ...verificadorSinPassword } = actualizado;
        return res.json({ mensaje: 'Verificador actualizado con éxito', verificador: verificadorSinPassword });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No se pudo actualizar el verificador.' });
    }
}

// --- ELIMINAR VERIFICADOR (ADMIN, borrado lógico) ---
async function eliminarVerificador(req, res) {
    try {
        const idVerificador = Number(req.params.id);
        if (!Number.isInteger(idVerificador)) {
            return res.status(400).json({ error: 'ID no válido.' });
        }

        const eliminado = await desactivarVerificador(idVerificador);
        if (!eliminado) {
            return res.status(404).json({ error: 'No se encontró el verificador.' });
        }
        return res.json({ mensaje: 'Cuenta de verificador eliminada con éxito' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al eliminar el verificador.' });
    }
}
module.exports = {
    registrar,
    iniciarSesion,
    actualizarPerfil,
    registrarVerificador,
    listarVerificadores,
    modificarVerificador,
    eliminarVerificador,
};