const TOKEN_EXPIRATION_TIME = process.env.TOKEN_EXPIRATION_TIME;
const PRIVATE_KEY = process.env.SECRET_KEY_JWT || "";
const SECRET = process.env.SECRET_KEY_IMAGE;
const jwt = require("jsonwebtoken");
const tiposValidos = ["usuario", "firma"];
const bcrypt = require("bcrypt");

const generarTokenImagen = (tipoEntidad, id, thumbnail = false) => {
    if (!tiposValidos.includes(tipoEntidad)) {
      throw new Error(`Tipo de entidad inválido: ${tipoEntidad}`);
    }
    const campoId = `${tipoEntidad}Id`;
    const token = jwt.sign({ [campoId]: id }, SECRET, { expiresIn: '1h' });
    return `/images/${tipoEntidad}s/${id}/avatar${thumbnail ? "/thumbnail" : ""}?token=${token}`;
}

const generarTokenFirma = (archivoNombre) => {
    if (!archivoNombre || typeof archivoNombre !== "string") {
        throw new Error("Nombre de archivo inválido para firma.");
    }

    const token = jwt.sign({ tipo: "firma", archivo: archivoNombre }, SECRET, { expiresIn: "10m" });

    // Devuelve la URL de acceso con token y nombre del archivo en la ruta
    return `/images/firmas/${archivoNombre}?token=${token}`;
};

const hashearContrasena = (password) => {
    return bcrypt.hashSync(password, 10);
}

const compararPasswordHasheada = (password, hashedPassword) => {
    return bcrypt.compareSync(password, hashedPassword)
}

const generarTokenRestablecerContrasena = () => {
    return crypto.randomBytes(20).toString('hex'); // Genera un token aleatorio de 40 caracteres
}

const generarTokenAutenticacion = (usuario) => {
    const payload = {
        id: usuario.id,
        primerNombre: usuario.primer_nombre,
        apellidos: usuario.apellidos,
        email: usuario.email,
        username: usuario.username,
        rol: usuario.rol,
        empresaId: usuario.empresa_id, 
        avatar: usuario.avatar,
        avatarThumbnail: usuario.avatar_thumbnail, 
        emailVerificado: usuario.email_verificado
    } 
    const token = jwt.sign(payload, PRIVATE_KEY, { 
        expiresIn: TOKEN_EXPIRATION_TIME
    })
    return { payload, token }
}

const validatePassword = (password) => {
  // Regular expression for password validation:
  // It must contain at least one uppercase letter.
  // It must contain at least one digit.
  // It must contain at least one special character from the set: !@#$%^&*()_+\-\={}[\]:;\"'<>,.?\\/]
  // It must be between 8 and 20 characters in length.
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-\={}[\]:;\"'<>,.?\\/]).{8,20}$/.test(password)
}

const verificarTokenImagen = (token, idEsperado, campoId) => {
    try {
        const payload = jwt.verify(token, SECRET);
        if (payload[campoId] != idEsperado) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

const verificarTokenFirma = (token, archivoEsperado) => {
    try {
        const payload = jwt.verify(token, SECRET);

        // Validar tipo y nombre de archivo
        if (payload.tipo !== "firma" || payload.archivo !== archivoEsperado) {
            return null;
        }

        return payload;
    } catch (err) {
        return null;
    }
};

module.exports = {
    generarTokenAutenticacion,
    generarTokenImagen,
    hashearContrasena,
    compararPasswordHasheada,
    generarTokenRestablecerContrasena, 
    validatePassword,
    verificarTokenImagen,
    generarTokenFirma,
    verificarTokenFirma
}