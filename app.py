from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import mysql.connector
import os
from datetime import datetime, timedelta

# --- CONFIGURACIÓN DE LA BASE DE DATOS ---
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', '127.0.0.1'),
    'port': int(os.environ.get('DB_PORT', '3306')),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', '1234'),
    'database': os.environ.get('DB_NAME', 'carniceria_db')
}

app = Flask(__name__)
CORS(app)

def get_db_connection():
    """Crea y retorna una conexión a la base de datos"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as err:
        print(f"Error al conectar a MySQL: {err}")
        return None

# ============================================
# RUTAS PÚBLICAS
# ============================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/productos', methods=['GET'])
def get_productos():
    """Obtener todos los productos"""
    productos = []
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, nombre, corte, precio, unidad FROM productos ORDER BY id")
        productos = cursor.fetchall()
        
    except mysql.connector.Error as err:
        print(f"Error al consultar productos: {err}")
        return jsonify({"error": "Error al consultar productos."}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
    
    return jsonify(productos)

# ============================================
# AUTENTICACIÓN - CLIENTES
# ============================================

@app.route('/clientes/registro', methods=['POST'])
def registro_cliente():
    """Registrar nuevo cliente"""
    data = request.get_json()
    
    if not data or not data.get('nombre') or not data.get('email'):
        return jsonify({"error": "Nombre y email son obligatorios"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor()
        
        # Verificar si el email ya existe
        cursor.execute("SELECT id FROM clientes WHERE email = %s", (data.get('email'),))
        if cursor.fetchone():
            return jsonify({"error": "El email ya está registrado"}), 409
        
        # Insertar nuevo cliente (rol por defecto: cliente)
        query = """
            INSERT INTO clientes (nombre, apellido, email, telefono, direccion, password, rol)
            VALUES (%s, %s, %s, %s, %s, %s, 'cliente')
        """
        valores = (
            data.get('nombre'),
            data.get('apellido', ''),
            data.get('email'),
            data.get('telefono', ''),
            data.get('direccion', ''),
            data.get('password', '')
        )
        
        cursor.execute(query, valores)
        connection.commit()
        
        cliente_id = cursor.lastrowid
        
        return jsonify({
            "message": "Cliente registrado exitosamente",
            "cliente_id": cliente_id
        }), 201
        
    except mysql.connector.Error as err:
        print(f"Error al registrar cliente: {err}")
        return jsonify({"error": "Error al registrar cliente"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/clientes/login', methods=['POST'])
def login_cliente():
    """Login de cliente con verificación de rol"""
    data = request.get_json()
    
    if not data or not data.get('email'):
        return jsonify({"error": "Email es obligatorio"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nombre, apellido, email, telefono, direccion, rol 
            FROM clientes 
            WHERE email = %s
        """, (data.get('email'),))
        
        cliente = cursor.fetchone()
        
        if not cliente:
            return jsonify({"error": "Cliente no encontrado"}), 404
        
        return jsonify({"cliente": cliente}), 200
        
    except mysql.connector.Error as err:
        print(f"Error al buscar cliente: {err}")
        return jsonify({"error": "Error al buscar cliente"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ============================================
# PEDIDOS - CLIENTES
# ============================================

@app.route('/pedidos', methods=['POST'])
def crear_pedido():
    """Crear nuevo pedido"""
    data = request.get_json()
    
    if not data or not data.get('cliente_id') or not data.get('items'):
        return jsonify({"error": "cliente_id e items son obligatorios"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor()
        
        # Calcular total
        total = sum(float(item['precio']) * float(item['cantidad']) for item in data['items'])
        
        # Insertar pedido con método de pago
        metodo_pago = data.get('metodo_pago', 'efectivo')
        cursor.execute("""
            INSERT INTO pedidos (cliente_id, fecha, total, estado, metodo_pago)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['cliente_id'], datetime.now(), total, 'pendiente', metodo_pago))
        
        pedido_id = cursor.lastrowid
        
        # Insertar detalles del pedido con subtotal
        for item in data['items']:
            cantidad = float(item['cantidad'])
            precio = float(item['precio'])
            subtotal = cantidad * precio
            
            cursor.execute("""
                INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (%s, %s, %s, %s, %s)
            """, (pedido_id, item['id'], cantidad, precio, subtotal))
        
        connection.commit()
        
        return jsonify({
            "message": "Pedido creado exitosamente",
            "pedido_id": pedido_id,
            "total": total
        }), 201
        
    except mysql.connector.Error as err:
        print(f"Error al crear pedido: {err}")
        if connection:
            connection.rollback()
        return jsonify({"error": "Error al crear pedido"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/pedidos/<int:cliente_id>', methods=['GET'])
def get_pedidos_cliente(cliente_id):
    """Obtener pedidos de un cliente específico"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, fecha, total, estado, metodo_pago, editado, fecha_edicion 
            FROM pedidos 
            WHERE cliente_id = %s 
            ORDER BY fecha DESC
        """, (cliente_id,))
        
        pedidos = cursor.fetchall()
        
        for pedido in pedidos:
            cursor.execute("""
                SELECT dp.cantidad, dp.precio_unitario, dp.subtotal, p.nombre, p.unidad
                FROM detalle_pedidos dp
                JOIN productos p ON dp.producto_id = p.id
                WHERE dp.pedido_id = %s
            """, (pedido['id'],))
            
            pedido['items'] = cursor.fetchall()
        
        return jsonify(pedidos), 200
        
    except mysql.connector.Error as err:
        print(f"Error al obtener pedidos: {err}")
        return jsonify({"error": "Error al obtener pedidos"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ============================================
# 🆕 HISTORIAL COMPLETO DE PEDIDOS (DESDE BD)
# ============================================

@app.route('/pedidos/historial', methods=['GET'])
def get_historial_completo():
    """Obtener historial completo de todos los pedidos guardados en BD"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Obtener pedidos con información del cliente
        cursor.execute("""
            SELECT p.id, p.fecha, p.total, p.estado, p.metodo_pago, 
                   p.editado, p.fecha_edicion,
                   c.nombre as cliente_nombre, c.apellido as cliente_apellido,
                   c.email, c.telefono
            FROM pedidos p
            JOIN clientes c ON p.cliente_id = c.id
            ORDER BY p.fecha DESC
            LIMIT 1000
        """)
        
        pedidos = cursor.fetchall()
        
        # Obtener items de cada pedido
        for pedido in pedidos:
            cursor.execute("""
                SELECT dp.cantidad, dp.precio_unitario, dp.subtotal,
                       pr.nombre, pr.unidad
                FROM detalle_pedidos dp
                JOIN productos pr ON dp.producto_id = pr.id
                WHERE dp.pedido_id = %s
            """, (pedido['id'],))
            
            pedido['items'] = cursor.fetchall()
        
        return jsonify(pedidos), 200
        
    except mysql.connector.Error as err:
        print(f"Error al obtener historial: {err}")
        return jsonify({"error": "Error al obtener historial"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ============================================
# ADMIN - GESTIÓN DE PRODUCTOS
# ============================================

@app.route('/admin/productos', methods=['POST'])
def agregar_producto():
    """Agregar nuevo producto (solo admin)"""
    data = request.get_json()
    
    if not data or not all(k in data for k in ['nombre', 'corte', 'precio', 'unidad']):
        return jsonify({"error": "Faltan datos obligatorios"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor()
        
        cursor.execute("""
            INSERT INTO productos (nombre, corte, precio, unidad)
            VALUES (%s, %s, %s, %s)
        """, (data['nombre'], data['corte'], data['precio'], data['unidad']))
        
        connection.commit()
        producto_id = cursor.lastrowid
        
        return jsonify({
            "message": "Producto agregado exitosamente",
            "producto_id": producto_id
        }), 201
        
    except mysql.connector.Error as err:
        print(f"Error al agregar producto: {err}")
        return jsonify({"error": "Error al agregar producto"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/admin/productos/<int:id>', methods=['PUT'])
def actualizar_producto(id):
    """Actualizar producto existente (solo admin)"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No hay datos para actualizar"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor()
        
        campos = []
        valores = []
        
        if 'nombre' in data:
            campos.append("nombre = %s")
            valores.append(data['nombre'])
        if 'corte' in data:
            campos.append("corte = %s")
            valores.append(data['corte'])
        if 'precio' in data:
            campos.append("precio = %s")
            valores.append(data['precio'])
        if 'unidad' in data:
            campos.append("unidad = %s")
            valores.append(data['unidad'])
        
        if not campos:
            return jsonify({"error": "No hay campos válidos para actualizar"}), 400
        
        valores.append(id)
        query = f"UPDATE productos SET {', '.join(campos)} WHERE id = %s"
        
        cursor.execute(query, valores)
        connection.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Producto no encontrado"}), 404
        
        return jsonify({"message": "Producto actualizado exitosamente"}), 200
        
    except mysql.connector.Error as err:
        print(f"Error al actualizar producto: {err}")
        return jsonify({"error": "Error al actualizar producto"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/admin/productos/<int:id>', methods=['DELETE'])
def eliminar_producto(id):
    """Eliminar producto (solo admin)"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor()
        cursor.execute("DELETE FROM productos WHERE id = %s", (id,))
        connection.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Producto no encontrado"}), 404
        
        return jsonify({"message": "Producto eliminado exitosamente"}), 200
        
    except mysql.connector.Error as err:
        print(f"Error al eliminar producto: {err}")
        return jsonify({"error": "Error al eliminar producto"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ============================================
# ADMIN/EMPLEADO - GESTIÓN DE PEDIDOS
# ============================================

@app.route('/admin/pedidos', methods=['GET'])
def get_todos_pedidos():
    """Obtener todos los pedidos (admin y empleado)"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT p.id, p.fecha, p.total, p.estado, p.metodo_pago, p.editado, p.fecha_edicion,
                   c.nombre, c.apellido, c.email, c.telefono
            FROM pedidos p
            JOIN clientes c ON p.cliente_id = c.id
            ORDER BY p.fecha DESC
        """)
        
        pedidos = cursor.fetchall()
        
        for pedido in pedidos:
            cursor.execute("""
                SELECT dp.cantidad, dp.precio_unitario, dp.subtotal, 
                       pr.nombre, pr.unidad
                FROM detalle_pedidos dp
                JOIN productos pr ON dp.producto_id = pr.id
                WHERE dp.pedido_id = %s
            """, (pedido['id'],))
            
            pedido['items'] = cursor.fetchall()
        
        return jsonify(pedidos), 200
        
    except mysql.connector.Error as err:
        print(f"Error al obtener pedidos: {err}")
        return jsonify({"error": "Error al obtener pedidos"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/admin/pedidos/<int:pedido_id>', methods=['PUT'])
def editar_pedido(pedido_id):
    """Editar pedido existente (admin y empleado)"""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No hay datos para actualizar"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor()
        
        if 'estado' in data or 'metodo_pago' in data:
            campos = []
            valores = []
            
            if 'estado' in data:
                campos.append("estado = %s")
                valores.append(data['estado'])
            if 'metodo_pago' in data:
                campos.append("metodo_pago = %s")
                valores.append(data['metodo_pago'])
            
            campos.append("editado = TRUE")
            campos.append("fecha_edicion = %s")
            valores.append(datetime.now())
            
            if 'editado_por' in data:
                campos.append("editado_por = %s")
                valores.append(data['editado_por'])
            
            valores.append(pedido_id)
            query = f"UPDATE pedidos SET {', '.join(campos)} WHERE id = %s"
            cursor.execute(query, valores)
        
        if 'items' in data:
            cursor.execute("DELETE FROM detalle_pedidos WHERE pedido_id = %s", (pedido_id,))
            
            total = 0
            for item in data['items']:
                cantidad = float(item['cantidad'])
                precio = float(item['precio'])
                subtotal = cantidad * precio
                total += subtotal
                
                cursor.execute("""
                    INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                    VALUES (%s, %s, %s, %s, %s)
                """, (pedido_id, item['producto_id'], cantidad, precio, subtotal))
            
            cursor.execute("UPDATE pedidos SET total = %s WHERE id = %s", (total, pedido_id))
        
        connection.commit()
        
        return jsonify({"message": "Pedido actualizado exitosamente"}), 200
        
    except mysql.connector.Error as err:
        print(f"Error al editar pedido: {err}")
        if connection:
            connection.rollback()
        return jsonify({"error": "Error al editar pedido"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/admin/pedidos/<int:pedido_id>', methods=['DELETE'])
def cancelar_pedido(pedido_id):
    """Cancelar pedido (cambiar estado a cancelado)"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE pedidos 
            SET estado = 'cancelado', editado = TRUE, fecha_edicion = %s 
            WHERE id = %s
        """, (datetime.now(), pedido_id))
        
        connection.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"error": "Pedido no encontrado"}), 404
        
        return jsonify({"message": "Pedido cancelado exitosamente"}), 200
        
    except mysql.connector.Error as err:
        print(f"Error al cancelar pedido: {err}")
        return jsonify({"error": "Error al cancelar pedido"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ============================================
# 🆕 CIERRE DE CAJA
# ============================================

@app.route('/admin/cierre-caja', methods=['POST'])
def crear_cierre_caja():
    """Realizar cierre de caja diario"""
    data = request.get_json()
    
    if not data or not data.get('usuario_id') or not data.get('fecha'):
        return jsonify({"error": "usuario_id y fecha son obligatorios"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        fecha = data['fecha']
        
        # Verificar si ya existe cierre para esa fecha
        cursor.execute("SELECT id FROM cierre_caja WHERE fecha = %s", (fecha,))
        if cursor.fetchone():
            return jsonify({"error": f"Ya existe un cierre de caja para la fecha {fecha}"}), 409
        
        # Calcular totales por método de pago
        cursor.execute("""
            SELECT 
                COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as total_efectivo,
                COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as total_tarjeta,
                COALESCE(SUM(CASE WHEN metodo_pago = 'transferencia' THEN total ELSE 0 END), 0) as total_transferencia,
                COALESCE(SUM(total), 0) as total_general,
                COUNT(*) as cantidad_pedidos
            FROM pedidos
            WHERE DATE(fecha) = %s AND estado != 'cancelado'
        """, (fecha,))
        
        totales = cursor.fetchone()
        
        # Insertar cierre de caja
        cursor.execute("""
            INSERT INTO cierre_caja 
            (fecha, usuario_id, total_efectivo, total_tarjeta, total_transferencia, 
             total_general, cantidad_pedidos, observaciones)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            fecha,
            data['usuario_id'],
            totales['total_efectivo'],
            totales['total_tarjeta'],
            totales['total_transferencia'],
            totales['total_general'],
            totales['cantidad_pedidos'],
            data.get('observaciones', '')
        ))
        
        connection.commit()
        cierre_id = cursor.lastrowid
        
        return jsonify({
            "message": "Cierre de caja realizado exitosamente",
            "cierre_id": cierre_id,
            "totales": totales
        }), 201
        
    except mysql.connector.Error as err:
        print(f"Error al realizar cierre de caja: {err}")
        return jsonify({"error": "Error al realizar cierre de caja"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/admin/cierres', methods=['GET'])
def get_cierres():
    """Obtener todos los cierres de caja"""
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT cc.*, c.nombre as usuario_nombre
            FROM cierre_caja cc
            LEFT JOIN clientes c ON cc.usuario_id = c.id
            ORDER BY cc.fecha DESC
            LIMIT 100
        """)
        
        cierres = cursor.fetchall()
        
        return jsonify(cierres), 200
        
    except mysql.connector.Error as err:
        print(f"Error al obtener cierres: {err}")
        return jsonify({"error": "Error al obtener cierres"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ============================================
# 🆕 REPORTES DE VENTAS
# ============================================

@app.route('/admin/reportes/diario', methods=['GET'])
def reporte_diario():
    """Reporte de ventas del día"""
    fecha = request.args.get('fecha', datetime.now().strftime('%Y-%m-%d'))
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Totales por método de pago
        cursor.execute("""
            SELECT 
                metodo_pago,
                COUNT(*) as cantidad,
                SUM(total) as total
            FROM pedidos
            WHERE DATE(fecha) = %s AND estado != 'cancelado'
            GROUP BY metodo_pago
        """, (fecha,))
        
        por_metodo = cursor.fetchall()
        
        # Total general
        cursor.execute("""
            SELECT 
                COUNT(*) as total_pedidos,
                SUM(total) as total_ventas,
                AVG(total) as ticket_promedio
            FROM pedidos
            WHERE DATE(fecha) = %s AND estado != 'cancelado'
        """, (fecha,))
        
        totales = cursor.fetchone()
        
        # Productos más vendidos
        cursor.execute("""
            SELECT 
                p.nombre,
                p.corte,
                SUM(dp.cantidad) as cantidad_vendida,
                SUM(dp.subtotal) as total_vendido
            FROM detalle_pedidos dp
            JOIN productos p ON dp.producto_id = p.id
            JOIN pedidos pe ON dp.pedido_id = pe.id
            WHERE DATE(pe.fecha) = %s AND pe.estado != 'cancelado'
            GROUP BY p.id, p.nombre, p.corte
            ORDER BY total_vendido DESC
            LIMIT 10
        """, (fecha,))
        
        productos_top = cursor.fetchall()
        
        return jsonify({
            "fecha": fecha,
            "totales": totales,
            "por_metodo_pago": por_metodo,
            "productos_mas_vendidos": productos_top
        }), 200
        
    except mysql.connector.Error as err:
        print(f"Error al generar reporte diario: {err}")
        return jsonify({"error": "Error al generar reporte"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/admin/reportes/mensual', methods=['GET'])
def reporte_mensual():
    """Reporte de ventas del mes"""
    anio = request.args.get('anio', datetime.now().year)
    mes = request.args.get('mes', datetime.now().month)
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Ventas por día del mes
        cursor.execute("""
            SELECT 
                DATE(fecha) as fecha,
                COUNT(*) as cantidad_pedidos,
                SUM(total) as total_ventas
            FROM pedidos
            WHERE YEAR(fecha) = %s AND MONTH(fecha) = %s AND estado != 'cancelado'
            GROUP BY DATE(fecha)
            ORDER BY fecha
        """, (anio, mes))
        
        ventas_diarias = cursor.fetchall()
        
        # Total del mes
        cursor.execute("""
            SELECT 
                COUNT(*) as total_pedidos,
                SUM(total) as total_ventas,
                AVG(total) as ticket_promedio
            FROM pedidos
            WHERE YEAR(fecha) = %s AND MONTH(fecha) = %s AND estado != 'cancelado'
        """, (anio, mes))
        
        totales = cursor.fetchone()
        
        # Por método de pago
        cursor.execute("""
            SELECT 
                metodo_pago,
                COUNT(*) as cantidad,
                SUM(total) as total
            FROM pedidos
            WHERE YEAR(fecha) = %s AND MONTH(fecha) = %s AND estado != 'cancelado'
            GROUP BY metodo_pago
        """, (anio, mes))
        
        por_metodo = cursor.fetchall()
        
        return jsonify({
            "periodo": f"{mes}/{anio}",
            "totales": totales,
            "ventas_diarias": ventas_diarias,
            "por_metodo_pago": por_metodo
        }), 200
        
    except mysql.connector.Error as err:
        print(f"Error al generar reporte mensual: {err}")
        return jsonify({"error": "Error al generar reporte"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/admin/reportes/rango', methods=['GET'])
def reporte_rango():
    """Reporte de ventas por rango de fechas"""
    fecha_desde = request.args.get('desde')
    fecha_hasta = request.args.get('hasta')
    
    if not fecha_desde or not fecha_hasta:
        return jsonify({"error": "Debe proporcionar fecha_desde y fecha_hasta"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Totales generales
        cursor.execute("""
            SELECT 
                COUNT(*) as total_pedidos,
                SUM(total) as total_ventas,
                AVG(total) as ticket_promedio
            FROM pedidos
            WHERE DATE(fecha) BETWEEN %s AND %s AND estado != 'cancelado'
        """, (fecha_desde, fecha_hasta))
        
        totales = cursor.fetchone()
        
        # Por método de pago
        cursor.execute("""
            SELECT 
                metodo_pago,
                COUNT(*) as cantidad,
                SUM(total) as total
            FROM pedidos
            WHERE DATE(fecha) BETWEEN %s AND %s AND estado != 'cancelado'
            GROUP BY metodo_pago
        """, (fecha_desde, fecha_hasta))
        
        por_metodo = cursor.fetchall()
        
        # Productos más vendidos en el rango
        cursor.execute("""
            SELECT 
                p.nombre,
                p.corte,
                SUM(dp.cantidad) as cantidad_vendida,
                SUM(dp.subtotal) as total_vendido
            FROM detalle_pedidos dp
            JOIN productos p ON dp.producto_id = p.id
            JOIN pedidos pe ON dp.pedido_id = pe.id
            WHERE DATE(pe.fecha) BETWEEN %s AND %s AND pe.estado != 'cancelado'
            GROUP BY p.id, p.nombre, p.corte
            ORDER BY total_vendido DESC
            LIMIT 15
        """, (fecha_desde, fecha_hasta))
        
        productos_top = cursor.fetchall()
        
        return jsonify({
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "totales": totales,
            "por_metodo_pago": por_metodo,
            "productos_mas_vendidos": productos_top
        }), 200
        
    except mysql.connector.Error as err:
        print(f"Error al generar reporte por rango: {err}")
        return jsonify({"error": "Error al generar reporte"}), 500
    
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# ============================================
# EJECUCIÓN
# ============================================

if __name__ == '__main__':
    app.run(debug=True)