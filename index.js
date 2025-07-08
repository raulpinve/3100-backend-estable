const PORT = process.env.PORT || 3000;
const express = require('express');
const app = express();
require('@dotenvx/dotenvx').config();
const cors = require("cors");
const path = require("path");

app.use(express.json());
app.use(cors());
app.get('/', (req, res) => {
    res.send('Hola mundo desde 3100!');
});

app.use(express.static(path.join(__dirname, 'public')));
const { validarToken } = require("./controllers/loginController");
const handleErrorResponse = require('./errors/handleErrorResponse');

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

app.use("/items-evaluacion", validarToken, itemsEvaluacionRoutes);
app.use("/resultados-items", validarToken, resultadosItemsRoutes);
app.use("/auditorias", validarToken, auditoriasRoutes);
app.use("/usuario-privilegios", validarToken, usuarioEmpresaRoutes);
app.use("/criterios", validarToken, criterioRoutes);
app.use("/empresas", validarToken, empresaRoutes);
app.use("/grupos", validarToken, gruposRoutes);
app.use("/perfiles", validarToken, perfilRoutes);
app.use("/usuarios", validarToken, usuarioRoutes);
app.use("/firmas", validarToken, firmaRoutes);
app.use("/images", imageRoutes);
app.use(loginRoutes);
app.use(handleErrorResponse);

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
