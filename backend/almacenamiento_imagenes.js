// Guarda y borra las imágenes de las creaciones en Supabase Storage,
// así todos los integrantes ven las mismas imágenes sin pasarse archivos.
const fs = require('fs');
const path = require('path');
const supabase = require('./bd-supabase');

const BUCKET = 'creaciones';
const EXTENSIONES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Sube la imagen que recibió multer (en memoria) y regresa su URL pública
async function subirImagen(archivo) {
    const extension = EXTENSIONES[archivo.mimetype] || path.extname(archivo.originalname).toLowerCase();
    const nombre = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(nombre, archivo.buffer, { contentType: archivo.mimetype, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre);
    return data.publicUrl;
}

// Borra una imagen. Acepta URLs de Storage y también rutas viejas tipo /uploads/archivo.jpg
async function borrarImagen(imagen) {
    if (!imagen) return;

    try {
        const marca = `/storage/v1/object/public/${BUCKET}/`;
        const posicion = imagen.indexOf(marca);

        if (posicion !== -1) {
            const nombre = decodeURIComponent(imagen.slice(posicion + marca.length));
            const { error } = await supabase.storage.from(BUCKET).remove([nombre]);
            if (error) console.error('No se pudo borrar la imagen de Storage:', error.message);
            return;
        }

        if (imagen.startsWith('/uploads/')) {
            const rutaLocal = path.join(__dirname, 'uploads', path.basename(imagen));
            fs.unlink(rutaLocal, () => {});
        }
    } catch (error) {
        // Si no se puede borrar una imagen, no debe tumbar la petición
        console.error('Error al borrar imagen:', error);
    }
}

module.exports = { subirImagen, borrarImagen };