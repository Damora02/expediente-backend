const cron = require('node-cron');
const pool = require('../config/db');
const { enviarCorreoAniversario } = require('../config/mailer');
const { obtenerEmpleadosConAniversarioHoy } = require('../services/vacacionesService');
const { obtenerCorreosAdmin } = require('../services/usuariosService');

async function revisarAniversarios() {
  const empleados = await obtenerEmpleadosConAniversarioHoy();

  if (empleados.length === 0) {
    console.log('Ningun empleado cumple aniversario hoy.');
    return;
  }

  const correosAdmin = await obtenerCorreosAdmin();

  if (correosAdmin.length === 0) {
    console.warn('No hay administradores activos con correo registrado.');
    return;
  }

  for (const emp of empleados) {
    try {
      await pool.promise().query(
        `INSERT INTO alertas_vacaciones (empleado_id, fecha_generada) VALUES (?, CURDATE())`,
        [emp.id]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`Ya se habia notificado el aniversario de ${emp.nombre} hoy.`);
        continue;
      }
      throw error;
    }

    const nombreCompleto = `${emp.nombre} ${emp.apellido}`;

    try {
      await enviarCorreoAniversario(correosAdmin, nombreCompleto, emp.anios_cumplidos, emp.fecha_ingreso);
      console.log(`Alerta de aniversario enviada: ${nombreCompleto}`);
    } catch (error) {
      console.error(`Error al enviar correo de aniversario de ${nombreCompleto}:`, error);
    }
  }
}

// Se ejecuta todos los dias a las 8:00 AM
cron.schedule('0 8 * * *', revisarAniversarios);

module.exports = { revisarAniversarios };