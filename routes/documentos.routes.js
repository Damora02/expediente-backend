const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const upload = require('../config/upload.config');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

// POST /documentos/:id -> subir un documento para el empleado con ese id
// El ":id" es el id del empleado, y en el body (form-data) viene el "tipo"
router.post('/:id', verificarToken, soloAdmin, upload.single('archivo'), async (req, res) => {
  try {
    const empleadoId = req.params.id;
    const { tipo } = req.body;
    

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibio ningun archivo' });
    }

    const tiposValidos = ['contrato', 'entrevista', 'cv', 'cedula', 'titulo1', 'titulo2'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de documento invalido' });
    }

    // Verificar que el empleado exista
    const [empleados] = await pool.promise().query(
      'SELECT id FROM empleados WHERE id = ?',
      [empleadoId]
    );
    if (empleados.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const rutaRelativa = `uploads/${req.file.filename}`;

    // Si ya existe un documento de ese tipo para ese empleado, lo actualiza.
    // Si no existe, lo crea. (Esto es un "UPSERT")
    await pool.promise().query(
      `INSERT INTO documentos (empleado_id, tipo, nombre_original, ruta_archivo, tamano_bytes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre_original = ?, ruta_archivo = ?, tamano_bytes = ?, subido_en = CURRENT_TIMESTAMP`,
      [
        empleadoId, tipo, req.file.originalname, rutaRelativa, req.file.size,
        req.file.originalname, rutaRelativa, req.file.size,
      ]
    );

    res.status(201).json({ mensaje: 'Documento subido correctamente', archivo: rutaRelativa });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir el documento' });
  }
});

// GET /documentos/:id -> listar los documentos de un empleado
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const empleadoId = req.params.id;
    const [documentos] = await pool.promise().query(
      'SELECT * FROM documentos WHERE empleado_id = ?',
      [empleadoId]
    );
    res.json(documentos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los documentos' });
  }
});

// GET /documentos/:id/:tipo/ver -> descargar/ver un documento especifico
router.get('/:id/:tipo/ver', verificarToken, async (req, res) => {
  try {
    const { id, tipo } = req.params;
    const [documentos] = await pool.promise().query(
      'SELECT * FROM documentos WHERE empleado_id = ? AND tipo = ?',
      [id, tipo]
    );

    if (documentos.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const rutaCompleta = path.join(__dirname, '..', documentos[0].ruta_archivo);

    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({ error: 'El archivo ya no existe en el servidor' });
    }

    res.sendFile(rutaCompleta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el documento' });
  }
});

// DELETE /documentos/:id/:tipo -> eliminar un documento especifico
router.delete('/:id/:tipo', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { id, tipo } = req.params;
    const [documentos] = await pool.promise().query(
      'SELECT * FROM documentos WHERE empleado_id = ? AND tipo = ?',
      [id, tipo]
    );

    if (documentos.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const rutaCompleta = path.join(__dirname, '..', documentos[0].ruta_archivo);

    // Borrar el archivo fisico del disco, si existe
    if (fs.existsSync(rutaCompleta)) {
      fs.unlinkSync(rutaCompleta);
    }

    // Borrar el registro de la base de datos
    await pool.promise().query(
      'DELETE FROM documentos WHERE empleado_id = ? AND tipo = ?',
      [id, tipo]
    );

    res.json({ mensaje: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el documento' });
  }
});

module.exports = router;