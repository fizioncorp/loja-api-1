// Importa os tipos Request, Response e NextFunction do Express
// Request -> representa a requisição HTTP recebida
// Response -> representa a resposta HTTP enviada ao cliente
// NextFunction -> função usada para passar o controle para o próximo middleware
import { Request, Response, NextFunction } from "express";

// Importa a biblioteca jsonwebtoken para criação e validação de JWT
import jwt from "jsonwebtoken";

// Chave secreta usada para validar o token JWT
// OBS: Em produção isso deve ficar em variáveis de ambiente (.env)
const JWT_SECRET = "supersecret"; // depois moveremos para .env


// Interface que estende o Request padrão do Express
// Adicionamos a propriedade "user" para guardar os dados do usuário autenticado
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    storeId: string;
    role: string;
  };
}


// Middleware de autenticação
// Responsável por validar o token JWT enviado na requisição
export function authMiddleware(

  // Request customizado contendo o campo user
  req: AuthRequest,

  // Objeto de resposta do Express
  res: Response,

  // Função que chama o próximo middleware ou rota
  next: NextFunction
) {

  try {

    // Obtém o header Authorization da requisição
    // Normalmente vem no formato: "Bearer TOKEN"
    const authHeader = req.headers.authorization;

    // Se não existir header Authorization, retorna erro 401 (não autorizado)
    if (!authHeader) {
      return res.status(401).json({
        error: "Token não enviado"
      });
    }

    // Divide o header pelo espaço
    // Exemplo: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    // Resultado do split: ["Bearer", "TOKEN"]
    const token = authHeader.split(" ")[1];

    // Verifica e decodifica o token usando a chave secreta
    // Se o token for inválido ou expirado, o jwt.verify lançará erro
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Salva os dados decodificados do token dentro da requisição
    // Isso permite que outras rotas acessem req.user
    req.user = {
  userId: decoded.userId,
  storeId: decoded.storeId,
  role: decoded.role
};

    // Se o token for válido, continua a execução para o próximo middleware ou rota
    next();

  } catch (error) {

    // Se ocorrer qualquer erro na verificação do token
    // retorna erro 401 indicando token inválido
    return res.status(401).json({
      error: "Token inválido"
    });
  }
}