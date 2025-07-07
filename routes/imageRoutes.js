const router = require('express').Router();
const imagesController = require("../controllers/imagesController");

// Obtener avatar thumbnail
router.get("/usuarios/:usuarioId/avatar/thumbnail", 
    imagesController.obtenerAvatarUsuarioThumbnail
);

// Obtener avatar
router.get("/usuarios/:usuarioId/avatar", 
    imagesController.obtenerAvatarUsuario
);

// Obtener avatar
router.get("/firmas/:archivo", 
    imagesController.obtenerFirmaUsuario
);


module.exports = router