const API_URL = "http://localhost:3000/api/productos";

const CATEGORIAS_PERMITIDAS = [
  "Aseo del Hogar",
  "Cuidado Personal",
  "Lavandería",
  "Utensilios de Limpieza",
  "Desinfección",
];

const form = document.getElementById("product-form");
const tableBody = document.getElementById("table-body");
const alertContainer = document.getElementById("alert-container");
const formTitle = document.getElementById("form-title");
const btnSubmit = document.getElementById("btn-submit");
const btnCancel = document.getElementById("btn-cancel");

document.addEventListener("DOMContentLoaded", cargarProductos);

// Utilidad para mostrar alertas según el código HTTP
function mostrarAlerta(mensaje, tipo = "success", codigoHttp = "") {
  const badge = codigoHttp
    ? `<span class="badge bg-dark me-2">HTTP ${codigoHttp}</span>`
    : "";
  alertContainer.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${badge} <strong>${mensaje}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
  setTimeout(() => {
    alertContainer.innerHTML = "";
  }, 5000);
}

// 1. LISTAR TODOS (GET /api/productos -> 200 OK | 500)
async function cargarProductos() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      mostrarAlerta(
        errData.error || "Error interno al consultar productos.",
        "danger",
        response.status,
      );
      return;
    }

    const productos = await response.json();
    renderizarTabla(productos);
  } catch (error) {
    mostrarAlerta(
      `Error de conexión con el servidor: ${error.message}`,
      "danger",
    );
  }
}

function renderizarTabla(productos) {
  tableBody.innerHTML = "";

  if (!productos || productos.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-3">
          No hay productos registrados en la base de datos.
        </td>
      </tr>`;
    return;
  }

  productos.forEach((prod) => {
    const tr = document.createElement("tr");
    const fecha = prod.creado_en
      ? new Date(prod.creado_en).toLocaleDateString("es-CO")
      : "-";

    tr.innerHTML = `
      <td>${prod.id}</td>
      <td><code>${prod.codigo_barras}</code></td>
      <td class="fw-medium">${prod.nombre}</td>
      <td><span class="badge bg-secondary">${prod.categoria}</span></td>
      <td>$${Number(prod.precio).toLocaleString("es-CO", { minimumFractionDigits: 2 })}</td>
      <td>
        <span class="badge ${prod.stock > 0 ? "bg-info text-dark" : "bg-danger"}">
          ${prod.stock} uds
        </span>
      </td>
      <td class="small text-muted">${fecha}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-warning me-1" onclick="cargarProductoParaEditar(${prod.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${prod.id}, '${prod.nombre.replace(/'/g, "\\'")}')">Eliminar</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// 2. CONSULTAR POR ID PARA EDICIÓN (GET /api/productos/:id -> 200 OK | 404 Not Found)
async function cargarProductoParaEditar(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const data = await response.json().catch(() => ({}));

    if (response.status === 404) {
      mostrarAlerta(
        data.error || `El producto con ID ${id} no existe.`,
        "danger",
        404,
      );
      cargarProductos();
      return;
    }

    if (!response.ok) {
      mostrarAlerta(
        data.error || "Error al obtener el producto.",
        "danger",
        response.status,
      );
      return;
    }

    // Llenar formulario con todos los campos exigidos por PUT
    document.getElementById("product-id").value = data.id;
    document.getElementById("codigo_barras").value = data.codigo_barras;
    document.getElementById("nombre").value = data.nombre;
    document.getElementById("categoria").value = data.categoria;
    document.getElementById("precio").value = data.precio;
    document.getElementById("stock").value = data.stock;

    formTitle.textContent = `Editando Producto #${data.id}`;
    btnSubmit.textContent = "Actualizar Producto";
    btnSubmit.classList.replace("btn-success", "btn-warning");
    btnCancel.classList.remove("d-none");
    form.classList.remove("was-validated");
  } catch (error) {
    mostrarAlerta(`Error de red: ${error.message}`, "danger");
  }
}

// 3. CREAR (POST -> 201 | 400) Y ACTUALIZAR (PUT -> 200 | 400 | 404)
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("product-id").value;
  const codigo_barras = document.getElementById("codigo_barras").value.trim();
  const nombre = document.getElementById("nombre").value.trim();
  const categoria = document.getElementById("categoria").value;
  const precioRaw = document.getElementById("precio").value;
  const stockRaw = document.getElementById("stock").value;

  const precio = parseFloat(precioRaw);
  const stock = Number(stockRaw);

  // Validaciones del lado del cliente según reglas de negocio
  const esValido =
    codigo_barras.length > 0 &&
    nombre.length > 0 &&
    CATEGORIAS_PERMITIDAS.includes(categoria) &&
    !isNaN(precio) &&
    precio > 0 &&
    stockRaw !== "" &&
    Number.isInteger(stock) &&
    stock >= 0;

  if (!esValido) {
    form.classList.add("was-validated");
    mostrarAlerta(
      "Verifica los datos: todos los campos son obligatorios, precio > 0 y stock entero >= 0.",
      "warning",
    );
    return;
  }

  // Payload completo (Reglas 1 y 7)
  const payload = {
    nombre,
    categoria,
    precio,
    stock,
    codigo_barras,
  };

  const esEdicion = Boolean(id);
  const url = esEdicion ? `${API_URL}/${id}` : API_URL;
  const metodo = esEdicion ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 201) {
      mostrarAlerta("Producto creado exitosamente.", "success", 201);
      resetearFormulario();
      cargarProductos();
    } else if (response.status === 200) {
      mostrarAlerta("Producto actualizado correctamente.", "success", 200);
      resetearFormulario();
      cargarProductos();
    } else if (response.status === 400) {
      // Ej. código de barras duplicado o regla de negocio incumplida
      mostrarAlerta(
        data.error || "Solicitud inválida (400 Bad Request).",
        "danger",
        400,
      );
    } else if (response.status === 404) {
      mostrarAlerta(
        data.error || "El producto a actualizar no existe.",
        "danger",
        404,
      );
      resetearFormulario();
      cargarProductos();
    } else {
      mostrarAlerta(
        data.error || "Error inesperado en el servidor.",
        "danger",
        response.status,
      );
    }
  } catch (error) {
    mostrarAlerta(`Error de red: ${error.message}`, "danger");
  }
});

// 4. ELIMINAR (DELETE /api/productos/:id -> 204 No Content | 404 Not Found)
async function eliminarProducto(id, nombre) {
  const confirmado = confirm(
    `¿Seguro que deseas eliminar "${nombre}" (ID: ${id})?`,
  );
  if (!confirmado) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    // 204 No Content no tiene cuerpo JSON
    if (response.status === 204) {
      mostrarAlerta("Producto eliminado correctamente.", "success", 204);
      cargarProductos();
      return;
    }

    const data = await response.json().catch(() => ({}));

    if (response.status === 404) {
      mostrarAlerta(
        data.error || "El producto no existe o ya fue eliminado.",
        "danger",
        404,
      );
      cargarProductos();
    } else {
      mostrarAlerta(
        data.error || "Error al eliminar el producto.",
        "danger",
        response.status,
      );
    }
  } catch (error) {
    mostrarAlerta(`Error de red al eliminar: ${error.message}`, "danger");
  }
}

// Auxiliares de formulario
btnCancel.addEventListener("click", resetearFormulario);

function resetearFormulario() {
  form.reset();
  form.classList.remove("was-validated");
  document.getElementById("product-id").value = "";
  formTitle.textContent = "Nuevo Producto";
  btnSubmit.textContent = "Guardar Producto";
  btnSubmit.classList.replace("btn-warning", "btn-success");
  btnCancel.classList.add("d-none");
}
