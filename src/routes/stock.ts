import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Registrar entrada ou saída
router.post(
  "/",
  authMiddleware,
  async (req: AuthRequest, res) => {
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

      const newStock =
        type === "IN"
          ? product.stock + quantity
          : product.stock - quantity;

      if (newStock < 0) {
        return res.status(400).json({ error: "Estoque insuficiente" });
      }

      const result = await prisma.$transaction([
        prisma.stockMovement.create({
          data: {
            productId,
            storeId: req.user!.storeId,
            userId: req.user!.userId,
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

      return res.status(500).json({
        error: "Erro na movimentação"
      });
    }
  }
);

router.get("/", async (req, res) => {
  const movements = await prisma.stockMovement.findMany({
    include: { product: true },
    orderBy: { createdAt: "asc" }
  });

  return res.json(movements);
});

export default router;