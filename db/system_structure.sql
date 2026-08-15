-- System Structure Table (Sin Iconos, Solo Nombres)
CREATE TABLE system_structure (
  ID_Section INT PRIMARY KEY IDENTITY(1,1),
  section_name NVARCHAR(100) NOT NULL UNIQUE,        -- 'Proveedores', 'Clientes', etc
  section_key NVARCHAR(50) NOT NULL UNIQUE,          -- 'providers', 'clients', etc (routing key)
  table_name NVARCHAR(100) NOT NULL UNIQUE,          -- Nombre tabla SQL: 'Proveedores', 'Clientes'
  display_order INT DEFAULT 0,                       -- Orden en menú
  is_active BIT DEFAULT 1,                           -- Mostrar/ocultar
  requires_admin BIT DEFAULT 0,                      -- Solo admin puede ver
  description NVARCHAR(300),                         -- Descripción del módulo
  api_endpoint NVARCHAR(100),                        -- Endpoint API: '/providers', '/clients'
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE()
);

-- Data inicial
INSERT INTO system_structure (section_name, section_key, table_name, display_order, is_active, requires_admin, description, api_endpoint)
VALUES 
('Proveedores', 'providers', 'Proveedores', 1, 1, 0, 'Gestión de proveedores', '/providers'),
('Clientes', 'clients', 'Clientes', 2, 1, 0, 'Gestión de clientes', '/clients'),
('Productos', 'products', 'Productos', 3, 1, 0, 'Catálogo de productos', '/products'),
('Rubros', 'rubros', 'Rubros', 4, 1, 0, 'Categorías de productos', '/rubros'),
('Marcas', 'marcas', 'Marca', 5, 1, 0, 'Marcas de productos', '/marcas'),
('Pedidos', 'orders', 'TomadePedido', 6, 1, 0, 'Gestión de órdenes de compra', '/orders'),
('Repartidores', 'repartidores', 'Repartidores', 7, 1, 0, 'Gestión de repartidores', '/repartidores'),
('Estadísticas', 'statistics', 'Statistics', 8, 1, 0, 'Reportes y análisis', '/statistics'),
('Usuarios', 'users', 'Users', 9, 1, 1, 'Gestión de usuarios (Admin)', '/users');
