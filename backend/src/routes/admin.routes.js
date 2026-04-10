const express = require("express");
const { requireAdmin } = require("../middleware/auth.middleware");

const angajatiRoutes = require("./admin/angajati.routes");
const clientiRoutes = require("./admin/clienti.routes");
const serviciiRoutes = require("./admin/servicii.routes");
const stocuriRoutes = require("./admin/stocuri.routes");
const programariRoutes = require("./admin/programari.routes");
const indisponibilitatiRoutes = require("./admin/indisponibilitati.routes");
const chitanteRoutes = require("./admin/chitante.routes");
const platiRoutes = require("./admin/plati.routes");

const router = express.Router();

router.use(requireAdmin);

router.use("/admin/angajati", angajatiRoutes);
router.use("/admin/clienti", clientiRoutes);
router.use("/admin/servicii", serviciiRoutes);
router.use("/admin/stocuri", stocuriRoutes);
router.use("/admin/produse", stocuriRoutes);
router.use("/admin/programari", programariRoutes);
router.use("/admin/indisponibilitati", indisponibilitatiRoutes);
router.use("/admin/angajati", indisponibilitatiRoutes);
router.use("/admin/chitante", chitanteRoutes);
router.use("/admin/plati", platiRoutes);

module.exports = router;