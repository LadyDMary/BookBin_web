const regexContrasenaSegura =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).+$/;

function validarContrasena(contrasena, confirmar) {
    if(contrasena != confirmar) return false;
    return typeof contrasena === 'string' &&
    typeof confirmar === 'string' &&
    contrasena.length >= 8 &&
    contrasena.length <= 128;
}

function validarContrasenaSegura(contrasena, confirmar) {
    return validarContrasena(contrasena, confirmar) &&
    regexContrasenaSegura.test(contrasena);
}

