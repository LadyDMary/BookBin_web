import { useEffect, useState } from 'react';
import Link from 'next/link';
import { pedirJSON } from '../lib/api';
import TargetaCreacion from '../components/TargetaCreacion';
import styles from './index.module.css';

export default function Home() {
    const [creaciones, setCreaciones] = useState([]);
    const [usuario, setUsuario] = useState(null);
    const [pestana, setPestana] = useState('recomendados'); // 'recomendados' | 'mis-creaciones'
    const [mostrarMateriales, setMostrarMateriales] = useState(false);
    const [materialFiltro, setMaterialFiltro] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const u = localStorage.getItem('usuario');
        if (u) setUsuario(JSON.parse(u));

        pedirJSON('/creaciones')
            .then(setCreaciones)
            .catch((err) => setError(err.message));
    }, []);

    // Extraer materiales únicos disponibles
    const materialesDisponibles = Array.from(
        new Set(
            creaciones.flatMap((c) =>
                Array.isArray(c.materiales)
                    ? c.materiales.map((m) => m.nombre || m)
                    : []
            )
        )
    );

    const creacionesFiltradas = creaciones.filter((c) => {
        if (pestana === 'mis-creaciones') {
            const idUsuarioActual = usuario?.id_usuario ?? usuario?.id;
            const idAutor = c.id_usuario ?? c.usuario_id;
            if (!idUsuarioActual || idAutor !== idUsuarioActual) return false;
        }
        if (materialFiltro) {
            const lista = Array.isArray(c.materiales)
                ? c.materiales.map((m) => m.nombre || m)
                : [];
            if (!lista.includes(materialFiltro)) return false;
        }
        return true;
    });

    async function manejarGuardar(idCreacion) {
        if (!usuario) {
            alert('Inicia sesión para guardar creaciones');
            return;
        }
        try {
            await pedirJSON('/guardados', {
                method: 'POST',
                body: JSON.stringify({
                    id_usuarios: usuario.id_usuario ?? usuario.id,
                    id_creacion: idCreacion,
                }),
            });
            alert('¡Creación guardada!');
        } catch (err) {
            alert(err.message);
        }
    }

    return (
        <main className={styles.fondo}>
            {/* Solo Recomendados y Mis Creaciones */}
            <div className={styles.pestanas}>
                <button
                    type="button"
                    className={`${styles.pestana} ${pestana === 'recomendados' ? styles.pestanaActiva : ''}`}
                    onClick={() => setPestana('recomendados')}
                >
                    Recomendados
                </button>
                <button
                    type="button"
                    className={`${styles.pestana} ${pestana === 'mis-creaciones' ? styles.pestanaActiva : ''}`}
                    onClick={() => setPestana('mis-creaciones')}
                >
                    Mis Creaciones
                </button>
            </div>

            {/* Desplegable de Materiales */}
            <div className={styles.barraMateriales}>
                <button
                    type="button"
                    className={styles.botonMateriales}
                    onClick={() => setMostrarMateriales(!mostrarMateriales)}
                >
                    <span>Materiales {materialFiltro ? `(${materialFiltro})` : ''}</span>
                    <span>{mostrarMateriales ? 'v' : '>'}</span>
                </button>

                {mostrarMateriales && (
                    <div className={styles.listaChips}>
                        <button
                            type="button"
                            className={`${styles.chip} ${materialFiltro === '' ? styles.chipActivo : ''}`}
                            onClick={() => setMaterialFiltro('')}
                        >
                            Todos
                        </button>
                        {materialesDisponibles.map((mat) => (
                            <button
                                key={mat}
                                type="button"
                                className={`${styles.chip} ${materialFiltro === mat ? styles.chipActivo : ''}`}
                                onClick={() => setMaterialFiltro(mat)}
                            >
                                #{mat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Contenedor de tarjetas */}
            <section className={styles.contenedorLista}>
                <div>
                    {error && <p style={{ color: '#ffdddd' }}>{error}</p>}

                    {creacionesFiltradas.length === 0 ? (
                        <p style={{ color: '#DCE6EC', textAlign: 'center', marginTop: '20px' }}>
                            No hay creaciones para mostrar en esta sección.
                        </p>
                    ) : (
                        <div className={styles.listaCreacion}>
                            {creacionesFiltradas.map((c) => (
                                <TargetaCreacion
                                    key={c.id_creacion ?? c.id}
                                    creacion={c}
                                    onGuardar={manejarGuardar}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {pestana === 'mis-creaciones' && (
                    <div className={styles.contenedorBotonNueva}>
                        <Link href="/creaciones/nueva" className={styles.botonNuevaCreacion}>
                            Nueva Creacion
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}