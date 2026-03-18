import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("ERROR:", err);

  if (err.message) {
    return res.status(400).json({
      error: err.message
    });
  }

  return res.status(500).json({
    error: "Erro interno do servidor"
  });
}