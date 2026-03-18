import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { createProductSchema } from "../validators/product.validator";

const router = Router();

/**
 * Criar produto
 */
router.post(
  "/",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const parsed = createProductSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues
        });
      }

      const { name, barcode, price, cost } = parsed.data;

      const product = await prisma.product.create({
        data: {
          name,
          barcode,
          price,
          cost,
          storeId: req.user!.storeId
        }
      });

      return res.status(201).json(product);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao criar produto" });
    }
  }
);

/**
 * Listar produtos (COM PAGINAÇÃO)
 */
router.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const skip = (page - 1) * limit;

      const products = await prisma.product.findMany({
        where: {
  storeId: req.user!.storeId,
  active: true
},
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc"
        }
      });

      const total = await prisma.product.count({
        where: {
          storeId: req.user!.storeId
        }
      });

      return res.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: products
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao listar produtos" });
    }
  }
);

// Buscar produtos por nome
router.get(
  "/search",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const name = String(req.query.name || "");

      const products = await prisma.product.findMany({
        where: {
          storeId: req.user!.storeId,
          name: {
            contains: name,
            mode: "insensitive"
          }
        },
        take: 10
      });

      return res.json(products);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Erro ao buscar produtos"
      });
    }
  }
);

/**
 * Buscar produto por código de barras
 */
router.get(
  "/barcode/:barcode",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const barcode = String(req.params.barcode);

      const product = await prisma.product.findFirst({
        where: {
          barcode,
          storeId: req.user!.storeId
        }
      });

      if (!product) {
        return res.status(404).json({
          error: "Produto não encontrado"
        });
      }

      return res.json(product);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Erro ao buscar produto"
      });
    }
  }
);

// Atualizar produto
router.put(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const productId = String(req.params.id);

      const parsed = createProductSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues
        });
      }

      const { name, barcode, price, cost } = parsed.data;

      const result = await prisma.product.updateMany({
        where: {
          id: productId,
          storeId: req.user!.storeId
        },
        data: {
          name,
          barcode,
          price,
          cost
        }
      });

      // nenhum produto atualizado
      if (result.count === 0) {
        return res.status(404).json({
          error: "Produto não encontrado"
        });
      }

      // buscar produto atualizado
      const product = await prisma.product.findUnique({
        where: {
          id: productId
        }
      });

      return res.json(product);

    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao atualizar produto"
      });
    }
  }
);


router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const productId = String(req.params.id);

      // garantir que o produto pertence à loja
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          storeId: req.user!.storeId
        }
      });

      if (!product) {
        return res.status(404).json({
          error: "Produto não encontrado"
        });
      }

      // verificar se já foi usado em vendas
      const usedInSale = await prisma.saleItem.findFirst({
        where: {
          productId: productId
        }
      });

      if (usedInSale) {
        return res.status(400).json({
          error: "Produto já possui vendas e não pode ser excluído"
        });
      }

      await prisma.product.delete({
        where: {
          id: productId
        }
      });

      return res.json({
        message: "Produto excluído com sucesso"
      });

    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao excluir produto"
      });
    }
  }
);


//rota de desativação
router.patch(
  "/:id/deactivate",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const productId = String(req.params.id);

      const product = await prisma.product.updateMany({
        where: {
          id: productId,
          storeId: req.user!.storeId
        },
        data: {
          active: false
        }
      });

      if (product.count === 0) {
        return res.status(404).json({
          error: "Produto não encontrado"
        });
      }

      return res.json({
        message: "Produto desativado"
      });

    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao desativar produto"
      });
    }
  }
);

router.patch(
  "/:id/activate",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const productId = String(req.params.id);

      const result = await prisma.product.updateMany({
        where: {
          id: productId,
          storeId: req.user!.storeId
        },
        data: {
          active: true
        }
      });

      if (result.count === 0) {
        return res.status(404).json({
          error: "Produto não encontrado"
        });
      }

      return res.json({
        message: "Produto reativado"
      });

    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Erro ao reativar produto"
      });
    }
  }
);

router.get(
  "/:id/stock-history",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {

      const productId = String(req.params.id);

      const movements = await prisma.stockMovement.findMany({
        where: {
          productId: productId,
          storeId: req.user!.storeId
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return res.json(movements);

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error: "Erro ao buscar histórico de estoque"
      });

    }
  }
);

export default router;