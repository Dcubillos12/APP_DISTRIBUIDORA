const API_URL = "http://localhost:3000/api/productos";

const CATEGORIAS_PERMITIDAS = [
  "Aseo del Hogar",
  "Cuidado Personal",
  "Lavandería",
  "Utensilios de Limpieza",
  "Desinfección",
];

const CATEGORIA_CLASES = {
  "Aseo del Hogar": "cat--aseo",
  "Cuidado Personal": "cat--cuidado",
  Lavandería: "cat--lavanderia",
  "Utensilios de Limpieza": "cat--utensilios",
  Desinfección: "cat--desinfeccion",
};

const TOAST_META = {
  success: { icon: "bi-check-circle-fill" },
  danger: { icon: "bi-x-octagon-fill" },
  warning: { icon: "bi-exclamation-triangle-fill" },
  info: { icon: "bi-info-circle-fill" },
};

const fmtCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const fmtCompacto = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});
const fmtEntero = new Intl.NumberFormat("es-CO");
const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const fmtHora = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
});

const $ = (id) => document.getElementById(id);

const refs = {
  form: $("product-form"),
  formPanel: $("formulario"),
  formTitle: $("form-title"),
  formSub: $("form-sub"),
  productId: $("product-id"),
  codigo: $("codigo_barras"),
  nombre: $("nombre"),
  categoria: $("categoria"),
  precio: $("precio"),
  stock: $("stock"),
  btnSubmit: $("btn-submit"),
  btnCancel: $("btn-cancel"),
  tableBody: $("table-body"),
  contador: $("contador-lista"),
  buscador: $("buscador"),
  filtroCategoria: $("filtro-categoria"),
  btnRefresh: $("btn-refresh"),
  apiStatus: $("api-status"),
  apiStatusText: $("api-status-text"),
  lastUpdate: $("last-update"),
  panelUpdated: $("panel-updated"),
  toastContainer: $("toast-container"),
  confirmModal: $("confirm-modal"),
  confirmName: $("confirm-name"),
  confirmDelete: $("confirm-delete"),
  kpiProductos: $("kpi-productos"),
  kpiUnidades: $("kpi-unidades"),
  kpiCategorias: $("kpi-categorias"),
  kpiValor: $("kpi-valor"),
};

const state = {
  productos: [],
  busqueda: "",
  categoria: "",
  cargando: false,
  error: false,
};

let ultimaActualizacion = null;
let productoAEliminar = null;
let modalConfirmacion = null;

/* Utilidades -------------------------------------------------------------- */

const escapeHtml = (valor) =>
  String(valor ?? "").replace(/[&<>"']/g, (caracter) => {
    const mapa = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return mapa[caracter];
  });

const normalizar = (texto) =>
  String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const aNumero = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const formatearFecha = (valor) => {
  if (!valor) return "—";
  const fecha = new Date(String(valor).replace(" ", "T"));
  return Number.isNaN(fecha.getTime()) ? "—" : fmtFecha.format(fecha);
};

async function peticion(url, opciones = {}, timeout = 12000) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...opciones,
      signal: controlador.signal,
      headers: { Accept: "application/json", ...(opciones.headers || {}) },
    });

    const texto = await response.text();
    let data = null;
    if (texto) {
      try {
        data = JSON.parse(texto);
      } catch {
        data = null;
      }
    }

    return { response, data };
  } finally {
    clearTimeout(temporizador);
  }
}

/* Notificaciones y estado ------------------------------------------------- */

function showToast(tipo, titulo, mensaje, codigo = "") {
  const meta = TOAST_META[tipo] || TOAST_META.info;

  while (refs.toastContainer.children.length >= 4) {
    refs.toastContainer.firstElementChild.remove();
  }

  const toastEl = document.createElement("div");
  toastEl.className = `toast app-toast app-toast--${tipo}`;
  toastEl.setAttribute(
    "role",
    tipo === "danger" || tipo === "warning" ? "alert" : "status",
  );
  toastEl.innerHTML = `
    <div class="d-flex align-items-start">
      <div class="toast-body">
        <i class="bi ${meta.icon}" aria-hidden="true"></i>
        <div class="flex-grow-1">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <strong>${escapeHtml(titulo)}</strong>
            ${codigo ? `<span class="http-tag">HTTP ${escapeHtml(String(codigo))}</span>` : ""}
          </div>
          <div class="mt-1">${escapeHtml(mensaje)}</div>
        </div>
      </div>
      <button
        type="button"
        class="btn-close me-2 mt-2"
        data-bs-dismiss="toast"
        aria-label="Cerrar notificación"
      ></button>
    </div>
  `;

  refs.toastContainer.appendChild(toastEl);

  const toast = new bootstrap.Toast(toastEl, { delay: 5200, autohide: true });
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  toast.show();
}

function setApiStatus(estado) {
  const etiquetas = {
    online: "API en línea",
    offline: "Sin conexión",
    checking: "Verificando API…",
  };
  refs.apiStatus.dataset.state = estado;
  refs.apiStatusText.textContent = etiquetas[estado] || etiquetas.checking;
}

function marcarActualizacion() {
  ultimaActualizacion = new Date();
  const hora = fmtHora.format(ultimaActualizacion);
  refs.lastUpdate.textContent = `· ${hora}`;
  refs.lastUpdate.setAttribute("datetime", ultimaActualizacion.toISOString());
  refs.panelUpdated.textContent = hora;
  refs.panelUpdated.setAttribute("datetime", ultimaActualizacion.toISOString());
}

function manejarErrorRed(error) {
  const mensaje =
    error?.name === "AbortError"
      ? "La solicitud tardó demasiado. Revisa que el backend esté activo."
      : `No se pudo contactar la API en ${API_URL}. Verifica que el backend esté en ejecución.`;

  setApiStatus("offline");
  showToast("danger", "Error de conexión", mensaje);
}

/* KPIs -------------------------------------------------------------------- */

function renderKpis() {
  const productos = state.productos;
  const unidades = productos.reduce((total, p) => total + aNumero(p.stock), 0);
  const categorias = new Set(productos.map((p) => p.categoria)).size;
  const valor = productos.reduce(
    (total, p) => total + aNumero(p.precio) * aNumero(p.stock),
    0,
  );

  refs.kpiProductos.textContent = fmtEntero.format(productos.length);
  refs.kpiUnidades.textContent = fmtEntero.format(unidades);
  refs.kpiCategorias.textContent = `${categorias} / ${CATEGORIAS_PERMITIDAS.length}`;
  refs.kpiValor.textContent = `$ ${fmtCompacto.format(valor)}`;
  refs.kpiValor.title = fmtCOP.format(valor);
}

/* Tabla ------------------------------------------------------------------- */

function productosFiltrados() {
  const termino = normalizar(state.busqueda.trim());

  return state.productos.filter((producto) => {
    if (state.categoria && producto.categoria !== state.categoria) {
      return false;
    }
    if (!termino) return true;

    return normalizar(
      `${producto.nombre} ${producto.codigo_barras} ${producto.categoria} ${producto.id}`,
    ).includes(termino);
  });
}

function filaVacia({ icono, titulo, texto, accion = "" }) {
  return `
    <tr>
      <td colspan="6">
        <div class="empty-state">
          <span class="empty-state__icon" aria-hidden="true">
            <i class="bi ${icono}"></i>
          </span>
          <h3>${escapeHtml(titulo)}</h3>
          <p>${escapeHtml(texto)}</p>
          ${accion}
        </div>
      </td>
    </tr>
  `;
}

function filaProducto(producto) {
  const precio = aNumero(producto.precio);
  const stock = aNumero(producto.stock);
  const claseCategoria = CATEGORIA_CLASES[producto.categoria] || "cat--otra";

  const claseStock = stock === 0 ? "stock--out" : stock <= 5 ? "stock--low" : "stock--ok";
  const etiquetaStock = stock === 0 ? "Agotado" : `${fmtEntero.format(stock)} uds`;
  const nombre = escapeHtml(producto.nombre);

  return `
    <tr>
      <td>
        <div class="product-cell">
          <span class="product-name">${nombre}</span>
          <span class="product-meta">
            <span class="code-chip">${escapeHtml(producto.codigo_barras)}</span>
            <span class="cell-id">#${escapeHtml(producto.id)}</span>
          </span>
        </div>
      </td>
      <td data-label="Categoría">
        <span class="cat-badge ${claseCategoria}">
          ${escapeHtml(producto.categoria)}
        </span>
      </td>
      <td class="price" data-label="Precio">${fmtCOP.format(precio)}</td>
      <td class="text-end" data-label="Stock">
        <span class="stock-badge ${claseStock}">${etiquetaStock}</span>
      </td>
      <td class="cell-date d-none d-md-table-cell" data-label="Creado">
        ${formatearFecha(producto.creado_en)}
      </td>
      <td>
        <div class="row-actions">
          <button
            type="button"
            class="btn-row btn-row--edit"
            data-action="edit"
            data-id="${escapeHtml(producto.id)}"
            title="Editar ${nombre}"
            aria-label="Editar ${nombre}"
          >
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn-row btn-row--delete"
            data-action="delete"
            data-id="${escapeHtml(producto.id)}"
            title="Eliminar ${nombre}"
            aria-label="Eliminar ${nombre}"
          >
            <i class="bi bi-trash3" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderTabla() {
  if (state.cargando) {
    refs.tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <span class="empty-state__icon" aria-hidden="true">
              <span class="spinner-border text-primary" role="status"></span>
            </span>
            <h3>Cargando catálogo…</h3>
            <p>Consultando los productos registrados.</p>
          </div>
        </td>
      </tr>
    `;
    refs.contador.textContent = "Consultando la base de datos…";
    return;
  }

  if (state.error) {
    refs.tableBody.innerHTML = filaVacia({
      icono: "bi-plug-fill",
      titulo: "Sin conexión con la API",
      texto:
        "No se pudo cargar el catálogo. Verifica que el backend esté en ejecución en el puerto 3000.",
      accion:
        '<button type="button" class="btn btn-brand btn-sm mt-3" data-action="retry"><i class="bi bi-arrow-clockwise me-1"></i>Reintentar</button>',
    });
    refs.contador.textContent = "Error de conexión";
    return;
  }

  if (state.productos.length === 0) {
    refs.tableBody.innerHTML = filaVacia({
      icono: "bi-box",
      titulo: "Aún no hay productos",
      texto: "Usa el formulario para registrar el primer producto del catálogo.",
    });
    refs.contador.textContent = "0 productos registrados";
    return;
  }

  const productos = productosFiltrados();

  if (productos.length === 0) {
    refs.tableBody.innerHTML = filaVacia({
      icono: "bi-search",
      titulo: "Sin coincidencias",
      texto: "Ningún producto coincide con la búsqueda o el filtro seleccionado.",
      accion:
        '<button type="button" class="btn btn-light btn-sm mt-3" data-action="clear-filters"><i class="bi bi-x-lg me-1"></i>Limpiar filtros</button>',
    });
  } else {
    refs.tableBody.innerHTML = productos.map(filaProducto).join("");
  }

  const filtrosActivos = state.busqueda.trim() || state.categoria;
  refs.contador.textContent = filtrosActivos
    ? `Mostrando ${fmtEntero.format(productos.length)} de ${fmtEntero.format(state.productos.length)} productos · filtros activos`
    : `${fmtEntero.format(state.productos.length)} productos registrados`;
}

function renderTodo() {
  renderKpis();
  renderTabla();
}

/* Carga de datos ---------------------------------------------------------- */

async function cargarProductos({ silencioso = false } = {}) {
  if (!silencioso) {
    state.cargando = true;
    state.error = false;
    renderTabla();
  }

  refs.btnRefresh.classList.add("is-loading");
  refs.btnRefresh.disabled = true;
  setApiStatus("checking");

  try {
    const { response, data } = await peticion(API_URL);

    if (!response.ok) {
      throw new Error(`El servidor respondió ${response.status}`);
    }

    state.productos = Array.isArray(data) ? data : [];
    state.error = false;
    state.cargando = false;
    setApiStatus("online");
    marcarActualizacion();
    renderTodo();
  } catch (error) {
    state.cargando = false;
    state.error = true;
    setApiStatus("offline");
    renderTabla();
    manejarErrorRed(error);
  } finally {
    refs.btnRefresh.classList.remove("is-loading");
    refs.btnRefresh.disabled = false;
  }
}

/* Formulario -------------------------------------------------------------- */

function setSubmitting(activo, etiqueta) {
  refs.btnSubmit.disabled = activo;
  const span = refs.btnSubmit.querySelector("span");
  const icono = refs.btnSubmit.querySelector("i");

  if (activo) {
    span.textContent = "Guardando…";
    icono.className = "spinner-border spinner-border-sm me-2";
  } else {
    span.textContent = etiqueta;
    icono.className = "bi bi-check2-circle me-1";
  }
}

function estadoEdicion(activo, producto) {
  refs.formTitle.textContent = activo ? `Editando #${producto.id}` : "Nuevo producto";
  refs.formSub.textContent = activo
    ? "Modifica los datos y guarda los cambios"
    : "Completa los datos para agregarlo al catálogo";

  refs.btnSubmit.querySelector("span").textContent = activo
    ? "Actualizar producto"
    : "Guardar producto";
  refs.btnSubmit.querySelector("i").className = activo
    ? "bi bi-arrow-repeat me-1"
    : "bi bi-check2-circle me-1";

  refs.btnCancel.classList.toggle("d-none", !activo);
}

function resetearFormulario() {
  refs.form.reset();
  refs.form.classList.remove("was-validated");
  refs.productId.value = "";
  refs.codigo.classList.remove("is-invalid");
  estadoEdicion(false);
}

function enfocarFormulario() {
  refs.formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  refs.nombre.focus({ preventScroll: true });
}

function limpiarFiltros() {
  state.busqueda = "";
  state.categoria = "";
  refs.buscador.value = "";
  refs.filtroCategoria.value = "";
  renderTabla();
}

async function cargarProductoParaEditar(id) {
  try {
    const { response, data } = await peticion(`${API_URL}/${id}`);

    if (response.status === 404) {
      showToast(
        "warning",
        "Producto no encontrado",
        data?.error || `El producto #${id} ya no existe.`,
        404,
      );
      await cargarProductos({ silencioso: true });
      return;
    }

    if (!response.ok) {
      showToast(
        "danger",
        "No se pudo cargar el producto",
        data?.error || `El servidor respondió ${response.status}.`,
        response.status,
      );
      return;
    }

    refs.productId.value = data.id;
    refs.codigo.value = data.codigo_barras;
    refs.nombre.value = data.nombre;
    refs.categoria.value = data.categoria;
    refs.precio.value = data.precio;
    refs.stock.value = data.stock;

    refs.form.classList.remove("was-validated");
    refs.codigo.classList.remove("is-invalid");
    estadoEdicion(true, data);
    enfocarFormulario();

    showToast(
      "info",
      "Producto cargado",
      `${data.nombre} está listo para editarse.`,
      200,
    );
  } catch (error) {
    manejarErrorRed(error);
  }
}

/* Eliminación ------------------------------------------------------------- */

function abrirConfirmacion(producto) {
  productoAEliminar = producto;
  refs.confirmName.textContent = producto.nombre;

  if (!modalConfirmacion) {
    modalConfirmacion = new bootstrap.Modal(refs.confirmModal);
  }

  modalConfirmacion.show();
}

async function eliminarProducto(producto) {
  try {
    const { response, data } = await peticion(`${API_URL}/${producto.id}`, {
      method: "DELETE",
    });

    if (response.status === 204) {
      showToast(
        "success",
        "Producto eliminado",
        `"${producto.nombre}" se eliminó del inventario.`,
        204,
      );
      await cargarProductos({ silencioso: true });
      return;
    }

    if (response.status === 404) {
      showToast(
        "warning",
        "Producto no encontrado",
        data?.error || "El producto ya no existe o fue eliminado.",
        404,
      );
      await cargarProductos({ silencioso: true });
      return;
    }

    showToast(
      "danger",
      "No se pudo eliminar",
      data?.error || `El servidor respondió ${response.status}.`,
      response.status,
    );
  } catch (error) {
    manejarErrorRed(error);
  }
}

/* Eventos ----------------------------------------------------------------- */

refs.form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const id = refs.productId.value;
  const codigo = refs.codigo.value.trim();
  const nombre = refs.nombre.value.trim();
  const categoria = refs.categoria.value;
  const precio = Number.parseFloat(refs.precio.value);
  const stockTexto = refs.stock.value;
  const stock = Number(stockTexto);

  const esValido =
    codigo.length > 0 &&
    nombre.length > 0 &&
    CATEGORIAS_PERMITIDAS.includes(categoria) &&
    Number.isFinite(precio) &&
    precio > 0 &&
    stockTexto !== "" &&
    Number.isInteger(stock) &&
    stock >= 0;

  if (!esValido) {
    refs.form.classList.add("was-validated");
    showToast(
      "warning",
      "Revisa los datos",
      "Todos los campos son obligatorios; el precio debe ser mayor a 0 y el stock un entero mayor o igual a 0.",
    );
    return;
  }

  refs.form.classList.remove("was-validated");
  refs.codigo.classList.remove("is-invalid");

  const esEdicion = Boolean(id);
  const url = esEdicion ? `${API_URL}/${id}` : API_URL;
  const etiqueta = esEdicion ? "Actualizar producto" : "Guardar producto";

  setSubmitting(true, etiqueta);

  try {
    const { response, data } = await peticion(url, {
      method: esEdicion ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        categoria,
        precio,
        stock,
        codigo_barras: codigo,
      }),
    });

    if (response.status === 201 || response.status === 200) {
      showToast(
        "success",
        esEdicion ? "Producto actualizado" : "Producto creado",
        esEdicion
          ? `"${nombre}" se actualizó correctamente.`
          : `"${nombre}" se agregó al inventario.`,
        response.status,
      );
      resetearFormulario();
      if (!esEdicion) limpiarFiltros();
      await cargarProductos({ silencioso: true });
      return;
    }

    if (response.status === 400) {
      showToast(
        "danger",
        "Solicitud inválida",
        data?.error || "Revisa los datos enviados (400 Bad Request).",
        400,
      );
      if (String(data?.error || "").toLowerCase().includes("código de barras")) {
        refs.codigo.classList.add("is-invalid");
        refs.codigo.focus();
      }
      return;
    }

    if (response.status === 404) {
      showToast(
        "warning",
        "Producto no encontrado",
        data?.error || "El producto a actualizar no existe.",
        404,
      );
      resetearFormulario();
      await cargarProductos({ silencioso: true });
      return;
    }

    showToast(
      "danger",
      "Error inesperado",
      data?.error || `El servidor respondió ${response.status}.`,
      response.status,
    );
  } catch (error) {
    manejarErrorRed(error);
  } finally {
    setSubmitting(false, etiqueta);
  }
});

refs.btnCancel.addEventListener("click", () => {
  resetearFormulario();
  showToast("info", "Edición cancelada", "El formulario volvió al modo de creación.");
});

refs.confirmDelete.addEventListener("click", async () => {
  if (!productoAEliminar) return;

  const producto = productoAEliminar;
  const contenidoOriginal = refs.confirmDelete.innerHTML;

  refs.confirmDelete.disabled = true;
  refs.confirmDelete.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Eliminando…';

  try {
    await eliminarProducto(producto);
  } finally {
    refs.confirmDelete.disabled = false;
    refs.confirmDelete.innerHTML = contenidoOriginal;
    productoAEliminar = null;
    modalConfirmacion?.hide();
  }
});

refs.tableBody.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-action]");
  if (!boton) return;

  const accion = boton.dataset.action;

  if (accion === "retry") {
    cargarProductos();
    return;
  }

  if (accion === "clear-filters") {
    limpiarFiltros();
    return;
  }

  const producto = state.productos.find(
    (item) => String(item.id) === String(boton.dataset.id),
  );
  if (!producto) return;

  if (accion === "edit") cargarProductoParaEditar(producto.id);
  if (accion === "delete") abrirConfirmacion(producto);
});

refs.buscador.addEventListener("input", (evento) => {
  state.busqueda = evento.target.value;
  renderTabla();
});

refs.filtroCategoria.addEventListener("change", (evento) => {
  state.categoria = evento.target.value;
  renderTabla();
});

refs.btnRefresh.addEventListener("click", () => {
  cargarProductos({ silencioso: true });
});

document.addEventListener("keydown", (evento) => {
  const etiqueta = document.activeElement?.tagName;
  const escribiendo = ["INPUT", "TEXTAREA", "SELECT"].includes(etiqueta);

  if (evento.key === "/" && !escribiendo) {
    evento.preventDefault();
    refs.buscador.focus();
    return;
  }

  if (evento.key === "Escape" && document.activeElement === refs.buscador) {
    refs.buscador.value = "";
    state.busqueda = "";
    renderTabla();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setApiStatus("checking");
  cargarProductos();
});
