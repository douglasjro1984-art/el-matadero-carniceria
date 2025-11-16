// ============================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ============================================

const API_URL = 'http://localhost:5000';
let adminActual = null;
let pedidosActuales = [];
let historialCompleto = [];

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacion();
    cargarPedidos();
    configurarEventos();
});

function verificarAutenticacion() {
    const clienteGuardado = localStorage.getItem('cliente');
    
    if (!clienteGuardado) {
        window.location.href = 'login.html';
        return;
    }
    
    adminActual = JSON.parse(clienteGuardado);
    
    if (adminActual.rol !== 'admin' && adminActual.rol !== 'empleado') {
        alert('Acceso denegado. Solo administradores y empleados pueden acceder.');
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('adminNombre').textContent = 
        `${adminActual.nombre} ${adminActual.apellido || ''}`;
    document.getElementById('adminRol').textContent = adminActual.rol;
}

function configurarEventos() {
    // Botones del menú principal
    document.getElementById('btnGestionPedidos').addEventListener('click', mostrarSeccionPedidos);
    document.getElementById('btnGestionProductos').addEventListener('click', mostrarSeccionProductos);
    document.getElementById('btnHistorial').addEventListener('click', mostrarHistorialCompleto);
    document.getElementById('btnCierreCaja').addEventListener('click', mostrarCierreCaja);
    document.getElementById('btnReportes').addEventListener('click', mostrarReportes);
    document.getElementById('btnCerrarSesion').addEventListener('click', cerrarSesion);
    
    // Filtros de pedidos
    document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroMetodo').addEventListener('change', aplicarFiltros);
    document.getElementById('buscarPedido').addEventListener('input', aplicarFiltros);
}

// ============================================
// GESTIÓN DE PEDIDOS
// ============================================

async function cargarPedidos() {
    try {
        const response = await fetch(`${API_URL}/admin/pedidos`);
        const pedidos = await response.json();
        
        pedidosActuales = pedidos;
        mostrarPedidos(pedidos);
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        alert('Error al cargar los pedidos');
    }
}

function mostrarPedidos(pedidos) {
    const tbody = document.getElementById('tablaPedidos');
    tbody.innerHTML = '';
    
    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay pedidos</td></tr>';
        return;
    }
    
    pedidos.forEach(pedido => {
        const fecha = new Date(pedido.fecha).toLocaleString('es-AR');
        const estadoBadge = obtenerBadgeEstado(pedido.estado);
        const metodoBadge = obtenerBadgeMetodo(pedido.metodo_pago);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pedido.id}</td>
            <td>${fecha}</td>
            <td>${pedido.nombre} ${pedido.apellido || ''}</td>
            <td>$${parseFloat(pedido.total).toFixed(2)}</td>
            <td>${estadoBadge}</td>
            <td>${metodoBadge}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="verDetallePedido(${pedido.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="editarPedido(${pedido.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="cancelarPedidoConfirm(${pedido.id})">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function obtenerBadgeEstado(estado) {
    const badges = {
        'pendiente': '<span class="badge bg-warning">Pendiente</span>',
        'completado': '<span class="badge bg-success">Completado</span>',
        'cancelado': '<span class="badge bg-danger">Cancelado</span>'
    };
    return badges[estado] || '<span class="badge bg-secondary">Desconocido</span>';
}

function obtenerBadgeMetodo(metodo) {
    const badges = {
        'efectivo': '<span class="badge bg-success">💵 Efectivo</span>',
        'tarjeta': '<span class="badge bg-primary">💳 Tarjeta</span>',
        'transferencia': '<span class="badge bg-info">🏦 Transferencia</span>'
    };
    return badges[metodo] || '<span class="badge bg-secondary">N/A</span>';
}

function aplicarFiltros() {
    const estadoFiltro = document.getElementById('filtroEstado').value;
    const metodoFiltro = document.getElementById('filtroMetodo').value;
    const busqueda = document.getElementById('buscarPedido').value.toLowerCase();
    
    let pedidosFiltrados = [...pedidosActuales];
    
    if (estadoFiltro !== 'todos') {
        pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === estadoFiltro);
    }
    
    if (metodoFiltro !== 'todos') {
        pedidosFiltrados = pedidosFiltrados.filter(p => p.metodo_pago === metodoFiltro);
    }
    
    if (busqueda) {
        pedidosFiltrados = pedidosFiltrados.filter(p => 
            p.nombre.toLowerCase().includes(busqueda) ||
            p.apellido?.toLowerCase().includes(busqueda) ||
            p.email.toLowerCase().includes(busqueda) ||
            p.id.toString().includes(busqueda)
        );
    }
    
    mostrarPedidos(pedidosFiltrados);
}

function verDetallePedido(pedidoId) {
    const pedido = pedidosActuales.find(p => p.id === pedidoId);
    if (!pedido) return;
    
    let itemsHTML = '<table class="table table-sm"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>';
    
    pedido.items.forEach(item => {
        itemsHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad} ${item.unidad}</td>
                <td>$${parseFloat(item.precio_unitario).toFixed(2)}</td>
                <td>$${parseFloat(item.subtotal).toFixed(2)}</td>
            </tr>
        `;
    });
    
    itemsHTML += '</tbody></table>';
    
    const modalContent = `
        <p><strong>Pedido #${pedido.id}</strong></p>
        <p><strong>Cliente:</strong> ${pedido.nombre} ${pedido.apellido || ''}</p>
        <p><strong>Email:</strong> ${pedido.email}</p>
        <p><strong>Teléfono:</strong> ${pedido.telefono || 'N/A'}</p>
        <p><strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleString('es-AR')}</p>
        <p><strong>Estado:</strong> ${pedido.estado}</p>
        <p><strong>Método de Pago:</strong> ${pedido.metodo_pago}</p>
        ${pedido.editado ? `<p class="text-warning"><small>⚠️ Editado el ${new Date(pedido.fecha_edicion).toLocaleString('es-AR')}</small></p>` : ''}
        <hr>
        <h6>Productos:</h6>
        ${itemsHTML}
        <h5 class="text-end">Total: $${parseFloat(pedido.total).toFixed(2)}</h5>
    `;
    
    document.getElementById('modalDetalleContenido').innerHTML = modalContent;
    new bootstrap.Modal(document.getElementById('modalDetalle')).show();
}

async function editarPedido(pedidoId) {
    const pedido = pedidosActuales.find(p => p.id === pedidoId);
    if (!pedido) return;
    
    const nuevoEstado = prompt(
        `Estado actual: ${pedido.estado}\n\nNuevo estado (pendiente/completado/cancelado):`,
        pedido.estado
    );
    
    if (!nuevoEstado || nuevoEstado === pedido.estado) return;
    
    if (!['pendiente', 'completado', 'cancelado'].includes(nuevoEstado)) {
        alert('Estado inválido');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/pedidos/${pedidoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                estado: nuevoEstado,
                editado_por: adminActual.id
            })
        });
        
        if (response.ok) {
            alert('Pedido actualizado exitosamente');
            cargarPedidos();
        } else {
            alert('Error al actualizar pedido');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar pedido');
    }
}

async function cancelarPedidoConfirm(pedidoId) {
    if (!confirm('¿Está seguro de cancelar este pedido?')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/pedidos/${pedidoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Pedido cancelado exitosamente');
            cargarPedidos();
        } else {
            alert('Error al cancelar pedido');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cancelar pedido');
    }
}

// ============================================
// HISTORIAL COMPLETO
// ============================================

async function mostrarHistorialCompleto() {
    mostrarSeccion('seccionHistorial');
    
    try {
        const response = await fetch(`${API_URL}/pedidos/historial`);
        historialCompleto = await response.json();
        
        renderizarHistorial(historialCompleto);
    } catch (error) {
        console.error('Error al cargar historial:', error);
        alert('Error al cargar el historial completo');
    }
}

function renderizarHistorial(pedidos) {
    const tbody = document.getElementById('tablaHistorial');
    tbody.innerHTML = '';
    
    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay registros</td></tr>';
        return;
    }
    
    pedidos.forEach(pedido => {
        const fecha = new Date(pedido.fecha).toLocaleString('es-AR');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pedido.id}</td>
            <td>${fecha}</td>
            <td>${pedido.cliente_nombre} ${pedido.cliente_apellido || ''}</td>
            <td>$${parseFloat(pedido.total).toFixed(2)}</td>
            <td>${obtenerBadgeEstado(pedido.estado)}</td>
            <td>${obtenerBadgeMetodo(pedido.metodo_pago)}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="verDetalleHistorial(${pedido.id})">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('totalHistorial').textContent = pedidos.length;
}

function verDetalleHistorial(pedidoId) {
    const pedido = historialCompleto.find(p => p.id === pedidoId);
    if (!pedido) return;
    
    let itemsHTML = '<table class="table table-sm"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>';
    
    pedido.items.forEach(item => {
        itemsHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad} ${item.unidad}</td>
                <td>$${parseFloat(item.precio_unitario).toFixed(2)}</td>
                <td>$${parseFloat(item.subtotal).toFixed(2)}</td>
            </tr>
        `;
    });
    
    itemsHTML += '</tbody></table>';
    
    const modalContent = `
        <p><strong>Pedido #${pedido.id}</strong></p>
        <p><strong>Cliente:</strong> ${pedido.cliente_nombre} ${pedido.cliente_apellido || ''}</p>
        <p><strong>Email:</strong> ${pedido.email}</p>
        <p><strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleString('es-AR')}</p>
        <p><strong>Estado:</strong> ${pedido.estado}</p>
        <p><strong>Método de Pago:</strong> ${pedido.metodo_pago}</p>
        <hr>
        ${itemsHTML}
        <h5 class="text-end">Total: $${parseFloat(pedido.total).toFixed(2)}</h5>
    `;
    
    document.getElementById('modalDetalleContenido').innerHTML = modalContent;
    new bootstrap.Modal(document.getElementById('modalDetalle')).show();
}

// ============================================
// CIERRE DE CAJA
// ============================================

async function mostrarCierreCaja() {
    mostrarSeccion('seccionCierreCaja');
    
    // Establecer fecha de hoy por defecto
    document.getElementById('fechaCierre').valueAsDate = new Date();
    
    // Cargar historial de cierres
    await cargarHistorialCierres();
}

async function cargarHistorialCierres() {
    try {
        const response = await fetch(`${API_URL}/admin/cierres`);
        const cierres = await response.json();
        
        const tbody = document.getElementById('tablaCierres');
        tbody.innerHTML = '';
        
        if (cierres.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay cierres registrados</td></tr>';
            return;
        }
        
        cierres.forEach(cierre => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cierre.fecha}</td>
                <td>${cierre.usuario_nombre || 'N/A'}</td>
                <td>$${parseFloat(cierre.total_efectivo).toFixed(2)}</td>
                <td>$${parseFloat(cierre.total_tarjeta).toFixed(2)}</td>
                <td>$${parseFloat(cierre.total_transferencia).toFixed(2)}</td>
                <td><strong>$${parseFloat(cierre.total_general).toFixed(2)}</strong></td>
                <td>${cierre.cantidad_pedidos}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error al cargar cierres:', error);
    }
}

async function realizarCierreCaja() {
    const fecha = document.getElementById('fechaCierre').value;
    const observaciones = document.getElementById('observacionesCierre').value;
    
    if (!fecha) {
        alert('Debe seleccionar una fecha');
        return;
    }
    
    if (!confirm(`¿Confirma realizar el cierre de caja para el ${fecha}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/cierre-caja`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha: fecha,
                usuario_id: adminActual.id,
                observaciones: observaciones
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ Cierre realizado exitosamente!\n\nTotal: $${parseFloat(data.totales.total_general).toFixed(2)}\nPedidos: ${data.totales.cantidad_pedidos}`);
            document.getElementById('observacionesCierre').value = '';
            cargarHistorialCierres();
        } else {
            alert(`❌ Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al realizar cierre de caja');
    }
}

// ============================================
// REPORTES
// ============================================

async function mostrarReportes() {
    mostrarSeccion('seccionReportes');
    
    // Establecer fechas por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaReporte').value = hoy;
    document.getElementById('fechaDesde').value = hoy;
    document.getElementById('fechaHasta').value = hoy;
}

async function generarReporteDiario() {
    const fecha = document.getElementById('fechaReporte').value;
    
    if (!fecha) {
        alert('Debe seleccionar una fecha');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/reportes/diario?fecha=${fecha}`);
        const reporte = await response.json();
        
        mostrarReporteDiario(reporte);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar reporte');
    }
}

function mostrarReporteDiario(reporte) {
    const contenedor = document.getElementById('resultadoReporte');
    
    let html = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <h5>📊 Reporte del ${reporte.fecha}</h5>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-4">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h3>${reporte.totales.total_pedidos || 0}</h3>
                                <p class="mb-0">Pedidos</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h3>$${parseFloat(reporte.totales.total_ventas || 0).toFixed(2)}</h3>
                                <p class="mb-0">Ventas Totales</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h3>$${parseFloat(reporte.totales.ticket_promedio || 0).toFixed(2)}</h3>
                                <p class="mb-0">Ticket Promedio</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h6>Por Método de Pago:</h6>
                <table class="table table-sm">
                    <thead><tr><th>Método</th><th>Cantidad</th><th>Total</th></tr></thead>
                    <tbody>
    `;
    
    reporte.por_metodo_pago.forEach(metodo => {
        html += `
            <tr>
                <td>${metodo.metodo_pago}</td>
                <td>${metodo.cantidad}</td>
                <td>$${parseFloat(metodo.total).toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
                
                <h6>Productos Más Vendidos:</h6>
                <table class="table table-sm">
                    <thead><tr><th>Producto</th><th>Cantidad</th><th>Total</th></tr></thead>
                    <tbody>
    `;
    
    reporte.productos_mas_vendidos.forEach(prod => {
        html += `
            <tr>
                <td>${prod.nombre} - ${prod.corte}</td>
                <td>${prod.cantidad_vendida}</td>
                <td>$${parseFloat(prod.total_vendido).toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    contenedor.innerHTML = html;
}

async function generarReporteRango() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;
    
    if (!desde || !hasta) {
        alert('Debe seleccionar ambas fechas');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/reportes/rango?desde=${desde}&hasta=${hasta}`);
        const reporte = await response.json();
        
        mostrarReporteRango(reporte);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al generar reporte');
    }
}

function mostrarReporteRango(reporte) {
    const contenedor = document.getElementById('resultadoReporte');
    
    let html = `
        <div class="card">
            <div class="card-header bg-success text-white">
                <h5>📈 Reporte desde ${reporte.fecha_desde} hasta ${reporte.fecha_hasta}</h5>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-4">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h3>${reporte.totales.total_pedidos || 0}</h3>
                                <p class="mb-0">Pedidos</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h3>$${parseFloat(reporte.totales.total_ventas || 0).toFixed(2)}</h3>
                                <p class="mb-0">Ventas Totales</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h3>$${parseFloat(reporte.totales.ticket_promedio || 0).toFixed(2)}</h3>
                                <p class="mb-0">Ticket Promedio</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h6>Por Método de Pago:</h6>
                <table class="table table-sm">
                    <thead><tr><th>Método</th><th>Cantidad</th><th>Total</th></tr></thead>
                    <tbody>
    `;
    
    reporte.por_metodo_pago.forEach(metodo => {
        html += `
            <tr>
                <td>${metodo.metodo_pago}</td>
                <td>${metodo.cantidad}</td>
                <td>$${parseFloat(metodo.total).toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
                
                <h6>Top 15 Productos Más Vendidos:</h6>
                <table class="table table-sm">
                    <thead><tr><th>Producto</th><th>Cantidad</th><th>Total</th></tr></thead>
                    <tbody>
    `;
    
    reporte.productos_mas_vendidos.forEach(prod => {
        html += `
            <tr>
                <td>${prod.nombre} - ${prod.corte}</td>
                <td>${prod.cantidad_vendida}</td>
                <td>$${parseFloat(prod.total_vendido).toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    contenedor.innerHTML = html;
}

// ============================================
// GESTIÓN DE PRODUCTOS (SOLO ADMIN)
// ============================================

async function mostrarSeccionProductos() {
    if (adminActual.rol !== 'admin') {
        alert('Solo administradores pueden gestionar productos');
        return;
    }
    
    mostrarSeccion('seccionProductos');
    // Aquí puedes implementar la gestión de productos
    alert('Funcionalidad de gestión de productos - Por implementar en admin.html');
}

// ============================================
// UTILIDADES
// ============================================

function mostrarSeccion(seccionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.seccion-admin').forEach(s => s.classList.add('d-none'));
    
    // Mostrar la sección seleccionada
    const seccion = document.getElementById(seccionId);
    if (seccion) {
        seccion.classList.remove('d-none');
    }
}

function mostrarSeccionPedidos() {
    mostrarSeccion('seccionPedidos');
    cargarPedidos();
}

function cerrarSesion() {
    if (confirm('¿Desea cerrar sesión?')) {
        localStorage.removeItem('cliente');
        window.location.href = 'login.html';
    }
}