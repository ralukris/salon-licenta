require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const publicRoutes = require("./routes/public.routes");
const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/auth.routes");
const clientRoutes = require("./routes/client.routes");
const managerRoutes = require("./routes/manager.routes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://salon-licenta.vercel.app"
    ],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// 🔹 Montare rute
app.use(publicRoutes);
app.use(authRoutes);
app.use(clientRoutes);
app.use(adminRoutes);
app.use(managerRoutes);

// 🔹 Test API
app.get("/", (req, res) => {
  res.json({ message: "API Salon funcționează" });
});

// 🔹 Test conexiune DB
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "OK", db: "connected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "ERROR", db: "not connected" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});