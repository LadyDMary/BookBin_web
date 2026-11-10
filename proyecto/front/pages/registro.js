import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from './registro.module.css';

export default function Registro() {
    const router = useRouter();
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');

        try {
            const respuesta = await fetch('/api/registrar', { // Ajusta la ruta de tu API según corresponda
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, correo, contrasena })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(datos.error || 'Error al registrarse');
            }

            setMensaje('¡Usuario registrado con éxito! Redirigiendo...');
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <main className={styles['registro-contenedor']}>
            <div className={styles['registro-tarjeta']}>
                <h3 className={styles['registro-encabezado']}>
                    Regístrate y empieza a armar
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

                    <div className={styles.campo}>
                        <label htmlFor="usuario">
                            Nombre de usuario
                        </label>
                        <input
                            type="text"
                            id="usuario"
                            placeholder="Ingresa tu nombre de usuario"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit">
                        Registrarse
                    </button>
                </form>

                <p className={styles['registro-enlace']}>
                    ¿Ya cuentas con una cuenta?{' '}
                    <Link href="/login">
                        ¡Inicia sesión!
                    </Link>
                </p>
            </div>
        </main>
    );
}