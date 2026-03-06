import { Router } from "express";
import * as pedidosController from "./pedidos.controller";

const router = Router();

router.get('/', pedidosController.getPedidos);
router.patch('/:pedido', pedidosController.updatePedido);

export default router;