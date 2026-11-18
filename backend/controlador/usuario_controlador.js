const bcrypt = require('bcrypt');
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
} = require('../modelo/usuario_modelo');
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
// --- INICIAR SESIÓN ---
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
        // 1. Buscar al usuario por correo
        const usuario = await obtenerUsuarioPorCorreo(correoLimpio);
        if (!usuario) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }
        // 2. Comparar la contraseña ingresada con la hasheada de la BD
        const esValida = await bcrypt.compare(String(contrasena), usuario.contrasena);
        if (!esValida) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }
        // 3. Inicio exitoso (excluyendo la contraseña)
        const { contrasena: _, ...usuarioSinPassword } = usuario;
        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: usuarioSinPassword,
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
module.exports = {
    registrar,
    iniciarSesion,
    actualizarPerfil,
};