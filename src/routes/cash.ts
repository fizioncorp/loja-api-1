import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.post(
  "/open",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { initial } = req.body;

      const existing = await prisma.cashRegister.findFirst({
        where: {
          storeId: req.user!.storeId,
          closedAt: null
        }
      });

      if (existing) {
        return res.status(400).json({ error: "Caixa já aberto" });
      }

      const cash = await prisma.cashRegister.create({
        data: {
          storeId: req.user!.storeId,
          initial
        }
      });

      return res.json(cash);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao abrir caixa" });
    }
  }
);

router.post(
  "/close",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      // Buscar caixa aberto da loja
      const cash = await prisma.cashRegister.findFirst({
        where: {
          storeId: req.user!.storeId,
          closedAt: null
        }
      });

      // Se não existir caixa aberto
      if (!cash) {
        return res.status(400).json({ error: "Nenhum caixa aberto" });
      }

      // Atualizar fechando o caixa
      const closedCash = await prisma.cashRegister.update({
        where: {
          id: cash.id
        },
        data: {
          closedAt: new Date()
        }
      });

      // Calcular total esperado no caixa
      const expectedCash = closedCash.initial + closedCash.sales;

      return res.json({
        initial: closedCash.initial,
        sales: closedCash.sales,
        expectedCash,
        openedAt: closedCash.openedAt,
        closedAt: closedCash.closedAt
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao fechar caixa" });
    }
  }
);

router.get(
  "/history",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const cashRegisters = await prisma.cashRegister.findMany({
        where: {
          storeId: req.user!.storeId,
          closedAt: {
            not: null
          }
        },
        orderBy: {
          openedAt: "desc"
        }
      });

      const result = cashRegisters.map(cash => ({
        id: cash.id,
        openedAt: cash.openedAt,
        closedAt: cash.closedAt,
        initial: cash.initial,
        sales: cash.sales,
        expectedCash: cash.initial + cash.sales
      }));

      return res.json(result);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar histórico de caixa" });
    }
  }
);

export default router;