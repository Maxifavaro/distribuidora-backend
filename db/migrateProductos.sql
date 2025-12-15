USE OMMISYS;
GO

-- Crear tabla Marca
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Marca]') AND type in (N'U'))
BEGIN
    CREATE TABLE Marca (
        Id_Marca INT PRIMARY KEY IDENTITY(1,1),
        Mrc_Descripcion VARCHAR(30) NOT NULL
    );
END
GO

-- Crear tabla Alicuotas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Alicuotas]') AND type in (N'U'))
BEGIN
    CREATE TABLE Alicuotas (
        id_alicuota INT PRIMARY KEY IDENTITY(1,1),
        Alic_descripcion VARCHAR(50) NOT NULL,
        Alicuota REAL NOT NULL
    );
END
GO

-- Crear tabla Productos con la estructura completa de TesisProduccion
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Productos]') AND type in (N'U'))
BEGIN
    CREATE TABLE Productos (
        ID_Producto INT PRIMARY KEY IDENTITY(1,1),
        Descripcion VARCHAR(999) NOT NULL,
        ID_Proveedor INT NOT NULL,
        PMR INT NOT NULL,
        Costo REAL NOT NULL,
        CostoUnit REAL NULL,
        margen REAL NULL,
        PrecioFinalPack REAL NOT NULL,
        ID_Rubro INT NOT NULL,
        PrecioNetoPack REAL NOT NULL,
        MontoIVA REAL NOT NULL,
        Estado VARCHAR(50) NOT NULL DEFAULT 'Activo',
        idMarca INT NULL,
        MarcaDesc VARCHAR(255) NULL,
        IdAlicIva INT NULL,
        AlicIva_desc FLOAT NULL,
        Pr_Ean13 VARCHAR(15) NULL,
        Pr_CodOrigen VARCHAR(15) NULL,
        Pr_Pack VARCHAR(3) NULL,
        Pr_UniXPack INT NULL,
        Pr_UnidMinVenta DECIMAL(18,2) NULL,
        PrecioFinalUni REAL NULL,
        PrecioNetoUni REAL NULL,
        Enviado BIGINT NULL,
        OcultarApp BIT NULL DEFAULT 0,
        SinStockApp BIT NULL DEFAULT 0,
        Stock INT NULL DEFAULT 0,
        FOREIGN KEY (ID_Proveedor) REFERENCES Proveedores(ID_Proveedor),
        FOREIGN KEY (ID_Rubro) REFERENCES Rubros(id_rubro),
        FOREIGN KEY (idMarca) REFERENCES Marca(Id_Marca),
        FOREIGN KEY (IdAlicIva) REFERENCES Alicuotas(id_alicuota)
    );
END
GO

-- Crear tabla TomadePedido (Pedidos)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TomadePedido]') AND type in (N'U'))
BEGIN
    CREATE TABLE TomadePedido (
        ID_TomaPedido BIGINT PRIMARY KEY IDENTITY(1,1),
        Letra VARCHAR(30) NOT NULL DEFAULT 'A',
        ID_Comprobante INT NOT NULL DEFAULT 1,
        ID_Cliente INT NOT NULL,
        Fecha DATETIME NOT NULL DEFAULT GETDATE(),
        FechaEntrega DATETIME NOT NULL,
        ID_Condicion INT NULL,
        ID_Empleado INT NULL,
        PorcentajeDto REAL NULL,
        Dto REAL NOT NULL DEFAULT 0,
        Total REAL NOT NULL DEFAULT 0,
        Apagar REAL NOT NULL DEFAULT 0,
        CtaCte REAL NOT NULL DEFAULT 0,
        Estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
        Observaciones VARCHAR(255) NULL,
        bDeposito SMALLINT NULL DEFAULT 0,
        FOREIGN KEY (ID_Cliente) REFERENCES Clientes(ID_Cliente),
        FOREIGN KEY (ID_Condicion) REFERENCES CondicionPago(ID_CondicionPago)
    );
END
GO

-- Crear tabla DetalleTomadePedido
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DetalleTomadePedido]') AND type in (N'U'))
BEGIN
    CREATE TABLE DetalleTomadePedido (
        ID_TomaPedido BIGINT NOT NULL,
        ID_Producto INT NOT NULL,
        IVA REAL NOT NULL,
        PrecioUnitario REAL NOT NULL,
        Cantidad REAL NOT NULL,
        RestoIVA REAL NOT NULL DEFAULT 0,
        Dto REAL NOT NULL DEFAULT 0,
        ImporteconDto REAL NOT NULL,
        Hoja INT NULL,
        Rechazo INT NULL,
        Monto REAL NULL,
        CostoUnit REAL NULL,
        Item VARCHAR(2) NOT NULL,
        NroPedido INT NULL,
        PRIMARY KEY (ID_TomaPedido, ID_Producto, Item),
        FOREIGN KEY (ID_TomaPedido) REFERENCES TomadePedido(ID_TomaPedido),
        FOREIGN KEY (ID_Producto) REFERENCES Productos(ID_Producto)
    );
END
GO

PRINT 'Tablas creadas exitosamente';
