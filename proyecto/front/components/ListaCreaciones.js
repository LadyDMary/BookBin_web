import TargetaCreacion from './TargetaCreacion';

export default function ListaCreaciones({ listaCreaciones }) {
    return (
        <article className='targeta'>
            <div className='listaCreacion'>
                {listaCreaciones.map((c) => (
                    <TargetaCreacion key={c.id_creacion} creacion={c} />
                ))}
            </div>
        </article>
    );
}