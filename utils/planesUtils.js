exports.PLANES = {
    prueba: { mensual: 100, trimestral: 300, semestral: 600, anual: 1200 },
    basico: {
        mensual: 29000,
        trimestral: 29000 * 3 * 0.90,
        semestral: 29000 * 6 * 0.85,
        anual: 29000 * 12 * 0.80
    },
    estandar: {
        mensual: 59900,
        trimestral: 59900 * 3 * 0.90,
        semestral: 59900 * 6 * 0.85,
        anual: 59900 * 12 * 0.80
    },
    premium: {
        mensual: 189000,
        trimestral: 189000 * 3 * 0.90,
        semestral: 189000 * 6 * 0.85,
        anual: 189000 * 12 * 0.80
    }
};

exports.LIMITES_PLANES = {
    basico: {
        empresas: 1,
        usuarios: 1
    },
    estandar: {
        empresas: 3,
        usuarios: 5
    },
    premium: {
        empresas: 10,
        usuarios: 15
    }
};