USE OMMISYS;
GO

-- Crear tabla Repartidores
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Repartidores]') AND type in (N'U'))
BEGIN
    CREATE TABLE Repartidores (
        ID_Repartidor INT PRIMARY KEY IDENTITY(1,1),
        Nombre NVARCHAR(100) NOT NULL,
        Apellido NVARCHAR(100) NOT NULL,
        DNI VARCHAR(20) NULL,
        Telefono VARCHAR(50) NULL,
        Direccion NVARCHAR(200) NULL,
        Email NVARCHAR(100) NULL,
        FechaIngreso DATETIME NULL DEFAULT GETDATE(),
        Estado VARCHAR(50) NOT NULL DEFAULT 'Activo',
        Observaciones NVARCHAR(255) NULL,
        LicenciaConducir VARCHAR(50) NULL,
        VencimientoLicencia DATETIME NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Tabla Repartidores creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla Repartidores ya existe';
END
GO

-- Agregar columna ID_Repartidor a la tabla TomadePedido si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TomadePedido]') AND name = 'ID_Repartidor')
BEGIN
    ALTER TABLE TomadePedido
    ADD ID_Repartidor INT NULL;
    
    -- Crear foreign key constraint
    ALTER TABLE TomadePedido
    ADD CONSTRAINT FK_TomadePedido_Repartidores 
    FOREIGN KEY (ID_Repartidor) REFERENCES Repartidores(ID_Repartidor);
    
    PRINT 'Columna ID_Repartidor agregada a TomadePedido';
END
ELSE
BEGIN
    PRINT 'La columna ID_Repartidor ya existe en TomadePedido';
END
GO

-- Insertar datos de ejemplo (opcional)
IF NOT EXISTS (SELECT * FROM Repartidores WHERE DNI = '12345678')
BEGIN
    INSERT INTO Repartidores (Nombre, Apellido, DNI, Telefono, Email, Estado, LicenciaConducir)
    VALUES 
        ('Juan', 'Pérez', '12345678', '351-1234567', 'juan.perez@example.com', 'Activo', 'B123456'),
        ('María', 'González', '23456789', '351-2345678', 'maria.gonzalez@example.com', 'Activo', 'B234567'),
        ('Carlos', 'Rodríguez', '34567890', '351-3456789', 'carlos.rodriguez@example.com', 'Activo', 'B345678');
    PRINT 'Datos de ejemplo insertados en Repartidores';
END
ELSE
BEGIN
    PRINT 'Los datos de ejemplo ya existen';
END
GO

-- Verificar la creación
SELECT COUNT(*) as TotalRepartidores FROM Repartidores;
GO
