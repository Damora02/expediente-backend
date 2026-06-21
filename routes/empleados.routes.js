const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /empleados -> listar todos los empleados
router.get('/', async (req, res) => {
  try {
    const [empleados] = await pool.promise().query(
      'SELECT * FROM empleados ORDER BY apellido, nombre'
    );
    res.json(empleados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// GET /empleados/:id -> ver un empleado especifico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [empleados] = await pool.promise().query(
      'SELECT * FROM empleados WHERE id = ?',
      [id]
    );
    if (empleados.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json(empleados[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el empleado' });
  }
});

// POST /empleados -> crear un empleado nuevo
router.post('/', async (req, res) => {
  try {
    const {
      nombre, apellido, tipo_identificacion, numero_identificacion,
      telefono, correo, puesto, fecha_ingreso, lugar_trabajo,
      nacionalidad, genero, fecha_nacimiento, estado_civil, iban
    } = req.body;

    const [resultado] = await pool.promise().query(
      `INSERT INTO empleados
        (nombre, apellido, tipo_identificacion, numero_identificacion, telefono,
         correo, puesto, fecha_ingreso, lugar_trabajo, nacionalidad, genero,
         fecha_nacimiento, estado_civil, iban)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, tipo_identificacion, numero_identificacion, telefono,
       correo, puesto, fecha_ingreso, lugar_trabajo, nacionalidad, genero,
       fecha_nacimiento, estado_civil, iban]
    );

    res.status(201).json({ id: resultado.insertId, mensaje: 'Empleado creado correctamente' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un empleado con ese numero de identificacion' });
    }
    res.status(500).json({ error: 'Error al crear el empleado' });
  }
});

// PUT /empleados/:id -> editar un empleado existente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, apellido, tipo_identificacion, numero_identificacion,
      telefono, correo, puesto, fecha_ingreso, lugar_trabajo,
      nacionalidad, genero, fecha_nacimiento, estado_civil, iban
    } = req.body;

    const [resultado] = await pool.promise().query(
      `UPDATE empleados SET
        nombre = ?, apellido = ?, tipo_identificacion = ?, numero_identificacion = ?,
        telefono = ?, correo = ?, puesto = ?, fecha_ingreso = ?, lugar_trabajo = ?,
        nacionalidad = ?, genero = ?, fecha_nacimiento = ?, estado_civil = ?, iban = ?
       WHERE id = ?`,
      [nombre, apellido, tipo_identificacion, numero_identificacion, telefono,
       correo, puesto, fecha_ingreso, lugar_trabajo, nacionalidad, genero,
       fecha_nacimiento, estado_civil, iban, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json({ mensaje: 'Empleado actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el empleado' });
  }
});

// DELETE /empleados/:id -> eliminar un empleado
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [resultado] = await pool.promise().query(
      'DELETE FROM empleados WHERE id = ?',
      [id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json({ mensaje: 'Empleado eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el empleado' });
  }
});

module.exports = router;