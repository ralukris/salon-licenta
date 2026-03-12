const express = require("express");
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const router = express.Router();

// ======================
// ADMIN LOGIN
// ======================
router.post("/auth/admin/login", async (req, res) => {
  const { email, parola } = req.body;

  if (!email || !parola) {
    return res.status(400).json({ error: "Lipsesc email/parola" });
  }

  const emailCurat = String(email).trim().toLowerCase();

  try {
    const result = await db.query(
      `
      SELECT id_administrator, id_locatie, rol, parola_hash, email, activ
      FROM administratori
      WHERE LOWER(email) = $1
      `,
      [emailCurat]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Date invalide" });
    }

    const admin = result.rows[0];

    if (!admin.activ) {
      return res.status(403).json({ error: "Cont administrator dezactivat" });
    }

    let ok = false;

    if (parola === admin.parola_hash) {
      ok = true;
    } else {
      try {
        ok = await bcrypt.compare(parola, admin.parola_hash);
      } catch {
        ok = false;
      }
    }

    if (!ok) {
      return res.status(401).json({ error: "Date invalide" });
    }

    const token = jwt.sign(
      {
        tip: "ADMIN",
        id_administrator: admin.id_administrator,
        id_locatie: admin.id_locatie,
        rol: admin.rol,
        email: admin.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        tip: "ADMIN",
        id_administrator: admin.id_administrator,
        id_locatie: admin.id_locatie,
        rol: admin.rol,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la autentificare" });
  }
});

// ======================
// CLIENT LOGIN
// ======================
router.post("/auth/client/login", async (req, res) => {
  const { identificator, parola } = req.body;

  if (!identificator || !parola) {
    return res.status(400).json({ error: "Lipsesc identificator/parola" });
  }

  const ident = String(identificator).trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const eEmail = emailRegex.test(ident);
  const identCurat = eEmail ? ident.toLowerCase() : ident;

  try {
    const result = await db.query(
      `
      SELECT id_cont, parola_hash, activ, email, telefon
      FROM conturi
      WHERE ${eEmail ? "LOWER(email)" : "telefon"} = $1
      `,
      [identCurat]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Date invalide" });
    }

    const cont = result.rows[0];

    if (!cont.activ) {
      return res.status(403).json({ error: "Cont dezactivat" });
    }

    const ok = await bcrypt.compare(parola, cont.parola_hash);
    if (!ok) {
      return res.status(401).json({ error: "Date invalide" });
    }

    const token = jwt.sign(
      {
        tip: "CLIENT",
        id_cont: cont.id_cont,
        email: cont.email,
        telefon: cont.telefon,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      user: {
        tip: "CLIENT",
        id_cont: cont.id_cont,
        email: cont.email,
        telefon: cont.telefon,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Eroare la autentificare" });
  }
});

// ======================
// CLIENT REGISTER
// ======================
router.post("/auth/client/register", async (req, res) => {
  const { telefon, email, parola, nume, prenume, data_nasterii } = req.body;

  if (!telefon || !email || !parola || !nume || !prenume || !data_nasterii) {
    return res.status(400).json({
      error:
        "Lipsesc campuri: telefon, email, parola, nume, prenume, data_nasterii",
    });
  }

  const telefonCurat = String(telefon).trim();
  const emailCurat = String(email).trim().toLowerCase();
  const numeCurat = String(nume).trim();
  const prenumeCurat = String(prenume).trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailCurat)) {
    return res.status(400).json({ error: "Email invalid" });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const emailExists = await client.query(
      `
      SELECT id_cont
      FROM conturi
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [emailCurat]
    );

    if (emailExists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Exista deja un cont cu acest email",
      });
    }

    const telExists = await client.query(
      `
      SELECT id_cont
      FROM conturi
      WHERE telefon = $1
      LIMIT 1
      `,
      [telefonCurat]
    );

    if (telExists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Exista deja un cont cu acest telefon",
      });
    }

    const parolaHash = await bcrypt.hash(parola, 10);

    const contRes = await client.query(
      `
      INSERT INTO conturi (telefon, email, parola_hash)
      VALUES ($1, $2, $3)
      RETURNING id_cont, email, telefon
      `,
      [telefonCurat, emailCurat, parolaHash]
    );

    const contNou = contRes.rows[0];
    const id_cont = contNou.id_cont;

    const clientExistentRes = await client.query(
      `
      SELECT id_client, id_cont, nume, prenume, data_nasterii, telefon
      FROM clienti
      WHERE telefon = $1
      ORDER BY id_client ASC
      LIMIT 1
      `,
      [telefonCurat]
    );

    let id_client;

    if (clientExistentRes.rows.length > 0) {
      const clientExistent = clientExistentRes.rows[0];

      if (clientExistent.id_cont) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Exista deja un client asociat unui cont pentru acest telefon",
        });
      }

      const updateRes = await client.query(
        `
        UPDATE clienti
        SET id_cont = $1,
            nume = $2,
            prenume = $3,
            data_nasterii = $4,
            telefon = $5
        WHERE id_client = $6
        RETURNING id_client
        `,
        [
          id_cont,
          numeCurat,
          prenumeCurat,
          data_nasterii,
          telefonCurat,
          clientExistent.id_client,
        ]
      );

      id_client = updateRes.rows[0].id_client;
    } else {
      const profilRes = await client.query(
        `
        INSERT INTO clienti (id_cont, nume, prenume, data_nasterii, telefon)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id_client
        `,
        [id_cont, numeCurat, prenumeCurat, data_nasterii, telefonCurat]
      );

      id_client = profilRes.rows[0].id_client;
    }

    await client.query("COMMIT");

    const token = jwt.sign(
      {
        tip: "CLIENT",
        id_cont,
        email: contNou.email,
        telefon: contNou.telefon,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(201).json({
      message: "Cont creat",
      id_client,
      token,
      user: {
        tip: "CLIENT",
        id_cont,
        email: contNou.email,
        telefon: contNou.telefon,
      },
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({
        error: "Email sau telefon deja folosit",
      });
    }

    return res.status(500).json({ error: "Eroare la creare cont" });
  } finally {
    client.release();
  }
});

// ======================
// FORGOT PASSWORD
// ======================
router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email lipsa" });
  }

  const emailCurat = String(email).trim().toLowerCase();

  try {
    const result = await db.query(
      `
      SELECT id_cont, email, activ
      FROM conturi
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [emailCurat]
    );

    if (result.rows.length === 0) {
      return res.json({
        message: "Dacă emailul există în sistem, vei primi instrucțiuni de resetare.",
      });
    }

    const cont = result.rows[0];

    if (!cont.activ) {
      return res.json({
        message: "Dacă emailul există în sistem, vei primi instrucțiuni de resetare.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpire = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      `
      UPDATE conturi
      SET reset_token = $1,
          reset_token_expire = $2
      WHERE id_cont = $3
      `,
      [resetToken, resetExpire, cont.id_cont]
    );

    const resetLink = `https://salon-licenta.vercel.app/reset-password/${resetToken}`;

    console.log("======================================");
    console.log("LINK RESETARE PAROLA:");
    console.log(resetLink);
    console.log("======================================");

    return res.json({
      message: "Dacă emailul există în sistem, vei primi instrucțiuni de resetare.",
      resetLink,
    });
  } catch (err) {
    console.error("Eroare forgot-password:", err);
    return res.status(500).json({ error: "Eroare server" });
  }
});

// ======================
// RESET PASSWORD
// ======================
router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Lipsesc token sau parola noua" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      error: "Parola trebuie sa aiba minim 6 caractere",
    });
  }

  try {
    const result = await db.query(
      `
      SELECT id_cont
      FROM conturi
      WHERE reset_token = $1
        AND reset_token_expire IS NOT NULL
        AND reset_token_expire > NOW()
      LIMIT 1
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "Token invalid sau expirat",
      });
    }

    const cont = result.rows[0];
    const parolaHashNoua = await bcrypt.hash(password, 10);

    await db.query(
      `
      UPDATE conturi
      SET parola_hash = $1,
          reset_token = NULL,
          reset_token_expire = NULL
      WHERE id_cont = $2
      `,
      [parolaHashNoua, cont.id_cont]
    );

    return res.json({
      message: "Parola a fost resetata cu succes",
    });
  } catch (err) {
    console.error("Eroare reset-password:", err);
    return res.status(500).json({ error: "Eroare server" });
  }
});

module.exports = router;