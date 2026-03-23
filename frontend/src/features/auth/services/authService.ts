import { api } from "@/services/api";
import { LoginDTO, LoginResponse } from "@/types/auth";

// Faz login no backend
export async function login(data: LoginDTO): Promise<LoginResponse> {
  const response = await api.post("/auth/login", data);

  return response.data;
}