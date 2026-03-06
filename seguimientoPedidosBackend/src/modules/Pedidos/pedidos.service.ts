import { connectDB, sql } from "../../config/db";

export const getPedido = async (pedido: string) => {
  const pool = await connectDB();

  const result = await pool.request().input("pedido", sql.VarChar, pedido)
    .query(`SELECT r.PEDIDO, TRIM(r.ETAPA) as ETAPA, TRIM(e.DESCRIP) as DESCRIP, TRIM(e.ADICIONALES) as ADICIONALES
        FROM REG00506 r
        LEFT JOIN REG00043 e ON r.ETAPA = e.ETAPA
        WHERE r.PEDIDO = @pedido`);
  console.log(result.recordset);
  return result.recordset[0];
};

export const getEtapas = async (etapa: string) => {
  const pool = await connectDB();

  const result = await pool.request().input("etapa", sql.VarChar, etapa)
    .query(`SELECT ETAPA, TRIM(DESCRIP) as DESCRIP, TRIM(ADICIONALES) AS ADICIONALES FROM REG00043 WHERE ETAPA = @etapa`);
  return result.recordset[0];
}

export const getPermiso = async (pedido: string, etapa: string) =>{
  const pool = await connectDB();

  const result = await pool.request()
  .input("pedido", sql.VarChar, pedido)
  .input("etapa", sql.VarChar, etapa)
  .query(`SELECT TOP 1 TRIM(USUARIO) AS USUARIO
    FROM REG00506_INCIDEN
    WHERE PEDIDO = @pedido `);

  return result.recordset[0];
}

export const getDescEtapa = async (etapa: string) => {
  const pool = await connectDB();

  const result = await pool.request()
  .input("etapa", sql.VarChar, etapa)
  .query(`SELECT TOP 1 TRIM(DESCRIP) AS DESCRIP
    FROM REG00043
    WHERE ETAPA = @etapa `);

  return result.recordset[0];
}

export const updatePedido = async (
  pedido: string,
  etapas: string,
  usuario: string,
  hora: number,
  fecha: Number,
  mensaje: string,
  etapaHist: string
) => {
  const pool = await connectDB();

  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request = new sql.Request(transaction);

    const consecutivoResult = await request.query(`
      SELECT ISNULL(MAX(NUMERO), 0) AS ULTIMO
      FROM REG00506_INCIDEN WITH (UPDLOCK, HOLDLOCK)
    `);

    const nuevoConsecutivo = consecutivoResult.recordset[0].ULTIMO + 1;

    const result = await pool
      .request()
      .input("pedido", sql.VarChar, pedido)
      .input("etapas", sql.VarChar, etapas).query(`UPDATE REG00506
        SET ETAPA = @etapas 
        WHERE PEDIDO = @pedido
        
        SELECT r.PEDIDO, TRIM(r.ETAPA) as ETAPA, TRIM(e.DESCRIP) as DESCRIP, TRIM(e.ADICIONALES) as ADICIONALES
        FROM REG00506 r
        LEFT JOIN REG00043 e ON r.ETAPA = e.ETAPA
        WHERE r.PEDIDO = @pedido`);

    await request
      .input("numero", sql.Int, nuevoConsecutivo)
      .input("pedido", sql.VarChar, pedido)
      .input("usuario", sql.VarChar, usuario)
      .input("hora", sql.Int, hora)
      .input("fecha", sql.Int, fecha)
      .input("adicionales", sql.VarChar, mensaje)
      .input("etapa", sql.VarChar, etapaHist)
      .query(`
        INSERT INTO REG00506_INCIDEN
        (NUMERO, PEDIDO, INCIDENCIA, ETAPA, FECHA, HORA, USUARIO, ADICIONALES)
        VALUES
        (@numero, @pedido, 0 , @etapa, @fecha, @hora, @usuario, @adicionales)
      `);

    await transaction.commit();

    return result.recordset[0];
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
