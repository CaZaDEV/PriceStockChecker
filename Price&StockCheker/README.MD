# Gestor de Rendimiento de Empleados con IA

Aplicación web de gestión de empleados centrada en el seguimiento del rendimiento mediante informes y análisis inteligente. Permite crear perfiles de empleados, registrar informes periódicos y evaluar automáticamente el rendimiento usando una API de IA gratuita.

---

## 🚀 Tecnologías utilizadas y por qué

### 🔹 Backend

- **Node.js + Express**
  - Elegido por su ligereza y velocidad para crear servidores REST.
  - Express facilita la estructuración del backend en rutas, middlewares y controladores.
  - Permite una fácil integración con bases de datos SQLite y APIs externas.

- **SQLite**
  - Base de datos ligera ideal para proyectos personales y prototipos.
  - Almacena los empleados e informes localmente sin necesidad de servidores externos.
  - Fácil de gestionar con paquetes como `sqlite3` y `better-sqlite3`.

### 🔹 Frontend

- **HTML + CSS + JavaScript Vanilla**
  - Suficientes para una aplicación sencilla y liviana sin dependencias pesadas.
  - Perfecto para mostrar una interfaz limpia y responsive sin frameworks complejos.

- **EJS (Embedded JavaScript Templates)**
  - Usado como motor de plantillas en Express para renderizar dinámicamente páginas con datos.
  - Permite lógica embebida en HTML (mostrar listas, condicionales, formularios...).

### 🔹 Inteligencia Artificial

- **API gratuita de IA (vía OpenRouter, HuggingFace, etc.)**
  - Permite el análisis semántico del contenido de los informes para obtener una evaluación de rendimiento (0-100).
  - Se eligió una alternativa gratuita para no depender de servicios de pago (como OpenAI) en fase de desarrollo.
  - Los informes se envían mediante un prompt ajustable y la respuesta es interpretada como una métrica de desempeño.

---

## 🧩 Arquitectura general

[ Navegador del usuario ]
         |
         v
  [Frontend HTML/EJS]
         |
         v
     [Express.js]
         |
 -------------------------------
| Base de datos SQLite (empleados, informes)
| API externa de IA (análisis de rendimiento)
 -------------------------------


## Las vistas EJS renderizan la información que Express recoge de SQLite.

-Los formularios HTML hacen peticiones POST/GET al backend (rutas REST).

-El backend puede, opcionalmente, enviar el contenido de los informes a una API externa para obtener una evaluación por IA.

-Todos los datos se guardan y consultan desde la base de datos local SQLite.

#### 🛠️ Instalación y ejecución

### Clonar el repositorio

git clone https://github.com/tuusuario/gestor-empleados-ia.git

cd gestor-empleados-ia

### Instalar dependencias

npm install

### Ejecutar el servidor

npm start

### Abrir en navegador

http://localhost:3000


#### 🧪 Funcionamiento técnico detallado
## 📁 Estructura del proyecto

/public        → Archivos estáticos (CSS, imágenes, etc.)
/views         → Plantillas EJS
/routes        → Rutas de Express (empleados, informes, IA)
/db            → Archivo SQLite y funciones de acceso
/app.js        → Archivo principal (configura servidor)

#### 👥 Gestión de empleados
Cada empleado tiene:

-Nombre, cargo, foto

-Evaluación de IA (opcional)

-CRUD completo (crear, ver, editar, eliminar)

#### 📑 Informes de rendimiento
-Asociados a cada empleado.

-Se pueden agregar múltiples informes con fecha y contenido.

-Vista de todos los informes del empleado.

-Opción para editar o eliminar informes existentes.

#### 🧠 Evaluación con IA
-Botón "Evaluar con IA" en el perfil de empleado.

-Envía todos los informes concatenados junto a un prompt configurable.

-La IA responde con un valor de rendimiento entre 0 y 100.

-Este valor se guarda y se muestra en el perfil del empleado.

#### 🔐 Seguridad y validaciones
-Sanitización básica de entradas.

-Confirmaciones en acciones destructivas (eliminar empleado o informe).

-Validación en formularios para evitar envíos incompletos.


Desarrollado por Eloi Cata Zapata


