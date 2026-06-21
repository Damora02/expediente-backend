const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const empleadosRoutes = require('./routes/empleados.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/empleados', empleadosRoutes);
app.use('/auth', authRoutes);

// Ruta de prueba para confirmar que el servidor funciona
app.get('/', (req, res) => {
  res.json({ mensaje: 'Backend funcionando correctamente' });
});

// Ruta de prueba para confirmar la conexion a MySQL
app.get('/test-db', async (req, res) => {
  try {
    const [resultado] = await pool.promise().query('SELECT 1 + 1 AS suma');
    res.json({ conexion: 'exitosa', resultado: resultado[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo conectar a la base de datos' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});