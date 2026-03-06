import { connectDB, sql } from "../../config/db";

export const getEmpleadoByCodigo = async (codigo: string) => {
  const pool = await connectDB();

  const result = await pool.request()
    .input("codigo", sql.VarChar, codigo)
    .query(`
      SELECT TECNICO, TRIM(NOMBRE) as NOMBRE, TRIM(OBSERVACIONES) as ROL
      FROM REG00036
      WHERE TECNICO = @codigo
    `);

  return result.recordset[0]; // retorna undefined si no existe
};
