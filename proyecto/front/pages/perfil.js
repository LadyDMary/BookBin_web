import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { pedirJSON } from '../lib/api';
import styles from './perfil.module.css';

const CAMPOS = [
    { clave: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', maximo: 45 },
    { clave: 'nombre', etiqueta: 'Nombre de usuario', tipo: 'text', maximo: 50 },
    { clave: 'contrasena', etiqueta: 'Contraseña', tipo: 'password', maximo: 72 },
];

const SIN_EDICION = { correo: false, nombre: false, contrasena: false };

function IconoEditar() {
    return (
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

export default function Perfil() {
    const router = useRouter();

    // undefined = todavía leyendo el navegador, null = no hay sesión
    const [usuario, setUsuario] = useState(undefined);
    const [valores, setValores] = useState({ correo: '', nombre: '', contrasena: '' });
    const [editando, setEditando] = useState(SIN_EDICION);
    const [contrasenaActual, setContrasenaActual] = useState('');
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        try {
            const guardado = JSON.parse(localStorage.getItem('usuario'));
            setUsuario(guardado || null);
            if (guardado) {
                setValores({ correo: guardado.correo, nombre: guardado.nombre, contrasena: '' });
            }
        } catch {
            setUsuario(null);
        }
    }, []);

    if (usuario === undefined) {
        return <main className={styles.pagina}><p className={styles.aviso}>Cargando…</p></main>;
    }

    if (usuario === null) {
        return (
            <main className={styles.pagina}>
                <p className={styles.aviso}>
                    Inicia sesión para ver tu perfil. <Link href="/login">Ir a iniciar sesión</Link>
                </p>
            </main>
        );
    }

    // ¿Qué datos cambió la persona respecto a lo guardado?
    const cambios = {};
    if (editando.correo && valores.correo.trim() !== usuario.correo) cambios.correo = valores.correo.trim();
    if (editando.nombre && valores.nombre.trim() !== usuario.nombre) cambios.nombre = valores.nombre.trim();
    if (editando.contrasena && valores.contrasena !== '') cambios.contrasena = valores.contrasena;
    const hayCambios = Object.keys(cambios).length > 0;

    const alternarEdicion = (clave) => {
        setError('');
        setMensaje('');
        if (editando[clave]) {
            // Cancelar: se regresa al valor guardado
            setValores({ ...valores, [clave]: clave === 'contrasena' ? '' : usuario[clave] });
        }
        setEditando({ ...editando, [clave]: !editando[clave] });
    };

    const guardar = async () => {
        setError('');
        setMensaje('');

        if (!hayCambios) {
            setError('No hay cambios que guardar.');
            return;
        }
        if (cambios.contrasena && cambios.contrasena.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (!contrasenaActual) {
            setError('Escribe tu contraseña actual para confirmar los cambios.');
            return;
        }

        setGuardando(true);
        try {
            const datos = await pedirJSON(`/usuarios/${usuario.id_usuario}`, {
                method: 'PUT',
                body: JSON.stringify({ ...cambios, contrasena_actual: contrasenaActual }),
            });

            localStorage.setItem('usuario', JSON.stringify(datos.usuario));
            setUsuario(datos.usuario);
            setValores({ correo: datos.usuario.correo, nombre: datos.usuario.nombre, contrasena: '' });
            setEditando(SIN_EDICION);
            setContrasenaActual('');
            setMensaje('Tus datos se actualizaron.');
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const cerrarSesion = () => {
        localStorage.removeItem('usuario');
        router.push('/login');
    };

    return (
        <main className={styles.pagina}>
            <section className={styles.panel}>
                <div className={styles.cuenta}>
                    <h1 className={styles.titulo}>Cuenta</h1>

                    {CAMPOS.map((campo) => (
                        <div className={styles.fila} key={campo.clave}>
                            <label className={styles.etiqueta} htmlFor={`campo-${campo.clave}`}>
                                {campo.etiqueta}
                            </label>

                            {editando[campo.clave] ? (
                                <input
                                    id={`campo-${campo.clave}`}
                                    className={styles.entrada}
                                    type={campo.tipo}
                                    value={valores[campo.clave]}
                                    maxLength={campo.maximo}
                                    placeholder={campo.clave === 'contrasena' ? 'Nueva contraseña' : ''}
                                    autoComplete={campo.clave === 'contrasena' ? 'new-password' : 'off'}
                                    autoFocus
                                    onChange={(e) => setValores({ ...valores, [campo.clave]: e.target.value })}
                                />
                            ) : (
                                <span className={styles.valor} id={`campo-${campo.clave}`}>
                                    {campo.clave === 'contrasena' ? '••••••••••••' : usuario[campo.clave]}
                                </span>
                            )}

                            <button
                                type="button"
                                className={styles.editar}
                                onClick={() => alternarEdicion(campo.clave)}
                                aria-label={`${editando[campo.clave] ? 'Cancelar edición de' : 'Editar'} ${campo.etiqueta.toLowerCase()}`}
                                aria-pressed={editando[campo.clave]}
                            >
                                <IconoEditar />
                            </button>
                        </div>
                    ))}

                    {hayCambios && (
                        <div className={styles.confirmar}>
                            <label className={styles.etiqueta} htmlFor="contrasena-actual">
                                Contraseña actual
                            </label>
                            <input
                                id="contrasena-actual"
                                className={styles.entrada}
                                type="password"
                                value={contrasenaActual}
                                autoComplete="current-password"
                                placeholder="Para confirmar los cambios"
                                onChange={(e) => setContrasenaActual(e.target.value)}
                            />
                        </div>
                    )}

                    {error && <p className={styles.error} role="alert">{error}</p>}
                    {mensaje && <p className={styles.exito} role="status">{mensaje}</p>}
                </div>

                <div className={styles.acciones}>
                    <button
                        type="button"
                        className={styles.guardar}
                        onClick={guardar}
                        disabled={!hayCambios || guardando}
                    >
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button type="button" className={styles.cerrar} onClick={cerrarSesion}>
                        Cerrar sesión
                    </button>
                </div>
            </section>
        </main>
    );
}