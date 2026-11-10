import { useEffect, useState } from 'react';
import { pedirJSON } from '../lib/api';
import ListaCreaciones from '../components/ListaCreaciones';

export default function Home() {
    const [creaciones, setCreaciones] = useState([]);
    const [error, setError] = useState('');

    // Se ejecuta una vez, cuando la página carga en el navegador
    useEffect(() => {
        pedirJSON('/creaciones')
            .then(setCreaciones)
            .catch((err) => setError(err.message));
    }, []);

    return (
        <main>
            <div className='seleccion'>
                <button>Recomendados</button>
                <button>Historial</button>
                <button>Mis Creaciones</button>
            </div>

            {/* agregar materiales como filtro */}

            {error && <p style={{ color: 'red' }}>{error}</p>}
            <ListaCreaciones listaCreaciones={creaciones} />
        </main>
    );
}