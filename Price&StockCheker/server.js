const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Configuraciones
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// Base de datos
const db = new sqlite3.Database('./db.sqlite');

async function actualizarEsquemaBD() {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) AS existe FROM pragma_table_info('historico_precios') WHERE name = 'precio_actual'",
      (err, row) => {
        if (err) return reject(err);

        if (row.existe === 0) {
          console.log('Añadiendo columna precio_actual a historico_precios...');
          db.run(
            'ALTER TABLE historico_precios ADD COLUMN precio_actual REAL',
            (err) => {
              if (err) return reject(err);
              console.log('Columna añadida correctamente');
              resolve();
            }
          );
        } else {
          console.log('La columna precio_actual ya existe');
          resolve();
        }
      }
    );
  });
}

// Crear tablas si no existen
db.serialize(async () => {
  try {
    db.run(`CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria TEXT CHECK(categoria IN ('Fruta/Verdura', 'Bebida', 'Alimento', 'Otros')),
      nombre TEXT NOT NULL,
      marca TEXT NOT NULL,
      precio_compra REAL NOT NULL,
      precio_actual REAL,
      calidad TEXT CHECK(calidad IN ('alta', 'media', 'baja')) NOT NULL,
      urgencia TEXT CHECK(urgencia IN ('muy alta', 'media', 'baja')) NOT NULL,
      foto TEXT,
      precio_sugerido REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS historico_precios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      precio_actual REAL,
      precio_sugerido REAL,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`);

    await actualizarEsquemaBD();
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
  }
});

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Rutas
app.get('/', (req, res) => {
  const categoria = req.query.categoria || '';

  let query = 'SELECT * FROM productos';
  const params = [];

  if (categoria) {
    query += ' WHERE categoria = ?';
    params.push(categoria);
  }

  db.all(query, params, (err, productos) => {
    if (err) {
      console.error('Error obteniendo productos:', err);
      return res.status(500).send('Error al obtener productos');
    }

    productos.sort((a, b) => b.id - a.id);
    res.render('index', {
      productos,
      categoriaFiltro: categoria
    });
  });
});

app.get('/producto/nuevo', (req, res) => {
  res.render('nuevoProducto');
});

app.post('/producto/nuevo', upload.single('foto'), (req, res) => {
  const { nombre, marca, precio_compra, precio_actual, calidad, urgencia, categoria } = req.body;
  const fotoRuta = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    'INSERT INTO productos(categoria, nombre, marca, precio_compra, precio_actual, calidad, urgencia, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [categoria, nombre, marca, precio_compra, precio_actual || null, calidad, urgencia, fotoRuta],
    function (err) {
      if (err) {
        console.error('Error insertando producto:', err.message);
        return res.status(500).send('Error al guardar producto.');
      }
      res.redirect('/');
    }
  );
});

app.get('/producto/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM productos WHERE id = ?', [id], (err, producto) => {
    if (err || !producto) {
      return res.status(404).send('Producto no encontrado');
    }
    db.all('SELECT * FROM historico_precios WHERE producto_id = ? ORDER BY fecha DESC', [id], (err, historico) => {
      res.render('producto', { producto, historico });
    });
  });
});

app.get('/producto/editar/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM productos WHERE id = ?', [id], (err, producto) => {
    if (err || !producto) return res.status(404).send('Producto no encontrado');
    res.render('editarProducto', { producto });
  });
});

app.post('/producto/editar/:id', upload.single('foto'), (req, res) => {
  const { nombre, marca, precio_compra, precio_actual, calidad, urgencia, categoria } = req.body;
  const id = req.params.id;

  db.get('SELECT foto FROM productos WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).send('Error al obtener producto');

    const nuevaFoto = req.file ? `/uploads/${req.file.filename}` : row.foto;

    db.run(
      'UPDATE productos SET categoria = ?, nombre = ?, marca = ?, precio_compra = ?, precio_actual = ?, calidad = ?, urgencia = ?, foto = ? WHERE id = ?',
      [categoria, nombre, marca, precio_compra, precio_actual || null, calidad, urgencia, nuevaFoto, id],
      (err) => {
        if (err) return res.status(500).send('Error al actualizar producto.');
        res.redirect(`/producto/${id}`);
      }
    );
  });
});

app.post('/producto/eliminar/:id', (req, res) => {
  const id = req.params.id;

  db.run('DELETE FROM historico_precios WHERE producto_id = ?', [id], (err) => {
    if (err) {
      console.error(err);
      return res.redirect('/?error=Error al eliminar histórico de precios');
    }

    db.run('DELETE FROM productos WHERE id = ?', [id], (err) => {
      if (err) {
        console.error(err);
        return res.redirect('/?error=Error al eliminar producto');
      }
      res.redirect('/?success=Producto eliminado correctamente');
    });
  });
});


app.get('/buscar', (req, res) => {
  const termino = req.query.q;
  
  if (!termino || termino.length < 2) {
    return res.status(400).json({ error: 'Término de búsqueda demasiado corto' });
  }

  // Normalizamos el término de búsqueda (remove acentos, to lowercase)
  const normalizado = termino.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  db.all(`
    SELECT * FROM productos 
    WHERE LOWER(REPLACE(REPLACE(REPLACE(nombre, 'á', 'a'), 'é', 'e'), 'í', 'i')) LIKE ? || '%'
    ORDER BY nombre
  `, [normalizado], (err, productos) => {
    if (err) {
      console.error('Error en búsqueda:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    
    res.json(productos);
  });
});

const axios = require('axios');

app.post('/producto/calcular-precio/:id', (req, res) => {
  const id = req.params.id;

  db.get('SELECT * FROM productos WHERE id = ?', [id], async (err, producto) => {
    if (err || !producto) return res.status(400).send('Producto no encontrado.');

    const prompt = `
Eres un experto en precios para comercios minoristas en Catalunya. Calcula el precio de venta óptimo para este producto siguiendo estas reglas específicas:

${producto.categoria === 'Fruta/Verdura' ? `
**INSTRUCCIONES PARA FRUTA/VERDURA:**
1. Siempre calcula el precio POR KILO (no por unidad)
2. Margen base:45%-75% sobre precio compra
3. Si es temporada alta: reduce 5-10%
4. Si está cerca de caducar (urgencia alta): reduce 10-15%
5. Calidad alta: añade 5-8%`:
        producto.categoria === 'Bebida' ? `
**INSTRUCCIONES PARA BEBIDAS:**
1. Precio POR UNIDAD (excepto especificar que son packs)
2. Margen base: 20-40%
4. Aguas minerales: margen 150-300% (Basate en reputacion de la marca)
5. Marcas blancas: margen 20-40%
6. Refrescos: margen 25-50%` :
          producto.categoria === 'Alimento' ? `
**INSTRUCCIONES PARA ALIMENTOS:**
1. Perecederos: margen 25-75%
2. No perecederos: margen 50-150%
3. Urgencia alta: reduce 5-10%
4. Calidad premium: añade 5-10%
5. Productos locales: añade 5-8%` : `
**INSTRUCCIONES PARA OTROS PRODUCTOS:**
1. Margen base: 25-50% (Muy Flexible bajo cirterio de la IA)
2. Productos exclusivos: +10-20%
3. Competencia directa: iguala o reduce 2-5%`}

**DATOS DEL PRODUCTO:**
- Nombre: ${producto.nombre}
- Marca: ${producto.marca}
- Categoría: ${producto.categoria}
- Precio compra: ${producto.precio_compra}€
- Calidad: ${producto.calidad}
- Urgencia: ${producto.urgencia}

**FACTORES ADICIONALES A CONSIDERAR:**
${producto.urgencia === 'muy alta' ? '- APLICAR DESCUENTO por urgencia (5-10%)' : ''}
${producto.calidad === 'alta' ? '- AÑADIR RECARGO por calidad (2-5%)' : producto.calidad === 'baja' ? '- REDUCIR MARGEN por calidad inferior (5-10%)' : ''}

**FORMATO REQUERIDO:**
MAXIMA IMPORTANCIA Devuelve SOLAMENTE el número con 2 decimales. Ejemplo: 2.75 NADA DE ANALISIS NI FORMA DE PENSAR SOLO NUMERO DE DOS DECIMALES SIN TEXTO AÑADIDO 

**PRECIO SUGERIDO CALCULADO:**`;

    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data.choices[0].message.content.trim();
      const precio_sugerido = parseFloat(result);

      if (!isNaN(precio_sugerido)) {
        db.run('INSERT INTO historico_precios (producto_id, precio_actual, precio_sugerido) VALUES (?, ?, ?)',
          [id, producto.precio_actual, precio_sugerido], (err) => {
            if (err) console.error("Error guardando histórico:", err);

            db.run('UPDATE productos SET precio_sugerido = ? WHERE id = ?',
              [precio_sugerido, id], (err) => {
                if (err) return res.status(500).send('Error al actualizar');
                res.redirect(`/producto/${id}`);
              });
          });
      } else {
        res.status(400).send('La IA devolvió un formato inválido: ' + result);
      }
    } catch (error) {
      console.error('Error con IA:', error.response?.data || error.message);
      res.status(500).send('Error al calcular precio');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});