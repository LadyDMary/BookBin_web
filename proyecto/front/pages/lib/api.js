export async function pedirJSON(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(`/api${ruta}`, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...opciones.headers },
    });
  } catch {
    throw new Error('El backend no responde');
  }
  let datos = null;
  try { datos = await res.json(); } catch { datos = null; }
  if (!res.ok) throw new Error((datos && datos.error) || `Error ${res.status}`);
  return datos;
}