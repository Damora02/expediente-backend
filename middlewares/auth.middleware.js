const jwt = require('jsonwebtoken');

// Verifica que el token exista y sea valido
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token;

  if (authHeader) {
    // El header viene como "Bearer eyJhbGc..." -> separamos la palabra "Bearer"
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    // Para casos como <iframe> o <img>, donde no se pueden mandar headers
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No se proporciono un token' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, datosUsuario) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalido o expirado' });
    }
    // Guardamos los datos del usuario (id, usuario, rol) para usarlos despues
    req.usuario = datosUsuario;
    next(); // Todo bien, sigue hacia la ruta real
  });
}

// Verifica que el usuario tenga rol de admin
function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta accion' });
  }
  next();
}

module.exports = { verificarToken, soloAdmin };