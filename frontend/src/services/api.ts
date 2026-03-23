import axios from "axios";

// Instância padrão da API
export const api = axios.create({
  baseURL: "http://localhost:3000", // ajuste se necessário
});

// Interceptor → envia token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});