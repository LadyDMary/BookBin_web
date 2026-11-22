// Almacén de sesiones de express-session guardado en Supabase (tabla "sesiones").
// Hace lo mismo que el MySQLStore de la clase, pero para nuestra base de datos en Postgres.
const session = require('express-session');
const supabase = require('./bd-supabase');

const UN_DIA = 1000 * 60 * 60 * 24;

function fechaDeExpiracion(sesion) {
    const expira = sesion && sesion.cookie && sesion.cookie.expires;
    return expira ? new Date(expira) : new Date(Date.now() + UN_DIA);
}

class AlmacenSesionesSupabase extends session.Store {
    // Obtener una sesión por su id (sid)
    get(sid, callback) {
        supabase
            .from('sesiones')
            .select('datos, expira')
            .eq('sid', sid)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) return callback(error);
                if (!data || new Date(data.expira) <= new Date()) return callback(null, null);
                return callback(null, data.datos);
            }, callback);
    }

    // Crear o actualizar una sesión
    set(sid, sesion, callback = () => {}) {
        supabase
            .from('sesiones')
            .upsert({ sid, datos: sesion, expira: fechaDeExpiracion(sesion).toISOString() })
            .then(({ error }) => {
                // De vez en cuando borra las sesiones vencidas para que la tabla no crezca sin fin
                if (!error && Math.random() < 0.05) {
                    supabase.from('sesiones').delete().lt('expira', new Date().toISOString()).then(() => {}, () => {});
                }
                callback(error || null);
            }, callback);
    }

    // Borrar una sesión (cerrar sesión)
    destroy(sid, callback = () => {}) {
        supabase
            .from('sesiones')
            .delete()
            .eq('sid', sid)
            .then(({ error }) => callback(error || null), callback);
    }

    // Renovar la expiración sin cambiar los datos (cuando rolling: true)
    touch(sid, sesion, callback = () => {}) {
        supabase
            .from('sesiones')
            .update({ expira: fechaDeExpiracion(sesion).toISOString() })
            .eq('sid', sid)
            .then(({ error }) => callback(error || null), callback);
    }
}

module.exports = { AlmacenSesionesSupabase };
