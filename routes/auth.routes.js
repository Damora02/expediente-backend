const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');
const crypto = require('crypto');
const { enviarCorreoRecuperacion } = require('../config/mailer');

const rateLimit = require('express-rate-limit');

const limitadorLogin = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 4,
  message: { error: 'Demasiados intentos fallidos. Intenta de nuevo en 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /auth/login -> iniciar sesion
router.post('/login', limitadorLogin, async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    // Buscar el usuario en la base de datos
    const [usuarios] = await pool.promise().query(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = TRUE',
      [usuario]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuarioEncontrado = usuarios[0];

    // Comparar la contraseña escrita con el hash guardado
    const passwordValido = await bcrypt.compare(password, usuarioEncontrado.password_hash);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Crear el token JWT (la "llave" de sesion)
    const token = jwt.sign(
      {
        id: usuarioEncontrado.id,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Responder con el token y los datos basicos (sin la contraseña)
    res.json({
      token,
      usuario: {
        id: usuarioEncontrado.id,
        usuario: usuarioEncontrado.usuario,
        correo: usuarioEncontrado.correo,
        rol: usuarioEncontrado.rol,
        debeCambiarPassword: Boolean(usuarioEncontrado.debe_cambiar_password),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesion' });
  }
});
// POST /auth/registro -> crear un usuario nuevo (solo admin)
router.post('/registro', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { usuario, correo, password, rol } = req.body;

    if (!usuario || !correo || !password || !rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!['admin', 'visor'].includes(rol)) {
      return res.status(400).json({ error: 'Rol invalido' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [resultado] = await pool.promise().query(
      `INSERT INTO usuarios (usuario, correo, password_hash, rol, debe_cambiar_password)
       VALUES (?, ?, ?, ?, TRUE)`,
      [usuario, correo, passwordHash, rol]
    );

    res.status(201).json({
      id: resultado.insertId,
      mensaje: 'Usuario creado correctamente. Debera cambiar su contraseña al iniciar sesion.',
    });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El usuario o correo ya existe' });
    }
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});
// PUT /auth/cambiar-password -> cambiar la propia contraseña (cualquier usuario logueado)
router.put('/cambiar-password', verificarToken, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'Debe indicar la contraseña actual y la nueva' });
    }

    if (passwordNueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const [usuarios] = await pool.promise().query(
      'SELECT * FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioActual = usuarios[0];
    const passwordValido = await bcrypt.compare(passwordActual, usuarioActual.password_hash);

    if (!passwordValido) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const nuevoHash = await bcrypt.hash(passwordNueva, 10);

    await pool.promise().query(
      'UPDATE usuarios SET password_hash = ?, debe_cambiar_password = FALSE WHERE id = ?',
      [nuevoHash, req.usuario.id]
    );

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});
// POST /auth/olvide-password -> solicitar recuperacion de contraseña
router.post('/olvide-password', async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ error: 'Debe indicar un correo' });
    }

    const [usuarios] = await pool.promise().query(
      'SELECT * FROM usuarios WHERE correo = ?',
      [correo]
    );

    // Por seguridad, siempre respondemos lo mismo, exista o no el correo
    // (asi no revelamos que correos estan registrados en el sistema)
    if (usuarios.length === 0) {
      return res.json({ mensaje: 'Si el correo existe, se envio un enlace de recuperacion' });
    }

    const usuario = usuarios[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await pool.promise().query(
      'INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, ?)',
      [usuario.id, token, expiraEn]
    );

    try {
  await enviarCorreoRecuperacion(usuario.correo, token);
  console.log('CORREO ENVIADO CORRECTAMENTE a:', usuario.correo);
} catch (errorCorreo) {
  console.error('ERROR AL ENVIAR CORREO:', errorCorreo);
}

res.json({ mensaje: 'Si el correo existe, se envio un enlace de recuperacion' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// POST /auth/restablecer-password -> usar el token para definir una nueva contraseña
router.post('/restablecer-password', async (req, res) => {
  try {
    const { token, passwordNueva } = req.body;

    if (!token || !passwordNueva) {
      return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios' });
    }
    if (passwordNueva.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const [tokens] = await pool.promise().query(
      'SELECT * FROM tokens_recuperacion WHERE token = ? AND usado = FALSE AND expira_en > NOW()',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'El enlace es invalido o ya expiro' });
    }

    const tokenInfo = tokens[0];
    const nuevoHash = await bcrypt.hash(passwordNueva, 10);

    await pool.promise().query(
      'UPDATE usuarios SET password_hash = ?, debe_cambiar_password = FALSE WHERE id = ?',
      [nuevoHash, tokenInfo.usuario_id]
    );

    await pool.promise().query(
      'UPDATE tokens_recuperacion SET usado = TRUE WHERE id = ?',
      [tokenInfo.id]
    );

    res.json({ mensaje: 'Contraseña restablecida correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

module.exports = router;