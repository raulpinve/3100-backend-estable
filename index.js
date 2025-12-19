const PORT = process.env.PORT || 3000;
const express = require('express');
const app = express();
require('@dotenvx/dotenvx').config();
const cors = require("cors");
const path = require("path");

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));
const handleErrorResponse = require('./errors/handleErrorResponse');
const { validarToken } = require("./controllers/loginController");
const validarSuscripcion = require("./middlewares/validarSuscripcion");

// Rutas
const itemsEvaluacionRoutes = require("./routes/itemsEvaluacionRoutes");
const resultadosItemsRoutes = require("./routes/resultadosItemsRoutes");
const usuarioEmpresaRoutes = require("./routes/usuarioEmpresaRoutes");
const auditoriasRoutes = require("./routes/auditoriasRoutes");
const criterioRoutes = require("./routes/criteriosRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const empresaRoutes = require("./routes/empresaRoutes");
const perfilRoutes = require("./routes/perfilRoutes");
const firmaRoutes = require("./routes/firmasRoutes");
const gruposRoutes = require("./routes/grupoRoutes");
const loginRoutes = require("./routes/loginRoutes");
const imageRoutes = require("./routes/imageRoutes");
const pagosRoutes = require("./routes/pagosRoutes");
const pagosController = require("./controllers/pagosController");
const validarUsuarioActivo = require('./middlewares/validarUsuarioActivo');
const suscripcionesRoutes = require("./routes/suscripcionesRoutes")

// 1. Rutas públicas
app.use("/auth", loginRoutes);
app.use("/wompi-webhook", pagosController.webhook);
app.use("/images", imageRoutes);

app.use(validarToken);
app.use("/pagos", pagosRoutes);
app.use("/perfiles", perfilRoutes);
app.use("/usuarios", usuarioRoutes);
app.use("/items-evaluacion", itemsEvaluacionRoutes);
app.use("/criterios", criterioRoutes);
app.use("/grupos", gruposRoutes);

// 2. Validar suscripciones a las demás rutas
/**
 * Activa modo SOLO LECTURA para suscripciones expiradas
 * y usuarios bloqueados
*/
app.use(validarSuscripcion); 
app.use(validarUsuarioActivo);

// 3. Rutas privadas
app.use("/resultados-items", resultadosItemsRoutes);
app.use("/auditorias", auditoriasRoutes);
app.use("/usuario-privilegios", usuarioEmpresaRoutes);
app.use("/empresas", empresaRoutes);
app.use("/firmas", firmaRoutes);
app.use("/suscripciones", suscripcionesRoutes)

// 4. Manejo de errores
app.use(handleErrorResponse);

// 5. Correr servidor
app.get('/', (req, res) => { res.send(`Hola mundo desde ${PORT}!`) });
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
