import Link from 'next/link';
import Targeta from '../components/TargetaCreacion';

import {} from '../lib/formato'

export default function ListaCreacion({listaCreaciones}) {

    return (
        <article className='targeta'>
            <div className='listaCreacion'>
                {listaCreaciones.map((t) => <Targeta key={t.id} creaccion={t}/>)}
            </div>
        </article>
    );
}