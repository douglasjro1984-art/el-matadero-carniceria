// clientes.js - VERSIÓN FINAL CORREGIDA
let usuarioActual = null;
const STORAGE_KEY_USUARIO = 'usuarioMatadero';

// === REFERENCIAS DOM ===
const btnAuth = document.getElementById('btn-auth');
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
    modalAuth.style.display = 'block';
    formLogin.style.display = 'block';
    formRegistro.style.display = 'none';
});

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

    const datos = {
        nombre: document.getElementById('reg-nombre').value.trim(),
        apellido: document.getElementById('reg-apellido').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        telefono: document.getElementById('reg-telefono').value.trim(),
        direccion: document.getElementById('reg-direccion').value.trim()
    };

    if (!datos.nombre || !datos.apellido || !datos.email) {
        alert('Nombre, apellido y email son obligatorios');
        return;
    }

    try {
        const res = await fetch('http://127.0.0.1:5000/clientes/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const data = await res.json();

        if (res.ok) {
            usuarioActual = { ...datos, id: data.cliente_id };
            actualizarUI();
            modalAuth.style.display = 'none';
            e.target.reset();
            alert('¡Registrado con éxito!');
        } else {
            alert(data.error || 'Error al registrarse');
        }
    } catch (err) {
        console.error(err);
        alert('Error: No se pudo conectar al servidor. ¿Flask está corriendo?');
    }
});

// === LOGIN ===
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    if (!email) {
        alert('Ingresa tu email');
        return;
    }

    try {
        const res = await fetch('http://127.0.0.1:5000/clientes/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (res.ok) {
            usuarioActual = data.cliente;
            actualizarUI();
            modalAuth.style.display = 'none';
            alert('¡Bienvenido de nuevo!');
            e.target.reset();
        } else {
            alert(data.error || 'Email no encontrado');
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión. Verifica que Flask esté corriendo en el puerto 5000');
    }
});

// === CERRAR SESIÓN ===
btnCerrarSesion.addEventListener('click', () => {
    usuarioActual = null;
    localStorage.removeItem(STORAGE_KEY_USUARIO);
    panelUsuario.style.display = 'none';
    authText.textContent = 'Iniciar Sesión';
    btnAuth.querySelector('i').className = 'fas fa-user';
});

// === ACTUALIZAR UI ===
function actualizarUI() {
    if (usuarioActual) {
        authText.textContent = usuarioActual.nombre;
        btnAuth.querySelector('i').className = 'fas fa-user-check';
        infoUsuario.innerHTML = `
            <p><strong>${usuarioActual.nombre} ${usuarioActual.apellido}</strong></p>
            <p><em>${usuarioActual.email}</em></p>
            ${usuarioActual.telefono ? `<p>Tel: ${usuarioActual.telefono}</p>` : ''}
            ${usuarioActual.direccion ? `<p>Dir: ${usuarioActual.direccion}</p>` : ''}
        `;
        panelUsuario.style.display = 'block';
        localStorage.setItem(STORAGE_KEY_USUARIO, JSON.stringify(usuarioActual));
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