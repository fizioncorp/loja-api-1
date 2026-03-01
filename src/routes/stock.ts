import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Registrar entrada ou saída
router.post("/", async (req, res) => {
  try {
    const { productId, type, quantity } = req.body;

    if (quantity <= 0) {
      return res.status(400).json({ error: "Quantidade inválida" });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    // Atualiza estoque baseado no tipo
    const newStock =
      type === "IN"
        ? product.stock + quantity
        : product.stock - quantity;

    if (newStock < 0) {
      return res.status(400).json({ error: "Estoque insuficiente" });
    }

    // Transação para manter consistência
    const result = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId,
          type,
          quantity
        }
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock }
      })
    ]);

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro na movimentação" });
  }
});

router.get("/", async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    include: { product: true },
    orderBy: { createdAt: "asc" }
  });

  return res.json(movements);
});

export default router;