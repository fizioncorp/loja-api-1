import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  barcode: z.string().min(3, "Código inválido"),
  price: z.number().positive("Preço deve ser positivo"),
  cost: z.number().nonnegative("Custo inválido")
});