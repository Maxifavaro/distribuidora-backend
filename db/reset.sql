-- Drop existing tables in reverse dependency order
IF OBJECT_ID('dbo.OrderItems', 'U') IS NOT NULL
  DROP TABLE OrderItems;

IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL
  DROP TABLE Orders;

IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL
  DROP TABLE Products;

IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
  DROP TABLE Users;

IF OBJECT_ID('dbo.Permissions', 'U') IS NOT NULL
  DROP TABLE Permissions;

IF OBJECT_ID('dbo.Clients', 'U') IS NOT NULL
  DROP TABLE Clients;

IF OBJECT_ID('dbo.Providers', 'U') IS NOT NULL
  DROP TABLE Providers;

-- Re-create all tables
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

CREATE TABLE Orders (
  id INT IDENTITY(1,1) PRIMARY KEY,
  order_type NVARCHAR(20) NOT NULL,
  provider_id INT NULL,
  client_id INT NULL,
  total_amount DECIMAL(18,2) DEFAULT 0,
  created_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Orders_Providers FOREIGN KEY (provider_id) REFERENCES Providers(id),
  CONSTRAINT FK_Orders_Clients FOREIGN KEY (client_id) REFERENCES Clients(id)
);

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
