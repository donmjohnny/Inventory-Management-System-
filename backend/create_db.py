import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_database():
    try:
        # Connect to the default postgres database
        conn = psycopg2.connect(
            dbname='postgres',
            user='postgres',
            password='mundackal@123',
            host='127.0.0.1',
            port='5432'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if rbac_db exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'rbac_db';")
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute("CREATE DATABASE rbac_db;")
            print("Database 'rbac_db' created successfully.")
        else:
            print("Database 'rbac_db' already exists.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    create_database()
