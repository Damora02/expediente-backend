const multer = require('multer');
const path = require('path');

// Configuracion de donde y como se guardan los archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const empleadoId = req.params.id;
    const tipo = req.body.tipo;
    const extension = path.extname(file.originalname);
    // Ejemplo de nombre final: empleado_3_cedula.pdf
    const nombreUnico = `empleado_${empleadoId}_${tipo}${extension}`;
    cb(null, nombreUnico);
  },
});

// Solo permitir archivos PDF
const filtroArchivos = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

const upload = multer({
  storage,
  fileFilter: filtroArchivos,
  limits: { fileSize: 10 * 1024 * 1024 }, // maximo 10 MB
});

module.exports = upload;