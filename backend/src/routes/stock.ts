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

      const result = await prisma.$transaction(async (tx) => {

        if (type === "IN") {

          await tx.product.update({
            where: { id: productId },
            data: {
              stock: {
                increment: quantity
              }
            }
          });

        } else {

          const updated = await tx.product.updateMany({
            where: {
              id: productId,
              stock: {
                gte: quantity
              }
            },
            data: {
              stock: {
                decrement: quantity
              }
            }
          });

          if (updated.count === 0) {
            throw new Error("Estoque insuficiente");
          }

        }

        const movement = await tx.stockMovement.create({
          data: {
            productId,
            storeId: req.user!.storeId,
            userId: req.user!.userId,
            type,
            quantity
          }
        });

        return movement;

      });

      return res.json(result);

    } catch (error: any) {

      console.error(error);

      return res.status(500).json({
        error: error.message || "Erro na movimentação"
      });

    }

  }
);

// Listar movimentações
router.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res) => {

    const movements = await prisma.stockMovement.findMany({
      where: {
        storeId: req.user!.storeId
      },
      include: {
        product: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return res.json(movements);

  }
);

export default router;