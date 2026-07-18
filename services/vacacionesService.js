const pool = require('../config/db');

async function obtenerEmpleadosConAniversarioHoy() {
  const [empleados] = await pool.promise().query(`
    SELECT id, nombre, apellido, correo, fecha_ingreso,
      TIMESTAMPDIFF(YEAR, fecha_ingreso, CURDATE()) AS anios_cumplidos
    FROM empleados
    WHERE MONTH(fecha_ingreso) = MONTH(CURDATE())
      AND DAY(fecha_ingreso) = DAY(CURDATE())
      AND fecha_ingreso < CURDATE()
  `);
  return empleados;
}

module.exports = { obtenerEmpleadosConAniversarioHoy };