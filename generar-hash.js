const bcrypt = require('bcrypt');

const contraseñaPlana = 'Admin2024!'; // <-- cambia esto por la contraseña que quieras

bcrypt.hash(contraseñaPlana, 10, (err, hash) => {
  if (err) {
    console.error('Error generando el hash:', err);
    return;
  }
  console.log('Contraseña original:', contraseñaPlana);
  console.log('Hash generado:', hash);
});