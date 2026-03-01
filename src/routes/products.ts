// Importações
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * Criar um produto
 */
router.post("/", async (req, res) => {
  try {
    const { name, barcode, price, cost } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        barcode,
        price,
        cost
      }
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar produto" });
  }
});

/**
 * Listar todos os produtos
 */
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar produtos" });
  }
});

export default router;

// Buscar produto pelo código de barras
router.get("/barcode/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;

    const product = await prisma.product.findUnique({
      where: { barcode }
    });

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar produto" });
  }
});