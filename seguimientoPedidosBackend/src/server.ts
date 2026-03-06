// src/server.ts
import { app } from '../src/app.ts';
import { env } from './config/env.ts';
import cors from 'cors';
import './config/db.ts';
import pedidosRoutes from './modules/Pedidos/pedidos.routes.ts';
import usuariosRoutes from './modules/usuarios/usuarios.routes.ts';


app.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
});

app.use(cors());
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/usuarios', usuariosRoutes);
  