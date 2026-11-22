// Lista negra de tokens revocados (los que se cerraron antes de expirar)
const supabase = require('../bd-supabase');

async function revocar(jti, idCuenta, tipo, exp) {
    const { error } = await supabase
        .from('tokens_revocados')
        .upsert(
            { jti, id_cuenta: idCuenta, tipo, expira: new Date(exp * 1000).toISOString() },
            { onConflict: 'jti', ignoreDuplicates: true }
        );
    if (error) throw error;

    // Limpieza: los tokens ya vencidos no necesitan seguir en la lista
    await supabase.from('tokens_revocados').delete().lt('expira', new Date().toISOString());
}

async function estaRevocado(jti) {
    const { data, error } = await supabase
        .from('tokens_revocados')
        .select('jti')
        .eq('jti', String(jti || ''))
        .maybeSingle();

    if (error) throw error;
    return Boolean(data);
}

module.exports = { revocar, estaRevocado };
