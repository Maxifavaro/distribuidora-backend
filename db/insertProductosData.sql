USE OMMISYS;
GO

-- Insertar Marcas desde TesisProduccion
SET IDENTITY_INSERT Marca ON;
INSERT INTO Marca (Id_Marca, Mrc_Descripcion)
SELECT Id_Marca, Mrc_Descripcion
FROM TesisProduccion.dbo.Marca;
SET IDENTITY_INSERT Marca OFF;
PRINT 'Marcas insertadas: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- Insertar Alicuotas desde TesisProduccion
SET IDENTITY_INSERT Alicuotas ON;
INSERT INTO Alicuotas (id_alicuota, Alic_descripcion, Alicuota)
SELECT id_alicuota, Alic_descripcion, Alicuota
FROM TesisProduccion.dbo.Alicuotas;
SET IDENTITY_INSERT Alicuotas OFF;
PRINT 'Alicuotas insertadas: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- Insertar Productos desde TesisProduccion
-- Solo productos con proveedores y rubros existentes
SET IDENTITY_INSERT Productos ON;
INSERT INTO Productos (
    ID_Producto, Descripcion, ID_Proveedor, PMR, Costo, CostoUnit, margen,
    PrecioFinalPack, ID_Rubro, PrecioNetoPack, MontoIVA, Estado, idMarca, MarcaDesc,
    IdAlicIva, AlicIva_desc, Pr_Ean13, Pr_CodOrigen, Pr_Pack, Pr_UniXPack,
    Pr_UnidMinVenta, PrecioFinalUni, PrecioNetoUni, Enviado, OcultarApp, SinStockApp, Stock
)
SELECT 
    p.ID_Producto, p.Descripcion, 
    -- Solo proveedores que existen en OMMISYS
    CASE WHEN pr.ID_Proveedor IS NOT NULL THEN p.ID_Proveedor ELSE 1 END,
    p.PMR, p.Costo, p.CostoUnit, p.margen,
    p.PrecioFinalPack, 
    -- Solo rubros que existen en OMMISYS
    CASE WHEN r.id_rubro IS NOT NULL THEN p.ID_Rubro ELSE 1 END,
    p.PrecioNetoPack, p.MontoIVA, p.Estado, 
    -- Solo marcas que existen en OMMISYS
    CASE WHEN m.Id_Marca IS NOT NULL THEN p.idMarca ELSE NULL END, 
    p.MarcaDesc,
    -- Solo alicuotas que existen en OMMISYS
    CASE WHEN a.id_alicuota IS NOT NULL THEN p.IdAlicIva ELSE NULL END,
    p.AlicIva_desc, p.Pr_Ean13, p.Pr_CodOrigen, p.Pr_Pack, p.Pr_UniXPack,
    p.Pr_UnidMinVenta, p.PrecioFinalUni, p.PrecioNetoUni, p.Enviado, p.OcultarApp, p.SinStockApp,
    CAST(RAND(CHECKSUM(NEWID())) * 500 AS INT) -- Stock aleatorio entre 0 y 500
FROM TesisProduccion.dbo.Productos p
LEFT JOIN OMMISYS.dbo.Proveedores pr ON p.ID_Proveedor = pr.ID_Proveedor
LEFT JOIN OMMISYS.dbo.Rubros r ON p.ID_Rubro = r.id_rubro
LEFT JOIN OMMISYS.dbo.Marca m ON p.idMarca = m.Id_Marca
LEFT JOIN OMMISYS.dbo.Alicuotas a ON p.IdAlicIva = a.id_alicuota;
SET IDENTITY_INSERT Productos OFF;
PRINT 'Productos insertados: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- Insertar pedidos recientes (últimos 1000 pedidos para no sobrecargar)
-- Solo pedidos con clientes que existen en OMMISYS
SET IDENTITY_INSERT TomadePedido ON;
INSERT INTO TomadePedido (
    ID_TomaPedido, Letra, ID_Comprobante, ID_Cliente, Fecha, FechaEntrega,
    ID_Condicion, ID_Empleado, PorcentajeDto, Dto, Total, Apagar, CtaCte,
    Estado, Observaciones, bDeposito
)
SELECT TOP 1000
    tp.ID_TomaPedido, tp.Letra, tp.ID_Comprobante, tp.ID_Cliente, tp.Fecha, tp.FechaEntrega,
    -- Solo condiciones de pago que existen en OMMISYS
    CASE WHEN cp.ID_CondicionPago IS NOT NULL THEN tp.ID_Condicion ELSE NULL END,
    tp.ID_Empleado, tp.PorcentajeDto, tp.Dto, tp.Total, tp.Apagar, tp.CtaCte,
    tp.Estado, tp.Observaciones, tp.bDeposito
FROM TesisProduccion.dbo.TomadePedido tp
INNER JOIN OMMISYS.dbo.Clientes c ON tp.ID_Cliente = c.ID_Cliente
LEFT JOIN OMMISYS.dbo.CondicionPago cp ON tp.ID_Condicion = cp.ID_CondicionPago
ORDER BY tp.ID_TomaPedido DESC;
SET IDENTITY_INSERT TomadePedido OFF;
PRINT 'Pedidos insertados: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

-- Insertar detalles de los pedidos insertados
-- Solo productos que existen en OMMISYS
INSERT INTO DetalleTomadePedido (
    ID_TomaPedido, ID_Producto, IVA, PrecioUnitario, Cantidad, RestoIVA,
    Dto, ImporteconDto, Hoja, Rechazo, Monto, CostoUnit, Item, NroPedido
)
SELECT 
    d.ID_TomaPedido, d.ID_Producto, d.IVA, d.PrecioUnitario, d.Cantidad, d.RestoIVA,
    d.Dto, d.ImporteconDto, d.Hoja, d.Rechazo, d.Monto, d.CostoUnit, d.Item, d.NroPedido
FROM TesisProduccion.dbo.DetalleTomadePedido d
INNER JOIN OMMISYS.dbo.TomadePedido tp ON d.ID_TomaPedido = tp.ID_TomaPedido
INNER JOIN OMMISYS.dbo.Productos p ON d.ID_Producto = p.ID_Producto;
PRINT 'Detalles de pedidos insertados: ' + CAST(@@ROWCOUNT AS VARCHAR);
GO

PRINT 'Migración completada exitosamente';
