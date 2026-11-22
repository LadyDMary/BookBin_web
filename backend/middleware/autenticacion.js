// Sesiones + JWT:
//  - La SESIÓN (cookie httpOnly guardada en la tabla "sesiones") identifica al navegador y dura más.
//  - El JWT (encabezado Authorization) autoriza cada petición y dura poco.
//  - Para entrar a una ruta protegida se necesitan LOS DOS y deben ser de la misma cuenta.
//  - Cuando el JWT expira, el front pide uno nuevo a /api/refresh usando la sesión.
//  - Al cerrar sesión se destruye la sesión y el JWT va a la lista negra (tokens_revocados).
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Tokens = require('../Modelo/token_modelo');

const SECRETO_JWT = process.env.JWT_SECRET;
if (!SECRETO_JWT) {
    throw new Error('Falta JWT_SECRET en el archivo .env');
}
const EXPIRA_JWT = process.env.JWT_EXPIRA || '15m';
const NOMBRE_COOKIE = 'bookbin.sid';

// Cada tipo de cuenta guarda su id en una columna distinta
const CAMPO_ID = {
    usuario: 'id_usuario',
    administrador: 'id_administrador',
    verificador: 'id_verificador',
    verificador_lider: 'id_verificador',
};

// Crea un JWT con un identificador único (jti) para poder revocarlo
function firmarToken({ id, tipo, nombre }) {
    return jwt.sign(
        { sub: String(id), tipo, nombre },
        SECRETO_JWT,
        { algorithm: 'HS256', expiresIn: EXPIRA_JWT, jwtid: crypto.randomUUID() }
    );
}

// Al iniciar sesión: nuevo id de sesión (evita la fijación de sesión), se guarda la cuenta y se firma el JWT
function abrirSesion(req, cuenta, tipo) {
    const datos = { id: Number(cuenta[CAMPO_ID[tipo]]), tipo, nombre: cuenta.nombre };

    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) return reject(error);
            req.session.usuario = datos;
            req.session.creada = Date.now();
            req.session.save((errorGuardar) => {
                if (errorGuardar) return reject(errorGuardar);
                resolve(firmarToken(datos));
            });
        });
    });
}

// 401: falta el token o la sesión, son inválidos, expiraron, fueron revocados o no coinciden
async function requiereJWT(req, res, next) {
    const encabezado = req.headers.authorization || '';
    if (!encabezado.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    }

    let datos;
    try {
        datos = jwt.verify(encabezado.slice('Bearer '.length), SECRETO_JWT, { algorithms: ['HS256'] });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado', codigo: 'TOKEN_EXPIRADO' });
        }
        return res.status(401).json({ error: 'Sesión no válida, vuelve a iniciar sesión.' });
    }

    try {
        if (await Tokens.estaRevocado(datos.jti)) {
            return res.status(401).json({ error: 'Tu sesión fue cerrada, vuelve a iniciar sesión.' });
        }
    } catch (error) {
        return next(error);
    }

    // El token debe pertenecer a la misma cuenta que la sesión de este navegador
    const sesion = req.session && req.session.usuario;
    if (!sesion || sesion.id !== Number(datos.sub) || sesion.tipo !== datos.tipo) {
        return res.status(401).json({ error: 'Tu sesión terminó, vuelve a iniciar sesión.' });
    }

    req.usuario = {
        id: Number(datos.sub),
        tipo: datos.tipo,
        nombre: datos.nombre,
        jti: datos.jti,
        exp: datos.exp,
    };
    next();
}

// 403: hay sesión y token válidos, pero el tipo de cuenta no tiene permiso
function requiereTipo(...tipos) {
    return (req, res, next) => {
        if (!tipos.includes(req.usuario.tipo)) {
            return res.status(403).json({ error: 'No tienes permiso para hacer esto.' });
        }
        next();
    };
}

// Reemplaza el id que mande el navegador por el del token: nadie puede actuar a nombre de otro.
// En rutas con imagen va DESPUÉS de subida.single(), que es quien llena req.body.
function fijarIdDelToken(campo) {
    return (req, res, next) => {
        req.body = req.body || {};
        req.body[campo] = req.usuario.id;
        next();
    };
}

// Para rutas como /api/usuarios/:id: solo puedes usar tu propio id
function soloSuPropioId(parametro) {
    return (req, res, next) => {
        if (Number(req.params[parametro]) !== req.usuario.id) {
            return res.status(403).json({ error: 'Solo puedes acceder a tu propia cuenta.' });
        }
        next();
    };
}

// POST /api/refresh: con una sesión activa entrega un JWT nuevo (el anterior ya expiró)
function refrescarToken(req, res) {
    const sesion = req.session && req.session.usuario;
    if (!sesion) {
        return res.status(401).json({ error: 'Tu sesión terminó, vuelve a iniciar sesión.' });
    }
    return res.json({ token: firmarToken(sesion) });
}

// POST /api/logout: revoca el JWT (si viene uno válido) y destruye la sesión
async function cerrarSesion(req, res, next) {
    try {
        const encabezado = req.headers.authorization || '';
        if (encabezado.startsWith('Bearer ')) {
            try {
                const datos = jwt.verify(encabezado.slice('Bearer '.length), SECRETO_JWT, { algorithms: ['HS256'] });
                await Tokens.revocar(datos.jti, Number(datos.sub), datos.tipo, datos.exp);
            } catch {
                // Token vencido o inválido: ya no sirve, no hace falta revocarlo
            }
        }

        if (!req.session) {
            res.clearCookie(NOMBRE_COOKIE);
            return res.json({ mensaje: 'Sesión cerrada' });
        }
        req.session.destroy((error) => {
            if (error) return next(error);
            res.clearCookie(NOMBRE_COOKIE);
            return res.json({ mensaje: 'Sesión cerrada' });
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    NOMBRE_COOKIE,
    abrirSesion,
    requiereJWT,
    requiereTipo,
    fijarIdDelToken,
    soloSuPropioId,
    refrescarToken,
    cerrarSesion,
};
