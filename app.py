from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector

# --- 1. CONFIGURACIÓN DE LA CONEXIÓN A LA BASE DE DATOS ---
DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': '1234',
    'database': 'carniceria_db' 
}

# --- 2. CONFIGURACIÓN DE LA APLICACIÓN FLASK ---
app = Flask(__name__)


CORS(app) 

# --- 3. DEFINICIÓN DEL ENDPOINT API ---

@app.route('/productos', methods=['GET'])
def get_productos():
    productos = []
    
    try:
        
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True) 
        
        # Ejecutar la consulta SQL
        cursor.execute("SELECT id, nombre, corte, precio, unidad FROM productos")
        
        # Obtener todos los resultados
        productos = cursor.fetchall()
        
    except mysql.connector.Error as err:
        print(f"Error al conectar o consultar MySQL: {err}")
        
        return jsonify({"error": "No se pudo conectar a la base de datos."}), 500
        
    finally:
        # Asegurarse de cerrar el cursor y la conexión
        if 'cursor' in locals() and cursor is not None:
            cursor.close()
        if 'db' in locals() and db.is_connected():
            db.close()
            
    # Devolver la lista de productos en formato JSON
    return jsonify(productos)

# --- 4. EJECUCIÓN DEL SERVIDOR ---

if __name__ == '__main__':
   
    app.run(debug=True)