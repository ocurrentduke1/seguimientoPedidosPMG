import { Request, Response } from "express";
import * as userService from "./usuarios.service";

export const getEmpleadoByCodigo = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.query;

    if (!codigo || typeof codigo !== "string") {
      return res.status(400).json({
        error: "El código del empleado es requerido"
      });
    }

    const empleado = await userService.getEmpleadoByCodigo(codigo);

    if (!empleado) {
      return res.status(404).json({
        error: "Empleado no encontrado"
      });
    }

    res.json(empleado);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error obteniendo empleado"
    });
  }
};
