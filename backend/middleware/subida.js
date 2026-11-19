const multer = require('multer');

// La imagen se queda en memoria y luego se sube a Supabase Storage
// (ya no se guarda en la carpeta uploads de cada computadora)
const subida = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (permitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
        }
    },
});

module.exports = subida;