// Importações principais
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import productsRoutes from "./routes/products";
import stockRoutes from "./routes/stock";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/products", productsRoutes);

app.use("/stock", stockRoutes);

// Rota de teste
app.get("/health", (req, res) => {
  return res.json({ status: "ok" });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});