import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { createSaleSchema } from "../validators/sale.validator";

const router = Router();
const prisma = new PrismaClient();

/*
========================================
CRIAR VENDA
========================================
*/
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const storeId = req.user!.storeId;

    const data = createSaleSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {

      let total = 0;

      // validar produtos e calcular total
      for (const item of data.items) {

        const product = await tx.product.findFirst({
          where: {
            id: item.productId,
            storeId
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

      // validar pagamentos
      // calcular total dos pagamentos
let paymentsTotal = 0;
let hasCash = false;

for (const p of data.payments) {
  paymentsTotal += p.amount;
  if (p.method === "CASH") hasCash = true;
}

if (paymentsTotal < total) {
  throw new Error("Valor pago é menor que o total da venda");
}

const change = paymentsTotal - total;

if (change > 0 && !hasCash) {
  throw new Error("Troco só é permitido quando há pagamento em dinheiro");
}

      // criar venda
      const sale = await tx.sale.create({
        data: {
          total,
          storeId
        }
      });

      // atualizar caixa aberto
      const cash = await tx.cashRegister.findFirst({
        where: {
          storeId,
          closedAt: null
        }
      });

      if (cash) {
        await tx.cashRegister.update({
          where: { id: cash.id },
          data: {
            sales: {
              increment: total
            }
          }
        });
      }

      // criar itens da venda
      for (const item of data.items) {

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

        // registrar movimento estoque
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            storeId,
            userId: req.user!.userId,
            type: "OUT",
            quantity: item.quantity
          }
        });

        // reduzir estoque
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });

      }

      // registrar pagamentos
      if (data.payments && data.payments.length > 0) {
  for (const payment of data.payments) {

    await tx.payment.create({
      data: {
        saleId: sale.id,
        method: payment.method,
        amount: payment.amount
      }
    });

  }
}

      return sale;

    });

    return res.status(201).json(result);

  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});


/*
========================================
LISTAR VENDAS
========================================
*/
router.get("/", authMiddleware, async (req: AuthRequest, res) => {

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
        },
        payments: true
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

});


/*
========================================
RELATÓRIO DO DIA
========================================
*/
router.get("/report/today", authMiddleware, async (req: AuthRequest, res) => {

  try {

    const start = new Date();
    start.setHours(0,0,0,0);

    const end = new Date();
    end.setHours(23,59,59,999);

    const sales = await prisma.sale.findMany({
      where:{
        storeId: req.user!.storeId,
        createdAt:{
          gte:start,
          lte:end
        }
      }
    });

    const total = sales.reduce((acc,s)=>acc + s.total,0);
    const count = sales.length;
    const average = count > 0 ? total / count : 0;

    return res.json({
      total,
      count,
      average
    });

  } catch (error) {

    console.error(error);
    return res.status(500).json({ error: "Erro relatório" });

  }

});


/*
========================================
RELATÓRIO POR PERÍODO
========================================
*/
router.get("/report", authMiddleware, async (req: AuthRequest, res) => {

  try {

    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error:"start e end obrigatórios"});
    }

    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);

    const sales = await prisma.sale.findMany({
      where:{
        storeId:req.user!.storeId,
        createdAt:{
          gte:startDate,
          lte:endDate
        }
      }
    });

    const total = sales.reduce((acc,s)=>acc + s.total,0);
    const count = sales.length;
    const average = count > 0 ? total / count : 0;

    return res.json({
      total,
      count,
      average
    });

  } catch (error) {

    console.error(error);
    return res.status(500).json({ error:"Erro relatório"});

  }

});


/*
========================================
CANCELAR VENDA
========================================
*/
router.post("/:id/cancel", authMiddleware, async (req:AuthRequest,res)=>{

  try{

    const saleId = String(req.params.id);

    const result = await prisma.$transaction(async(tx)=>{

      const sale = await tx.sale.findFirst({
        where:{
          id:saleId,
          storeId:req.user!.storeId
        },
        include:{
          items:true
        }
      });

      if(!sale){
        throw new Error("Venda não encontrada");
      }

      if(sale.status === "CANCELLED"){
        throw new Error("Venda já cancelada");
      }

      // devolver estoque
      for(const item of sale.items){

        await tx.product.update({
          where:{id:item.productId},
          data:{
            stock:{
              increment:item.quantity
            }
          }
        });

        await tx.stockMovement.create({
          data:{
            productId:item.productId,
            storeId:req.user!.storeId,
            userId:req.user!.userId,
            type:"IN",
            quantity:item.quantity
          }
        });

      }

      // atualizar caixa
      const cash = await tx.cashRegister.findFirst({
        where:{
          storeId:req.user!.storeId,
          closedAt:null
        }
      });

      if(cash){

        await tx.cashRegister.update({
          where:{id:cash.id},
          data:{
            sales:{
              decrement:sale.total
            }
          }
        });

      }

      return await tx.sale.update({
        where:{id:sale.id},
        data:{
          status:"CANCELLED"
        }
      });

    });

    return res.json(result);

  }catch(error:any){

    return res.status(400).json({
      error:error.message
    });

  }

});

router.get(
  "/report/payments",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const { start, end } = req.query;

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (start && end) {
        startDate = new Date(`${start}T00:00:00.000Z`);
        endDate = new Date(`${end}T23:59:59.999Z`);
      }

      const payments = await prisma.payment.groupBy({
        by: ["method"],
        where: {
          sale: {
            storeId: req.user!.storeId,
            createdAt: startDate && endDate ? {
              gte: startDate,
              lte: endDate
            } : undefined
          }
        },
        _sum: {
          amount: true
        }
      });

      const result: Record<string, number> = {};

      for (const p of payments) {
        result[p.method] = Number(p._sum.amount || 0);
      }

      return res.json(result);

    } catch (error) {

      console.error(error);
      return res.status(500).json({
        error: "Erro ao gerar relatório de pagamentos"
      });

    }
  }
);

router.get(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const saleId = String(req.params.id);

      const sale = await prisma.sale.findFirst({
        where: {
          id: saleId,
          storeId: req.user!.storeId
        },
        include: {

          items: {
            include: {
              product: true
            }
          },

          payments: true

        }
      });

      if (!sale) {
        return res.status(404).json({
          error: "Venda não encontrada"
        });
      }

      return res.json(sale);

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error: "Erro ao buscar venda"
      });

    }
  }
);

export default router;