const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Las imágenes se guardan en backend/uploads
const carpeta = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(carpeta, { recursive: true });

const almacenamiento = multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpeta),
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
});

const subida = multer({
    storage: almacenamiento,
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