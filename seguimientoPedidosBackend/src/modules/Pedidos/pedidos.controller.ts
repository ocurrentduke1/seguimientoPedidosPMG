  import { Request, Response } from "express";
  import * as pedidosService from "./pedidos.service";

  // Metodo para obtener un pedido específico por su ID (pedido)
  export const getPedidos = async (req: Request, res: Response) => {
    try {
      const { pedido, usuario, rol } = req.query;

      if (!pedido) {
        return res.status(400).json({ error: "pedido es requerido" });
      }

      const pedidos = await pedidosService.getPedido(pedido as string);

      if (!pedidos) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // 👇 Validación de usuario si se proporcionó
    if (usuario && Number(rol) !== 1) {
      const etapasActivas = pedidos.ETAPA.split(".").map((e: string) => e.trim());

      // Etapas que tienen dueño: 2, 3 o 6
      const etapasConDueno = ["2", "3", "6"].filter(e => etapasActivas.includes(e));

      for (const etapa of etapasConDueno) {
        const dueno = await pedidosService.getPermiso(pedido as string, etapa);

        if (dueno && (usuario as string).trim() !== dueno.USUARIO) {
          return res.status(403).json({
            error: `El pedido está siendo trabajado por ${dueno.USUARIO}. Solo ese usuario o un supervisor pueden continuar.`
          });
        }
      }
    }

      const pedidoInfo = await obtenerDescEtapa(pedidos.ETAPA);

      const response = {
        ...pedidos,
        descripcionEtapa: pedidoInfo?.descripciones || null
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Error obteniendo el pedido" });
    }
  };

  // Metodo para actualizar la etapa de un pedido específico
  export const updatePedido = async (req: Request, res: Response) => {
    try {
      const { pedido } = req.params;
      const { etapa, usuario, rol } = req.body;

      if (!pedido || !etapa || !usuario) {
        return res
          .status(400)
          .json({ error: "Pedido, etapa y usuario son requeridos" });
      }

      const hora = obtenerHora();
      const fecha = obtenerFecha();

      const pedidoActual = await pedidosService.getPedido(pedido as string);
      const siguienteEtapa = await pedidosService.getEtapas(etapa);

      const mensaje = obtenerAdicionales(
        siguienteEtapa.ADICIONALES,
        siguienteEtapa.DESCRIP,
      );


      if (!pedidoActual) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // Convertir etapas actuales a array
      let etapasActivas = pedidoActual.ETAPA
        ? pedidoActual.ETAPA.split(".").map((e: string) => e.trim())
        : [];

      // 🔹 Si solo está en etapa 1, únicamente puede avanzar a 2 o 3
      const soloEtapa1 =
        etapasActivas.length === 1 && etapasActivas.includes("1");

      if (soloEtapa1 && etapa !== "2" && etapa !== "3") {
        return res.status(400).json({
          error: "Desde la etapa 1 solo se puede avanzar a 2 (MC) o 3 (AE)",
        });
      }

      // Validar transición
      if (!validarTransicion(etapa, etapasActivas)) {
        return res.status(400).json({ error: "Transición no permitida" });
      }

      // 🔹 Si viene 2 o 3, eliminar etapa 1 automáticamente
      if (etapa === "2" || etapa === "3") {
        etapasActivas = etapasActivas.filter((e: string) => e !== "1");
      }

      // 🔹 Regla especial etapa 5:
      // Si llega 5 y existe 3 → reemplazar 3 por 5
      if (etapa === "5") {
        const tiene3 = etapasActivas.includes("3");

        if (tiene3) {
          const usuarioDueno = await pedidosService.getPermiso(
            pedido as string,
            "3",
          );

          if (usuario.trim() !== usuarioDueno.USUARIO && Number(rol) !== 1) {
            return res.status(403).json({
              error:
                "No tienes permiso para avanzar a etapa 5, solo el usuario que inició etapa 3 o un supervisor pueden hacerlo",
            });
          }

          etapasActivas = etapasActivas
            .filter((e: string) => e !== "3") // quitar 3
            .concat("5"); // agregar 5
        } else {
          // si no tiene 3, funciona como toggle normal
          return res.status(400).json({
            error: "No se puede avanzar a etapa 5 sin haber pasado por etapa 3",
          });
        }

        etapasActivas = etapasActivas.sort(
          (a: string, b: string) => Number(a) - Number(b),
        );

        const etapaString = etapasActivas.join(".");

        const actualizado = await pedidosService.updatePedido(
          pedido as string,
          etapaString,
          usuario,
          hora,
          fecha,
          mensaje,
          etapa,
        );

        const pedidoInfo = await obtenerDescEtapa(actualizado.ETAPA);

        const response = {...actualizado, descripcionEtapa: pedidoInfo?.descripciones || null}
        console.log(response);

        return res.json(response);
      }

      // Si llega 4 y existe 2 → reemplazar 2 por 4
      if (etapa === "4") {
        const tiene2 = etapasActivas.includes("2");

        if (tiene2) {
          const usuarioDueno = await pedidosService.getPermiso(
            pedido as string,
            "2",
          );

          if (usuario.trim() !== usuarioDueno.USUARIO && Number(rol) !== 1) {
            return res.status(403).json({
              error:
                "No tienes permiso para avanzar a etapa 4, solo el usuario que inició etapa 2 o un supervisor pueden hacerlo",
            });
          }

          etapasActivas = etapasActivas
            .filter((e: string) => e !== "2")
            .concat("4");
        } else {
          return res.status(400).json({
            error: "No se puede avanzar a etapa 4 sin haber pasado por etapa 2",
          });
        }

        etapasActivas = etapasActivas.sort(
          (a: string, b: string) => Number(a) - Number(b),
        );

        const etapaString = etapasActivas.join(".");

        const actualizado = await pedidosService.updatePedido(
          pedido as string,
          etapaString,
          usuario,
          hora,
          fecha,
          mensaje,
          etapa,
        );

        const pedidoInfo = await obtenerDescEtapa(actualizado.ETAPA);

        const response = {...actualizado, descripcionEtapa: pedidoInfo?.descripciones || null}

        return res.json(response);
      }

      // 🔹 Si llega 6 → validar reglas antes de reemplazar
      if (etapa === "6") {
        const tiene2 = etapasActivas.includes("2");
        const tiene3 = etapasActivas.includes("3");

        // 🚫 No permitir avanzar si aún está en surtido (2 o 3)
        if (tiene2 || tiene3) {
          return res.status(400).json({
            error:
              "No se puede avanzar a revisión (6) mientras existan etapas de surtido activas (2 o 3)",
          });
        }

        // ✅ Permitir si solo hay 4, 5 o 4.5
        const actualizado = await pedidosService.updatePedido(
          pedido as string,
          "6",
          usuario,
          hora,
          fecha,
          mensaje,
          etapa,
        );

        const pedidoInfo = await obtenerDescEtapa(actualizado.ETAPA);

        const response = {...actualizado, descripcionEtapa: pedidoInfo?.descripciones || null}

        return res.json(response);
      }

      // 🔹 Si llega 7 → solo puede venir desde 6
      if (etapa === "7") {
        const solo6 = etapasActivas.length === 1 && etapasActivas.includes("6");

        if (!solo6) {
          return res.status(400).json({
            error: "Solo se puede avanzar a 7 cuando el pedido está en etapa 6",
          });
        }

        const usuarioDueno = await pedidosService.getPermiso(
          pedido as string,
          "6",
        );

        if (usuario.trim() !== usuarioDueno.USUARIO && Number(rol) !== 1) {
          return res.status(403).json({
            error:
              "No tienes permiso para avanzar a etapa 7, solo el usuario que inició etapa 6 o un supervisor pueden hacerlo",
          });
        }

        const actualizado = await pedidosService.updatePedido(
          pedido as string,
          "7",
          usuario,
          hora,
          fecha,
          mensaje,
          etapa,
        );

        const pedidoInfo = await obtenerDescEtapa(actualizado.ETAPA);

        const response = {...actualizado, descripcionEtapa: pedidoInfo?.descripciones || null}

        return res.json(response);
      }

      // Toggle etapa
      const nuevasEtapas = toggleEtapa(etapasActivas, etapa);

      const etapaString = nuevasEtapas.join(".");

      const actualizado = await pedidosService.updatePedido(
        pedido as string,
        etapaString,
        usuario,
        hora,
        fecha,
        mensaje,
        etapa,
      );

      const pedidoInfo = await obtenerDescEtapa(actualizado.ETAPA);

      const response = {...actualizado, descripcionEtapa: pedidoInfo?.descripciones || null}

        return res.json(response);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error actualizando pedido" });
    }
  };

  // Función para agregar o quitar una etapa del array de etapas activas
  function toggleEtapa(etapas: string[], etapa: string) {
    if (etapas.includes(etapa)) {
      return etapas.filter((e: string) => e !== etapa);
    } else {
      return [...etapas, etapa];
    }
  }

  // Función para validar si la transición a la etapa destino es permitida según las reglas de negocio
  function validarTransicion(etapaDestino: string, etapasActivas: string[]) {
    const activa = (etapa: string) => etapasActivas.includes(etapa);

    switch (etapaDestino) {
      case "2": // MC puede coexistir con 3
        return true;

      case "3": // AE puede coexistir con 2
        return true;

      case "4":
        return activa("2") || !activa("4"); // Si tiene 2, puede agregar 4.

      case "5": // Si tiene 3, puede agregar 5.
        return activa("3") || !activa("5");

      case "6": // Revisión NO puede iniciar si 2 o 3 están activas
        if (!activa("6")) {
          return !activa("2") && !activa("3");
        }
        return true; // puede cerrarse

      case "7":
        return activa("6") || !activa("7"); // Solo puede cerrar si tiene 6.
      default:
        return false;
    }
  }

  function obtenerHora(): number {
    const now = new Date();

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const clarion = String(
      Number(ss) * 100 + 1 + Number(mm) * 60 * 100 + Number(hh) * 60 * 60 * 100,
    );

    return Number(`${clarion}`);
  }

  function obtenerFecha(): Number {
    const now = new Date();
    const fechaBase = new Date(1900, 0, 1);

    const diffTime = now.getTime() - fechaBase.getTime();

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const fechaJuliana = diffDays + 36163;

    return fechaJuliana;
  }

  function obtenerAdicionales(adicionales: string, descrip: string): string {
    if (!adicionales || adicionales.trim() === "") return "";

    return `*${adicionales}*(${descrip})`;
  }

  async function obtenerDescEtapa(etapa: string) {

    if(!etapa.includes(".")){
      const desc = await pedidosService.getDescEtapa(etapa);
      return {etapa, descripciones: desc.DESCRIP};
    }

    const etapas = etapa.split(".")

    const descripciones = [];

    for(const e of etapas){
      const desc = await pedidosService.getDescEtapa(e);
      descripciones.push(desc.DESCRIP);
    }

    return {etapa, descripciones: descripciones.join(" - ")};
  }