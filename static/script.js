// 1. BASE DE DATOS Y CONEXIÓN API
// ------------------------------------

let productos = []; 
let carrito = [];
const STORAGE_KEY_CARRITO = 'carritoMatadero';
const STORAGE_KEY_PEDIDOS = 'historialPedidosMatadero';

// Referencias del DOM
const productosContainer = document.getElementById('productos-container');

/**
 * Función ASÍNCRONA para obtener los productos de la API
 */
async function cargarProductosDesdeAPI() {
    try {
        const response = await fetch('/productos'); 
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        productos = await response.json(); 
        renderizarProductos(); 
        
    } catch (error) {
        console.error("No se pudieron cargar los productos de la API:", error);
        productosContainer.innerHTML = '<p class="subtitle" style="color:red;">Error: No se pudo conectar al servidor. Intenta recargar la página.</p>';
    }
}

// 2. LÓGICA DEL CATÁLOGO (Renderizado)
// ------------------------------------

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
        
        const precioNumerico = parseFloat(producto.precio);
        const imagenSrc = `/static/img/${producto.id}.jpg`;
        const precioFormateado = `$${precioNumerico.toFixed(3)} / ${producto.unidad}`;

        card.innerHTML = `
            <div class="card-imagen-corte">
                <img src="${imagenSrc}" alt="${producto.nombre}" onerror="this.onerror=null;this.src='/static/img/default.jpg';" />
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

    document.querySelectorAll('.btn-agregar').forEach(button => {
        button.addEventListener('click', agregarAlCarrito);
    });
}

// 3. LÓGICA DEL CARRITO
// ------------------------------------

function agregarAlCarrito(event) {
    const idProducto = parseInt(event.currentTarget.dataset.id); 
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
    mostrarNotificacion(`${producto.nombre} (${cantidad.toFixed(2)} ${producto.unidad}) agregado al carrito!`, 'success');
}

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

window.removerDelCarrito = function(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarCarrito();
}

function vaciarCarrito() {
    if (confirm("¿Estás seguro de que quieres vaciar todo el carrito?")) {
        carrito = [];
        actualizarCarrito();
    }
}

// 4. LÓGICA DEL HISTORIAL Y COMPRA
// ------------------------------------

async function finalizarCompra() {
    if (carrito.length === 0) {
        alert("El carrito está vacío. ¡Agrega algo antes de finalizar!");
        return;
    }

    // Verificar si hay usuario logueado
    if (!usuarioActual) {
        alert("Debes iniciar sesión para finalizar tu compra");
        return;
    }

    const totalCompra = carrito.reduce((sum, item) => sum + parseFloat(item.precio) * item.cantidad, 0);

    // NUEVO: Preguntar método de pago
    const metodoPago = await preguntarMetodoPago();
    if (!metodoPago) {
        return; // Usuario canceló
    }

    try {
        const response = await fetch('/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente_id: usuarioActual.id,
                items: carrito.map(item => ({
                    id: item.id,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    nombre: item.nombre,
                    unidad: item.unidad
                })),
                metodo_pago: metodoPago
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Generar ticket
            generarTicket({
                pedido_id: result.pedido_id,
                fecha: new Date().toLocaleString('es-AR'),
                items: carrito,
                total: totalCompra,
                metodo_pago: metodoPago,
                cliente: usuarioActual
            });

            mostrarNotificacion(`¡Pedido #${result.pedido_id} creado exitosamente!`, 'success');
            
            // Vaciar carrito y cerrar modal
            carrito = [];
            actualizarCarrito();
            document.getElementById('modal-carrito').style.display = 'none';
            
            // Recargar historial
            if (typeof cargarHistorialDesdeAPI === 'function') {
                cargarHistorialDesdeAPI();
            }
        } else {
            alert(result.error || 'Error al guardar pedido');
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión al guardar pedido.');
    }
}

// NUEVA FUNCIÓN: Preguntar método de pago
function preguntarMetodoPago() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3 style="color: var(--color-principal); margin-bottom: 20px;">Selecciona método de pago</h3>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button class="btn-compra" onclick="seleccionarMetodo('efectivo')" style="width: 100%; font-size: 1.1em;">
                        <i class="fas fa-money-bill-wave"></i> Efectivo
                    </button>
                    <button class="btn-compra" onclick="seleccionarMetodo('tarjeta')" style="width: 100%; font-size: 1.1em;">
                        <i class="fas fa-credit-card"></i> Tarjeta
                    </button>
                    <button class="btn-compra" onclick="seleccionarMetodo('transferencia')" style="width: 100%; font-size: 1.1em;">
                        <i class="fas fa-exchange-alt"></i> Transferencia
                    </button>
                    <button class="btn-vaciar" onclick="seleccionarMetodo(null)" style="width: 100%;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        window.seleccionarMetodo = (metodo) => {
            modal.remove();
            delete window.seleccionarMetodo;
            resolve(metodo);
        };
    });
}

//  Generar ticket de venta
function generarTicket(datos) {
    const ticket = document.createElement('div');
    ticket.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        font-family: 'Courier New', monospace;
    `;

    const itemsHTML = datos.items.map(item => `
        <tr>
            <td style="padding: 5px;">${item.nombre}</td>
            <td style="text-align: right;">${item.cantidad.toFixed(2)} ${item.unidad}</td>
            <td style="text-align: right;">$${(parseFloat(item.precio) * item.cantidad).toFixed(3)}</td>
        </tr>
    `).join('');

    ticket.innerHTML = `
        <div style="text-align: center; border-bottom: 2px dashed #333; padding-bottom: 15px; margin-bottom: 15px;">
            <h2 style="color: var(--color-principal); margin: 0;">🥩 El Matadero</h2>
            <p style="margin: 5px 0; font-size: 0.9em;">Carnicería Artesanal</p>
            <p style="margin: 5px 0; font-size: 0.85em;">Av. Aconquija 1234, Concepción</p>
            <p style="margin: 5px 0; font-size: 0.85em;">Tel: (0381) 555-1234</p>
        </div>
        
        <div style="margin-bottom: 15px; font-size: 0.9em;">
            <p style="margin: 3px 0;"><strong>Pedido #:</strong> ${datos.pedido_id}</p>
            <p style="margin: 3px 0;"><strong>Fecha:</strong> ${datos.fecha}</p>
            <p style="margin: 3px 0;"><strong>Cliente:</strong> ${datos.cliente.nombre} ${datos.cliente.apellido}</p>
            <p style="margin: 3px 0;"><strong>Email:</strong> ${datos.cliente.email}</p>
            ${datos.cliente.telefono ? `<p style="margin: 3px 0;"><strong>Tel:</strong> ${datos.cliente.telefono}</p>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.85em;">
            <thead>
                <tr style="border-bottom: 1px solid #333;">
                    <th style="text-align: left; padding: 5px;">Producto</th>
                    <th style="text-align: right; padding: 5px;">Cant.</th>
                    <th style="text-align: right; padding: 5px;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 10px;">
            <p style="font-size: 1.2em; text-align: right; margin: 5px 0;"><strong>TOTAL: $${datos.total.toFixed(3)}</strong></p>
            <p style="text-align: right; margin: 5px 0; font-size: 0.9em;">
                <strong>Método de pago:</strong> ${datos.metodo_pago.toUpperCase()}
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #333;">
            <p style="font-size: 0.85em; margin: 5px 0;">¡Gracias por tu compra!</p>
            <p style="font-size: 0.8em; margin: 5px 0; color: #666;">Calidad y tradición en carnes</p>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button onclick="imprimirTicket()" class="btn-compra" style="flex: 1;">
                <i class="fas fa-print"></i> Imprimir
            </button>
            <button onclick="cerrarTicket()" class="btn-vaciar" style="flex: 1;">
                Cerrar
            </button>
        </div>
    `;

    document.body.appendChild(ticket);

    window.imprimirTicket = () => {
        window.print();
    };

    window.cerrarTicket = () => {
        ticket.remove();
        delete window.imprimirTicket;
        delete window.cerrarTicket;
    };
}

// NUEVA FUNCIÓN: Mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.createElement('div');
    const color = tipo === 'success' ? '#28a745' : tipo === 'error' ? '#dc3545' : '#ffc107';
    
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;
    
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function obtenerPedidosGuardados() {
    const pedidos = localStorage.getItem(STORAGE_KEY_PEDIDOS);
    return pedidos ? JSON.parse(pedidos) : [];
}

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
    
    pedidos.sort((a, b) => b.id - a.id); 

    pedidos.forEach(pedido => {
        const card = document.createElement('div');
        card.classList.add('historial-pedido-card');
        
        let itemsListHTML = pedido.items.map(item => {
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

document.addEventListener('DOMContentLoaded', () => {
    const carritoGuardado = localStorage.getItem(STORAGE_KEY_CARRITO);
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
    }
    
    cargarProductosDesdeAPI();
    actualizarCarrito();
    renderizarHistorial();
    
    const btnVaciar = document.getElementById('vaciar-carrito-btn');
    const btnFinalizar = document.getElementById('finalizar-compra-btn');
    
    if (btnVaciar) btnVaciar.addEventListener('click', vaciarCarrito);
    if (btnFinalizar) btnFinalizar.addEventListener('click', finalizarCompra);
    
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

    window.onclick = function(event) {
        if (event.target == modalCarrito) {
            modalCarrito.style.display = 'none';
        }
    }
});