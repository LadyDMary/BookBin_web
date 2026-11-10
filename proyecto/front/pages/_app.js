import Menu from '../components/Menu';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
    const router = useRouter();

    const ocultarMenu =
        router.pathname === '/registro' ||
        router.pathname === '/login';

    return (
        <>
            {!ocultarMenu && <Menu />}
            <Component {...pageProps} />
        </>
    );
}