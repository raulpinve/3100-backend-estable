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
const bloquearEdicionSiLectura = require("./middlewares/bloquearEdicionSiLectura");

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

// 1. Rutas públicas
app.use("/auth", loginRoutes);
app.use("/wompi-webhook", pagosController.webhook);

app.use(validarToken);
app.use("/pagos", pagosRoutes);
app.use("/perfiles", perfilRoutes);

// 3. Validar suscripciones a las demás rutas
app.use(validarSuscripcion);
app.use(bloquearEdicionSiLectura);

// 3. Rutas privadas
app.use("/items-evaluacion", itemsEvaluacionRoutes);
app.use("/resultados-items", resultadosItemsRoutes);
app.use("/auditorias", auditoriasRoutes);
app.use("/usuario-privilegios", usuarioEmpresaRoutes);
app.use("/criterios", criterioRoutes);
app.use("/empresas", empresaRoutes);
app.use("/grupos", gruposRoutes);
app.use("/usuarios", usuarioRoutes);
app.use("/firmas", firmaRoutes);
app.use("/images", imageRoutes);

// 4. Manejo de errores
app.use(handleErrorResponse);

app.get('/', (req, res) => { res.send(`Hola mundo desde ${PORT}!`) });

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
