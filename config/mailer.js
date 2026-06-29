const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const enviarCorreoRecuperacion = async (correoDestino, token) => {
  const enlace = `http://localhost:3000/restablecer-password?token=${token}`;

  await transporter.sendMail({
    from: `"Deco Pastel Costa Rica" <${process.env.EMAIL_USER}>`,
    to: correoDestino,
    subject: 'Recuperación de contraseña',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #FF33CC;">Recuperación de contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz click en el siguiente enlace para crear una nueva contraseña. Este enlace expira en 1 hora.</p>
        <p style="margin: 24px 0;">
          <a href="${enlace}" style="background: #FF33CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color: #888; font-size: 12px;">
          Si no solicitaste esto, puedes ignorar este correo.
        </p>
      </div>
    `,
  });
};

module.exports = { enviarCorreoRecuperacion };