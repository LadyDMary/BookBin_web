const bcrypt = require('bcrypt');

const { crearUsuario, obtenerUsuarioPorCorreo } = require('../modelo/usuario_modelo');

// --- REGISTRARSE ---
async function registrar(req, res) {
    try {
        const { nombre, correo, contrasena } = req.body;

        if (!nombre || !correo || !contrasena) {
            return res.status(400).json({ error: 'nombre, correo y contrasena son obligatorios.' });
        }

        // 1. Validar que el usuario no exista ya
        const usuarioExistente = await obtenerUsuarioPorCorreo(correo);
        if (usuarioExistente) {
            return res.status(400).json({ error: 'El correo ya está registrado.' });
        }

        // 2. Hashear la contraseña (seguridad)
        const saltRounds = 10;
        const contrasenaHasheada = await bcrypt.hash(contrasena, saltRounds);

        // 3. Crear el usuario en la base de datos con la contraseña hasheada
        const nuevoUsuario = await crearUsuario({
            nombre,
            correo,
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
            return res.status(400).json({ error: 'correo y contrasena son obligatorios.' });
        }

        // 1. Buscar al usuario por correo
        const usuario = await obtenerUsuarioPorCorreo(correo);
        if (!usuario) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }

        // 2. Comparar la contraseña ingresada con la hasheada de la BD
        const esValida = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!esValida) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        }

        // 3. Inicio exitoso (más adelante aquí se generaría un token JWT)
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

module.exports = {
    registrar,
    iniciarSesion,
};