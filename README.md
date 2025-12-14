# Distribuidora API

API REST en Node.js (Express) usando SQL Server para gestionar proveedores, clientes y productos.

Setup rápido:

1. Instalar dependencias:

```bash
npm install
```

2. Copiar `.env.example` a `.env` y ajustar la conexión a SQL Server; por defecto se usa SQL Server auth con `sa`/`Apex34`.

3. Crear la base y tablas ejecutando `db/init.sql` en tu SQL Server.

4. Ejecutar en modo desarrollo (por defecto corre en el puerto 3002; para usar otro puerto, exportar `PORT`):

```bash
# En Windows (PowerShell)
$env:PORT='3002'; npm run dev

# En Windows (CMD)
set PORT=3002 && npm run dev

# En macOS/Linux
PORT=3002 npm run dev
```

Endpoints principales:
- `POST /providers`, `GET /providers`, `GET /providers/:id`, `PUT /providers/:id`, `DELETE /providers/:id`
- `POST /clients`, `GET /clients`, ...
- `POST /products`, `GET /products`, ...
