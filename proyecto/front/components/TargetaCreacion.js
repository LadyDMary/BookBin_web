import Link from 'next/link';

export default function TargetaCreacion({ creacion }) {
    return (
        <article className='targeta'>
            <div className='img-creacion-targeta'>
                {creacion.imagen && <img src={creacion.imagen} alt={creacion.nombre} />}
            </div>
            <div className='cont-creacion-targeta'>
                <small><button>Guardar</button></small>
                <h3>
                    <Link href={`/creaciones/${creacion.id_creacion}`}>{creacion.nombre}</Link>
                </h3>
                <p>{creacion.descripcion}</p>
            </div>
        </article>
    );
}