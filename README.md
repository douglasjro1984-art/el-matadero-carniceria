# El Matadero, carnicería artesanal

Aplicación web para una carnicería artesanal: catálogo de productos, registro de clientes, pedidos en línea y panel de gestión para el local. Proyecto final de programación, desarrollado para un local en funcionamiento.

**Demo en línea:** https://el-matadero-carniceria-1.onrender.com/

## Qué hace

- **Catálogo:** lista de productos con nombre, corte, precio y unidad.
- **Clientes:** registro e inicio de sesión, con roles (cliente, empleado y administrador).
- **Pedidos:** el cliente arma un pedido con varios productos y elige el método de pago (por defecto, efectivo). El pedido queda en estado "pendiente" y el cliente puede ver su historial.
- **Gestión del local:** el administrador y los empleados ven todos los pedidos, cambian su estado o método de pago, editan los productos del pedido y pueden cancelarlo. El administrador da de alta, edita y elimina productos.

## Tecnologías

- Python 3 y Flask 3
- Flask-CORS
- MySQL (`mysql-connector-python`)
- Gunicorn para producción
- HTML, CSS y JavaScript (carpetas `templates/` y `static/`)
- Publicado en Render

## Estructura

```
├── app.py              # API REST y rutas de la aplicación
├── carniceria.sql      # Estructura de la base de datos
├── requirements.txt    # Dependencias de Python
├── templates/          # Páginas HTML
├── static/             # CSS, JavaScript e imágenes
└── ticket/             # Recursos para el ticket del pedido
```

## Cómo ejecutarlo en tu computadora

1. Cloná el repositorio e instalá las dependencias:

   ```bash
   git clone https://github.com/douglasjro1984-art/el-matadero-carniceria.git
   cd el-matadero-carniceria
   pip install -r requirements.txt
   ```

2. Creá una base de datos MySQL llamada `carniceria_db` e importá el archivo `carniceria.sql`.

3. Configurá la conexión con estas variables de entorno (si no las definís, usa los valores por defecto):

   | Variable | Valor por defecto |
   |---|---|
   | `DB_HOST` | `127.0.0.1` |
   | `DB_PORT` | `3306` |
   | `DB_USER` | `root` |
   | `DB_PASSWORD` | (definila vos) |
   | `DB_NAME` | `carniceria_db` |

4. Iniciá la aplicación y abrí http://127.0.0.1:5000

   ```bash
   python app.py
   ```

   En producción se ejecuta con `gunicorn app:app`.

## API principal

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/productos` | Lista los productos |
| POST | `/clientes/registro` | Registra un cliente |
| POST | `/clientes/login` | Inicia sesión |
| POST | `/pedidos` | Crea un pedido |
| GET | `/pedidos/<cliente_id>` | Historial de pedidos de un cliente |
| POST | `/admin/productos` | Agrega un producto |
| PUT / DELETE | `/admin/productos/<id>` | Edita o elimina un producto |
| GET | `/admin/pedidos` | Lista todos los pedidos |
| PUT / DELETE | `/admin/pedidos/<id>` | Edita o cancela un pedido |

## Mejoras previstas

- Guardar las contraseñas cifradas y validarlas en el inicio de sesión.
- Proteger las rutas de administración según el rol del usuario.
- Controlar el stock de productos.

## Autor

**Douglas Romero**, desarrollador backend junior.
[GitHub](https://github.com/douglasjro1984-art) · [LinkedIn](https://www.linkedin.com/in/douglas-romero-574576384)
