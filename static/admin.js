// admin.js - Panel de Administración

// === FUNCIÓN PRINCIPAL: Mostrar Panel Admin ===
function mostrarPanelAdmin() {
    if (!usuarioActual || (usuarioActual.rol !== 'admin' && usuarioActual.rol !== 'empleado')) {
        alert('No tienes permisos para acceder al panel de administración');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'modal-admin';
    
    const esAdmin = usuarioActual.rol === 'admin';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90vh; overflow-y: auto;">
            <span class="cerrar-modal" onclick="cerrarPanelAdmin()">&times;</span>
            <h2 style="color: var(--color-principal); text-align: center;">
                🔧 Panel de Administración - ${usuarioActual.nombre}
            </h2>
            
            <div style="display: flex; gap: 10px; margin: 20px 0; justify-content: center; flex-wrap: wrap;">
                ${esAdmin ? '<button onclick="verProductos()" class="btn-compra">📦 Gestionar Productos</button>' : ''}
                <button onclick="verTodosPedidos()" class="btn-compra">📋 Ver Todos los Pedidos</button>
                <button onclick="volverAlPerfil()" class="btn-compra" style="background: var(--color-secundario); color: var(--color-oscuro);">
                    👤 Volver a Mi Perfil
                </button>
                <button onclick="cerrarPanelAdmin()" class="btn-vaciar">Cerrar</button>
            </div>
            
            <div id="admin-contenido" style="margin-top: 20px;">
                <p style="text-align: center; color: #666;">Selecciona una opción del menú</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

window.cerrarPanelAdmin = function() {
    const modal = document.getElementById('modal-admin');
    if (modal) {
        modal.remove();
    }
};

window.volverAlPerfil = function() {
    cerrarPanelAdmin();
    // Mostrar panel de usuario
    panelUsuario.style.display = 'block';
};

// ============================================
// GESTIÓN DE PRODUCTOS (SOLO ADMIN)
// ============================================

window.verProductos = async function() {
    const contenido = document.getElementById('admin-contenido');
    contenido.innerHTML = '<p style="text-align:center;">Cargando productos...</p>';
    
    try {
        const response = await fetch('/productos');
        const productos = await response.json();
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: var(--color-principal);">Gestión de Productos</h3>
                <button onclick="mostrarFormAgregarProducto()" class="btn-compra">
                    <i class="fas fa-plus"></i> Agregar Producto
                </button>
            </div>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--color-oscuro); color: white;">
                            <th style="padding: 10px; text-align: left;">ID</th>
                            <th style="padding: 10px; text-align: left;">Imagen</th>
                            <th style="padding: 10px; text-align: left;">Nombre</th>
                            <th style="padding: 10px; text-align: left;">Corte</th>
                            <th style="padding: 10px; text-align: right;">Precio</th>
                            <th style="padding: 10px; text-align: center;">Unidad</th>
                            <th style="padding: 10px; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        productos.forEach(p => {
            html += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px;">${p.id}</td>
                    <td style="padding: 10px;">
                        <img src="/static/img/${p.id}.jpg" 
                             onerror="this.src='/static/img/default.jpg'" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                    </td>
                    <td style="padding: 10px;">${p.nombre}</td>
                    <td style="padding: 10px;">${p.corte}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold;">$${parseFloat(p.precio).toFixed(3)}</td>
                    <td style="padding: 10px; text-align: center;">${p.unidad}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="editarProducto(${p.id}, '${p.nombre}', '${p.corte}', ${p.precio}, '${p.unidad}')" 
                                class="btn-compra" style="padding: 5px 10px; margin: 2px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="eliminarProducto(${p.id}, '${p.nombre}')" 
                                class="btn-vaciar" style="padding: 5px 10px; margin: 2px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        contenido.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar productos:', error);
        contenido.innerHTML = '<p style="color:red; text-align:center;">Error al cargar productos</p>';
    }
};

window.mostrarFormAgregarProducto = function() {
    const contenido = document.getElementById('admin-contenido');
    contenido.innerHTML = `
        <h3 style="color: var(--color-principal);">Agregar Nuevo Producto</h3>
        <form id="form-agregar-producto" style="max-width: 500px; margin: 20px auto;">
            <div class="form-group">
                <label>Nombre:</label>
                <input type="text" id="nuevo-nombre" required>
            </div>
            <div class="form-group">
                <label>Corte/Descripción:</label>
                <input type="text" id="nuevo-corte" required>
            </div>
            <div class="form-group">
                <label>Precio:</label>
                <input type="number" step="0.001" id="nuevo-precio" required>
            </div>
            <div class="form-group">
                <label>Unidad:</label>
                <select id="nuevo-unidad" required>
                    <option value="kg">kg</option>
                    <option value="unidad">unidad</option>
                    <option value="docena">docena</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn-compra" style="flex: 1;">Guardar</button>
                <button type="button" onclick="verProductos()" class="btn-vaciar" style="flex: 1;">Cancelar</button>
            </div>
        </form>
    `;
    
    document.getElementById('form-agregar-producto').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const datos = {
            nombre: document.getElementById('nuevo-nombre').value,
            corte: document.getElementById('nuevo-corte').value,
            precio: parseFloat(document.getElementById('nuevo-precio').value),
            unidad: document.getElementById('nuevo-unidad').value
        };
        
        try {
            const response = await fetch('/admin/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('Producto agregado exitosamente');
                verProductos();
            } else {
                alert(result.error || 'Error al agregar producto');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    });
};

window.editarProducto = function(id, nombre, corte, precio, unidad) {
    const contenido = document.getElementById('admin-contenido');
    contenido.innerHTML = `
        <h3 style="color: var(--color-principal);">Editar Producto #${id}</h3>
        <form id="form-editar-producto" style="max-width: 500px; margin: 20px auto;">
            <div class="form-group">
                <label>Nombre:</label>
                <input type="text" id="edit-nombre" value="${nombre}" required>
            </div>
            <div class="form-group">
                <label>Corte/Descripción:</label>
                <input type="text" id="edit-corte" value="${corte}" required>
            </div>
            <div class="form-group">
                <label>Precio:</label>
                <input type="number" step="0.001" id="edit-precio" value="${precio}" required>
            </div>
            <div class="form-group">
                <label>Unidad:</label>
                <select id="edit-unidad" required>
                    <option value="kg" ${unidad === 'kg' ? 'selected' : ''}>kg</option>
                    <option value="unidad" ${unidad === 'unidad' ? 'selected' : ''}>unidad</option>
                    <option value="docena" ${unidad === 'docena' ? 'selected' : ''}>docena</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn-compra" style="flex: 1;">Guardar Cambios</button>
                <button type="button" onclick="verProductos()" class="btn-vaciar" style="flex: 1;">Cancelar</button>
            </div>
        </form>
    `;
    
    document.getElementById('form-editar-producto').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const datos = {
            nombre: document.getElementById('edit-nombre').value,
            corte: document.getElementById('edit-corte').value,
            precio: parseFloat(document.getElementById('edit-precio').value),
            unidad: document.getElementById('edit-unidad').value
        };
        
        try {
            const response = await fetch(`/admin/productos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('Producto actualizado exitosamente');
                verProductos();
            } else {
                alert(result.error || 'Error al actualizar producto');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    });
};

window.eliminarProducto = async function(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/productos/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Producto eliminado exitosamente');
            verProductos();
        } else {
            alert(result.error || 'Error al eliminar producto');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
};

// ============================================
// GESTIÓN DE PEDIDOS (ADMIN Y EMPLEADO)
// ============================================

window.verTodosPedidos = async function() {
    const contenido = document.getElementById('admin-contenido');
    contenido.innerHTML = '<p style="text-align:center;">Cargando pedidos...</p>';
    
    try {
        const response = await fetch('/admin/pedidos');
        const pedidos = await response.json();
        
        let html = `
            <h3 style="color: var(--color-principal); margin-bottom: 20px;">Todos los Pedidos</h3>
            <div style="overflow-x: auto;">
        `;
        
        if (pedidos.length === 0) {
            html += '<p style="text-align:center; color: #666;">No hay pedidos registrados</p>';
        } else {
            pedidos.forEach(pedido => {
                const fecha = new Date(pedido.fecha).toLocaleString('es-AR');
                const editado = pedido.editado ? '✏️ Editado' : '';
                
                html += `
                    <div style="border: 2px solid ${pedido.estado === 'cancelado' ? '#dc3545' : pedido.estado === 'completado' ? '#28a745' : '#ffc107'}; 
                                border-radius: 10px; padding: 20px; margin-bottom: 20px; background: white;">
                        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <h4 style="margin: 0; color: var(--color-principal);">Pedido #${pedido.id} ${editado}</h4>
                                <p style="margin: 5px 0;"><strong>Cliente:</strong> ${pedido.nombre} ${pedido.apellido}</p>
                                <p style="margin: 5px 0;"><strong>Email:</strong> ${pedido.email}</p>
                                ${pedido.telefono ? `<p style="margin: 5px 0;"><strong>Tel:</strong> ${pedido.telefono}</p>` : ''}
                                <p style="margin: 5px 0;"><strong>Fecha:</strong> ${fecha}</p>
                                ${pedido.fecha_edicion ? `<p style="margin: 5px 0; color: #666;"><em>Editado: ${new Date(pedido.fecha_edicion).toLocaleString('es-AR')}</em></p>` : ''}
                            </div>
                            <div style="text-align: right;">
                                <p style="margin: 5px 0; font-size: 1.3em; font-weight: bold;">$${parseFloat(pedido.total).toFixed(3)}</p>
                                <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: ${pedido.estado === 'cancelado' ? '#dc3545' : pedido.estado === 'completado' ? '#28a745' : '#ffc107'};">${pedido.estado.toUpperCase()}</span></p>
                                <p style="margin: 5px 0;"><strong>Pago:</strong> ${pedido.metodo_pago.toUpperCase()}</p>
                            </div>
                        </div>
                        
                        <details style="margin-top: 15px;">
                            <summary style="cursor: pointer; font-weight: bold; color: var(--color-oscuro);">Ver Detalle</summary>
                            <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #ddd;">
                                        <th style="text-align: left; padding: 8px;">Producto</th>
                                        <th style="text-align: right; padding: 8px;">Cantidad</th>
                                        <th style="text-align: right; padding: 8px;">Precio Unit.</th>
                                        <th style="text-align: right; padding: 8px;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pedido.items.map(item => `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding: 8px;">${item.nombre}</td>
                                            <td style="text-align: right; padding: 8px;">${parseFloat(item.cantidad).toFixed(2)} ${item.unidad}</td>
                                            <td style="text-align: right; padding: 8px;">$${parseFloat(item.precio_unitario).toFixed(3)}</td>
                                            <td style="text-align: right; padding: 8px; font-weight: bold;">$${parseFloat(item.subtotal).toFixed(3)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </details>
                        
                        <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                            <button onclick="reimprimirTicket(${pedido.id}, ${JSON.stringify(pedido).replace(/"/g, '&quot;')})" 
                                    class="btn-compra" style="flex: 1; min-width: 150px;">
                                <i class="fas fa-print"></i> Reimprimir Ticket
                            </button>
                            ${pedido.estado !== 'cancelado' ? `
                                <button onclick="editarPedidoAdmin(${pedido.id})" 
                                        class="btn-compra" style="flex: 1; min-width: 150px; background: var(--color-secundario); color: var(--color-oscuro);">
                                    <i class="fas fa-edit"></i> Editar Pedido
                                </button>
                                <button onclick="cancelarPedidoAdmin(${pedido.id})" 
                                        class="btn-vaciar" style="flex: 1; min-width: 150px;">
                                    <i class="fas fa-ban"></i> Cancelar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        contenido.innerHTML = html;
        
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        contenido.innerHTML = '<p style="color:red; text-align:center;">Error al cargar pedidos</p>';
    }
};

window.reimprimirTicket = function(pedidoId, pedidoData) {
    // Usar la función generarTicket existente
    if (typeof generarTicket === 'function') {
        generarTicket({
            pedido_id: pedidoData.id,
            fecha: new Date(pedidoData.fecha).toLocaleString('es-AR'),
            items: pedidoData.items,
            total: parseFloat(pedidoData.total),
            metodo_pago: pedidoData.metodo_pago,
            cliente: {
                nombre: pedidoData.nombre,
                apellido: pedidoData.apellido,
                email: pedidoData.email,
                telefono: pedidoData.telefono || ''
            }
        });
    }
};

window.editarPedidoAdmin = async function(pedidoId) {
    const nuevoEstado = prompt('Nuevo estado:\n1. pendiente\n2. completado\n3. cancelado\n\nIngresa el número:');
    
    const estados = {
        '1': 'pendiente',
        '2': 'completado',
        '3': 'cancelado'
    };
    
    if (!estados[nuevoEstado]) {
        alert('Opción inválida');
        return;
    }
    
    try {
        const response = await fetch(`/admin/pedidos/${pedidoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                estado: estados[nuevoEstado],
                editado_por: usuarioActual.id
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Pedido actualizado exitosamente');
            verTodosPedidos();
        } else {
            alert(result.error || 'Error al actualizar pedido');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
};

window.cancelarPedidoAdmin = async function(pedidoId) {
    if (!confirm('¿Estás seguro de cancelar este pedido?')) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/pedidos/${pedidoId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Pedido cancelado exitosamente');
            verTodosPedidos();
        } else {
            alert(result.error || 'Error al cancelar pedido');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
};