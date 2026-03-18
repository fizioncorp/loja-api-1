import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/role";


const router = Router();


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
  requireRole("ADMIN", "GERENTE"),
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
  "/current",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const cash = await prisma.cashRegister.findFirst({
        where: {
          storeId: req.user!.storeId,
          closedAt: null
        }
      });

      if (!cash) {
        return res.status(404).json({
          error: "Nenhum caixa aberto"
        });
      }

      return res.json({
        id: cash.id,
        openedAt: cash.openedAt,
        initial: cash.initial,
        sales: cash.sales,
        expectedCash: cash.initial + cash.sales
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error: "Erro ao buscar caixa atual"
      });

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

router.post(
  "/withdraw",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { amount, reason } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor inválido" });
      }

      const cash = await prisma.cashRegister.findFirst({
        where: {
          storeId: req.user!.storeId,
          closedAt: null
        }
      });

      if (!cash) {
        return res.status(400).json({ error: "Nenhum caixa aberto" });
      }

      const movement = await prisma.cashMovement.create({
        data: {
          storeId: req.user!.storeId,
          userId: req.user!.userId,
          cashId: cash.id,
          type: "WITHDRAW",
          amount,
          reason
        }
      });

      return res.json(movement);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao registrar sangria" });
    }
  }
);


router.post(
  "/deposit",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { amount, reason } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor inválido" });
      }

      const cash = await prisma.cashRegister.findFirst({
        where: {
          storeId: req.user!.storeId,
          closedAt: null
        }
      });

      if (!cash) {
        return res.status(400).json({ error: "Nenhum caixa aberto" });
      }

      const movement = await prisma.cashMovement.create({
        data: {
          storeId: req.user!.storeId,
          userId: req.user!.userId,
          cashId: cash.id,
          type: "DEPOSIT",
          amount,
          reason
        }
      });

      return res.json(movement);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao registrar suprimento" });
    }
  }
);

router.get(
  "/report",
  authMiddleware,
  async (req: AuthRequest, res) => {

    try {

      const cash = await prisma.cashRegister.findFirst({
        where: {
          storeId: req.user!.storeId,
          closedAt: null
        }
      });

      if (!cash) {
        return res.status(404).json({
          error: "Nenhum caixa aberto"
        });
      }

      const movements = await prisma.cashMovement.findMany({
        where: {
          cashId: cash.id
        }
      });

      let deposits = 0;
      let withdraws = 0;

      for (const m of movements) {

        if (m.type === "DEPOSIT") {
          deposits += Number(m.amount);
        }

        if (m.type === "WITHDRAW") {
          withdraws += Number(m.amount);
        }

      }

      const expectedCash =
        Number(cash.initial) +
        Number(cash.sales) +
        deposits -
        withdraws;

      return res.json({
        cashId: cash.id,
        initial: cash.initial,
        sales: cash.sales,
        deposits,
        withdraws,
        expectedCash,
        openedAt: cash.openedAt
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error: "Erro ao gerar relatório de caixa"
      });

    }

  }
);

export default router;