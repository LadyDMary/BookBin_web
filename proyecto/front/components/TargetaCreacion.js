import Link from 'next/link';
import styles from './TargetaCreacion.module.css';

export default function TargetaCreacion({ creacion, onGuardar }) {
    const id = creacion.id_creacion ?? creacion.id;
    const materialesTexto = Array.isArray(creacion.materiales)
        ? creacion.materiales.map((m) => `#${m.nombre || m}`).join(' ')
        : creacion.materiales || '#Material';

    return (    
        <article className={styles.fila}>
            <div className={styles.imagenCaja}>
                {creacion.imagen ? (                   
                    <img 
                        src={creacion.imagen.startsWith('http') ? creacion.imagen : `http://localhost:4000${creacion.imagen}`} 
                        alt={creacion.nombre} 
                    />
                ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#6B8797">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                )}
            </div>

            <div className={styles.contenido}>
                <button
                    type="button"
                    className={styles.botonGuardar}
                    title="Guardar creación"
                    onClick={() => onGuardar && onGuardar(id)}
                >
                    <svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                </button>

                <div className={styles.encabezado}>
                    <Link href={`/creaciones/${id}`} className={styles.titulo}>
                        {creacion.nombre}
                    </Link>
                </div>

                <div className={styles.filaMateriales}>
                    <span>{materialesTexto}</span>
                    <Link href={`/creaciones/${id}`} className={styles.verMas}>Más..</Link>
                </div>

                <div className={styles.filaDescripcion}>
                    <p className={styles.descripcionTexto}>{creacion.descripcion}</p>
                    <Link href={`/creaciones/${id}`} className={styles.verMas}>Más...</Link>
                </div>
            </div>
        </article>
    );
}