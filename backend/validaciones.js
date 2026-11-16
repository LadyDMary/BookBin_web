const regexContrasenaSegura = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).+$/;
const correo_valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCorreo(correo) {
    if (!correo || typeof correo !== 'string') return false;
    const correoLimpio = correo.trim();
    return correo_valido.test(correoLimpio) && correoLimpio.length <= 45;
}

function validarNombreUsuario(nombre) {
    if (!nombre || typeof nombre !== 'string') return false;
    const nombreLimpio = nombre.trim();
    return nombreLimpio.length >= 1 && nombreLimpio.length <= 50;
}

function validarContrasena(contrasena, confirmar) {
    if (contrasena != confirmar) return false;
    return typeof contrasena === 'string' &&
        typeof confirmar === 'string' &&
        contrasena.length >= 8 &&
        contrasena.length <= 128;
}

function validarContrasenaSegura(contrasena, confirmar) {
    return validarContrasena(contrasena, confirmar) &&
        regexContrasenaSegura.test(contrasena);
}

function validarCamposCreacion({ nombre, descripcion, instrucciones }, esBorrador) {
    if (!nombre) return 'El nombre es obligatorio.';
    if (nombre.length > 50) return 'El nombre no puede pasar de 50 caracteres.';
    if (descripcion.length > 100) return 'La descripción no puede pasar de 100 caracteres.';
    if (instrucciones.length > 500) return 'Las instrucciones no pueden pasar de 500 caracteres.';
    if (!esBorrador && (!descripcion || !instrucciones)) {
        return 'Para publicar, completa la descripción y las instrucciones.';
    }
    return null;
}
const MOTIVOS_REPORTE = ['inapropiado', 'spam', 'peligroso', 'plagio', 'otro'];

function validarReporte({ motivo, detalle }) {
    if (!MOTIVOS_REPORTE.includes(motivo)) return 'Selecciona un motivo válido.';
    if (detalle.length < 10) return 'Explica qué incumple (mínimo 10 caracteres).';
    if (detalle.length > 300) return 'La explicación no puede pasar de 300 caracteres.';
    return null;
}

module.exports = { 
    validarCorreo,
    validarNombreUsuario,
    validarContrasena, 
    validarContrasenaSegura, 
    validarCamposCreacion,
    validarReporte,
};