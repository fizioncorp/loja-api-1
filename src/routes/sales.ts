import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.post(
  "/",
  authMiddleware,

  async (req: AuthRequest, res) => {
  try {
    const { items } = req.body;
    // items = [{ productId, quantity }]

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Itens obrigatórios" });
    }

    const result = await prisma.$transaction(async (tx) => {
      let total = 0;

      for (const item of items) {
        const product = await tx.product.findFirst({
            where: {
                id: item.productId,
                storeId: req.user!.storeId
  }
});

        if (!product) {
          throw new Error("Produto não encontrado");
        }

        if (product.stock < item.quantity) {
          throw new Error("Estoque insuficiente");
        }

        total += product.price * item.quantity;
      }

      const sale = await tx.sale.create({
  data: {
    total,
    storeId: req.user!.storeId
  }
});

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: product!.price
          }
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "OUT",
            quantity: item.quantity
          }
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: product!.stock - item.quantity
          }
        });
      }

      return sale;
    });

    return res.status(201).json(result);

  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Listar vendas com itens e produtos
router.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const sales = await prisma.sale.findMany({
        where: {
          storeId: req.user!.storeId
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return res.json(sales);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao listar vendas" });
    }
  }
);

// Relatório de vendas do dia
router.get("/report/today", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });

    const total = sales.reduce((acc, sale) => acc + sale.total, 0);
    const count = sales.length;
    const average = count > 0 ? total / count : 0;

    return res.json({
      total,
      count,
      average
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// Relatório por período
router.get(
  "/report",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        return res.status(400).json({ error: "start e end são obrigatórios" });
      }

      const startDate = new Date(`${start}T00:00:00.000Z`);
      const endDate = new Date(`${end}T23:59:59.999Z`);

      const sales = await prisma.sale.findMany({
        where: {
          storeId: req.user!.storeId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const total = sales.reduce((acc, sale) => acc + sale.total, 0);
      const count = sales.length;
      const average = count > 0 ? total / count : 0;

      return res.json({
        total,
        count,
        average
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao gerar relatório" });
    }
  }
);

// Relatório de lucro
router.get(
  "/report/profit",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        return res.status(400).json({ error: "start e end são obrigatórios" });
      }

      const startDate = new Date(`${start}T00:00:00.000Z`);
      const endDate = new Date(`${end}T23:59:59.999Z`);

      const sales = await prisma.sale.findMany({
        where: {
          storeId: req.user!.storeId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      let revenue = 0;
      let cost = 0;

      for (const sale of sales) {
        revenue += sale.total;

        for (const item of sale.items) {
          cost += item.product.cost * item.quantity;
        }
      }

      const profit = revenue - cost;

      return res.json({
        revenue,
        cost,
        profit
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao gerar relatório de lucro" });
    }
  }
);

// Dashboard consolidado
router.get(
  "/dashboard",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        return res.status(400).json({ error: "start e end são obrigatórios" });
      }

      const startDate = new Date(`${start}T00:00:00.000Z`);
      const endDate = new Date(`${end}T23:59:59.999Z`);

      const sales = await prisma.sale.findMany({
        where: {
          storeId: req.user!.storeId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      let revenue = 0;
      let cost = 0;

      for (const sale of sales) {
        revenue += sale.total;

        for (const item of sale.items) {
          cost += item.product.cost * item.quantity;
        }
      }

      const salesCount = sales.length;
      const profit = revenue - cost;
      const averageTicket =
        salesCount > 0 ? revenue / salesCount : 0;

      return res.json({
        revenue,
        cost,
        profit,
        salesCount,
        averageTicket
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao gerar dashboard" });
    }
  }
);

// Produtos mais vendidos (otimizado com groupBy)
router.get(
  "/report/top-products",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { start, end } = req.query;

      if (!start || !end) {
        return res.status(400).json({ error: "start e end são obrigatórios" });
      }

      const startDate = new Date(`${start}T00:00:00.000Z`);
      const endDate = new Date(`${end}T23:59:59.999Z`);

      // Agrupar por produto
      const result = await prisma.$queryRaw<
  {
    productId: string;
    name: string;
    quantitySold: number;
    revenue: number;
    profit: number;
  }[]
>`
SELECT 
  si."productId" as "productId",
  p."name" as "name",
  SUM(si."quantity") as "quantitySold",
  SUM(si."price" * si."quantity") as "revenue",
  SUM((si."price" - p."cost") * si."quantity") as "profit"
FROM "SaleItem" si
JOIN "Sale" s ON s."id" = si."saleId"
JOIN "Product" p ON p."id" = si."productId"
WHERE s."storeId" = ${req.user!.storeId}
  AND s."createdAt" BETWEEN ${startDate} AND ${endDate}
GROUP BY si."productId", p."name"
ORDER BY "quantitySold" DESC
`;

return res.json(result);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao gerar ranking otimizado" });
    }
  }
);

export default router;