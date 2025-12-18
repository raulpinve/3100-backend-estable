exports.PLANES = {
    basico: {
        mensual: 1500,
        trimestral: 1500 * 3 * 0.90,
        semestral: 1500 * 6 * 0.85,
        anual: 1500 * 12 * 0.80
    },
    estandar: {
        mensual: 2000,
        trimestral: 2000 * 3 * 0.90,
        semestral: 2000 * 6 * 0.85,
        anual: 2000 * 12 * 0.80
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

exports.NIVELES_PLANES = {
  basico: 1,
  estandar: 2,
  premium: 3
};
