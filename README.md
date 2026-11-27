# BookBin – Backend

API de **BookBin**, una plataforma para compartir manualidades hechas con materiales reciclados.
Proyecto aula de Programación Intermedia · CECyT 9 "Juan de Dios Bátiz" · Grupo 5IV7 · Equipo 6.

## Integrantes
- Arellano Ramírez Guadalupe Donaji
- Díaz Briseño Erick Gabriel
- Luan Lin Emiliano
- Meneses Hernández Luis Ángel

## Tecnologías
- Node.js + Express
- Supabase (PostgreSQL y Storage para las imágenes)
- express-session + JWT (jsonwebtoken) para la autenticación
- bcrypt para encriptar contraseñas
- multer para subir imágenes

## Estructura
```
backend/
├── server.js                 # Rutas y middlewares
├── bd-supabase.js            # Conexión a Supabase
├── almacenamiento_imagenes.js
├── almacen_sesiones.js       # Sesiones guardadas en Supabase
├── validaciones.js
├── middleware/               # Autenticación (JWT + sesión) y subida de imágenes
├── controlador/              # Lógica de cada ruta
└── Modelo/                   # Consultas a la base de datos
```

## Instalación
```bash
cd backend
npm install
```

Crea un archivo `.env` dentro de `backend/` con estas variables (pide los valores al equipo, **no los subas a GitHub**):

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
JWT_SECRET=una_frase_larga_y_secreta
SESSION_SECRET=otra_frase_larga_y_secreta
```

## Ejecutar
```bash
npm run dev     # desarrollo (se reinicia solo al guardar)
npm start       # producción
```
El servidor corre en `http://localhost:4000`.

## Tipos de cuenta
| Cuenta | Qué puede hacer |
|---|---|
| Invitado | Ver, buscar y filtrar creaciones |
| Usuario | Publicar, editar, guardar en favoritos, reportar y apelar |
| Verificador | Elegir y aprobar, rechazar o banear creaciones |
| Verificador líder | Revisar reportes y apelaciones |
| Administrador | Crear, cambiar de rol y eliminar verificadores |

## Rutas principales
| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/registrar`, `/api/login`, `/api/logout`, `/api/refresh` | Público |
| GET | `/api/creaciones`, `/api/creaciones/:id` | Público |
| POST / PUT / DELETE | `/api/creaciones` | Usuario |
| GET / POST / DELETE | `/api/favoritos` | Usuario |
| POST | `/api/creaciones/:id/reportes` | Usuario |
| GET / PUT / POST | `/api/notificaciones` | Usuario |
| — | `/api/verificador/...` | Verificadores |
| — | `/api/admin/verificadores` | Administrador |

## Despliegue
Desplegado en **Render** (Root Directory: `backend`, Build: `npm install`, Start: `npm start`).
Las variables del `.env` se configuran en Render → Environment.
