# Distribuidora La Española — Sistema Fullstack de Inventario

Aplicación fullstack para la gestión del inventario de **Distribuidora La Española**, una distribuidora especializada en productos de **aseo, limpieza e higiene del hogar**: detergentes, jabones, traperos, escobas, desinfectantes y artículos similares.

El sistema **no maneja alimentos ni comestibles**. Las categorías están restringidas y cualquier intento de registrar un producto alimenticio es rechazado con `400 Bad Request`, tanto en el cliente como en el servidor.

---

## Información académica

| Campo | Detalle |
| :--- | :--- |
| **Institución** | Universidad Incca de Colombia |
| **Programa** | Ingeniería de Sistemas |
| **Materia** | Ingeniería de Software III |
| **Integrantes** | Diego Andrés Cubillos · Héctor Velasco |
| **Tipo de proyecto** | Aplicación fullstack (API REST + cliente web) |

---

## Tabla de contenido

- [Descripción general](#descripción-general)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Levantar ambos proyectos simultáneamente](#4-levantar-ambos-proyectos-simultáneamente)
- [Configuración](#configuración)
- [Base de datos](#base-de-datos)
- [API REST](#api-rest)
- [Reglas de negocio](#reglas-de-negocio)
- [Manejo de errores](#manejo-de-errores)
- [Uso de la interfaz web](#uso-de-la-interfaz-web)
- [Pruebas manuales con cURL](#pruebas-manuales-con-curl)
- [Flujo de trabajo del equipo](#flujo-de-trabajo-del-equipo)

---

## Descripción general

El proyecto está dividido en dos aplicaciones independientes que se comunican por HTTP:

- **BackEnd**: API REST construida con Node.js + Express que expone el CRUD completo de productos sobre una base de datos SQLite. Aplica validaciones de negocio y responde con códigos de estado HTTP semánticos.
- **Front**: cliente web estático (HTML + JavaScript + Bootstrap) que consume la API y ofrece una interfaz para listar, crear, editar y eliminar productos, mostrando en pantalla el código HTTP de cada operación.

### Funcionalidades

- Listado completo del catálogo de productos.
- Consulta de un producto por ID.
- Registro de nuevos productos con validación de datos.
- Edición de productos (reemplazo completo de los campos).
- Eliminación de productos con confirmación.
- Validación del catálogo en el navegador (precio, stock, categorías permitidas).
- Retroalimentación visual del resultado HTTP (`200`, `201`, `204`, `400`, `404`, `500`).
- Manejo centralizado de errores y rutas no encontradas en el servidor.

---

## Tecnologías

### Backend

| Tecnología | Uso |
| :--- | :--- |
| Node.js 18+ | Entorno de ejecución |
| Express 4 | Framework HTTP y enrutamiento |
| SQLite (`sqlite3`) | Base de datos relacional en archivo |
| `dotenv` | Gestión de variables de entorno |
| `cors` | Habilitación de peticiones desde el cliente web |
| `nodemon` | Recarga automática en desarrollo |

### Frontend

| Tecnología | Uso |
| :--- | :--- |
| HTML5 | Estructura de la interfaz |
| JavaScript (ES2017+, `fetch`) | Consumo de la API y manipulación del DOM |
| Bootstrap 5.3 (CDN) | Estilos y componentes visuales |

No se requiere proceso de compilación ni gestor de paquetes para el frontend.

---

## Arquitectura

El backend sigue una **arquitectura por capas**, separando responsabilidades y facilitando el mantenimiento y las pruebas:

```text
Cliente (Front)
      │  fetch HTTP / JSON
      ▼
┌───────────────────────────────┐
│  routes/                      │  Define los endpoints
│        ▼                      │
│  controllers/                 │  Orquesta req/res y códigos HTTP
│        ▼                      │
│  services/                    │  Reglas de negocio y validaciones
│        ▼                      │
│  repositories/                │  SQL parametrizado
│        ▼                      │
│  db/database.js → SQLite      │  Conexión e inicialización
└───────────────────────────────┘
```

- **Routes**: mapea método + ruta al controlador.
- **Controllers**: traduce HTTP ↔ dominio, define estados de respuesta y delega errores al middleware global.
- **Services**: valida campos, categorías, precio, stock y unicidad del código de barras; lanza `ApiError` con su estado HTTP.
- **Repositories**: ejecuta las consultas SQL con parámetros (prevención de inyección SQL).
- **Database**: crea la carpeta y el archivo SQLite automáticamente al iniciar.

---

## Estructura del repositorio

```text
APP_DISTRIBUIDORA/
├── README.md                     # Documentación general del proyecto
├── BackEnd/
│   ├── .env                      # Variables de entorno (puerto y archivo de BD)
│   ├── package.json              # Dependencias y scripts
│   ├── README.md                 # Documentación específica del backend
│   ├── data/
│   │   └── app.db                # Base de datos SQLite (generada en ejecución)
│   └── src/
│       ├── app.js                # Servidor Express, middlewares y manejo de errores
│       ├── db/
│       │   └── database.js       # Conexión SQLite e inicialización de la tabla
│       ├── routes/
│       │   └── productos.routes.js
│       ├── controllers/
│       │   └── productos.controller.js
│       ├── services/
│       │   └── productos.service.js
│       └── repositories/
│           └── productos.repository.js
└── Front/
    ├── index.html                # Interfaz de usuario (Bootstrap)
    └── app.js                    # Lógica del cliente y consumo de la API
```

---

## Requisitos previos

- **Node.js 18 o superior**
- **npm** (incluido con Node.js)
- Navegador moderno (Chrome, Edge, Firefox)
- Opcional: extensión **Live Server** de VS Code o Python para servir el frontend

---

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd APP_DISTRIBUIDORA
```

### 2. Backend

```bash
cd BackEnd
npm install
```

Verifica el archivo `.env` (ver [Configuración](#configuración)) y ejecuta:

```bash
# Modo desarrollo (recarga automática)
npm run dev

# Modo producción
npm start
```

El servidor queda disponible en `http://localhost:3000` y la API en `http://localhost:3000/api/productos`. Al iniciar por primera vez se crea automáticamente `BackEnd/data/app.db` con la tabla `productos`.

### 3. Frontend

Con el backend en ejecución, abre `Front/index.html` en el navegador. Se recomienda servirlo por HTTP para evitar restricciones del navegador:

```bash
# Opción A: Live Server (VS Code) → botón "Go Live" sobre index.html

# Opción B: Python
cd Front
python -m http.server 5500
# Abrir http://localhost:5500
```

La URL de la API está configurada en `Front/app.js`:

```javascript
const API_URL = "http://localhost:3000/api/productos";
```

Si el backend se despliega en otro host o puerto, actualiza esta constante.

### 4. Levantar ambos proyectos simultáneamente

El backend y el frontend deben ejecutarse **al mismo tiempo**: la API en el puerto `3000` y el cliente web en el `5500`. Si el backend está detenido, la interfaz mostrará un error de conexión.

| Servicio | URL | Comando |
| :--- | :--- | :--- |
| Backend (API REST) | `http://localhost:3000/api/productos` | `npm run dev` en `BackEnd/` |
| Frontend (cliente web) | `http://localhost:5500` | `python -m http.server 5500` en `Front/` |

**Opción A — Dos terminales (recomendada)**

```bash
# Terminal 1
cd BackEnd
npm run dev

# Terminal 2
cd Front
python -m http.server 5500
```

Luego abre `http://localhost:5500` en el navegador.

**Opción B — Git Bash / WSL (una sola terminal, procesos en segundo plano)**

```bash
# Desde la raíz del repositorio
(cd BackEnd && npm run dev) &
(cd Front && python -m http.server 5500) &
```

Para detenerlos: `kill %1 %2` (o `jobs` para ver los identificadores).

**Opción C — Windows (PowerShell, ventanas separadas)**

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd BackEnd; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Front; python -m http.server 5500"
```

**Opción D — `cmd` de Windows**

```bat
start "Backend" cmd /k "cd BackEnd && npm run dev"
start "Frontend" cmd /k "cd Front && python -m http.server 5500"
```

**Opción E — Todo desde VS Code**

1. Abre la carpeta raíz `APP_DISTRIBUIDORA` en VS Code.
2. Terminal 1: `cd BackEnd` → `npm run dev`.
3. Terminal 2: `cd Front` → `python -m http.server 5500` (o clic derecho sobre `index.html` → *Open with Live Server*).
4. Abre `http://localhost:5500`.

> Verificación rápida: `curl http://localhost:3000/api/productos` debe devolver `200 OK` con un arreglo JSON (vacío `[]` si aún no hay productos). Si el frontend carga pero no muestra datos, revisa la consola del navegador y confirma que el backend está activo y que `API_URL` en `Front/app.js` apunta al puerto correcto.

---

## Configuración

Archivo `BackEnd/.env`:

```env
PORT=3000
DB_FILE=./data/app.db
```

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto del servidor HTTP | `3000` |
| `DB_FILE` | Ruta del archivo SQLite, relativa a `BackEnd/` o absoluta | `./data/app.db` |

El middleware CORS está habilitado de forma abierta (`app.use(cors())`), lo que permite consumir la API desde cualquier origen durante el desarrollo.

---

## Base de datos

**Motor:** SQLite 3 · **Archivo:** `BackEnd/data/app.db` · **Tabla:** `productos`

| Columna | Tipo | Restricciones |
| :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `nombre` | TEXT | NOT NULL |
| `categoria` | TEXT | NOT NULL |
| `precio` | REAL | NOT NULL |
| `stock` | INTEGER | NOT NULL |
| `codigo_barras` | TEXT | UNIQUE NOT NULL |
| `creado_en` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

La tabla se crea con `CREATE TABLE IF NOT EXISTS`, por lo que la inicialización es idempotente. Para reiniciar el inventario basta con detener el servidor y eliminar `data/app.db`; se regenerará al arrancar de nuevo.

---

## API REST

**URL base:** `http://localhost:3000/api/productos`

| Operación | Método | Endpoint | Éxito | Errores posibles |
| :--- | :--- | :--- | :--- | :--- |
| Listar todos | `GET` | `/api/productos` | `200 OK` | `500` |
| Consultar por ID | `GET` | `/api/productos/:id` | `200 OK` | `404` |
| Crear producto | `POST` | `/api/productos` | `201 Created` | `400` |
| Actualizar producto | `PUT` | `/api/productos/:id` | `200 OK` | `400` / `404` |
| Eliminar producto | `DELETE` | `/api/productos/:id` | `204 No Content` | `404` |

### Modelo de producto

```json
{
  "id": 1,
  "nombre": "Detergente Líquido 1L",
  "categoria": "Aseo del Hogar",
  "precio": 8500,
  "stock": 25,
  "codigo_barras": "7701234567890",
  "creado_en": "2026-10-20 17:00:00"
}
```

### Ejemplo de petición `POST /api/productos`

```json
{
  "nombre": "Detergente Líquido 1L",
  "categoria": "Aseo del Hogar",
  "precio": 8500,
  "stock": 25,
  "codigo_barras": "7701234567890"
}
```

Respuesta `201 Created`: el objeto creado, incluyendo `id` y `creado_en`.

`PUT` reemplaza el producto completo, por lo que exige **todos** los campos, igual que `POST`.

---

## Reglas de negocio

1. En `POST` y `PUT` son obligatorios todos los campos: `nombre`, `categoria`, `precio`, `stock` y `codigo_barras`.
2. Solo se permiten estas categorías:
   - `Aseo del Hogar`
   - `Cuidado Personal`
   - `Lavandería`
   - `Utensilios de Limpieza`
   - `Desinfección`
3. No se permiten alimentos ni comestibles (categoría fuera de la lista → `400 Bad Request`).
4. `precio` debe ser un número mayor que `0`.
5. `stock` debe ser un entero mayor o igual que `0`.
6. `codigo_barras` no puede repetirse entre productos.
7. Las operaciones `GET` por ID, `PUT` y `DELETE` sobre IDs inexistentes responden `404 Not Found`.
8. El `id` debe ser un entero positivo; de lo contrario se trata como recurso no encontrado.

Las mismas validaciones se replican en el cliente (`Front/app.js`) para dar retroalimentación inmediata, pero la **fuente de verdad es el backend**.

---

## Manejo de errores

Todos los errores se devuelven en un formato uniforme:

```json
{
  "error": "Mensaje explicativo del error"
}
```

| Situación | Estado |
| :--- | :--- |
| JSON malformado en el cuerpo | `400 Bad Request` |
| Campo obligatorio ausente o vacío | `400 Bad Request` |
| Categoría no permitida (incluye alimentos) | `400 Bad Request` |
| Precio ≤ 0 o stock inválido | `400 Bad Request` |
| Código de barras duplicado | `400 Bad Request` |
| Producto inexistente | `404 Not Found` |
| Ruta desconocida | `404 Not Found` |
| Error no controlado | `500 Internal Server Error` |

El middleware global de Express captura los errores lanzados por los servicios (`ApiError` con `status`) y evita exponer detalles internos en respuestas `5xx`.

---

## Uso de la interfaz web

1. Inicia el backend (`npm run dev` en `BackEnd/`).
2. Abre `Front/index.html` (idealmente con Live Server).
3. El catálogo se carga automáticamente al abrir la página.
4. **Crear**: completa el formulario y pulsa *Guardar Producto* → alerta con `HTTP 201`.
5. **Editar**: pulsa *Editar* en una fila, modifica los campos y pulsa *Actualizar Producto* → `HTTP 200`.
6. **Eliminar**: pulsa *Eliminar*, confirma el diálogo → `HTTP 204` y actualización de la tabla.
7. Cada operación muestra una alerta con el código HTTP resultante y el mensaje del servidor en caso de error.

---

## Pruebas manuales con cURL

> Los comandos están pensados para **Git Bash**, **WSL** o terminales tipo Unix. En PowerShell o `cmd` usa comillas dobles y escapa las comillas internas del JSON.

### Camino feliz: crear producto (`201 Created`)

```bash
curl -i -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Detergente Líquido 1L","categoria":"Aseo del Hogar","precio":8500,"stock":25,"codigo_barras":"7701234567890"}'
```

Si repites el comando obtendrás `400 Bad Request` por el código de barras duplicado.

### Error de validación: categoría no permitida (`400 Bad Request`)

```bash
curl -i -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Arroz Premium","categoria":"Alimentos","precio":5000,"stock":10,"codigo_barras":"7709876543210"}'
```

```json
{
  "error": "Categoría no válida. Categorías permitidas: Aseo del Hogar, Cuidado Personal, Lavandería, Utensilios de Limpieza, Desinfección. No se permiten alimentos ni comestibles."
}
```

### Recurso no encontrado (`404 Not Found`)

```bash
curl -i http://localhost:3000/api/productos/999999
```

```json
{
  "error": "Producto no encontrado."
}
```

### Consultas y operaciones adicionales

```bash
# Listar todos los productos
curl -i http://localhost:3000/api/productos

# Consultar un producto existente
curl -i http://localhost:3000/api/productos/1

# Actualizar un producto (reemplazo completo)
curl -i -X PUT http://localhost:3000/api/productos/1 \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Detergente Líquido 2L","categoria":"Aseo del Hogar","precio":12000,"stock":40,"codigo_barras":"7701234567890"}'

# Eliminar un producto
curl -i -X DELETE http://localhost:3000/api/productos/1
```

---

## Flujo de trabajo del equipo

- `BackEnd/` y `Front/` mantienen historiales de Git independientes; el repositorio raíz integra ambos entregables.
- Antes de subir cambios: ejecutar el servidor, validar los cinco endpoints y verificar que la interfaz refleje el resultado.
- Convención de commits sugerida: `feat:`, `fix:`, `docs:`, `refactor:`.
- No versionar `node_modules/` ni archivos `.db` con datos locales.

---

## Mejoras futuras

- Autenticación y roles (administrador / operador de inventario).
- Paginación, búsqueda y filtros por categoría.
- Alertas de bajo stock y reportes de inventario.
- Migraciones formales y pruebas automatizadas (Jest + Supertest).
- Contenerización con Docker y despliegue en la nube.

---

## Licencia

Proyecto académico desarrollado para la materia **Ingeniería de Software III** de la **Universidad Incca de Colombia**. Licencia MIT.

**Autores:** Diego Andrés Cubillos · Héctor Velasco
