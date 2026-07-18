const pool = require('../config/db');

async function obtenerCorreosAdmin() {
  const [usuarios] = await pool.promise().query(
    `SELECT correo FROM usuarios WHERE rol = 'admin' AND activo = TRUE`
  );
  return usuarios.map(u => u.correo);
}

module.exports = { obtenerCorreosAdmin };