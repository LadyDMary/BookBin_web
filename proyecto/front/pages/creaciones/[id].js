import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { pedirJSON } from '../../lib/api';
import styles from './nueva.module.css';

export default function Creacion() {
    const router = useRouter();
    const {id} = router.query;

    async function cargar() {
        
        const [errorCarga, setErrorCarga] = useState('');
        const [errorGuardar, setErrorGuardar] = useState('')
        const [exito, setExito] = useState('');
        const [creacion, setCreacion] = useState(null);
        const [usuario, setUsuario] = useState(null);

        try {
            setCreacion(await pedirJSON(`/creaciones/${id}`));
            setErrorCarga('');
        } catch (e) {
            setErrorCarga(e.message);
        }

        useEffect(() => {
            if (!router.isReady) return;
            cargar();
        }, [router.isReady, id]);
    }

    async function guardarCreacion(e) {
        e.preventDefrault();
        setExito('');
        setErrorGuardar('');

        if (!usuario) return setErrorGuardar('Inicia Sesion para guardar una creacion');
        
        if(guardados.some((a) => a.creacion_id === creacion.id && a.usuario_id === usuario.id)) return setErrorCarga('Ya has guardado esta Creacion');

        try {
            await pedirJSON('/guardados', {
                method: 'POST',
                body: JSON.stringify({
                    id_usuarios: usuario.id,
                    id_creacion: creacion.id
                })
            });
        } catch (err) {
            setErrorGuardar(errorToJSON.message);
        }

        if (errorCarga) return <main><p className='error'>{errorCarga}</p></main>;
        
        const usuarioCreacion = await pedirJSON('/musuarios', {
            method: 'POST',
            body: JSON.stringify({})
        });

        return (
            <main>
                <div className='contenedor-creacion-datos'>
                    <h1>{creacion.nombre}</h1>
                    <p><strong>Creacion de {usuarioCreacion.nombre}</strong></p>
                    <p>{creacion.descripcion}</p>
                </div>
                <div className='contenedor-creacion-contenido'>
                    <p>{creacion.instrucciones}</p>
                </div>
                <div className='contenedor-creacion-botones'>
                    <button className='boton-1' onClick={guardarCreacion()}>Guardar</button>
                    <Link className='Boton-Link' href='/index'>Regresar</Link>
                    <button className='boton-2'>Reportar</button>
                </div>
                </main>
        );

    }

}