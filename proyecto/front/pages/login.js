import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from './registro.module.css';

export default function Login() {
    const router = useRouter();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');

        try {
            // La ruta del backend es /api/login
            const respuesta = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, contrasena })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.error || 'Error al iniciar sesión');
            }

            // Por ahora guardamos el usuario en el navegador.
            // Más adelante esto se reemplaza por un token (JWT) o una cookie.
            localStorage.setItem('usuario', JSON.stringify(datos.usuario));

            setMensaje('¡Inicio de sesión exitoso!');
            router.push('/');

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <main className={styles['registro-contenedor']}>
            <div className={styles['registro-tarjeta']}>
                <h3 className={styles['registro-encabezado']}>
                    ¡Inicia sesión y volvamos a armar!
                </h3>
                <h1>Bienvenido a Bookbin</h1>

                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
                {mensaje && <p style={{ color: 'green', textAlign: 'center' }}>{mensaje}</p>}

                <form onSubmit={handleSubmit}>
                    <div className={styles.campo}>
                        <label htmlFor="correo">
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            id="correo"
                            placeholder="Ingresa tu correo electrónico"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.campo}>
                        <label htmlFor="contrasena">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            id="contrasena"
                            placeholder="Ingresa tu contraseña"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit">
                        Iniciar sesión
                    </button>
                </form>

                <p className={styles['registro-enlace']}>
                    ¿No cuentas con una cuenta?{' '}
                    <Link href="/registro">
                        ¡Regístrate ahora!
                    </Link>
                </p>
            </div>
        </main>
    );
}