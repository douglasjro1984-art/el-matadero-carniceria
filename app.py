from flask import Flask, jsonify, render_template
from flask_cors import CORS
import mysql.connector
import os

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

# --- 3. RUTA PRINCIPAL ---
@app.route('/')
def index():
    return render_template('index.html')

# --- 4. ENDPOINT API ---
@app.route('/productos', methods=['GET'])
def get_productos():
    productos = []
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, nombre, corte, precio, unidad FROM productos")
        productos = cursor.fetchall()
    except mysql.connector.Error as err:
        print(f"Error al conectar o consultar MySQL: {err}")
        return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
    finally:
        if 'cursor' in locals() and cursor is not None:
            cursor.close()
        if 'db' in locals() and db.is_connected():
            db.close()
    
    return jsonify(productos)

# --- 5. EJECUCIÓN DEL SERVIDOR ---
if __name__ == '__main__':
    app.run(debug=True)