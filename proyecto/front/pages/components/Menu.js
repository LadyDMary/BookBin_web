import Link from 'next/link';

export default function Menu() {
  return (
    <nav>
      <h2>BookBin</h2>
      <Link href="/">Inicio</Link>
      <Link href="/guardados">Guardados</Link>
      <Link href="/notificaciones">Mi perfil</Link>
      <div class="search-box">
        <input type="text" placeholder="Value" />
        <button type="submit" class="search-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        </button>
        </div>
      <Link href="/perfil">Mi perfil</Link>
    </nav>
  );
}