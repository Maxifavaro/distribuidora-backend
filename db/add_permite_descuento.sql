USE OMMISYS;
GO

-- Agregar campo para indicar si el producto permite descuentos
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Productos]') AND name = 'PermiteDescuento')
BEGIN
    ALTER TABLE Productos
    ADD PermiteDescuento BIT NOT NULL DEFAULT 1;
    
    PRINT 'Campo PermiteDescuento agregado exitosamente';
END
ELSE
BEGIN
    PRINT 'El campo PermiteDescuento ya existe';
END
GO
