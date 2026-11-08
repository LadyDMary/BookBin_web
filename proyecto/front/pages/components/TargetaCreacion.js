import Link from 'next/link';

import {} from '../lib/formato'

export default function TargetaCreacion({creacion}) {
    return (
        <article className='targeta'>
            <div className='img-creacion-targeta'><img /></div>
            <div className='cont-creacion-targeta'>
                <small><button>Guardar</button></small>
                <h3>
                    <Link href={`/creaciones/${creacion.id}`}>{creacion.nombre}</Link>
                </h3>
                <p>{creacion.descripcion}</p>
            </div>
        </article>
    );
}