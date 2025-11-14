from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import mysql.connector
import os
from datetime import datetime

# --- 1. CONFIGURACIÓN DE LA CONEXIÓN A LA BASE DE DATOS ---
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', '127.0.0.1'),
    'port': int(os.environ.get('DB_PORT', '3306')),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', '1234'),
    'database': os.environ.get('DB_NAME', 'carniceria_db')
}

# --- 2. CONFIGURACIÓN DE LA APLICACIÓN FLASK ---
app = Flask(__name__)
CORS(app)

# --- 3. FUNCIÓN AUXILIAR PARA CONECTAR A LA DB ---
def get_db_connection():
    """Crea y retorna una conexión a la base de datos"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except mysql.connector.Error as err:
        print(f"Error al conectar a MySQL: {err}")
        return None

# --- 4. RUTA PRINCIPAL ---
@app.route('/')
def index():
    return render_template('index.html')

# --- 5. ENDPOINT API - PRODUCTOS ---
@app.route('/productos', methods=['GET'])
def get_productos():
    productos = []
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, nombre, corte, precio, unidad FROM productos")
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

# --- 6. ENDPOINT API - REGISTRO DE CLIENTES ---
@app.route('/clientes/registro', methods=['POST'])
def registro_cliente():
    data = request.get_json()
    
    # Validar datos requeridos
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
        
        # Insertar nuevo cliente
        query = """
            INSERT INTO clientes (nombre, apellido, email, telefono, direccion, password)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        valores = (
            data.get('nombre'),
            data.get('apellido', ''),
            data.get('email'),
            data.get('telefono', ''),
            data.get('direccion', ''),
            data.get('password', '')  # En producción deberías hashear la contraseña
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

# --- 7. ENDPOINT API - LOGIN DE CLIENTES ---
@app.route('/clientes/login', methods=['POST'])
def login_cliente():
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
            SELECT id, nombre, apellido, email, telefono, direccion 
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

# --- 8. ENDPOINT API - CREAR PEDIDO ---
@app.route('/pedidos', methods=['POST'])
def crear_pedido():
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
        
        # Insertar pedido
        cursor.execute("""
            INSERT INTO pedidos (cliente_id, fecha, total, estado)
            VALUES (%s, %s, %s, %s)
        """, (data['cliente_id'], datetime.now(), total, 'pendiente'))
        
        pedido_id = cursor.lastrowid
        
        # Insertar detalles del pedido
        for item in data['items']:
            cursor.execute("""
                INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
                VALUES (%s, %s, %s, %s)
            """, (pedido_id, item['id'], item['cantidad'], item['precio']))
        
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

# --- 9. ENDPOINT API - OBTENER PEDIDOS DE UN CLIENTE ---
@app.route('/pedidos/<int:cliente_id>', methods=['GET'])
def get_pedidos_cliente(cliente_id):
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Obtener pedidos
        cursor.execute("""
            SELECT id, fecha, total, estado 
            FROM pedidos 
            WHERE cliente_id = %s 
            ORDER BY fecha DESC
        """, (cliente_id,))
        
        pedidos = cursor.fetchall()
        
        # Para cada pedido, obtener sus items
        for pedido in pedidos:
            cursor.execute("""
                SELECT dp.cantidad, dp.precio_unitario, p.nombre, p.unidad
                FROM detalle_pedido dp
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

# --- 10. EJECUCIÓN DEL SERVIDOR ---
if __name__ == '__main__':
    app.run(debug=True)