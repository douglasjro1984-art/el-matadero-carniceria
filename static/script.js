// 1. BASE DE DATOS Y CONEXIÓN API
// ------------------------------------

// La variable global 'productos' se inicializa vacía.
// Será llenada ASÍNCRONAMENTE con los datos de MySQL a través de la API de Python.
let productos = []; 

// Variables de estado global para el carrito y localStorage
let carrito = [];
const STORAGE_KEY_CARRITO = 'carritoMatadero';
const STORAGE_KEY_PEDIDOS = 'historialPedidosMatadero';

// Referencias del DOM
const productosContainer = document.getElementById('productos-container');


/**
 * Función ASÍNCRONA para obtener los productos de la API de Python (Flask).
 */
async function cargarProductosDesdeAPI() {
    try {
        // ⚠️ VERIFICAR URL: Debe coincidir con la dirección donde corre tu servidor Python.
        const response = await fetch('http://127.0.0.1:5000/productos'); 
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        // Llenar la variable global 'productos' con los datos
        productos = await response.json(); 
        
        // ¡IMPORTANTE! Llama a renderizarProductos SÓLO después de cargar los datos
        renderizarProductos(); 
        
    } catch (error) {
        console.error("No se pudieron cargar los productos de la API:", error);
        // El error es del servidor o de la DB. Muestra el mensaje de conexión.
        productosContainer.innerHTML = '<p class="subtitle" style="color:red;">Error: No se pudo conectar al servidor Python. Asegúrate de que Flask esté corriendo.</p>';
    }
}


// 2. LÓGICA DEL CATÁLOGO (Renderizado)
// ------------------------------------

/**
 * Genera el HTML de las tarjetas de productos dinámicamente usando la lista 'productos'.
 */
function renderizarProductos() {
    productosContainer.innerHTML = '';
    
    if (productos.length === 0) {
        productosContainer.innerHTML = '<p class="subtitle">Catálogo vacío o error de carga.</p>';
        return;
    }

    productos.forEach(producto => {
        const card = document.createElement('div');
        card.classList.add('producto-card');
        card.setAttribute('data-id', producto.id);
        
        //  CORRECCIÓN 1: Convertir el precio a número para toFixed()
        const precioNumerico = parseFloat(producto.precio);
        const imagenSrc = `img/${producto.id}.jpg`;
        const precioFormateado = `$${precioNumerico.toFixed(3)} / ${producto.unidad}`;

        card.innerHTML = `
            <div class="card-imagen-corte">
                <img src="${imagenSrc}" alt="${producto.nombre}" onerror="this.onerror=null;this.src='img/default.jpg';" />
            </div>
            <h3>${producto.nombre}</h3>
            <p><strong>Corte:</strong> ${producto.corte}</p>
            <p class="precio">${precioFormateado}</p>
            <button class="btn-agregar" data-id="${producto.id}">
                <i class="fas fa-cart-plus"></i> Agregar
            </button>
        `;
        productosContainer.appendChild(card);
    });

    // Añadir eventos a los botones de agregar
    document.querySelectorAll('.btn-agregar').forEach(button => {
        button.addEventListener('click', agregarAlCarrito);
    });
}

// 3. LÓGICA DEL CARRITO
// ------------------------------------

/**
 * Agrega un producto al carrito al hacer clic.
 */
function agregarAlCarrito(event) {
    const idProducto = parseInt(event.currentTarget.dataset.id); 
    // Busca en la lista 'productos' llena por la API
    const producto = productos.find(p => p.id === idProducto); 
    
    if (!producto) {
        alert("El producto no está disponible o el catálogo no se ha cargado.");
        return;
    }

    const cantidadStr = prompt(`Ingresa la cantidad (${producto.unidad}) para ${producto.nombre}:`, "1.0");
    
    if (cantidadStr === null || cantidadStr.trim() === "" || isNaN(parseFloat(cantidadStr))) {
        alert("Operación cancelada o cantidad inválida.");
        return;
    }

    let cantidad = parseFloat(cantidadStr);
    if (cantidad <= 0) {
        alert("La cantidad debe ser mayor a cero.");
        return;
    }

    const productoExistente = carrito.find(item => item.id === idProducto);

    if (productoExistente) {
        productoExistente.cantidad += cantidad;
    } else {
        carrito.push({ ...producto, cantidad: cantidad });
    }

    actualizarCarrito();
    alert(`${producto.nombre} (${cantidad.toFixed(2)} ${producto.unidad}) agregado al carrito!`);
}

/**
 * Función para modificar la cantidad de un producto en el carrito desde el input.
 */
window.modificarCantidadCarrito = function(id, inputElement) {
    const nuevaCantidad = parseFloat(inputElement.value);

    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
        alert("La cantidad debe ser un número positivo.");
        const producto = carrito.find(item => item.id === id);
        inputElement.value = producto.cantidad.toFixed(2);
        return;
    }

    const producto = carrito.find(item => item.id === id);
    if (producto) {
        producto.cantidad = nuevaCantidad;
        actualizarCarrito();
    }
}

/**
 * Actualiza la vista del carrito y el contador en la cabecera.
 */
function actualizarCarrito() {
    const itemsCarrito = document.getElementById('items-carrito');
    const contadorCarrito = document.getElementById('contador-carrito');
    const totalCarrito = document.getElementById('total-carrito');
    let total = 0;

    itemsCarrito.innerHTML = ''; 

    if (carrito.length === 0) {
        itemsCarrito.innerHTML = '<p class="carrito-vacio-msg">Tu carrito está vacío. ¡Agrega tus cortes favoritos!</p>';
    }

    carrito.forEach(item => {
        // ✅ CORRECCIÓN 2: Asegura que el precio sea numérico (viene de productos o localStorage)
        const precioNumerico = parseFloat(item.precio);
        const subtotal = precioNumerico * item.cantidad;
        total += subtotal;

        const itemHTML = document.createElement('div');
        itemHTML.classList.add('carrito-item');
        itemHTML.innerHTML = `
            <span class="carrito-nombre">${item.nombre}</span>
            <div class="carrito-cantidad-control">
                <input 
                    type="number" 
                    min="0.001" 
                    step="0.001" 
                    value="${item.cantidad.toFixed(2)}" 
                    title="Modificar peso/cantidad en ${item.unidad}"
                    onchange="modificarCantidadCarrito(${item.id}, this)"
                    class="input-cantidad"
                >
                <span class="carrito-unidad">(${item.unidad})</span>
            </div>
            <span class="carrito-subtotal">$${subtotal.toFixed(3)}</span>
            <button onclick="removerDelCarrito(${item.id})" title="Remover producto" style="background:none; border:none; color:var(--color-principal); cursor:pointer; margin-left: 10px;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        itemsCarrito.appendChild(itemHTML);
    });

    contadorCarrito.textContent = carrito.length; 
    totalCarrito.textContent = `$${total.toFixed(3)}`;
    localStorage.setItem(STORAGE_KEY_CARRITO, JSON.stringify(carrito));
}

/**
 * Remueve un artículo del carrito.
 */
window.removerDelCarrito = function(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarCarrito();
}

/**
 * Vacía el carrito por completo.
 */
function vaciarCarrito() {
    if (confirm("¿Estás seguro de que quieres vaciar todo el carrito?")) {
        carrito = [];
        actualizarCarrito();
    }
}


// 4. LÓGICA DEL HISTORIAL Y COMPRA
// ------------------------------------

/**
 * Guarda el pedido actual en el historial y vacía el carrito.
 */
function finalizarCompra() {
    if (carrito.length === 0) {
        alert("El carrito está vacío. ¡Agrega algo antes de finalizar!");
        return;
    }

    const pedidosGuardados = obtenerPedidosGuardados();
    // ✅ CORRECCIÓN 3: Asegura que el precio sea numérico para el cálculo total
    const totalCompra = carrito.reduce((sum, item) => sum + parseFloat(item.precio) * item.cantidad, 0);

    const nuevoPedido = {
        id: Date.now(), 
        fecha: new Date().toLocaleString(),
        items: carrito,
        total: totalCompra.toFixed(3) // Usa el total calculado
    };

    pedidosGuardados.push(nuevoPedido);
    localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify(pedidosGuardados));
    
    carrito = [];
    actualizarCarrito();
    renderizarHistorial();
    
    alert(`¡Pedido ID: ${nuevoPedido.id} guardado con éxito! Total: $${nuevoPedido.total}.`);
    document.getElementById('modal-carrito').style.display = 'none';
}

/**
 * Carga el historial de pedidos desde localStorage.
 */
function obtenerPedidosGuardados() {
    const pedidos = localStorage.getItem(STORAGE_KEY_PEDIDOS);
    return pedidos ? JSON.parse(pedidos) : [];
}

/**
 * Renderiza el historial de pedidos en la sección de "Pedidos".
 */
function renderizarHistorial() {
    const historialContainer = document.getElementById('historial-container'); 
    const pedidos = obtenerPedidosGuardados();

    historialContainer.innerHTML = ''; 

    if (pedidos.length === 0) {
        const noPedidosMsg = document.createElement('p');
        noPedidosMsg.id = 'no-pedidos-msg';
        noPedidosMsg.textContent = 'No hay pedidos guardados en tu historial local.';
        historialContainer.appendChild(noPedidosMsg);
        return;
    }
    
    // Ordenar por el pedido más reciente (ID más alto)
    pedidos.sort((a, b) => b.id - a.id); 

    pedidos.forEach(pedido => {
        const card = document.createElement('div');
        card.classList.add('historial-pedido-card');
        
        // Genera la lista de ítems del pedido
        let itemsListHTML = pedido.items.map(item => {
            // ✅ CORRECCIÓN 4: Convertir precio y cantidad a número (vienen de localStorage como string)
            const precioNumerico = parseFloat(item.precio);
            const cantidadNumerica = parseFloat(item.cantidad);
            const subtotal = precioNumerico * cantidadNumerica;

            return `
                <li>${item.nombre} (${cantidadNumerica.toFixed(2)} ${item.unidad}) - Subtotal: $${subtotal.toFixed(3)}</li>
            `;
        }).join('');

        card.innerHTML = `
            <h4>Pedido ID: ${pedido.id}</h4>
            <p><strong>Fecha:</strong> ${pedido.fecha}</p>
            <p><strong>Total:</strong> <span class="precio-total">$${pedido.total}</span></p>
            <h5>Detalle:</h5>
            <ul class="detalle-items-historial">
                ${itemsListHTML}
            </ul>
            <hr>
        `;
        historialContainer.appendChild(card);
    });
}


// 5. INICIALIZACIÓN
// ------------------------------------

/**
 * Función que se ejecuta al cargar la página (DOMContentLoaded)
 * * Inicializa el carrito, carga los productos de la API y asigna eventos.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar el carrito desde localStorage (si existe)
    const carritoGuardado = localStorage.getItem(STORAGE_KEY_CARRITO);
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
    }
    
    // 2. Cargar el catálogo de productos desde la API (y renderizará el catálogo después de cargar)
    cargarProductosDesdeAPI();

    // 3. Renderizar el carrito y el historial con los datos cargados de localStorage
    actualizarCarrito();
    renderizarHistorial();
    
    // 4. Asignar eventos a los botones principales del carrito (vaciar/finalizar)
    const btnVaciar = document.getElementById('vaciar-carrito-btn');
    const btnFinalizar = document.getElementById('finalizar-compra-btn');
    
    if (btnVaciar) btnVaciar.addEventListener('click', vaciarCarrito);
    if (btnFinalizar) btnFinalizar.addEventListener('click', finalizarCompra);
    
    // 5. Lógica de apertura/cierre del modal del carrito
    const botonCarrito = document.getElementById('abrir-carrito');
    const modalCarrito = document.getElementById('modal-carrito');
    const botonCerrar = document.querySelector('.cerrar-modal');

    if (botonCarrito && modalCarrito) {
        botonCarrito.addEventListener('click', () => {
            modalCarrito.style.display = 'block';
        });
    }

    if (botonCerrar && modalCarrito) {
        botonCerrar.addEventListener('click', () => {
            modalCarrito.style.display = 'none';
        });
    }

    // Cierra el modal si se hace clic fuera de él
    window.onclick = function(event) {
        if (event.target == modalCarrito) {
            modalCarrito.style.display = 'none';
        }
    }
});

async function finalizarCompra() {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const totalCompra = carrito.reduce((sum, item) => sum + parseFloat(item.precio) * item.cantidad, 0);

    // SI HAY USUARIO → Guardar en MySQL
    if (usuarioActual) {
        try {
            const response = await fetch('http://127.0.0.1:5000/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente_id: usuarioActual.id,
                    items: carrito.map(item => ({
                        id: item.id,
                        cantidad: item.cantidad,
                        precio: item.precio
                    }))
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert(`¡Pedido #${result.pedido_id} creado! Total: $${result.total.toFixed(3)}`);
                cargarHistorialDesdeAPI();
            } else {
                alert(result.error || 'Error al guardar pedido');
            }
        } catch (err) {
            alert('Error de conexión al guardar pedido.');
        }
    } 
    // SI NO HAY USUARIO → Guardar en localStorage (como antes)
    else {
        const pedidosGuardados = obtenerPedidosGuardados();
        const nuevoPedido = {
            id: Date.now(),
            fecha: new Date().toLocaleString(),
            items: carrito,
            total: totalCompra.toFixed(3)
        };
        pedidosGuardados.push(nuevoPedido);
        localStorage.setItem(STORAGE_KEY_PEDIDOS, JSON.stringify(pedidosGuardados));
        alert(`¡Pedido guardado localmente! Total: $${nuevoPedido.total}`);
    }

    // Vaciar carrito
    carrito = [];
    actualizarCarrito();
    document.getElementById('modal-carrito').style.display = 'none';
}