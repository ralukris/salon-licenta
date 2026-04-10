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

router.use("/angajati", angajatiRoutes);
router.use("/clienti", clientiRoutes);
router.use("/servicii", serviciiRoutes);
router.use("/stocuri", stocuriRoutes);
router.use("/produse", stocuriRoutes);
router.use("/programari", programariRoutes);
router.use("/indisponibilitati", indisponibilitatiRoutes);
router.use("/chitante", chitanteRoutes);
router.use("/plati", platiRoutes);

module.exports = router;