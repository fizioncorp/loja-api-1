import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = "supersecret"; // depois vamos mover para .env

// Registro (cria loja + usuário admin)
router.post("/register", async (req, res) => {
  try {
    const { storeName, name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: { name: storeName }
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          storeId: store.id
        }
      });

      return { store, user };
    });

    return res.status(201).json(result);

  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "Erro ao registrar" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
  where: { email }
});

// força TS reconhecer role (caso cache)
const role = (user as any).role;

    if (!user) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Senha inválida" });
    }

    const token = jwt.sign(
  {
    userId: user.id,
    storeId: user.storeId,
    role: user.role
  },
  JWT_SECRET,
  { expiresIn: "1d" }
);

    return res.json({ token });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro no login" });
  }
});

export default router;