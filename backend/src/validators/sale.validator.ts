import { z } from "zod";

export const paymentSchema = z.object({
  method: z.enum(["PIX", "CASH", "CARD"]),
  amount: z.number().positive()
});

export const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive()
});

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema),
  payments: z.array(paymentSchema)
});