// clientes.js - VERSIÓN CORREGIDA COMPLETA
let usuarioActual = null;
const STORAGE_KEY_USUARIO = 'usuarioMatadero';

// === REFERENCIAS DOM ===
const btnAuth = document.getElementById('btn-auth');
const btnPanelHeader = document.getElementById('btn-panel-header');
const modalAuth = document.getElementById('modal-auth');
const cerrarAuth = document.querySelector('.cerrar-auth');
const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');
const mostrarRegistro = document.getElementById('mostrar-registro');
const mostrarLogin = document.getElementById('mostrar-login');
const panelUsuario = document.getElementById('panel-usuario');
const infoUsuario = document.getElementById('info-usuario');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const authText = document.getElementById('auth-text');

// === EVENTOS MODAL ===
btnAuth.addEventListener('click', () => {
    // Si hay usuario logueado, mostrar panel de perfil
    if (usuarioActual) {
        if (panelUsuario.style.display === 'block') {
            panelUsuario.style.display = 'none';
        } else {
            panelUsuario.style.display = 'block';
        }
    } else {
        // Si no hay usuario, abrir modal de login
        modalAuth.style.display = 'block';
        formLogin.style.display = 'block';
        formRegistro.style.display = 'none';
    }
});

// === EVENTO: Botón Panel Admin en Header ===
if (btnPanelHeader) {
    btnPanelHeader.addEventListener('click', () => {
        if (typeof mostrarPanelAdmin === 'function') {
            mostrarPanelAdmin();
        }
    });
}

cerrarAuth.addEventListener('click', () => {
    modalAuth.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modalAuth) {
        modalAuth.style.display = 'none';
    }
});

// === CAMBIO ENTRE FORMULARIOS ===
mostrarRegistro.addEventListener('click', (e) => {
    e.preventDefault();
    formLogin.style.display = 'none';
    formRegistro.style.display = 'block';
});

mostrarLogin.addEventListener('click', (e) => {
    e.preventDefault();
    formRegistro.style.display = 'none';
    formLogin.style.display = 'block';
});

// === REGISTRO ===
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('reg-password').value.trim();
    const passwordConfirm = document.getElementById('reg-password-confirm').value.trim();

    if (password !== passwordConfirm) {
        alert('Las contraseñas no coinciden');
        return;
    }

    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    const datos = {
        nombre: document.getElementById('reg-nombre').value.trim(),
        apellido: document.getElementById('reg-apellido').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        telefono: document.getElementById('reg-telefono').value.trim(),
        direccion: document.getElementById('reg-direccion').value.trim(),
        password: password
    };

    if (!datos.nombre || !datos.apellido || !datos.email) {
        alert('Nombre, apellido y email son obligatorios');
        return;
    }

    try {
        const res = await fetch('/clientes/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const data = await res.json();

        if (res.ok) {
            usuarioActual = { 
                id: data.cliente_id,
                nombre: datos.nombre,
                apellido: datos.apellido,
                email: datos.email,
                telefono: datos.telefono,
                direccion: datos.direccion,
                rol: 'cliente'
            };
            actualizarUI();
            modalAuth.style.display = 'none';
            e.target.reset();
            
            const mensaje = document.createElement('div');
            mensaje.style.cssText = 'position:fixed;top:20px;right:20px;background:#28a745;color:white;padding:15px 25px;border-radius:8px;z-index:9999;box-shadow:0 4px 8px rgba(0,0,0,0.3);font-weight:bold;';
            mensaje.textContent = '¡Registrado con éxito!';
            document.body.appendChild(mensaje);
            setTimeout(() => mensaje.remove(), 3000);
        } else {
            alert(data.error || 'Error al registrarse');
        }
    } catch (err) {
        console.error(err);
        alert('Error: No se pudo conectar al servidor.');
    }
});

// === LOGIN ===
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipoSeleccionado = document.getElementById('login-tipo').value;
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        alert('Ingresa tu email y contraseña');
        return;
    }

    try {
        const res = await fetch('/clientes/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Verificar que el rol coincida
            if (data.cliente.rol !== tipoSeleccionado) {
                alert(`Este usuario no tiene permisos de ${tipoSeleccionado}. Tu rol es: ${data.cliente.rol}`);
                return;
            }
            
            usuarioActual = data.cliente;
            actualizarUI();
            modalAuth.style.display = 'none';
            e.target.reset();
            
            const mensaje = document.createElement('div');
            mensaje.style.cssText = 'position:fixed;top:20px;right:20px;background:#28a745;color:white;padding:15px 25px;border-radius:8px;z-index:9999;box-shadow:0 4px 8px rgba(0,0,0,0.3);font-weight:bold;';
            mensaje.textContent = '¡Bienvenido de nuevo, ' + data.cliente.nombre + '!';
            document.body.appendChild(mensaje);
            setTimeout(() => mensaje.remove(), 3000);
        } else {
            alert(data.error || 'Email o contraseña incorrectos');
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión al servidor');
    }
});

// === CERRAR SESIÓN ===
btnCerrarSesion.addEventListener('click', () => {
    if (confirm(`¿Cerrar sesión como ${usuarioActual.nombre}?`)) {
        usuarioActual = null;
        localStorage.removeItem(STORAGE_KEY_USUARIO);
        panelUsuario.style.display = 'none';
        authText.textContent = 'Iniciar Sesión';
        btnAuth.querySelector('i').className = 'fas fa-user';
        
        // Ocultar botón de panel admin
        if (btnPanelHeader) {
            btnPanelHeader.style.display = 'none';
        }
        
        const mensaje = document.createElement('div');
        mensaje.style.cssText = 'position:fixed;top:20px;right:20px;background:#dc3545;color:white;padding:15px 25px;border-radius:8px;z-index:9999;box-shadow:0 4px 8px rgba(0,0,0,0.3);font-weight:bold;';
        mensaje.textContent = 'Sesión cerrada';
        document.body.appendChild(mensaje);
        setTimeout(() => mensaje.remove(), 3000);
    }
});

// === ACTUALIZAR UI ===
function actualizarUI() {
    if (usuarioActual) {
        authText.textContent = usuarioActual.nombre;
        btnAuth.querySelector('i').className = 'fas fa-user-check';
        
        // Mostrar botón panel admin en header si es admin o empleado
        if (usuarioActual.rol === 'admin' || usuarioActual.rol === 'empleado') {
            if (btnPanelHeader) {
                btnPanelHeader.style.display = 'inline-block';
            }
        }
        
        infoUsuario.innerHTML = `
            <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, #f5f5f5, #e0e0e0); border-radius: 8px; margin-bottom: 15px;">
                <p style="font-size: 1.2em; font-weight: bold; margin: 5px 0; color: var(--color-oscuro);">${usuarioActual.nombre} ${usuarioActual.apellido}</p>
                ${usuarioActual.rol !== 'cliente' ? `<p style="color: var(--color-secundario); font-weight: bold; margin: 5px 0;">🔑 ${usuarioActual.rol.toUpperCase()}</p>` : ''}
            </div>
            <p style="margin: 8px 0;"><strong>📧 Email:</strong> ${usuarioActual.email}</p>
            ${usuarioActual.telefono ? `<p style="margin: 8px 0;"><strong>📱 Tel:</strong> ${usuarioActual.telefono}</p>` : ''}
            ${usuarioActual.direccion ? `<p style="margin: 8px 0;"><strong>📍 Dir:</strong> ${usuarioActual.direccion}</p>` : ''}
        `;
        panelUsuario.style.display = 'block';
        localStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(usuarioActual));
        
        setTimeout(() => {
            panelUsuario.style.display = 'none';
        }, 5000);
    }
}

// === CARGAR USUARIO AL INICIAR ===
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(STORAGE_KEY_USUARIO);
    if (saved) {
        usuarioActual = JSON.parse(saved);
        actualizarUI();
    }
});