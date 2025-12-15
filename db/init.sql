-- Schema for DistribuidoraDB

CREATE TABLE Providers (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  contact NVARCHAR(200),
  phone NVARCHAR(50),
  email NVARCHAR(200),
  created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE Clients (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  address NVARCHAR(300),
  phone NVARCHAR(50),
  email NVARCHAR(200),
  created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE Products (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  sku NVARCHAR(100),
  price DECIMAL(10,2) DEFAULT 0,
  stock INT DEFAULT 0,
  provider_id INT NULL,
  created_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Products_Providers FOREIGN KEY (provider_id) REFERENCES Providers(id)
);

-- Orders table: 'type' is 'supplier' (to provider) or 'client' (client order)
CREATE TABLE Orders (
  id INT IDENTITY(1,1) PRIMARY KEY,
  order_type NVARCHAR(20) NOT NULL, -- 'supplier' or 'client'
  provider_id INT NULL,
  client_id INT NULL,
  total_amount DECIMAL(18,2) DEFAULT 0,
  created_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Orders_Providers FOREIGN KEY (provider_id) REFERENCES Providers(id),
  CONSTRAINT FK_Orders_Clients FOREIGN KEY (client_id) REFERENCES Clients(id)
);

-- Order items
CREATE TABLE OrderItems (
  id INT IDENTITY(1,1) PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(18,2) DEFAULT 0,
  created_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (order_id) REFERENCES Orders(id) ON DELETE CASCADE,
  CONSTRAINT FK_OrderItems_Products FOREIGN KEY (product_id) REFERENCES Products(id)
);

-- Rubros (with auto-increment ID)
CREATE TABLE Rubros (
  ID_Rubro INT IDENTITY(1,1) PRIMARY KEY,
  Descripcion VARCHAR(40) NOT NULL
);

-- Permissions and Users
CREATE TABLE Permissions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  username NVARCHAR(200) NOT NULL UNIQUE,
  password NVARCHAR(300) NOT NULL,
  permission NVARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT GETDATE()
);
