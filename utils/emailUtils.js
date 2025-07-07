const nodemailer = require('nodemailer')
const { throwGoneError } = require('../errors/throwHTTPErrors')
const jwt = require('jsonwebtoken')

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
})

const enviarEmailVerificacion = async (usuario) => {
    try {
        const verificationToken = jwt.sign({ email: usuario.email }, process.env.SECRET_KEY_JWT_EMAIL_VERIFICATION, { expiresIn: '1d' })

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: usuario.email,
            subject: 'Verificación de cuenta de correo electrónico',
            html: `
                <p>Hola ${usuario.username},</p>
                <p>Por favor haz clic en el siguiente enlace para verificar tu cuenta:</p>
                <a href="${process.env.DOMINIO}/${verificationToken}/verificar-email">Verificar Email</a>`
        };
        await transporter.sendMail(mailOptions)
    } catch (error) {
        throw new Error(error)
    }
}

module.exports = {
    enviarEmailVerificacion
}